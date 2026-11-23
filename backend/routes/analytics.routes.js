const express = require("express");
const analyticsService = require("../services/analyticsService");
const { optionalJWT, authenticateJWT, requireAdmin } = require("../middleware/auth.middleware");
const { getIsConnected, memoryStore } = require("../db");
const Analysis = require("../models/Analysis");
const User = require("../models/User");

const router = express.Router();

/**
 * GET /api/analytics/admin
 * Protected administrative analytics endpoint requiring admin role.
 * Returns system health, platform telemetry, registered user counts, and database status
 * without exposing sensitive user information.
 */
router.get("/admin", authenticateJWT, requireAdmin, async (req, res, next) => {
  try {
    const isConnected = getIsConnected();
    let totalAnalyses = 0;
    let totalUsers = 0;
    let emotionCounts = {};
    let recentSystemAnalyses = [];

    if (isConnected) {
      totalAnalyses = await Analysis.countDocuments();
      totalUsers = await User.countDocuments();
      const counts = await Analysis.aggregate([
        { $group: { _id: "$mood", count: { $sum: 1 } } }
      ]);
      counts.forEach((c) => {
        if (c._id) emotionCounts[c._id] = c.count;
      });
      recentSystemAnalyses = await Analysis.find({})
        .sort({ createdAt: -1 })
        .limit(10)
        .select("title artist mood confidence language createdAt")
        .lean();
    } else {
      totalAnalyses = memoryStore.analyses.length;
      totalUsers = memoryStore.users.length;
      memoryStore.analyses.forEach((a) => {
        emotionCounts[a.mood] = (emotionCounts[a.mood] || 0) + 1;
      });
      recentSystemAnalyses = memoryStore.analyses
        .slice(-10)
        .reverse()
        .map((a) => ({
          title: a.title,
          artist: a.artist,
          mood: a.mood,
          confidence: a.confidence,
          language: a.language,
          createdAt: a.createdAt || new Date().toISOString()
        }));
    }

    return res.json({
      success: true,
      data: {
        database: {
          connected: isConnected,
          provider: isConnected ? "MongoDB Atlas / Active Database" : "In-Memory Store (Resilient Fallback)"
        },
        metrics: {
          totalAnalyses,
          totalRegisteredUsers: totalUsers,
          emotionBreakdown: emotionCounts
        },
        system: {
          uptimeSeconds: Math.floor(process.uptime()),
          nodeVersion: process.version,
          platform: process.platform,
          memoryMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
        },
        recentActivity: recentSystemAnalyses
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics
 * Retrieve aggregated mood analytics, charts, trends, and confidence metrics.
 * Public for guests (scope=community); requires authentication for personal history (scope=mine).
 */
router.get("/", optionalJWT, async (req, res, next) => {
  try {
    const {
      scope,
      timeframe = "all",
      startDate,
      endDate,
      mood = "All",
      artist = "All"
    } = req.query;

    // Security check: Guests cannot access personal analytics
    if (scope === "mine" && !req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required to access personal analytics."
      });
    }

    const resolvedScope = scope === "mine" && req.user
      ? "mine"
      : "community";

    // Strictly enforce JWT authenticated user ID - never accept client-supplied userId
    const userId = req.user ? req.user._id : null;

    const data = await analyticsService.getAnalytics({
      scope: resolvedScope,
      userId,
      timeframe,
      startDate,
      endDate,
      mood,
      artist
    });

    return res.json(data);
  } catch (error) {
    next(error);
  }
});

module.exports = router;

