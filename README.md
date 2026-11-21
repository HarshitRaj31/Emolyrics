🎵 EmoLyrics — Multilingual Song Lyrics Emotion Classification & Music Intelligence Platform

Larana, Inc. & EmoLyrics Research Team An NLP and deep learning platform that classifies song lyrics across 10 fine-grained emotions in 5 languages (English, Hindi, Bengali, Spanish, French) and code-switched scripts (Hinglish, Banglish), with calibrated confidence scores, emotional journey timelines, smart recommendations, client-side PDF reports, and an optional local AI assistant.

<!-- TODO: Add a hero screenshot or demo GIF here. This is the single biggest boost to first impressions. --> <!-- ![EmoLyrics demo](docs/images/demo.gif) -->

Show Image

📑 Table of Contents
Key Highlights
Results & Limitations
Architecture
Tech Stack
Local Setup
Docker Deployment
API Example
Security
Testing
CI/CD
Hosting & Costs
Privacy & Copyright
Team
Datasets & Licenses
License
🌟 Key Highlights & Production Benchmarks
Multilingual Neural Model (v1.2.0-production-calibrated)
Base: sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2 + calibrated PyTorch MLP head.
Languages: English (en), Hindi (hi) [Devanagari + Hinglish], Bengali (bn) [Bengali script + Banglish], Spanish (es), French (fr).
Zero data leakage: verified 0 text overlap across 3,290 canonical records (Train: 2,321 | Val: 485 | Test: 484).
Expected Calibration Error (ECE): 0.0538 (−12.38% vs. uncalibrated, temperature $T = 1.0295$).
Macro F1: 0.4071 (+6.96% over baseline) | Weighted F1: 0.4240 | Accuracy: 42.56%.
Fast repeat inference: in-memory LRU prediction cache returns repeat requests in $< 1\text{ ms}$.
10 Canonical Emotion Categories
☀️ Happiness — joy, cheerful, fun, dance, euphoric
🌧️ Sadness — melancholy, grief, poignant, heartbreak
💖 Love — romance, sweet affection, devotion
🔥 Anger — aggressive, fiery rage, hostile defiance
🕰️ Nostalgia — bittersweet retrospection, wistful longing
⚡ Excitement — exuberance, adrenaline, party energy
🌿 Calmness — serenity, peaceful chill, tranquility
🕊️ Hope — optimism, uplifting solidarity, faith
🌑 Fear — tense anxiety, dread, terror, panic
🥀 Loneliness — isolation, abandonment, solitude
Client-side PDF reports: a pure-JavaScript PDF-1.4 engine generates reports in the browser, with no server rendering load or headless browser.
Optional local AI (Ollama qwen2.5:3b): qualitative interpretation, with automatic fallback to deterministic NLP if Ollama is not installed or is offline.
📊 Results & Limitations
Metric	Value
Accuracy (10 classes)	42.56%
Macro F1	0.4071
Weighted F1	0.4240
ECE (calibrated)	0.0538
Random-guess baseline (10 classes)	~10%
<!-- TODO: Add a per-class F1 table and a confusion matrix image, e.g. docs/images/confusion_matrix.png -->

How to read these numbers. Lyrics emotion classification is a hard, subjective task, and the scores should be interpreted with that in mind:

Subjective labels: the same lyric can reasonably carry several emotions (e.g. nostalgia vs. sadness vs. loneliness), so single-label ground truth caps achievable accuracy.
Mixed-source corpus: training data is assembled from several public corpora (see Datasets) that were not originally built for song lyrics.
Code-switched text: Hinglish and Banglish have no standard spelling, which makes them harder than script-native text.
Calibration over raw accuracy: the model is tuned so its confidence scores are trustworthy (low ECE), so a low-confidence prediction should be treated as uncertain rather than as a firm label.

Results are reported on a held-out test split (484 records) with verified zero overlap with training data.

🏗️ Production Microservice Architecture
                                  ┌────────────────────────┐
                                  │   Browser / Client     │
                                  └───────────┬────────────┘
                                              │ HTTP :3000 / :80
                                              ▼
                        ┌──────────────────────────────────────────┐
                        │      Frontend (React + Vite + Nginx)     │
                        │    SPA with dynamic /api reverse proxy   │
                        └─────────────────────┬────────────────────┘
                                              │ HTTP :5000 /api
                                              ▼
                        ┌──────────────────────────────────────────┐
                        │       Backend (Node.js + Express)        │
                        │  - Security Headers (CSP, HSTS, XSS)     │
                        │  - Request ID Tracing & Rate Limiting    │
                        │  - Strict Non-English Fallback Policy    │
                        └──────────┬──────────────────┬────────────┘
                                   │                  │
         HTTP :8001 /predict       │                  │ HTTP :11434 /api/chat
    ┌──────────────────────────────┘                  └──────────────────────────────┐
    ▼                                                                                ▼
┌──────────────────────────────────────────┐                       ┌──────────────────────────────────────────┐
│   ML Microservice (FastAPI + PyTorch)    │                       │     Ollama LLM Service (Optional)        │
│  - Paraphrase-MiniLM-L12-v2              │                       │  - Model: qwen2.5:3b                     │
│  - Calibrated MLP (v1.2.0, T = 1.0295)   │                       │  - Qualitative explanations              │
│  - In-Memory LRU Prediction Cache        │                       │  - Automatic NLP fallback if offline     │
│  - CPU Thread Capped (torch_threads=4)   │                       └──────────────────────────────────────────┘
└──────────────────────────────────────────┘
🛠️ Tech Stack & Requirements
Tier	Technologies	Hardware Profile
Frontend	React 19, Vite 8, Tailwind CSS, Framer Motion, Lucide React, Nginx Alpine	Lightweight static bundle (~650 KB gzip)
Backend	Node.js 20+, Express 4, Mongoose, JWT, Express Rate Limit	~150 MB RSS
ML Microservice	Python 3.10+ (CI tests on 3.11), PyTorch 2.2+ (CPU), SentenceTransformers, FastAPI, Uvicorn	~1.1 GB RSS, 2–4 CPU threads
Database	MongoDB 7.0 (automatic in-memory store fallback)	~100 MB RSS
LLM (Optional)	Ollama with qwen2.5:3b	4–8 GB RAM (if enabled)
🚀 Local Development Setup (Without Docker)
Prerequisites
Node.js v20+
Python 3.10+ (CI runs on 3.11)
Windows PowerShell, or a macOS/Linux terminal
1. Python ML Microservice
powershell
cd ml-services

# Create a virtual environment (optional but recommended)
python -m venv .venv
.\.venv\Scripts\Activate.ps1      # macOS/Linux: source .venv/bin/activate

# Install CPU PyTorch and dependencies
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt

# Run the microservice (http://127.0.0.1:8001)
python -m src.api
2. Node.js Backend

In a second terminal:

powershell
cd backend
npm install

# Copy the environment template if not present
Copy-Item .env.example .env       # macOS/Linux: cp .env.example .env

# Run the backend API (http://localhost:5000)
npm run dev
3. Frontend

In a third terminal:

powershell
cd frontend
npm install

# Run the Vite dev server (http://localhost:3000, proxies /api to :5000)
npm run dev

Open http://localhost:3000 in your browser.

🐳 Docker Deployment Setup

EmoLyrics ships with multi-stage builds, non-root security profiles, and automatic health checks.

1. Configure Environment
powershell
Copy-Item .env.example .env       # macOS/Linux: cp .env.example .env
2. Start Services
powershell
docker compose up --build -d
3. Verify Container Health
powershell
docker compose ps

All containers (emolyrics-frontend, emolyrics-backend, emolyrics-ml-services, emolyrics-mongo) should report healthy.

Frontend App: http://localhost:3000
Backend API: http://localhost:5000/api/health
ML Service: http://localhost:8001/health
4. Optional: Containerized Ollama
powershell
docker compose --profile with-ollama up -d
docker compose exec ollama ollama pull qwen2.5:3b
🔌 API Example

Note: the request and response below are illustrative. Adjust field names to match your actual /predict schema before publishing.

Request

bash
curl -X POST http://localhost:8001/predict \
  -H "Content-Type: application/json" \
  -d '{"text": "Tum hi ho, ab tum hi ho, zindagi ab tum hi ho"}'

Response

json
{
  "language": "hi",
  "emotion": "love",
  "confidence": 0.71,
  "probabilities": {
    "love": 0.71,
    "hope": 0.09,
    "sadness": 0.07,
    "...": "..."
  },
  "model_version": "v1.2.0-production-calibrated",
  "cached": false
}

Health checks: GET /api/health (backend) and GET /health (ML service).

🔒 Production Security Hardening
Content Security Policy (CSP): strict default-src 'self' policy blocks unauthorized external scripts.
Reverse proxy & client IP trust: app.set("trust proxy", 1) keeps rate limiting accurate behind load balancers.
NoSQL operator sanitization: rejects queries containing Mongo $ operators and dot notation.
Input boundary enforcement: lyrics payloads over 30,000 characters are rejected by the backend; the ML service caps each inference query at 5,000 characters.
No secret or stack-trace leakage: with NODE_ENV=production, stack traces and file paths are masked; clients receive clean codes (BAD_REQUEST, NOT_FOUND, INTERNAL_ERROR).
Privacy-preserving logging: logs record response times, HTTP statuses, and Request IDs, never lyrics or credentials.
🧪 Testing & Verification
powershell
# 1. Backend unit & integration tests
cd backend
npm test

# 2. ML service production-readiness suite (10 checks)
cd ../ml-services
python tests/test_stage7_production.py

# 3. Frontend lint & production build
cd ../frontend
npm run lint
npm run build
🔄 CI/CD Pipeline (GitHub Actions)

Defined in .github/workflows/ci.yml:

Frontend: npm ci, npm run lint (oxlint), npm run build on ubuntu-latest.
Backend: npm ci and npm test, covering section analysis, journeys, and error middleware.
ML Services: Python 3.11, CPU PyTorch, then test_stage7_production.py (verifies 0 data leakage, metadata safety, LRU caching, and API consistency without re-downloading training corpora).
🌐 Production Hosting Recommendations & Cost Estimates
Hosting Tier	Recommended Providers	Setup	Est. Monthly Cost	Hardware
A (Recommended): Single VPS / Cloud VM	Hetzner Cloud (CX32 / CPX31), DigitalOcean Droplet, AWS Lightsail	docker compose up -d on a Linux VM; the Nginx container serves the frontend and proxies the backend.	$12 – $24	4 vCPU, 8 GB RAM, 80 GB SSD (hosts ML, Backend, Mongo, and Ollama)
B: Split PaaS	Frontend: Cloudflare Pages / Vercel
Backend: Vercel Hobby or Render
ML: Hugging Face Spaces / Render
DB: MongoDB Atlas M0	See backend/VERCEL_DEPLOYMENT.md for the Vercel Hobby setup ($0/mo with HF Spaces + Atlas M0), or Render ($15/mo for 2 GB ML).	$0 – $22	Separate Python ML service (~1.1 GB RSS)
C: Serverless with NLP fallback	Frontend: Netlify
Backend: AWS Lambda / Render
Ollama: offline NLP fallback	Backend on serverless or a basic container. If the ML service is offline, the English lexical fallback runs at no extra cost.	~$7	Low-cost entry tier

Prices are estimates and vary by provider and region; check current pricing before deploying.

🔐 Privacy & Lyrics Handling

Song lyrics are typically copyrighted, so EmoLyrics is designed to avoid retaining them:

Lyrics are supplied by the user at analysis time; the platform does not scrape or bundle lyric catalogs.
Request logs never include lyric text (only timings, statuses, and Request IDs).
The in-memory prediction cache is not persisted to disk and is cleared on restart.
Generated PDF reports are built client-side in the browser and are not uploaded to a server.
Please make sure you have the right to analyze any lyrics you submit.
<!-- TODO: Confirm each point above matches the implementation (especially whether any analysis history is stored in MongoDB), then adjust. -->
👥 Research & Engineering Team
Member	Roll	Role
Chandrima Chawdhury	359	Team Lead & Research Architect
Harshit Raj	403	Model Training & Feature Extraction
Sristi Priya	399	Frontend UI/UX & Interaction Design
Dibyendu Khamaru	412	Dataset Curation & Benchmark Evaluation
Tribeni Ghorai	455	System Architecture & Integration
📚 References, Datasets & Licenses
Dataset	Link	License
MIREX Lyrics Emotion Corpus	Kaggle	TODO: verify on dataset page
GoEmotions (Google Research)	GitHub	TODO: verify on dataset page
BEmoC (Bengali Emotion Corpus)	GitHub	TODO: verify on dataset page
XED (Helsinki-NLP)	GitHub	TODO: verify on dataset page

Base model: sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2.

Official repository: Chandrima2507/SONG_LYRICS_EMOTION_CLASSIFICATION07

📄 License
<!-- TODO: Choose a license (e.g. MIT, Apache-2.0) and add a LICENSE file to the repo root. -->

This project is released under the [LICENSE NAME] license. See LICENSE for details.
