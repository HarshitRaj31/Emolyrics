const express = require("express");
const { getIsConnected, memoryStore } = require("../db");
const User = require("../models/User");
const Analysis = require("../models/Analysis");
const { optionalJWT } = require("../middleware/auth.middleware");

const router = express.Router();

// Allow public access without requiring login
router.use(optionalJWT);

/**
 * GET /api/user/profile
 * Retrieves user account details, aggregated metrics, mood distribution, and timeline data
 */
router.get("/profile", async (req, res, next) => {
  try {
    if (!req.user) {
      return res.json({
        success: true,
        profile: {
          id: "guest-user",
          name: "Guest Explorer",
          email: "guest@emolyrics.local",
          role: "guest",
          avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
          createdAt: new Date().toISOString()
        },
        stats: {
          totalAnalyses: 0,
          totalSavedSongs: 0,
          mostFrequentMood: "Happy",
          mostFrequentMoodCount: 0,
          moodDistribution: { Happy: 0 }
        },
        timeline: []
      });
    }

    const userId = req.user._id ? req.user._id.toString() : req.user.id;

    let analyses = [];
    let savedSongs = [];
    let userDetails = null;

    if (getIsConnected()) {
      const user = await User.findById(userId).select("-password").lean();
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found." });
      }
      userDetails = user;
      savedSongs = user.savedSongs || [];

      // Fetch user's analyses
      analyses = await Analysis.find({ user: userId }).sort({ createdAt: -1 }).lean();
    } else {
      const user = memoryStore.users.find(
        (u) => (u._id && u._id.toString() === userId) || (u.id && u.id.toString() === userId)
      );
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found." });
      }
      userDetails = user;
      savedSongs = user.savedSongs || [];

      // Memory store analyses
      analyses = (memoryStore.analyses || []).filter(
        (a) => a.user && a.user.toString() === userId
      );
    }

    // Compute aggregated metrics
    const totalAnalyses = analyses.length;
    const moodCounts = {};
    const timeline = [];

    analyses.forEach((item) => {
      // Mood frequency
      const mood = item.mood || "Happy";
      moodCounts[mood] = (moodCounts[mood] || 0) + 1;

      // Timeline entry
      timeline.push({
        id: item._id,
        date: item.createdAt,
        title: item.title,
        artist: item.artist,
        mood: item.mood,
        confidence: item.confidence,
        language: item.language
      });
    });

    // Find most frequent mood
    let mostFrequentMood = "None Yet";
    let highestCount = 0;
    Object.entries(moodCounts).forEach(([mood, count]) => {
      if (count > highestCount) {
        highestCount = count;
        mostFrequentMood = mood;
      }
    });

    return res.json({
      success: true,
      profile: {
        id: userDetails._id || userDetails.id,
        name: userDetails.name,
        email: userDetails.email,
        role: userDetails.role || "user",
        avatar: userDetails.avatar,
        createdAt: userDetails.createdAt
      },
      stats: {
        totalAnalyses,
        totalSavedSongs: savedSongs.length,
        mostFrequentMood,
        mostFrequentMoodCount: highestCount,
        moodDistribution: moodCounts
      },
      timeline: timeline.slice(0, 30)
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/user/profile
 * Updates basic profile info (name, avatar)
 */
router.put("/profile", async (req, res, next) => {
  try {
    const { name, avatar } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Name must be at least 2 characters long."
      });
    }

    const cleanName = name.trim();
    const cleanAvatar = avatar && avatar.trim() ? avatar.trim() : (req.user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80");

    if (!req.user) {
      return res.json({
        success: true,
        message: "Profile updated successfully.",
        user: {
          id: "guest-user",
          name: cleanName,
          email: "guest@emolyrics.local",
          role: "guest",
          avatar: cleanAvatar,
          createdAt: new Date().toISOString()
        }
      });
    }

    const userId = req.user._id ? req.user._id.toString() : req.user.id;

    if (getIsConnected()) {
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { name: cleanName, avatar: cleanAvatar },
        { new: true, runValidators: true }
      ).select("-password");

      return res.json({
        success: true,
        message: "Profile updated successfully.",
        user: {
          id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          avatar: updatedUser.avatar,
          createdAt: updatedUser.createdAt
        }
      });
    } else {
      const user = memoryStore.users.find(
        (u) => (u._id && u._id.toString() === userId) || (u.id && u.id.toString() === userId)
      );
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found." });
      }

      user.name = cleanName;
      user.avatar = cleanAvatar;

      return res.json({
        success: true,
        message: "Profile updated successfully.",
        user: {
          id: user._id || user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          createdAt: user.createdAt
        }
      });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/user/history
 * Chronological analysis history with search, mood filter, and sorting
 */
router.get("/history", async (req, res, next) => {
  try {
    const { search = "", mood = "All", sort = "newest", page = 1, limit = 12 } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 12, 1), 50);
    const sortOrder = sort === "oldest" ? 1 : -1;

    if (!req.user) {
      return res.json({
        success: true,
        items: [],
        pagination: {
          total: 0,
          page: pageNum,
          pages: 1,
          limit: limitNum
        }
      });
    }

    const userId = req.user._id ? req.user._id.toString() : req.user.id;

    if (getIsConnected()) {
      const filter = { user: userId };

      if (mood && mood !== "All") {
        filter.mood = mood;
      }

      if (search && search.trim()) {
        const q = search.trim();
        filter.$or = [
          { title: { $regex: q, $options: "i" } },
          { artist: { $regex: q, $options: "i" } },
          { explanation: { $regex: q, $options: "i" } }
        ];
      }

      const total = await Analysis.countDocuments(filter);
      const items = await Analysis.find(filter)
        .sort({ createdAt: sortOrder })
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
      let items = (memoryStore.analyses || []).filter(
        (a) => a.user && a.user.toString() === userId
      );

      if (mood && mood !== "All") {
        items = items.filter((a) => a.mood.toLowerCase() === mood.toLowerCase());
      }

      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        items = items.filter(
          (a) =>
            a.title?.toLowerCase().includes(q) ||
            a.artist?.toLowerCase().includes(q) ||
            a.explanation?.toLowerCase().includes(q)
        );
      }

      items.sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return sortOrder === 1 ? timeA - timeB : timeB - timeA;
      });

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
 * DELETE /api/user/history/:id
 * Delete a single analysis record with strict user data isolation
 */
router.delete("/history/:id", async (req, res, next) => {
  try {
    if (!req.user) {
      return res.json({ success: true, message: "Analysis record removed from your history." });
    }
    const userId = req.user._id ? req.user._id.toString() : req.user.id;
    const { id } = req.params;

    if (getIsConnected()) {
      const record = await Analysis.findOne({ _id: id, user: userId });
      if (!record) {
        return res.status(404).json({
          success: false,
          message: "Record not found or you do not have permission to delete it."
        });
      }

      await Analysis.findByIdAndDelete(id);
      return res.json({ success: true, message: "Analysis record removed from your history." });
    } else {
      const idx = (memoryStore.analyses || []).findIndex(
        (a) => a._id === id && a.user && a.user.toString() === userId
      );

      if (idx === -1) {
        return res.status(404).json({
          success: false,
          message: "Record not found or you do not have permission to delete it."
        });
      }

      memoryStore.analyses.splice(idx, 1);
      return res.json({ success: true, message: "Analysis record removed from your history." });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/user/history
 * Clear all analysis history for the authenticated user
 */
router.delete("/history", async (req, res, next) => {
  try {
    if (!req.user) {
      return res.json({
        success: true,
        message: "Successfully cleared 0 analysis records from your history."
      });
    }
    const userId = req.user._id ? req.user._id.toString() : req.user.id;

    if (getIsConnected()) {
      const result = await Analysis.deleteMany({ user: userId });
      return res.json({
        success: true,
        message: `Successfully cleared ${result.deletedCount} analysis records from your history.`
      });
    } else {
      const initialLength = memoryStore.analyses.length;
      memoryStore.analyses = memoryStore.analyses.filter(
        (a) => !a.user || a.user.toString() !== userId
      );
      const deletedCount = initialLength - memoryStore.analyses.length;
      return res.json({
        success: true,
        message: `Successfully cleared ${deletedCount} analysis records from your history.`
      });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/user/saved-songs
 * Retrieves user's saved favorite songs
 */
router.get("/saved-songs", async (req, res, next) => {
  try {
    if (!req.user) {
      return res.json({ success: true, songs: [] });
    }
    const userId = req.user._id ? req.user._id.toString() : req.user.id;

    if (getIsConnected()) {
      const user = await User.findById(userId).select("savedSongs").lean();
      const songs = user?.savedSongs ? user.savedSongs.reverse() : [];
      return res.json({ success: true, songs });
    } else {
      const user = memoryStore.users.find(
        (u) => (u._id && u._id.toString() === userId) || (u.id && u.id.toString() === userId)
      );
      const songs = user?.savedSongs ? [...user.savedSongs].reverse() : [];
      return res.json({ success: true, songs });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/user/saved-songs
 * Bookmark a favorite song with metadata and deduplication
 */
router.post("/saved-songs", async (req, res, next) => {
  try {
    const { title, artist, album, mood, confidence, coverArtUrl, spotifyUrl, youtubeUrl, lyrics } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: "Song title is required." });
    }

    const cleanTitle = title.trim();
    const cleanArtist = artist ? artist.trim() : "Unknown Artist";
    const cleanMood = mood || "Happy";

    const songEntry = {
      title: cleanTitle,
      artist: cleanArtist,
      album: album ? album.trim() : "",
      mood: cleanMood,
      confidence: Number(confidence) || 85,
      coverArtUrl: coverArtUrl || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80",
      spotifyUrl: spotifyUrl || `https://open.spotify.com/search/${encodeURIComponent(cleanTitle + " " + cleanArtist)}`,
      youtubeUrl: youtubeUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanTitle + " " + cleanArtist + " official audio")}`,
      lyrics: lyrics ? lyrics.trim() : "",
      savedAt: new Date()
    };

    if (!req.user) {
      return res.status(201).json({
        success: true,
        message: `Saved "${cleanTitle}" to your favorites.`,
        song: {
          _id: "guest-song-" + Date.now(),
          ...songEntry
        }
      });
    }

    const userId = req.user._id ? req.user._id.toString() : req.user.id;

    if (getIsConnected()) {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found." });
      }

      if (!user.savedSongs) {
        user.savedSongs = [];
      }

      // Deduplication check: title + artist
      const exists = user.savedSongs.some(
        (s) =>
          s.title.toLowerCase() === cleanTitle.toLowerCase() &&
          s.artist.toLowerCase() === cleanArtist.toLowerCase()
      );

      if (exists) {
        return res.status(409).json({
          success: false,
          message: `"${cleanTitle}" by ${cleanArtist} is already saved in your library.`
        });
      }

      user.savedSongs.push(songEntry);
      await user.save();

      return res.status(201).json({
        success: true,
        message: `Saved "${cleanTitle}" to your favorites.`,
        song: user.savedSongs[user.savedSongs.length - 1]
      });
    } else {
      const user = memoryStore.users.find(
        (u) => (u._id && u._id.toString() === userId) || (u.id && u.id.toString() === userId)
      );
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found." });
      }

      if (!user.savedSongs) {
        user.savedSongs = [];
      }

      const exists = user.savedSongs.some(
        (s) =>
          s.title.toLowerCase() === cleanTitle.toLowerCase() &&
          s.artist.toLowerCase() === cleanArtist.toLowerCase()
      );

      if (exists) {
        return res.status(409).json({
          success: false,
          message: `"${cleanTitle}" by ${cleanArtist} is already saved in your library.`
        });
      }

      const created = {
        _id: "song-" + Date.now(),
        ...songEntry
      };
      user.savedSongs.push(created);

      return res.status(201).json({
        success: true,
        message: `Saved "${cleanTitle}" to your favorites.`,
        song: created
      });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/user/saved-songs/:id
 * Remove a favorite song from saved songs
 */
router.delete("/saved-songs/:id", async (req, res, next) => {
  try {
    if (!req.user) {
      return res.json({ success: true, message: "Song removed from your saved library." });
    }
    const userId = req.user._id ? req.user._id.toString() : req.user.id;
    const { id } = req.params;

    if (getIsConnected()) {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found." });
      }

      const initialLength = user.savedSongs.length;
      user.savedSongs = user.savedSongs.filter((s) => s._id.toString() !== id);

      if (user.savedSongs.length === initialLength) {
        return res.status(404).json({ success: false, message: "Saved song not found." });
      }

      await user.save();
      return res.json({ success: true, message: "Song removed from your saved library." });
    } else {
      const user = memoryStore.users.find(
        (u) => (u._id && u._id.toString() === userId) || (u.id && u.id.toString() === userId)
      );
      if (!user || !user.savedSongs) {
        return res.status(404).json({ success: false, message: "Saved song not found." });
      }

      const initialLength = user.savedSongs.length;
      user.savedSongs = user.savedSongs.filter((s) => s._id !== id);

      if (user.savedSongs.length === initialLength) {
        return res.status(404).json({ success: false, message: "Saved song not found." });
      }

      return res.json({ success: true, message: "Song removed from your saved library." });
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;

