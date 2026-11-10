/**
 * Production Environment Configuration & Startup Validator
 * Validates required environment settings without leaking secrets to stdout.
 */

function validateEnv() {
  const isProd = process.env.NODE_ENV === "production";
  const warnings = [];
  const errors = [];

  // 1. Port validation
  const port = parseInt(process.env.PORT, 10);
  if (process.env.PORT && (isNaN(port) || port < 1 || port > 65535)) {
    errors.push(`Invalid PORT "${process.env.PORT}". Must be an integer between 1 and 65535.`);
  }

  // 2. JWT Secret Validation
  const jwtSecret = process.env.JWT_SECRET;
  const isDefaultSecret =
    !jwtSecret || jwtSecret === "emolyrics-super-secure-production-secret-key-2026";

  if (isProd && isDefaultSecret) {
    warnings.push(
      "SECURITY WARNING: Production is using the default placeholder JWT_SECRET. Set a strong custom random secret in your production environment."
    );
  } else if (jwtSecret && jwtSecret.length < 16) {
    warnings.push("JWT_SECRET is short (< 16 characters). Recommend 32+ characters for cryptographic strength.");
  }

  // 3. CORS validation
  if (isProd && (!process.env.CORS_ORIGIN || process.env.CORS_ORIGIN === "*")) {
    warnings.push(
      "SECURITY ADVISORY: CORS_ORIGIN is set to '*' in production. For strict browser protection, set specific frontend origins."
    );
  }

  // 4. Summarize (Masking secrets)
  const maskedSummary = {
    NODE_ENV: process.env.NODE_ENV || "development",
    PORT: process.env.PORT || 5000,
    CORS_ORIGIN: process.env.CORS_ORIGIN || "*",
    MONGODB_URI: process.env.MONGODB_URI ? "Configured (Safe Masked)" : "Fallback In-Memory Store",
    JWT_SECRET: jwtSecret ? `${jwtSecret.slice(0, 3)}...****` : "Using Default",
    OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
    OLLAMA_MODEL: process.env.OLLAMA_MODEL || "qwen2.5:3b"
  };

  return {
    valid: errors.length === 0,
    isProd,
    errors,
    warnings,
    summary: maskedSummary
  };
}

module.exports = {
  validateEnv
};

