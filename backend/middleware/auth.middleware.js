const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { getIsConnected, memoryStore } = require("../db");
const User = require("../models/User");
const { isInsecureJwtSecret } = require("../config/envValidator");
const { isProductionRuntime } = require("../utils/serviceUrls");

let ephemeralDevSecret = null;
let warnedEphemeral = false;

/**
 * Resolves JWT signing/verification secret without any hardcoded production fallback.
 * - Production / Vercel: requires a valid non-placeholder 32+ char JWT_SECRET env var.
 * - Development / Test: uses ephemeral in-memory random secret if JWT_SECRET is omitted.
 */
function getJwtSecret() {
  const configured = (process.env.JWT_SECRET || "").trim();
  if (configured && !isInsecureJwtSecret(configured)) {
    return configured;
  }

  if (isProductionRuntime()) {
    throw new Error(
      "JWT_SECRET environment variable is required in production and cannot use a placeholder value."
    );
  }

  if (!ephemeralDevSecret) {
    ephemeralDevSecret = crypto.randomBytes(32).toString("hex");
    if (!warnedEphemeral && process.env.NODE_ENV !== "test") {
      warnedEphemeral = true;
      console.warn("⚠ [AUTH] JWT_SECRET not configured; generated ephemeral development secret for this session.");
    }
  }
  return ephemeralDevSecret;
}

async function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authorization token missing or invalid format"
    });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    if (getIsConnected()) {
      const user = await User.findById(decoded.id).select("-password");
      if (!user) {
        return res.status(401).json({ success: false, message: "User no longer exists" });
      }
      req.user = user;
    } else {
      const user = memoryStore.users.find((u) => u._id === decoded.id);
      if (!user) {
        return res.status(401).json({ success: false, message: "User no longer exists" });
      }
      req.user = user;
    }
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Session expired or invalid token. Please log in again."
    });
  }
}

// Optional Auth: if token exists, attach user, otherwise proceed anonymously
async function optionalJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, getJwtSecret());
      if (getIsConnected()) {
        req.user = await User.findById(decoded.id).select("-password");
      } else {
        req.user = memoryStore.users.find((u) => u._id === decoded.id);
      }
    } catch (e) {
      // Ignore token failure for optional endpoints
    }
  }
  next();
}

module.exports = {
  authenticateJWT,
  optionalJWT,
  getJwtSecret
};
