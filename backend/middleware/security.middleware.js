/**
 * Production Security & Sanitization Middleware
 * Implements hardened HTTP headers, NoSQL query sanitization, and privacy-preserving request logging.
 */

const crypto = require("crypto");

// 1. Strict Security Headers
function securityHeaders(req, res, next) {
  // Ensure Request ID exists on every request
  const reqId = req.headers["x-request-id"] || `req_${crypto.randomBytes(6).toString("hex")}`;
  req.headers["x-request-id"] = reqId;
  res.setHeader("X-Request-ID", reqId);

  // Prevent MIME sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");
  // Prevent Clickjacking
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  // Enable browser XSS filtering
  res.setHeader("X-XSS-Protection", "1; mode=block");
  // Control referrer info
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  // Restrict browser features
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  // Content Security Policy for SPA
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: blob: https:; " +
    "font-src 'self' data: https:; " +
    "connect-src 'self' http: https: ws: wss:; " +
    "frame-ancestors 'self';"
  );

  // HSTS in production or over HTTPS
  if (process.env.NODE_ENV === "production" || req.secure || req.headers["x-forwarded-proto"] === "https") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }

  next();
}

// 2. Recursive NoSQL Injection & Operator Sanitizer
function sanitizeObject(input) {
  if (!input || typeof input !== "object") return input;

  if (Array.isArray(input)) {
    return input.map(sanitizeObject);
  }

  const clean = {};
  for (const [key, value] of Object.entries(input)) {
    // Drop keys beginning with $ or containing . (MongoDB operator/path injection)
    if (key.startsWith("$") || key.includes(".")) {
      continue;
    }
    clean[key] = typeof value === "object" ? sanitizeObject(value) : value;
  }
  return clean;
}

function mongoSanitize(req, res, next) {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === "object") {
    req.query = sanitizeObject(req.query);
  }
  if (req.params && typeof req.params === "object") {
    req.params = sanitizeObject(req.params);
  }
  next();
}

// 3. Privacy-Preserving Structured Request Logger
function requestLogger(req, res, next) {
  // Skip logging high-frequency static asset fetches
  if (
    req.originalUrl.startsWith("/assets/") ||
    req.originalUrl.endsWith(".ico") ||
    req.originalUrl.endsWith(".png")
  ) {
    return next();
  }

  const start = Date.now();
  const method = req.method;
  const url = req.originalUrl;
  const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "local";

  res.on("finish", () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const statusEmoji = status < 400 ? "✓" : status < 500 ? "⚠" : "❌";
    const reqId = req.headers["x-request-id"] || "-";

    // Only log in non-test or non-silent environments
    if (process.env.NODE_ENV !== "test") {
      console.log(`[HTTP] ${statusEmoji} ${method} ${url} ${status} - ${duration}ms [${ip}] (id: ${reqId})`);
    }
  });

  next();
}

module.exports = {
  securityHeaders,
  mongoSanitize,
  requestLogger
};

