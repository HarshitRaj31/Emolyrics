const express = require("express");
const musicBrainzAdapter = require("../plugins/adapters/musicbrainzAdapter");
const lyricsManager = require("../plugins/providers/lyricsManager");
const recommendationService = require("../services/recommendationService");
const { classifyMultilingualLyrics } = require("../nlp/multilingualClassifier");
const { getIsConnected, memoryStore } = require("../db");
const Analysis = require("../models/Analysis");
const { optionalJWT } = require("../middleware/auth.middleware");

const router = express.Router();

/**
 * GET /api/music/search
 * Search MusicBrainz recordings with caching
 */
router.get("/search", async (req, res, next) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || !q.trim()) {
      return res.status(400).json({
        success: false,
        message: "Search query 'q' is required (song title, artist, or album)."
      });
    }

    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 25);
    const result = await musicBrainzAdapter.searchRecordings(q, limitNum);

    return res.json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/music/lyrics
 * Retrieve verified lyrics via authorized providers (LRCLIB, Lyrics.ovh)
 */
router.get("/lyrics", async (req, res, next) => {
  try {
    const { title, artist, album, duration } = req.query;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Track title is required to retrieve lyrics."
      });
    }

    const result = await lyricsManager.getLyrics({
      title: title.trim(),
      artist: artist ? artist.trim() : "",
      album: album ? album.trim() : "",
      duration: duration || null
    });

    return res.json({
      ...result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/music/analyze-song
 * End-to-end integration: Song Metadata + Legal Lyrics Retrieval + Existing ML Mood Prediction
 */
router.post("/analyze-song", optionalJWT, async (req, res, next) => {
  try {
    const { title, artist, album, coverArtUrl, spotifyUrl, autoSave = false } = req.body;
    let { lyrics } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Song title is required."
      });
    }

    // 1. If lyrics not supplied, retrieve from authorized provider
    let lyricsMetadata = {
      provider: "Direct Input",
      copyrightNotice: "Provided by user"
    };

    if (!lyrics || typeof lyrics !== "string" || !lyrics.trim()) {
      const lyricsResult = await lyricsManager.getLyrics({ title, artist, album });

      if (!lyricsResult.success || !lyricsResult.lyrics) {
        if (lyricsResult.isInstrumental) {
          return res.status(422).json({
            success: false,
            isInstrumental: true,
            message: `"${title}" is verified as an instrumental track without lyrical content. Emotion classification requires lyrics.`
          });
        }

        return res.status(404).json({
          success: false,
          isInstrumental: false,
          message: lyricsResult.error || `No authorized lyrics available for "${title}". You can enter lyrics manually to classify.`
        });
      }

      lyrics = lyricsResult.lyrics;
      lyricsMetadata = {
        provider: lyricsResult.provider,
        copyrightNotice: lyricsResult.copyrightNotice
      };
    }

    // 2. Pass lyrics to Multilingual NLP Emotion Classification engine
    const classification = classifyMultilingualLyrics(lyrics, { title, artist });

    // 3. Optional DB record persistence
    let savedRecord = null;
    if (autoSave) {
      const recordData = {
        title: title.trim(),
        artist: (artist || "Independent / Unknown").trim(),
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

    // 4. Generate initial mood-based recommendations
    let initialRecommendations = [];
    try {
      const recRes = await recommendationService.getRecommendations({
        mood: classification.mood,
        seedTitle: title.trim(),
        seedArtist: (artist || "").trim(),
        limit: 6
      });
      initialRecommendations = recRes.recommendations || [];
    } catch (recErr) {
      console.warn("[Music Routes] Recommendations generation warning:", recErr.message);
    }

    // 5. Return combined song metadata, ML mood classification & recommendations
    return res.json({
      success: true,
      song: {
        title: title.trim(),
        artist: (artist || "Unknown Artist").trim(),
        album: (album || "").trim(),
        coverArtUrl: coverArtUrl || null,
        spotifyUrl: spotifyUrl || `https://open.spotify.com/search/${encodeURIComponent(title + " " + (artist || ""))}`,
        lyrics,
        ...lyricsMetadata
      },
      mood: classification.mood,
      confidence: classification.confidence,
      explanation: classification.explanation,
      language: classification.language,
      languageCode: classification.languageCode,
      script: classification.script,
      detectedLanguage: classification.detectedLanguage,
      isSupportedLanguage: classification.isSupportedLanguage,
      scores: classification.scores,
      detectedKeywords: classification.detectedKeywords,
      emoji: classification.emoji,
      gradient: classification.gradient,
      color: classification.color,
      savedId: savedRecord ? savedRecord._id : null,
      recommendations: initialRecommendations
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/music/recommendations
 * Retrieve personalized, mood-based recommendations
 */
router.get("/recommendations", async (req, res, next) => {
  try {
    const {
      mood = "Happiness",
      title = "",
      artist = "",
      exclude = "",
      limit = 6,
      secondary = "",
      themes = "",
      tone = ""
    } = req.query;

    const parsedExclude = Array.isArray(exclude)
      ? exclude
      : typeof exclude === "string" && exclude.trim()
      ? exclude.split(",").map((s) => s.trim())
      : [];

    const parsedSecondary = Array.isArray(secondary)
      ? secondary
      : typeof secondary === "string" && secondary.trim()
      ? secondary.split(",").map((s) => s.trim())
      : [];

    const parsedThemes = Array.isArray(themes)
      ? themes
      : typeof themes === "string" && themes.trim()
      ? themes.split(",").map((s) => s.trim())
      : [];

    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 6, 1), 20);

    const result = await recommendationService.getRecommendations({
      mood,
      seedTitle: title,
      seedArtist: artist,
      exclude: parsedExclude,
      limit: limitNum,
      secondaryEmotions: parsedSecondary,
      lyricalThemes: parsedThemes,
      overallTone: tone
    });

    return res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/music/recommendations
 * Flexible body-based recommendations with multi-emotion & theme scoring
 */
router.post("/recommendations", async (req, res, next) => {
  try {
    const {
      mood = "Happiness",
      seedTitle = "",
      seedArtist = "",
      exclude = [],
      limit = 6,
      secondaryEmotions = [],
      lyricalThemes = [],
      overallTone = ""
    } = req.body;

    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 6, 1), 20);

    const result = await recommendationService.getRecommendations({
      mood,
      seedTitle,
      seedArtist,
      exclude: Array.isArray(exclude) ? exclude : [],
      limit: limitNum,
      secondaryEmotions: Array.isArray(secondaryEmotions) ? secondaryEmotions : [],
      lyricalThemes: Array.isArray(lyricalThemes) ? lyricalThemes : [],
      overallTone
    });

    return res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/music/similar-songs
 * Feature 2: Similar Song Discovery based on analyzed lyrics or seed song
 */
router.post("/similar-songs", async (req, res, next) => {
  try {
    const {
      seedTitle,
      seedArtist = "",
      mood = "Happiness",
      themes = [],
      secondaryEmotions = [],
      limit = 6
    } = req.body;

    if (!seedTitle || typeof seedTitle !== "string" || !seedTitle.trim()) {
      return res.status(400).json({
        success: false,
        message: "Seed song title is required to find similar tracks."
      });
    }

    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 6, 1), 20);

    const result = await recommendationService.findSimilarSongs({
      seedTitle: seedTitle.trim(),
      seedArtist: seedArtist ? seedArtist.trim() : "",
      mood,
      themes: Array.isArray(themes) ? themes : [],
      secondaryEmotions: Array.isArray(secondaryEmotions) ? secondaryEmotions : [],
      limit: limitNum
    });

    return res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/music/explain-recommendation
 * Feature 4: Contextual AI Match Explanation using local Ollama AI
 */
router.post("/explain-recommendation", async (req, res, next) => {
  try {
    const {
      songTitle,
      artist = "",
      mood = "Happiness",
      seedTitle = "",
      lyricalThemes = [],
      overallTone = ""
    } = req.body;

    if (!songTitle || typeof songTitle !== "string" || !songTitle.trim()) {
      return res.status(400).json({
        success: false,
        message: "Song title is required to generate match explanation."
      });
    }

    const result = await recommendationService.explainRecommendation({
      songTitle: songTitle.trim(),
      artist: artist ? artist.trim() : "",
      mood,
      seedTitle: seedTitle ? seedTitle.trim() : "",
      lyricalThemes: Array.isArray(lyricalThemes) ? lyricalThemes : [],
      overallTone
    });

    return res.json({
      success: true,
      songTitle,
      artist,
      mood,
      ...result
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

