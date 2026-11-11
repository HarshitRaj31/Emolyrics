const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const { connectDB, getIsConnected } = require("./db");
const { validateEnv } = require("./config/envValidator");
const { securityHeaders, mongoSanitize, requestLogger } = require("./middleware/security.middleware");
const { apiLimiter } = require("./middleware/rateLimiter");
const { errorHandler, notFoundHandler } = require("./middleware/error.middleware");

// Run environment audit on startup
const envAudit = validateEnv();
if (envAudit.warnings.length > 0) {
  envAudit.warnings.forEach((w) => console.warn(`⚠ [CONFIG] ${w}`));
}
if (!envAudit.valid) {
  envAudit.errors.forEach((e) => console.error(`❌ [CONFIG ERROR] ${e}`));
  process.exit(1);
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

const app = express();
const PORT = process.env.PORT || 5000;

// Trust reverse proxy (Docker, Nginx, Cloudflare, Heroku/Render) for client IP rate limiting
app.set("trust proxy", 1);

// Hardening: Disable information disclosure headers
app.disable("x-powered-by");

// Apply production security headers
app.use(securityHeaders);

// Structured privacy-preserving request logging
app.use(requestLogger);

// Security & Parsing Middleware
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean)
  : ["*"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked: Origin "${origin}" is not authorized.`));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"]
  })
);
app.use(express.json({ limit: "1mb", strict: false }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Prevent NoSQL operator injection in body, query, and params
app.use(mongoSanitize);

// Rate Limiter on all /api routes
app.use("/api", apiLimiter);

// Comprehensive Production Health Check & Monitoring endpoint
const { multilingualMLService } = require("./services/multilingualMLService");

app.get("/api/health", async (req, res) => {
  const mem = process.memoryUsage();
  let mlHealth = null;
  try {
    mlHealth = await multilingualMLService.checkHealth();
  } catch (err) {
    mlHealth = { online: false, status: "offline", error: err.message };
  }

  res.json({
    status: "healthy",
    service: "EmoLyrics Production API",
    version: "2.4.0",
    environment: process.env.NODE_ENV || "development",
    uptimeSeconds: Math.round(process.uptime()),
    database: {
      status: getIsConnected() ? "connected" : "in-memory-fallback",
      type: getIsConnected() ? "MongoDB" : "MemoryStore"
    },
    mlService: {
      status: mlHealth?.online ? "online" : "offline",
      url: multilingualMLService.getBaseUrl(),
      modelVersion: mlHealth?.modelVersion || "unknown",
      supportedLanguages: mlHealth?.supportedLanguages || ["en", "hi", "bn", "es", "fr"]
    },
    memory: {
      rssMB: Math.round(mem.rss / 1024 / 1024),
      heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024)
    },
    timestamp: new Date().toISOString()
  });
});

// Mount Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api", analysisRoutes);
app.use("/api/playlists", playlistRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/music", musicRoutes);
app.use("/api/assistant", assistantRoutes);

// Static file serving for production build of React frontend
const frontendDistPath = path.join(__dirname, "../frontend/dist");
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get("*", (req, res, next) => {
    if (req.originalUrl.startsWith("/api")) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, "index.html"));
  });
}

// 404 & Centralized Error Handler
app.use(notFoundHandler);
app.use(errorHandler);

// Start Server
async function startServer() {
  await connectDB();
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(` EmoLyrics API Server successfully listening on http://localhost:${PORT}`);
    console.log(` Health check: http://localhost:${PORT}/api/health`);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(
        `\n❌ [ERROR] Port ${PORT} is already in use by another running process.`
      );
      console.error(
        `To free port ${PORT} on Windows PowerShell, run:\n` +
        `  Stop-Process -Id (Get-NetTCPConnection -LocalPort ${PORT}).OwningProcess -Force\n`
      );
      process.exit(1);
    } else {
      console.error("❌ [ERROR] Server startup error:", error);
      process.exit(1);
    }
  });

  // Graceful shutdown handling for container and process managers (PM2 / Docker / K8s)
  const handleShutdown = (signal) => {
    console.log(`\n[SHUTDOWN] Received ${signal}. Gracefully stopping server...`);
    server.close(async () => {
      console.log("[SHUTDOWN] HTTP server connections closed.");
      try {
        const mongoose = require("mongoose");
        if (mongoose.connection.readyState === 1) {
          await mongoose.connection.close(false);
          console.log("[SHUTDOWN] MongoDB connection closed.");
        }
      } catch (e) {
        // ignore
      }
      process.exit(0);
    });

    setTimeout(() => {
      console.error("[SHUTDOWN] Force closing after 8s timeout.");
      process.exit(1);
    }, 8000).unref();
  };

  process.on("SIGTERM", () => handleShutdown("SIGTERM"));
  process.on("SIGINT", () => handleShutdown("SIGINT"));
}

if (require.main === module) {
  startServer();
}

module.exports = app;
