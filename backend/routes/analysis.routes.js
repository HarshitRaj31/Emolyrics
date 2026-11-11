const express = require("express");
const { classifyLyrics } = require("../nlp/emotionClassifier");
const { advancedEmotionService } = require("../services/advancedEmotionService");
const { multilingualMLService } = require("../services/multilingualMLService");
const { getIsConnected, memoryStore } = require("../db");
const Analysis = require("../models/Analysis");
const { optionalJWT, authenticateJWT } = require("../middleware/auth.middleware");

const router = express.Router();

/**
 * POST /api/analyze-mood
 * Core NLP Emotion Classification Endpoint
 * Backwards compatible with legacy server.py & app.js
 */
router.post("/analyze-mood", optionalJWT, async (req, res, next) => {
  try {
    const { lyrics, title, artist, autoSave } = req.body;

    if (!lyrics || typeof lyrics !== "string" || !lyrics.trim()) {
      return res.status(400).json({
        success: false,
        message: "Lyrics text is required to classify emotion."
      });
    }

    // Run high-precision NLP classification
    const classification = classifyLyrics(lyrics);

    let savedRecord = null;
    if (autoSave) {
      const recordData = {
        title: title?.trim() || "Untitled Lyrics",
        artist: artist?.trim() || "Independent / Unknown",
        lyrics: lyrics.trim(),
        mood: classification.mood,
        confidence: classification.confidence,
        explanation: classification.explanation,
        language: classification.language,
        scores: classification.scores,
        detectedKeywords: classification.detectedKeywords,
        user: req.user ? req.user._id : null,
        isPublic: true
      };

      if (getIsConnected()) {
        savedRecord = await Analysis.create(recordData);
      } else {
        savedRecord = {
          _id: "analysis-" + Date.now(),
          ...recordData,
          createdAt: new Date().toISOString()
        };
        memoryStore.analyses.unshift(savedRecord);
      }
    }

    return res.json({
      success: true,
      mood: classification.mood,
      confidence: classification.confidence,
      explanation: classification.explanation,
      language: classification.language,
      scores: classification.scores,
      detectedKeywords: classification.detectedKeywords,
      emoji: classification.emoji,
      gradient: classification.gradient,
      color: classification.color,
      savedId: savedRecord ? savedRecord._id : null
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/ml-health
 * Check status and configuration of the Python Multilingual Emotion ML microservice
 */
router.get("/ml-health", async (req, res, next) => {
  try {
    const health = await multilingualMLService.checkHealth(true);
    return res.json({
      success: true,
      ...health
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/analyze-multilingual
 * Direct original-language classification via the trained multilingual model
 */
router.post("/analyze-multilingual", optionalJWT, async (req, res, next) => {
  try {
    const { lyrics, language } = req.body;

    if (!lyrics || typeof lyrics !== "string" || !lyrics.trim()) {
      return res.status(400).json({
        success: false,
        message: "Lyrics text is required for multilingual emotion prediction."
      });
    }

    const prediction = await multilingualMLService.predictEmotion({
      lyrics,
      language
    });

    if (!prediction || prediction.success === false) {
      return res.status(503).json({
        success: false,
        code: "ERR_MULTILINGUAL_SERVICE_OFFLINE",
        message:
          `Multilingual ML service is unavailable (${prediction?.reason || "offline"}). ` +
          `Configure ML_SERVICE_URL to point to the separate Python FastAPI ML service.`,
        detectedLanguage: prediction?.language || language || null
      });
    }

    return res.json(prediction);
  } catch (error) {
    if (error.statusCode === 503 || error.code === "ERR_MULTILINGUAL_SERVICE_OFFLINE") {
      return res.status(503).json({
        success: false,
        message: error.message,
        code: error.code,
        detectedLanguage: error.detectedLanguage
      });
    }
    next(error);
  }
});

/**
 * POST /api/analyze-lines
 * Direct line-by-line multilingual emotion prediction with context windowing
 */
router.post("/analyze-lines", optionalJWT, async (req, res, next) => {
  try {
    const { lyrics, lines, language, contextWindow } = req.body;
    const inputLines = lines || (lyrics ? lyrics.split(/\r?\n/) : []);

    if (!Array.isArray(inputLines) || inputLines.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Lyrics or lines array is required."
      });
    }

    const prediction = await multilingualMLService.predictLines({
      lines: inputLines,
      options: { language, contextWindow }
    });

    if (!prediction || prediction.success === false) {
      return res.status(503).json({
        success: false,
        code: "ERR_MULTILINGUAL_SERVICE_OFFLINE",
        message:
          `Multilingual ML service is unavailable (${prediction?.reason || "offline"}). ` +
          `Configure ML_SERVICE_URL to point to the separate Python FastAPI ML service.`,
        detectedLanguage: prediction?.language || language || null
      });
    }

    return res.json(prediction);
  } catch (error) {
    if (error.statusCode === 503 || error.code === "ERR_MULTILINGUAL_SERVICE_OFFLINE") {
      return res.status(503).json({
        success: false,
        message: error.message,
        code: error.code,
        detectedLanguage: error.detectedLanguage
      });
    }
    next(error);
  }
});

/**
 * POST /api/analyze-advanced
 * Advanced Multi-Emotion Detection, Line-by-Line Analysis & Ollama Deep Interpretation
 */
router.post("/analyze-advanced", optionalJWT, async (req, res, next) => {
  try {
    const { lyrics, title, artist, autoSave, language, contextWindow } = req.body;

    if (!lyrics || typeof lyrics !== "string" || !lyrics.trim()) {
      return res.status(400).json({
        success: false,
        message: "Lyrics text is required for advanced mood analysis."
      });
    }

    if (lyrics.length > 25000) {
      return res.status(400).json({
        success: false,
        message: "Lyrics exceed maximum supported size of 25,000 characters."
      });
    }

    const result = await advancedEmotionService.analyzeAdvanced({
      lyrics,
      title,
      artist,
      options: { language, contextWindow }
    });

    let savedRecord = null;
    if (autoSave) {
      const recordData = {
        title: title?.trim() || "Untitled Lyrics",
        artist: artist?.trim() || "Independent / Unknown",
        lyrics: lyrics.trim(),
        mood: result.primaryEmotion,
        confidence: result.confidence,
        explanation:
          result.aiInterpretation?.overallMeaning ||
          `Advanced multi-emotion analysis with ${result.primaryEmotion} as primary mood.`,
        language: result.metadata.language,
        scores: result.emotionDistribution,
        detectedKeywords: result.primaryEmotionMeta?.keywords?.slice(0, 5) || [],
        user: req.user ? req.user._id : null,
        isPublic: true
      };

      if (getIsConnected()) {
        savedRecord = await Analysis.create(recordData);
      } else {
        savedRecord = {
          _id: "analysis-adv-" + Date.now(),
          ...recordData,
          createdAt: new Date().toISOString()
        };
        memoryStore.analyses.unshift(savedRecord);
      }
    }

    return res.json({
      ...result,
      savedId: savedRecord ? savedRecord._id : null
    });
  } catch (error) {
    if (error.statusCode === 503 || error.code === "ERR_MULTILINGUAL_SERVICE_OFFLINE") {
      return res.status(503).json({
        success: false,
        message: error.message,
        code: error.code,
        detectedLanguage: error.detectedLanguage
      });
    }
    next(error);
  }
});

/**
 * GET /api/analyses
 * Retrieve community and saved emotion analyses with filtering and search
 */
router.get("/analyses", optionalJWT, async (req, res, next) => {
  try {
    const { mood, search, page = 1, limit = 12 } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    if (getIsConnected()) {
      const filter = {};
      if (mood && mood !== "All") {
        filter.mood = mood;
      }
      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: "i" } },
          { artist: { $regex: search, $options: "i" } },
          { lyrics: { $regex: search, $options: "i" } }
        ];
      }

      const total = await Analysis.countDocuments(filter);
      const items = await Analysis.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean();

      return res.json({
        success: true,
        items,
        pagination: {
          total,
          page: pageNum,
          pages: Math.ceil(total / limitNum) || 1,
          limit: limitNum
        }
      });
    } else {
      // Memory Store Filter
      let items = [...memoryStore.analyses];
      if (mood && mood !== "All") {
        items = items.filter(a => a.mood.toLowerCase() === mood.toLowerCase());
      }
      if (search) {
        const q = search.toLowerCase();
        items = items.filter(
          a =>
            a.title?.toLowerCase().includes(q) ||
            a.artist?.toLowerCase().includes(q) ||
            a.lyrics?.toLowerCase().includes(q)
        );
      }

      const total = items.length;
      const paginated = items.slice((pageNum - 1) * limitNum, pageNum * limitNum);

      return res.json({
        success: true,
        items: paginated,
        pagination: {
          total,
          page: pageNum,
          pages: Math.ceil(total / limitNum) || 1,
          limit: limitNum
        }
      });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/analyses
 * Save/bookmark an analysis
 */
router.post("/analyses", optionalJWT, async (req, res, next) => {
  try {
    const { title, artist, lyrics, mood, confidence, explanation, language } = req.body;

    if (!lyrics || !mood) {
      return res.status(400).json({
        success: false,
        message: "Lyrics and mood classification are required to save an analysis."
      });
    }

    const recordData = {
      title: title?.trim() || "Untitled Track",
      artist: artist?.trim() || "Unknown Artist",
      lyrics: lyrics.trim(),
      mood,
      confidence: Number(confidence) || 80,
      explanation: explanation || "Lyrical sentiment verified.",
      language: language || "English",
      user: req.user ? req.user._id : null,
      isPublic: true
    };

    if (getIsConnected()) {
      const created = await Analysis.create(recordData);
      return res.status(201).json({ success: true, item: created });
    } else {
      const created = {
        _id: "analysis-" + Date.now(),
        ...recordData,
        createdAt: new Date().toISOString()
      };
      memoryStore.analyses.unshift(created);
      return res.status(201).json({ success: true, item: created });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/analyses/:id
 */
router.delete("/analyses/:id", optionalJWT, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (getIsConnected()) {
      const item = await Analysis.findById(id);
      if (!item) {
        return res.status(404).json({ success: false, message: "Analysis not found." });
      }
      await Analysis.findByIdAndDelete(id);
      return res.json({ success: true, message: "Analysis removed successfully." });
    } else {
      const index = memoryStore.analyses.findIndex(a => a._id === id);
      if (index === -1) {
        return res.status(404).json({ success: false, message: "Analysis not found." });
      }
      memoryStore.analyses.splice(index, 1);
      return res.json({ success: true, message: "Analysis removed successfully." });
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;
