/**
 * EmoLyrics Playlist Routes
 * Supports smart automated playlist generation across 9 ML emotion classes,
 * playlist CRUD, song reordering, duplicate prevention, and user access control.
 */

const express = require("express");
const mongoose = require("mongoose");
const { getIsConnected, memoryStore } = require("../db");
const Playlist = require("../models/Playlist");
const playlistGeneratorService = require("../services/playlistGeneratorService");
const { optionalJWT, authenticateJWT } = require("../middleware/auth.middleware");

const router = express.Router();

/**
 * GET /api/playlists
 * Retrieve playlists based on scope (presets, user custom, or all)
 */
router.get("/", optionalJWT, async (req, res, next) => {
  try {
    await playlistGeneratorService.ensurePresetsSeeded();
    const { scope = "all", mood } = req.query;
    const userId = req.user ? req.user._id : null;

    let systemPresets = [];
    let userPlaylists = [];

    if (getIsConnected()) {
      const query = {};
      if (mood && mood !== "All") {
        query.mood = new RegExp(`^${mood}$`, "i");
      }

      if (scope === "mine") {
        if (!userId) {
          return res.json({ success: true, playlists: [] });
        }
        userPlaylists = await Playlist.find({ user: userId, ...query })
          .sort({ updatedAt: -1 })
          .lean();
        return res.json({ success: true, playlists: userPlaylists });
      }

      if (scope === "presets") {
        systemPresets = await Playlist.find({ isSystemPreset: true, ...query })
          .sort({ createdAt: 1 })
          .lean();
        return res.json({ success: true, playlists: systemPresets });
      }

      // Default 'all': System Presets + User Custom Playlists
      const allFound = await Playlist.find(query).sort({ isSystemPreset: -1, updatedAt: -1 }).lean();
      return res.json({ success: true, playlists: allFound });
    } else {
      // Memory Store fallback
      let list = [...memoryStore.playlists];
      if (mood && mood !== "All") {
        list = list.filter((p) => p.mood.toLowerCase() === mood.toLowerCase());
      }
      if (scope === "mine" && userId) {
        list = list.filter((p) => p.user === userId || p.user === String(userId));
      }
      return res.json({ success: true, playlists: list });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/playlists/generate
 * Smart Dynamic Mood Playlist Generator
 * Supports single or multiple target emotions, song count, and autoSave
 */
router.post("/generate", optionalJWT, async (req, res, next) => {
  try {
    const { emotions, mood, count = 10, title, description, autoSave = false } = req.body;
    const userId = req.user ? req.user._id : null;

    const generated = await playlistGeneratorService.generatePlaylist({
      emotions: emotions || mood,
      count,
      title,
      description,
      userId
    });

    let savedPlaylist = null;
    if (autoSave) {
      savedPlaylist = await playlistGeneratorService.savePlaylist(generated, userId);
    }

    return res.json({
      success: true,
      playlist: savedPlaylist || generated,
      isSaved: Boolean(savedPlaylist)
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/playlists/:idOrMood
 * Retrieve a playlist by MongoDB ObjectId or preset Mood / title name
 */
router.get("/:idOrMood", optionalJWT, async (req, res, next) => {
  try {
    await playlistGeneratorService.ensurePresetsSeeded();
    const rawIdOrMood = req.params.idOrMood;
    const idOrMood = decodeURIComponent(rawIdOrMood).trim();
    let playlist = null;

    const isObjectId = mongoose.Types.ObjectId.isValid(idOrMood) && /^[0-9a-fA-F]{24}$/.test(idOrMood);

    if (getIsConnected()) {
      if (isObjectId) {
        playlist = await Playlist.findById(idOrMood).lean();
      } else {
        const escapedMood = idOrMood.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const slugSpace = idOrMood.replace(/[-_]/g, " ").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const slugSlash = idOrMood.replace(/[-_]/g, "/").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        const orFilters = [
          { mood: new RegExp(`^${escapedMood}$`, "i") },
          { title: new RegExp(`^${escapedMood}$`, "i") },
          { emotions: new RegExp(`^${escapedMood}$`, "i") }
        ];

        if (slugSpace !== escapedMood) {
          orFilters.push(
            { mood: new RegExp(`^${slugSpace}$`, "i") },
            { title: new RegExp(`^${slugSpace}$`, "i") },
            { emotions: new RegExp(`^${slugSpace}$`, "i") }
          );
        }

        if (slugSlash !== escapedMood && slugSlash !== slugSpace) {
          orFilters.push(
            { mood: new RegExp(`^${slugSlash}$`, "i") },
            { title: new RegExp(`^${slugSlash}$`, "i") },
            { emotions: new RegExp(`^${slugSlash}$`, "i") }
          );
        }

        playlist = await Playlist.findOne({ $or: orFilters }).lean();
      }
    }

    if (!playlist) {
      const targetLower = idOrMood.toLowerCase();
      const targetSpace = idOrMood.replace(/[-_]/g, " ").toLowerCase();
      const targetSlash = idOrMood.replace(/[-_]/g, "/").toLowerCase();

      playlist = memoryStore.playlists.find(
        (p) =>
          p._id === idOrMood ||
          (p.mood && (p.mood.toLowerCase() === targetLower || p.mood.toLowerCase() === targetSpace || p.mood.toLowerCase() === targetSlash)) ||
          (p.title && (p.title.toLowerCase() === targetLower || p.title.toLowerCase() === targetSpace)) ||
          (Array.isArray(p.emotions) && p.emotions.some((e) => {
            const eLow = e.toLowerCase();
            return eLow === targetLower || eLow === targetSpace || eLow === targetSlash;
          }))
      );
    }

    if (!playlist) {
      return res.status(404).json({
        success: false,
        message: `Playlist '${idOrMood}' not found.`
      });
    }

    return res.json({ success: true, playlist });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/playlists
 * Save a newly created playlist
 */
router.post("/", optionalJWT, async (req, res, next) => {
  try {
    const { title, description, mood, emotions, artwork, songs } = req.body;
    const userId = req.user ? req.user._id : null;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Playlist title is required."
      });
    }

    const saved = await playlistGeneratorService.savePlaylist(
      {
        title,
        description,
        mood: mood || "Happy",
        emotions: emotions || [mood || "Happy"],
        artwork,
        songs: songs || []
      },
      userId
    );

    return res.status(201).json({ success: true, playlist: saved });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/playlists/:id
 * Update playlist details, title, description, or songs (reorder, add, remove)
 * Enforces user ownership access control
 */
router.put("/:id", optionalJWT, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, songs, mood, emotions, artwork } = req.body;
    const userId = req.user ? req.user._id : null;

    if (getIsConnected()) {
      const isObjectId = mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id);
      if (!isObjectId) {
        return res.status(404).json({ success: false, message: "Playlist not found." });
      }
      const existing = await Playlist.findById(id);
      if (!existing) {
        return res.status(404).json({ success: false, message: "Playlist not found." });
      }

      // Access control: if playlist belongs to a user, only that user can update it
      if (existing.user && (!userId || String(existing.user) !== String(userId))) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: You can only edit your own custom playlists."
        });
      }

      if (title !== undefined) existing.title = title.trim();
      if (description !== undefined) existing.description = description.trim();
      if (songs !== undefined) existing.songs = (songs || []).filter(Boolean);
      if (mood !== undefined) existing.mood = mood;
      if (emotions !== undefined) existing.emotions = emotions;
      if (artwork !== undefined) existing.artwork = artwork;

      await existing.save();
      return res.json({ success: true, playlist: existing });
    } else {
      const idx = memoryStore.playlists.findIndex((p) => p._id === id);
      if (idx === -1) {
        return res.status(404).json({ success: false, message: "Playlist not found." });
      }

      const p = memoryStore.playlists[idx];
      if (p.user && (!userId || String(p.user) !== String(userId))) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: You can only edit your own custom playlists."
        });
      }

      if (title !== undefined) p.title = title.trim();
      if (description !== undefined) p.description = description.trim();
      if (songs !== undefined) p.songs = (songs || []).filter(Boolean);
      if (mood !== undefined) p.mood = mood;
      if (emotions !== undefined) p.emotions = emotions;
      p.updatedAt = new Date().toISOString();

      return res.json({ success: true, playlist: p });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/playlists/:id
 * Delete a custom playlist
 * Enforces user ownership access control
 */
router.delete("/:id", optionalJWT, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user ? req.user._id : null;

    if (getIsConnected()) {
      const isObjectId = mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id);
      if (!isObjectId) {
        return res.status(404).json({ success: false, message: "Playlist not found." });
      }
      const existing = await Playlist.findById(id);
      if (!existing) {
        return res.status(404).json({ success: false, message: "Playlist not found." });
      }

      if (existing.isSystemPreset) {
        return res.status(400).json({
          success: false,
          message: "Default system mood presets cannot be deleted."
        });
      }

      if (existing.user && (!userId || String(existing.user) !== String(userId))) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: You can only delete your own custom playlists."
        });
      }

      await Playlist.findByIdAndDelete(id);
      return res.json({ success: true, message: "Playlist deleted successfully." });
    } else {
      const idx = memoryStore.playlists.findIndex((p) => p._id === id);
      if (idx === -1) {
        return res.status(404).json({ success: false, message: "Playlist not found." });
      }

      const p = memoryStore.playlists[idx];
      if (p.isSystemPreset) {
        return res.status(400).json({
          success: false,
          message: "Default system mood presets cannot be deleted."
        });
      }

      if (p.user && (!userId || String(p.user) !== String(userId))) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: You can only delete your own custom playlists."
        });
      }

      memoryStore.playlists.splice(idx, 1);
      return res.json({ success: true, message: "Playlist deleted successfully." });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/playlists/:id/duplicate
 * Duplicate an existing playlist
 */
router.post("/:id/duplicate", optionalJWT, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user ? req.user._id : null;

    const cloned = await playlistGeneratorService.duplicatePlaylist(id, userId);
    return res.status(201).json({ success: true, playlist: cloned });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
