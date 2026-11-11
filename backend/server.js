const mongoose = require("mongoose");
const app = require("./app");
const { connectDB } = require("./db");

const PORT = process.env.PORT || 5000;

// Start Local HTTP Server (never executed during Vercel serverless imports)
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
  startServer().catch((err) => {
    console.error("❌ [STARTUP ERROR]", err.message);
    process.exit(1);
  });
}

module.exports = app;
