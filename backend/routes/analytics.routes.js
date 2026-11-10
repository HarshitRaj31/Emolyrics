const express = require("express");
const analyticsService = require("../services/analyticsService");
const { optionalJWT } = require("../middleware/auth.middleware");

const router = express.Router();

/**
 * GET /api/analytics
 * Retrieve aggregated mood analytics, charts, trends, and confidence metrics
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

    const resolvedScope = scope
      ? scope
      : req.user
      ? "mine"
      : "community";

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

