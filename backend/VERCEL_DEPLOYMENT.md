# EmoLyrics Backend — Vercel Hobby (Free) Deployment Guide

This guide documents how to prepare and configure the **EmoLyrics Node.js + Express backend** (`backend/`) for **Vercel Hobby (Free)** while keeping local Windows development intact.

> **Status:** Configuration prepared locally; **not yet deployed** to Vercel. Do not assume live endpoints exist until you deploy and verify `/api/health`.

---

## 1. Serverless Architecture & Entrypoints

The Express application has been separated from the local HTTP listener so Vercel can run it as a serverless function without binding a persistent port:

* `backend/app.js` — Express app initialization, security middleware, CORS, MongoDB connection middleware, and all `/api/*` routes.
* `backend/server.js` — Local Windows/Docker HTTP listener (`app.listen()` guarded by `if (require.main === module)`). Exports `app` for test compatibility.
* `backend/index.js` — Root Vercel Express entrypoint exporting `backend/app.js`.
* `backend/api/index.js` — Function handler at `/api/index` targeted by `backend/vercel.json` rewrites.
* `backend/vercel.json` — Routes all paths (`/(.*)`) to `/api/index` on Vercel Fluid Compute without legacy `builds` overrides.

---

## 2. Vercel Project Settings (Monorepo)

When importing **`HarshitRaj31/Emolyrics`** into Vercel:

1. **Framework Preset:** `Express` (or `Other` — `backend/vercel.json` supports both).
2. **Root Directory:** `backend` *(Critical: prevents deploying `frontend/` as part of the backend project).*
3. **Install Command:** `npm install` (or leave default).
4. **Build Command:** Leave empty / disabled (no build step required for Node.js Express).
5. **Output Directory:** Leave unset.
6. **Node.js Version:** `20.x` (in Project Settings → General → Node.js Version).

---

## 3. Required Environment Variables

Configure these in **Vercel Project Settings → Environment Variables** (never commit `.env` files):

| Variable | Required on Vercel | Recommended Value / Example | Notes |
|---|---|---|---|
| `NODE_ENV` | Yes | `production` | Enables strict `JWT_SECRET` check and masks 500 stack traces. |
| `JWT_SECRET` | **Mandatory** | Generate 64-hex-char secret via:<br>`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | Startup fails in production if unset, placeholder, or `< 32` characters. |
| `MONGODB_URI` | Recommended | `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/emolyrics?retryWrites=true&w=majority` | Must be remotely reachable (e.g., MongoDB Atlas M0 Free). Do **not** use `127.0.0.1`. |
| `CORS_ORIGIN` | **Mandatory** | `https://<your-cloudflare-pages-site>.pages.dev,https://*.vercel.app` | Comma-separated frontend origins. Never pair `*` with credentials. |
| `ML_SERVICE_URL` | Required for ML | `https://<your-separate-ml-service-url>` | URL of your separately hosted Python FastAPI ML microservice. Must not be localhost. |
| `ML_HEALTH_TIMEOUT_MS` | Optional | `4000` | Health probe timeout in ms. |
| `ML_REQUEST_TIMEOUT_MS` | Optional | `15000` | Single-prediction timeout in ms. |
| `ML_LINES_TIMEOUT_MS` | Optional | `25000` | Batched line-by-line prediction timeout in ms. |
| `OLLAMA_BASE_URL` | Optional | Leave **unset** unless pointing to an authenticated remote Ollama host | Localhost `127.0.0.1:11434` is unreachable from Vercel; omitted = instant fallback + explicit offline status. |
| `OLLAMA_MODEL` | Optional | `qwen2.5:3b` | Model identifier used only when a remote `OLLAMA_BASE_URL` is configured. |

---

## 4. MongoDB Setup (Serverless Reuse)

* `backend/db/index.js` caches the active Mongoose connection and coalesces concurrent cold-start connection attempts via `global.__emolyricsMongooseCache`.
* Pool sizing is tuned for free-tier limits (`maxPoolSize: 5`, `minPoolSize: 0`, `serverSelectionTimeoutMS: 5000`).
* If `MONGODB_URI` is omitted or unreachable in serverless production, the backend falls back to `MemoryStore` — **note that `MemoryStore` data is ephemeral and resets across cold starts/instances.** Configure MongoDB Atlas M0 Free for persistence.

---

## 5. ML Service & Ollama Limitations

* **Python ML Service (`ml-services/`):** Not migrated into Vercel Node.js (runtime RSS `~1.14 GB` + `~458 MB` MiniLM model exceeds standard serverless packaging). Deploy `ml-services/` separately (e.g., Hugging Face Spaces Free CPU Basic `16 GB RAM`) and point `ML_SERVICE_URL` to it. If `ML_SERVICE_URL` is unset or offline, `/api/analyze-multilingual`, `/api/analyze-lines`, and non-English requests return HTTP `503` without fabricating neural results.
* **Ollama Assistant:** Vercel cannot reach a user's `127.0.0.1:11434` Ollama instance. When `OLLAMA_BASE_URL` is unset or points to localhost in production/Vercel, the backend skips localhost requests, reports `ollamaAvailable: false` / `"Ollama (Offline/Unavailable)"`, and serves deterministic NLP intent/interpretation fallbacks. Do **not** expose a home/local Ollama port directly without authentication and TLS.

---

## 6. Vercel Hobby Platform Limits & Compatibility

| Vercel Hobby Limit | Backend Status | Notes |
|---|---|---|
| **Memory (2 GB)** | Compatible | Idle Node backend measured at `~77 MB RSS`. |
| **Function Bundle (250 MB uncompressed)** | Compatible | `backend/` total size measured at **`14.04 MB`**. |
| **Max Duration (300s w/ Fluid Compute)** | Compatible | Standard API routes respond in milliseconds; ML & Ollama HTTP calls have explicit `4s–90s` timeouts. |
| **Max Request/Response Payload (4.5 MB)** | Compatible | Express body parser capped at `1 MB`; lyrics capped at `25,000–30,000` chars. |
| **WebSockets** | Not Supported (Unused) | Backend uses REST JSON + HTTP Server-Sent Events (`text/event-stream`), zero `ws`/`socket.io`. |
| **Persistent Local Filesystem** | Not Supported (Unused) | PDF generation runs 100% client-side in browser (`pdfReportGenerator.js`); backend performs zero persistent file writes. |

---

## 7. Local Windows Development Commands

Local development continues to work unchanged:

```powershell
cd backend
Copy-Item .env.example .env
npm install
npm run dev     # or: npm start
npm test        # runs stage5, stage9, and stage10 Vercel compatibility suites
```

