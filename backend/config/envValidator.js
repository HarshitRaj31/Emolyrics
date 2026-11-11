/**
 * Production Environment Configuration & Startup Validator
 * Validates required environment settings without leaking secrets to stdout.
 */

const { isLocalhostUrl, isProductionRuntime, resolveMLServiceUrl } = require("../utils/serviceUrls");

const INSECURE_JWT_PLACEHOLDERS = new Set([
  "emolyrics-super-secure-production-secret-key-2026",
  "replace-with-a-secure-random-32-character-secret-key-in-prod",
  "changeme",
  "secret"
]);

function isInsecureJwtSecret(secret) {
  if (!secret || typeof secret !== "string") return true;
  const trimmed = secret.trim();
  if (!trimmed) return true;
  if (INSECURE_JWT_PLACEHOLDERS.has(trimmed)) return true;
  if (trimmed.toLowerCase().startsWith("replace-with-")) return true;
  return false;
}

function validateEnv() {
  const isProd = isProductionRuntime();
  const isVercel = process.env.VERCEL === "1";
  const warnings = [];
  const errors = [];

  // 1. Port validation (for local/VM HTTP listener)
  const port = parseInt(process.env.PORT, 10);
  if (process.env.PORT && (isNaN(port) || port < 1 || port > 65535)) {
    errors.push(`Invalid PORT "${process.env.PORT}". Must be an integer between 1 and 65535.`);
  }

  // 2. JWT Secret Validation (mandatory in production/Vercel, zero hardcoded fallback)
  const jwtSecret = (process.env.JWT_SECRET || "").trim();
  if (isProd) {
    if (isInsecureJwtSecret(jwtSecret)) {
      errors.push(
        "JWT_SECRET is missing or uses an insecure placeholder in production. Configure a strong random 32+ character secret."
      );
    } else if (jwtSecret.length < 32) {
      errors.push(
        "JWT_SECRET must be at least 32 characters in production for cryptographic strength."
      );
    }
  } else if (!jwtSecret || isInsecureJwtSecret(jwtSecret)) {
    warnings.push(
      "JWT_SECRET is unset or placeholder in development; using an ephemeral per-process development secret."
    );
  } else if (jwtSecret.length < 16) {
    warnings.push("JWT_SECRET is short (< 16 characters). Recommend 32+ characters.");
  }

  // 3. CORS validation
  const corsOrigin = (process.env.CORS_ORIGIN || "").trim();
  if (isProd && (!corsOrigin || corsOrigin === "*")) {
    warnings.push(
      "SECURITY ADVISORY: CORS_ORIGIN is unset or '*' in production. Set explicit frontend origin(s) (e.g., your Cloudflare Pages URL)."
    );
  }

  // 4. MongoDB URI validation
  const mongoUri = (process.env.MONGODB_URI || "").trim();
  if (isProd && (!mongoUri || isLocalhostUrl(mongoUri))) {
    warnings.push(
      "DATABASE ADVISORY: MONGODB_URI is unset or targets localhost in production/serverless. Using non-persistent MemoryStore fallback."
    );
  }

  // 5. ML Service URL validation
  const mlResolution = resolveMLServiceUrl();
  if (process.env.ML_SERVICE_URL && !mlResolution.configured) {
    if (isVercel || isProd) {
      warnings.push(`ML SERVICE ADVISORY: ${mlResolution.reason}`);
    } else {
      errors.push(mlResolution.reason);
    }
  } else if (isProd && !mlResolution.configured) {
    warnings.push(`ML SERVICE ADVISORY: ${mlResolution.reason}`);
  }

  // 6. Masked summary (never expose partial secrets or DB credentials)
  const maskedSummary = {
    NODE_ENV: process.env.NODE_ENV || "development",
    VERCEL: isVercel,
    PORT: process.env.PORT || 5000,
    CORS_ORIGIN: corsOrigin || (isProd ? "Not Set" : "Local Dev Defaults"),
    MONGODB_URI: mongoUri ? "Configured (Masked)" : "Not Set (MemoryStore Fallback)",
    JWT_SECRET: jwtSecret ? "Configured (Masked)" : "Not Set",
    OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL ? "Configured" : isProd ? "Not Set (Disabled)" : "Local Default",
    OLLAMA_MODEL: process.env.OLLAMA_MODEL || "qwen2.5:3b",
    ML_SERVICE_URL: mlResolution.configured ? mlResolution.url : "Not Configured"
  };

  return {
    valid: errors.length === 0,
    isProd,
    isVercel,
    errors,
    warnings,
    summary: maskedSummary
  };
}

module.exports = {
  validateEnv,
  isInsecureJwtSecret
};
