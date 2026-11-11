const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

if (process.env.VERCEL !== "1" && process.env.NODE_ENV !== "test") {
  const envFilePath = path.join(__dirname, ".env");
  if (fs.existsSync(envFilePath)) {
    dotenv.config({ path: envFilePath });
  }
}

const { connectDB, getDbStatus } = require("./db");
const { validateEnv } = require("./config/envValidator");
const { securityHeaders, mongoSanitize, requestLogger } = require("./middleware/security.middleware");
const { apiLimiter } = require("./middleware/rateLimiter");
const { errorHandler, notFoundHandler } = require("./middleware/error.middleware");
const { multilingualMLService } = require("./services/multilingualMLService");
const { isProductionRuntime, resolveOllamaBaseUrl } = require("./utils/serviceUrls");

// Run environment audit on startup (without logging secrets)
const envAudit = validateEnv();
if (envAudit.warnings.length > 0 && process.env.NODE_ENV !== "test") {
  envAudit.warnings.forEach((w) => console.warn(`⚠ [CONFIG] ${w}`));
}
if (!envAudit.valid) {
  const errSummary = envAudit.errors.join(" | ");
  envAudit.errors.forEach((e) => console.error(`❌ [CONFIG ERROR] ${e}`));
  throw new Error(`Invalid backend configuration: ${errSummary}`);
}

// Routes
const authRoutes = require("./routes/auth.routes");
const analysisRoutes = require("./routes/analysis.routes");
const playlistRoutes = require("./routes/playlist.routes");
const statsRoutes = require("./routes/stats.routes");
const musicRoutes = require("./routes/music.routes");
const userRoutes = require("./routes/user.routes");
const analyticsRoutes = require("./routes/analytics.routes");
const assistantRoutes = require("./routes/assistant.routes");

const DEFAULT_LOCAL_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173"
];

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesOriginPattern(origin, pattern) {
  if (pattern === origin) return true;
  if (!pattern.includes("*")) return false;
  // Support safe wildcard subdomains such as https://*.pages.dev or https://*.vercel.app
  const regexStr = "^" + pattern.split("*").map(escapeRegex).join("[^.]+(?:\\.[^.]+)*") + "$";
  return new RegExp(regexStr, "i").test(origin);
}

function createCorsMiddleware() {
  const rawCors = (process.env.CORS_ORIGIN || "").trim();
  const isProd = isProductionRuntime();

  let configuredOrigins;
  if (rawCors) {
    configuredOrigins = rawCors.split(",").map((s) => s.trim()).filter(Boolean);
  } else if (!isProd) {
    configuredOrigins = DEFAULT_LOCAL_ORIGINS;
  } else {
    configuredOrigins = [];
  }

  const allowsWildcard = configuredOrigins.includes("*");

  return cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }
      if (allowsWildcard) {
        return callback(null, true);
      }
      if (configuredOrigins.some((pattern) => matchesOriginPattern(origin, pattern))) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked: Origin "${origin}" is not authorized.`));
    },
    credentials: !allowsWildcard && configuredOrigins.length > 0,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
    optionsSuccessStatus: 204
  });
}

function createApp() {
  const app = express();

  // Trust reverse proxy (Vercel Edge, Cloudflare, Docker, Nginx) for accurate client IP rate limiting
  app.set("trust proxy", 1);

  // Hardening: Disable information disclosure headers
  app.disable("x-powered-by");

  // Apply production security headers
  app.use(securityHeaders);

  // Structured privacy-preserving request logging
  app.use(requestLogger);

  // CORS & Preflight handling
  const corsMiddleware = createCorsMiddleware();
  app.use(corsMiddleware);
  app.options("*", corsMiddleware);

  // Request body limits stay well under Vercel Hobby's 4.5 MB payload cap
  app.use(express.json({ limit: "1mb", strict: false }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));

  // Prevent NoSQL operator injection in body, query, and params
  app.use(mongoSanitize);

  // Rate Limiter on all /api routes
  app.use("/api", apiLimiter);

  // Lazily establish and reuse MongoDB connection across serverless invocations
  app.use("/api", async (req, res, next) => {
    try {
      await connectDB();
    } catch (err) {
      console.error("⚠ [DB] Connection check warning:", err.message);
    }
    next();
  });

  // Comprehensive Production Health Check & Monitoring endpoint
  app.get("/api/health", async (req, res) => {
    const mem = process.memoryUsage();
    const dbStatus = getDbStatus();
    const ollamaResolution = resolveOllamaBaseUrl();

    let mlHealth = null;
    try {
      mlHealth = await multilingualMLService.checkHealth();
    } catch (err) {
      mlHealth = { online: false, configured: false, status: "offline", error: err.message };
    }

    res.json({
      status: "healthy",
      service: "EmoLyrics Production API",
      version: "2.4.0",
      environment: process.env.NODE_ENV || "development",
      serverless: process.env.VERCEL === "1",
      uptimeSeconds: Math.round(process.uptime()),
      database: {
        status: dbStatus.connected ? "connected" : "in-memory-fallback",
        type: dbStatus.type,
        persistent: dbStatus.persistent
      },
      mlService: {
        configured: mlHealth?.configured !== false,
        status: mlHealth?.online ? "online" : mlHealth?.status || "offline",
        url: multilingualMLService.getBaseUrl(),
        modelVersion: mlHealth?.modelVersion || "unknown",
        supportedLanguages: mlHealth?.supportedLanguages || ["en", "hi", "bn", "es", "fr"]
      },
      ollama: {
        configured: ollamaResolution.configured,
        model: process.env.OLLAMA_MODEL || "qwen2.5:3b"
      },
      memory: {
        rssMB: Math.round(mem.rss / 1024 / 1024),
        heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024)
      },
      timestamp: new Date().toISOString()
    });
  });

  // Mount API Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/user", userRoutes);
  app.use("/api/analytics", analyticsRoutes);
  app.use("/api", analysisRoutes);
  app.use("/api/playlists", playlistRoutes);
  app.use("/api/stats", statsRoutes);
  app.use("/api/music", musicRoutes);
  app.use("/api/assistant", assistantRoutes);

  // Serve bundled frontend only for non-Vercel standalone/Docker monolith runs
  const frontendDistPath = path.join(__dirname, "../frontend/dist");
  if (process.env.VERCEL !== "1" && fs.existsSync(frontendDistPath)) {
    app.use(express.static(frontendDistPath));
    app.get("*", (req, res, next) => {
      if (req.originalUrl.startsWith("/api")) {
        return next();
      }
      res.sendFile(path.join(frontendDistPath, "index.html"));
    });
  } else {
    app.get("/", (req, res) => {
      res.json({
        success: true,
        service: "EmoLyrics Production API",
        version: "2.4.0",
        runtime: process.env.VERCEL === "1" ? "vercel-serverless" : "node-express",
        healthEndpoint: "/api/health"
      });
    });
  }

  // 404 & Centralized Error Handler
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

const app = createApp();

module.exports = app;
module.exports.createApp = createApp;
module.exports.createCorsMiddleware = createCorsMiddleware;
