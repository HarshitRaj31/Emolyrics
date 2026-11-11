/**
 * Shared external service URL resolver for local Windows and Vercel serverless environments.
 * Ensures production/Vercel deployments never dial unreachable localhost services.
 */

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1", "host.docker.internal"]);

function isProductionRuntime() {
  return process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
}

function isLocalhostUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return false;
  try {
    const parsed = new URL(rawUrl.trim());
    return LOCAL_HOSTNAMES.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function parsePositiveInt(rawVal, fallback) {
  const n = parseInt(rawVal, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Resolves the Python FastAPI ML microservice URL.
 * - Development/Test: defaults to http://127.0.0.1:8001 if ML_SERVICE_URL is unset.
 * - Production/Vercel: requires a non-localhost HTTP(S) ML_SERVICE_URL.
 */
function resolveMLServiceUrl() {
  const raw = (process.env.ML_SERVICE_URL || "").trim();
  const prod = isProductionRuntime();

  if (!raw) {
    if (prod) {
      return {
        configured: false,
        url: null,
        reason: "ML_SERVICE_URL is not configured for this production/serverless deployment."
      };
    }
    return { configured: true, url: "http://127.0.0.1:8001", reason: null };
  }

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return {
      configured: false,
      url: null,
      reason: "ML_SERVICE_URL is not a valid URL."
    };
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return {
      configured: false,
      url: null,
      reason: "ML_SERVICE_URL must use http: or https: protocol."
    };
  }

  if (prod && isLocalhostUrl(raw)) {
    return {
      configured: false,
      url: null,
      reason: "ML_SERVICE_URL points to a localhost address, which is unreachable from Vercel serverless."
    };
  }

  return {
    configured: true,
    url: raw.replace(/\/$/, ""),
    reason: null
  };
}

/**
 * Resolves the optional Ollama LLM base URL.
 * - Development/Test: defaults to http://127.0.0.1:11434 if unset.
 * - Production/Vercel: requires an explicit non-localhost URL; otherwise marks Ollama offline.
 */
function resolveOllamaBaseUrl() {
  const raw = (process.env.OLLAMA_BASE_URL || "").trim();
  const prod = isProductionRuntime();

  if (!raw) {
    if (prod) {
      return {
        configured: false,
        url: null,
        reason: "OLLAMA_BASE_URL is not configured; local Ollama cannot be reached from Vercel serverless."
      };
    }
    return { configured: true, url: "http://127.0.0.1:11434", reason: null };
  }

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return {
      configured: false,
      url: null,
      reason: "OLLAMA_BASE_URL is not a valid URL."
    };
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return {
      configured: false,
      url: null,
      reason: "OLLAMA_BASE_URL must use http: or https: protocol."
    };
  }

  if (prod && isLocalhostUrl(raw)) {
    return {
      configured: false,
      url: null,
      reason: "OLLAMA_BASE_URL points to localhost, which is unreachable from Vercel serverless."
    };
  }

  return {
    configured: true,
    url: raw.replace(/\/$/, ""),
    reason: null
  };
}

module.exports = {
  isProductionRuntime,
  isLocalhostUrl,
  parsePositiveInt,
  resolveMLServiceUrl,
  resolveOllamaBaseUrl
};

