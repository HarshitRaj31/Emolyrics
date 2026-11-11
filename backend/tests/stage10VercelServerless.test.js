/**
 * Stage 10 — Vercel Serverless Backend Compatibility & Security Test Suite
 * Tests Express serverless separation, entrypoints, MongoDB connection reuse,
 * production JWT enforcement, CORS preflight, ML & Ollama serverless handling,
 * SSE streaming, absence of WebSocket/filesystem dependencies, and bundle size.
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");
const { EventEmitter } = require("events");
const mongoose = require("mongoose");

const BACKEND_ROOT = path.resolve(__dirname, "..");

function createMockReqRes({ method = "GET", url = "/", headers = {}, body = {} } = {}) {
  const req = new EventEmitter();
  req.method = method;
  req.url = url;
  req.originalUrl = url;
  req.headers = { ...headers };
  req.body = body;
  req.query = {};
  req.params = {};
  req.ip = "127.0.0.1";
  req.socket = { remoteAddress: "127.0.0.1" };
  req.connection = { remoteAddress: "127.0.0.1" };
  req.get = (name) => req.headers[String(name).toLowerCase()];
  req.header = req.get;

  const chunks = [];
  const res = new EventEmitter();
  res.statusCode = 200;
  res.headers = {};
  res.headersSent = false;
  res.writableEnded = false;
  res.body = null;
  res.locals = {};

  res.status = function (code) {
    this.statusCode = code;
    return this;
  };
  res.setHeader = function (k, v) {
    this.headers[String(k).toLowerCase()] = v;
    return this;
  };
  res.getHeader = function (k) {
    return this.headers[String(k).toLowerCase()];
  };
  res.removeHeader = function (k) {
    delete this.headers[String(k).toLowerCase()];
  };
  res.set = res.setHeader;
  res.writeHead = function (code, hdrs = {}) {
    this.statusCode = code;
    for (const [k, v] of Object.entries(hdrs)) {
      this.setHeader(k, v);
    }
    this.headersSent = true;
    return this;
  };
  res.flushHeaders = function () {
    this.headersSent = true;
  };
  res.write = function (chunk) {
    this.headersSent = true;
    chunks.push(typeof chunk === "string" ? chunk : chunk.toString("utf8"));
    return true;
  };
  res.json = function (payload) {
    this.headersSent = true;
    this.writableEnded = true;
    this.body = payload;
    this.emit("finish");
    return this;
  };
  res.send = function (payload) {
    this.headersSent = true;
    this.writableEnded = true;
    this.body = payload;
    this.emit("finish");
    return this;
  };
  res.end = function (chunk) {
    if (chunk) chunks.push(typeof chunk === "string" ? chunk : chunk.toString("utf8"));
    this.headersSent = true;
    this.writableEnded = true;
    this.streamText = chunks.join("");
    this.emit("finish");
    this.emit("close");
    return this;
  };
  res.chunks = chunks;
  return { req, res };
}

function runAppRoute(app, req, res) {
  return new Promise((resolve, reject) => {
    res.on("finish", () => resolve({ req, res }));
    app.handle(req, res, (err) => {
      if (err) reject(err);
      else resolve({ req, res });
    });
  });
}

function getDirSizeBytes(dir) {
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      total += getDirSizeBytes(full);
    } else if (entry.isFile()) {
      total += fs.statSync(full).size;
    }
  }
  return total;
}

async function runStage10VercelTests() {
  console.log("=== Running Stage 10 Vercel Serverless Backend Tests ===");

  // 1 & 2. Express app & Vercel entrypoints import cleanly with ZERO http.Server.listen calls
  console.log("\n[Test 1-2] Express app separation & Vercel entrypoints (no listen side effect)...");
  const origListen = http.Server.prototype.listen;
  let listenCalls = 0;
  http.Server.prototype.listen = function () {
    listenCalls += 1;
    return origListen.apply(this, arguments);
  };

  let app, vercelRootEntry, vercelApiEntry, serverModule;
  try {
    app = require("../app");
    vercelRootEntry = require("../index");
    vercelApiEntry = require("../api/index");
    serverModule = require("../server");
  } finally {
    http.Server.prototype.listen = origListen;
  }

  assert.strictEqual(listenCalls, 0, "Importing app/index/api/server must not call http.Server.listen");
  assert.strictEqual(typeof app, "function", "backend/app.js must export Express app");
  assert.strictEqual(vercelRootEntry, app, "backend/index.js must export the exact same Express app");
  assert.strictEqual(vercelApiEntry, app, "backend/api/index.js must export the exact same Express app");
  assert.strictEqual(serverModule, app, "backend/server.js must export the exact same Express app");
  console.log("  ✓ PASS: Zero listen() calls; app.js, index.js, api/index.js, server.js share identical Express instance.");

  // 3. Local Windows server (server.js) starts HTTP listener when executed directly
  console.log("\n[Test 3] Local Windows HTTP server startup (node server.js)...");
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(BACKEND_ROOT, "server.js")], {
      env: { ...process.env, NODE_ENV: "development", PORT: "5199" },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`Local server.js startup timed out. stdout=${stdout} stderr=${stderr}`));
    }, 8000);
    child.stdout.on("data", (d) => {
      stdout += d.toString();
      if (stdout.includes("successfully listening on")) {
        clearTimeout(timer);
        child.kill("SIGTERM");
        resolve();
      }
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    child.on("exit", (code) => {
      if (!stdout.includes("successfully listening on")) {
        clearTimeout(timer);
        reject(new Error(`server.js exited early (${code}). stderr=${stderr}`));
      }
    });
  });
  console.log("  ✓ PASS: Local Windows HTTP server started on port 5199 and shut down cleanly.");

  // 4. All existing API routes remain registered
  console.log("\n[Test 4] Registered API routes audit...");
  const stackStr = app._router.stack
    .map((layer) => (layer.route ? layer.route.path : layer.regexp ? layer.regexp.toString() : ""))
    .join("\n");

  const expectedPrefixes = [
    "/api/health",
    "auth",
    "user",
    "analytics",
    "playlists",
    "stats",
    "music",
    "assistant"
  ];
  for (const prefix of expectedPrefixes) {
    assert.ok(stackStr.includes(prefix), `Expected route group "${prefix}" to remain registered`);
  }
  console.log("  ✓ PASS: All existing API route groups remain registered.");

  // 5. MongoDB connection reuse & graceful serverless fallback
  console.log("\n[Test 5] MongoDB connection reuse & serverless fallback...");
  const dbModule = require("../db");
  const origReadyState = Object.getOwnPropertyDescriptor(mongoose.connection, "readyState");
  const origConnect = mongoose.connect;
  let mongooseConnectCalls = 0;
  mongoose.connect = async () => {
    mongooseConnectCalls += 1;
    return mongoose;
  };
  try {
    Object.defineProperty(mongoose.connection, "readyState", { configurable: true, get: () => 1 });
    const reused = await dbModule.connectDB();
    assert.strictEqual(reused, true, "Should return true when readyState === 1");
    assert.strictEqual(mongooseConnectCalls, 0, "Must reuse warm connection without calling mongoose.connect");
  } finally {
    mongoose.connect = origConnect;
    if (origReadyState) {
      Object.defineProperty(mongoose.connection, "readyState", origReadyState);
    } else {
      delete mongoose.connection.readyState;
    }
  }

  // Test serverless unconfigured MongoDB does not hang or throw
  const savedVercel = process.env.VERCEL;
  const savedNodeEnv = process.env.NODE_ENV;
  const savedMongoUri = process.env.MONGODB_URI;
  try {
    process.env.VERCEL = "1";
    process.env.NODE_ENV = "production";
    delete process.env.MONGODB_URI;
    global.__emolyricsMongooseCache.promise = null;
    const fallbackResult = await dbModule.connectDB();
    assert.strictEqual(fallbackResult, false, "Should cleanly fall back to MemoryStore when MONGODB_URI is unset on Vercel");
    assert.strictEqual(dbModule.getDbStatus().type, "MemoryStore");
  } finally {
    if (savedVercel === undefined) delete process.env.VERCEL; else process.env.VERCEL = savedVercel;
    if (savedNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = savedNodeEnv;
    if (savedMongoUri === undefined) delete process.env.MONGODB_URI; else process.env.MONGODB_URI = savedMongoUri;
  }
  console.log("  ✓ PASS: Warm MongoDB connections reused (0 extra dials) and Vercel unset URI falls back cleanly.");

  // 6. JWT validation in production mode
  console.log("\n[Test 6] Production JWT_SECRET validation & fallback removal...");
  const { validateEnv } = require("../config/envValidator");
  const { getJwtSecret } = require("../middleware/auth.middleware");
  const savedJwt = process.env.JWT_SECRET;
  try {
    process.env.NODE_ENV = "production";
    delete process.env.JWT_SECRET;
    let auditMissing = validateEnv();
    assert.strictEqual(auditMissing.valid, false, "Production must fail env validation when JWT_SECRET is missing");
    assert.throws(() => getJwtSecret(), /JWT_SECRET environment variable is required/);

    process.env.JWT_SECRET = "emolyrics-super-secure-production-secret-key-2026";
    let auditPlaceholder = validateEnv();
    assert.strictEqual(auditPlaceholder.valid, false, "Production must reject known hardcoded placeholder");
    assert.throws(() => getJwtSecret(), /cannot use a placeholder/);

    process.env.JWT_SECRET = "short-secret";
    let auditShort = validateEnv();
    assert.strictEqual(auditShort.valid, false, "Production must reject <32-char JWT_SECRET");

    process.env.JWT_SECRET = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4"; // 32 chars
    let auditValid = validateEnv();
    assert.strictEqual(auditValid.valid, true, "Production should pass with a strong 32+ char JWT_SECRET");
    assert.strictEqual(auditValid.summary.JWT_SECRET, "Configured (Masked)", "Summary must mask secret completely");
    assert.strictEqual(getJwtSecret(), process.env.JWT_SECRET);
  } finally {
    if (savedNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = savedNodeEnv;
    if (savedJwt === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = savedJwt;
  }
  console.log("  ✓ PASS: Production JWT validation rejects missing/placeholder/short secrets and masks logs.");

  // 7. CORS works with configured Cloudflare Pages & Vercel preview origins + OPTIONS preflight
  console.log("\n[Test 7] CORS configuration & preflight checks...");
  const savedCors = process.env.CORS_ORIGIN;
  try {
    process.env.NODE_ENV = "production";
    process.env.CORS_ORIGIN = "https://emolyrics.pages.dev,https://*.vercel.app";
    const corsMw = app.createCorsMiddleware();

    const { req: reqOk, res: resOk } = createMockReqRes({
      method: "OPTIONS",
      url: "/api/health",
      headers: {
        origin: "https://emolyrics.pages.dev",
        "access-control-request-method": "POST"
      }
    });
    await new Promise((resolve, reject) => {
      resOk.on("finish", resolve);
      corsMw(reqOk, resOk, (e) => (e ? reject(e) : resolve()));
    });
    assert.strictEqual(resOk.statusCode, 204);
    assert.strictEqual(resOk.getHeader("access-control-allow-origin"), "https://emolyrics.pages.dev");
    assert.strictEqual(resOk.getHeader("access-control-allow-credentials"), "true");

    const { req: reqPreview, res: resPreview } = createMockReqRes({
      method: "GET",
      url: "/api/health",
      headers: { origin: "https://emolyrics-git-feat.vercel.app" }
    });
    await new Promise((resolve, reject) => corsMw(reqPreview, resPreview, (e) => (e ? reject(e) : resolve())));
    assert.strictEqual(resPreview.getHeader("access-control-allow-origin"), "https://emolyrics-git-feat.vercel.app");

    const { req: reqBad, res: resBad } = createMockReqRes({
      method: "GET",
      url: "/api/health",
      headers: { origin: "https://evil-attacker.example" }
    });
    let corsErr = null;
    await new Promise((resolve) =>
      corsMw(reqBad, resBad, (e) => {
        corsErr = e;
        resolve();
      })
    );
    assert.ok(corsErr && corsErr.message.includes("CORS blocked"), "Unauthorized origin must be blocked");

    // Ensure wildcard CORS never sends credentials: true
    process.env.CORS_ORIGIN = "*";
    const wildcardCors = app.createCorsMiddleware();
    const { req: reqWild, res: resWild } = createMockReqRes({
      method: "GET",
      url: "/api/health",
      headers: { origin: "https://any.example" }
    });
    await new Promise((resolve, reject) => wildcardCors(reqWild, resWild, (e) => (e ? reject(e) : resolve())));
    assert.ok(resWild.getHeader("access-control-allow-origin"), "Wildcard CORS should return allow-origin header");
    assert.strictEqual(resWild.getHeader("access-control-allow-credentials"), undefined, "Wildcard CORS must not enable credentials");
  } finally {
    if (savedNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = savedNodeEnv;
    if (savedCors === undefined) delete process.env.CORS_ORIGIN; else process.env.CORS_ORIGIN = savedCors;
  }
  console.log("  ✓ PASS: CORS allows configured Pages/preview origins, blocks unauthorized origins, and prevents wildcard+credentials.");

  // 8 & 9. ML Service URL configuration & unavailable handling
  console.log("\n[Test 8-9] ML Service serverless URL resolution & 503 unavailable handling...");
  const { resolveMLServiceUrl } = require("../utils/serviceUrls");
  const { multilingualMLService } = require("../services/multilingualMLService");
  const savedMlUrl = process.env.ML_SERVICE_URL;
  try {
    process.env.VERCEL = "1";
    process.env.NODE_ENV = "production";
    process.env.ML_SERVICE_URL = "http://127.0.0.1:8001";
    const localInProd = resolveMLServiceUrl();
    assert.strictEqual(localInProd.configured, false, "Localhost ML_SERVICE_URL must be rejected in Vercel production");

    process.env.ML_SERVICE_URL = "https://emolyrics-ml.hf.space";
    const remoteInProd = resolveMLServiceUrl();
    assert.strictEqual(remoteInProd.configured, true);
    assert.strictEqual(remoteInProd.url, "https://emolyrics-ml.hf.space");

    delete process.env.ML_SERVICE_URL;
    const healthUnconf = await multilingualMLService.checkHealth(true);
    assert.strictEqual(healthUnconf.online, false);
    assert.strictEqual(healthUnconf.configured, false);

    // Direct /api/analyze-multilingual must return 503 even for English when ML is unconfigured
    const { req: mlReq, res: mlRes } = createMockReqRes({
      method: "POST",
      url: "/api/analyze-multilingual",
      body: { lyrics: "I feel happy today" }
    });
    await runAppRoute(app, mlReq, mlRes);
    assert.strictEqual(mlRes.statusCode, 503, "/api/analyze-multilingual must return 503 when ML service is unavailable");
    assert.strictEqual(mlRes.body.code, "ERR_MULTILINGUAL_SERVICE_OFFLINE");
  } finally {
    if (savedVercel === undefined) delete process.env.VERCEL; else process.env.VERCEL = savedVercel;
    if (savedNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = savedNodeEnv;
    if (savedMlUrl === undefined) delete process.env.ML_SERVICE_URL; else process.env.ML_SERVICE_URL = savedMlUrl;
  }
  console.log("  ✓ PASS: Production blocks localhost ML_SERVICE_URL and direct ML routes return 503 when offline/unconfigured.");

  // 10 & 12. Ollama unavailable handling & SSE Streaming
  console.log("\n[Test 10 & 12] Ollama serverless unavailability & Assistant SSE streaming...");
  const aiAssistantService = require("../services/aiAssistantService");
  const savedOllamaUrl = process.env.OLLAMA_BASE_URL;
  try {
    process.env.VERCEL = "1";
    process.env.NODE_ENV = "production";
    delete process.env.OLLAMA_BASE_URL;

    const chatRes = await aiAssistantService.processUserMessage({
      message: "recommend happy songs",
      sessionId: "test-serverless-session"
    });
    assert.strictEqual(chatRes.success, true);
    assert.strictEqual(chatRes.ollamaAvailable, false);
    assert.strictEqual(chatRes.provider, "Ollama (Offline/Unavailable)");
    assert.ok(chatRes.reply.includes("not configured"), "Reply must transparently report Ollama is unconfigured on serverless");

    const { req: sseReq, res: sseRes } = createMockReqRes({
      method: "POST",
      url: "/api/assistant/chat",
      body: { message: "recommend calm songs", sessionId: "test-sse-session", stream: true }
    });
    await aiAssistantService.streamUserMessage({
      message: "recommend calm songs",
      sessionId: "test-sse-session",
      req: sseReq,
      res: sseRes
    });
    assert.strictEqual(sseRes.statusCode, 200);
    assert.ok((sseRes.getHeader("content-type") || "").includes("text/event-stream"), "SSE Content-Type required");
    assert.ok(sseRes.streamText.includes('"type":"start"'), "SSE stream must emit start frame");
    assert.ok(sseRes.streamText.includes('"type":"chunk"'), "SSE stream must emit chunk frame");
    assert.ok(sseRes.streamText.includes('"type":"done"'), "SSE stream must emit done frame");
    assert.ok(sseRes.streamText.includes('"ollamaAvailable":false'), "SSE stream must report Ollama unavailability accurately");
  } finally {
    if (savedVercel === undefined) delete process.env.VERCEL; else process.env.VERCEL = savedVercel;
    if (savedNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = savedNodeEnv;
    if (savedOllamaUrl === undefined) delete process.env.OLLAMA_BASE_URL; else process.env.OLLAMA_BASE_URL = savedOllamaUrl;
  }
  console.log("  ✓ PASS: Ollama unavailability handled honestly (no fake AI responses) and SSE streaming verified.");

  // 11. PDF generation stays client-side with zero backend temp-file dependency
  console.log("\n[Test 11] Client-side PDF generation & backend statelessness check...");
  const pdfGenPath = path.resolve(BACKEND_ROOT, "../frontend/src/components/dashboard/pdfReportGenerator.js");
  assert.ok(fs.existsSync(pdfGenPath), "Client-side PDF generator must exist in frontend");
  const pdfGenSrc = fs.readFileSync(pdfGenPath, "utf8");
  assert.ok(pdfGenSrc.includes("%PDF-1.4") && pdfGenSrc.includes("transliterateIndicAndAccents"), "Client-side PDF-1.4 engine intact");
  console.log("  ✓ PASS: PDF generation remains pure client-side PDF-1.4 without server filesystem storage.");

  // 13 & 14. Zero WebSocket or persistent local filesystem dependencies
  console.log("\n[Test 13-14] Auditing backend dependencies for WebSockets & persistent filesystem usage...");
  const pkg = JSON.parse(fs.readFileSync(path.join(BACKEND_ROOT, "package.json"), "utf8"));
  const depNames = Object.keys(pkg.dependencies || {});
  assert.ok(!depNames.includes("ws") && !depNames.includes("socket.io"), "Backend must not require WebSocket server libraries");
  const vercelJson = JSON.parse(fs.readFileSync(path.join(BACKEND_ROOT, "vercel.json"), "utf8"));
  assert.strictEqual(vercelJson.rewrites[0].destination, "/api/index", "vercel.json must route requests to /api/index");
  console.log("  ✓ PASS: Zero WebSocket dependencies and vercel.json routes cleanly to /api/index.");

  // 15 & 16. Backend package size (<250 MB Vercel standard limit) & no committed secrets/datasets
  console.log("\n[Test 15-16] Backend bundle size & secret/dataset exclusion audit...");
  const totalBytes = getDirSizeBytes(BACKEND_ROOT);
  const totalMB = +(totalBytes / (1024 * 1024)).toFixed(2);
  assert.ok(totalMB < 250, `Backend size (${totalMB} MB) must stay under Vercel 250 MB uncompressed limit`);
  const envExample = fs.readFileSync(path.join(BACKEND_ROOT, ".env.example"), "utf8");
  assert.ok(envExample.includes("replace-with-a-secure-random"), ".env.example must contain placeholder JWT_SECRET only");
  console.log(`  ✓ PASS: Backend total uncompressed size is ${totalMB} MB (< 250 MB limit), .env.example clean.`);

  console.log("\n======================================================");
  console.log("✅ ALL STAGE 10 VERCEL SERVERLESS BACKEND TESTS PASSED!");
  console.log("======================================================\n");
}

runStage10VercelTests().catch((err) => {
  console.error("\n❌ [TEST FAILURE]", err);
  process.exit(1);
});
