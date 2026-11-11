# 🎵 EmoLyrics — Multilingual Song Lyrics Emotion Classification & Music Intelligence Platform

> **Larana, Inc. & EmoLyrics Research Team**  
> An advanced NLP and deep learning sentiment analysis platform that classifies song lyrics across 10 fine-grained emotions in 5 languages (English, Hindi, Bengali, Spanish, French) and code-switched scripts (Hinglish, Banglish) with calibrated confidence metrics, emotional journey timelines, smart recommendations, client-side PDF reporting, and optional local AI assistant.

---

## 🌟 Key Highlights & Production Benchmarks

* **Multilingual Neural Model (`v1.2.0-production-calibrated`)**:
  - Base: `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` + Calibrated PyTorch Neural MLP Head.
  - Languages Supported: **English (`en`)**, **Hindi (`hi`)** [Devanagari + Hinglish], **Bengali (`bn`)** [Bengali script + Banglish], **Spanish (`es`)**, **French (`fr`)**.
  - **Zero Data Leakage**: Mathematically verified 0 text overlap across 3,290 canonical records (Train: 2,321 | Val: 485 | Test: 484).
  - **Calibrated Expected Calibration Error (ECE)**: `0.0538` (-12.38% error reduction at $T = 1.0295$).
  - **Macro F1**: `0.4071` (+6.96% improvement over baseline) | **Weighted F1**: `0.4240` | **Accuracy**: `42.56%`.
  - **Sub-Millisecond Repeat Inferences**: In-memory LRU prediction cache delivering $< 1.0\text{ms}$ responses.
* **10 Canonical Emotion Categories**:
  1. ☀️ **Happiness** (Joy, cheerful, fun, dance, euphoric)
  2. 🌧️ **Sadness** (Melancholy, grief, poignant, heartbreak)
  3. 💖 **Love** (Romance, sweet affection, devotion)
  4. 🔥 **Anger** (Aggressive, fiery rage, hostile defiance)
  5. 🕰️ **Nostalgia** (Bittersweet retrospection, wistful longing)
  6. ⚡ **Excitement** (Exuberance, adrenaline, party energy)
  7. 🌿 **Calmness** (Serenity, peaceful chill, tranquility)
  8. 🕊️ **Hope** (Optimism, uplifting solidarity, faith)
  9. 🌑 **Fear** (Tense anxiety, dread, terror, panic)
  10. 🥀 **Loneliness** (Isolation, abandonment, solitude)
* **Client-Side PDF Report Generation**: Pure JavaScript PDF-1.4 binary engine generating formatted reports in-browser without server rendering load or headless browsers.
* **Optional Ollama Local AI (`qwen2.5:3b`)**: Provides qualitative interpretation with automatic, instant fallback to deterministic NLP if Ollama is uninstalled or offline.

---

## 🏗️ Production Microservice Architecture

```
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
```

---

## 🛠️ Tech Stack & Requirements

| Tier | Technologies | Hardware Profile |
|---|---|---|
| **Frontend** | React 19, Vite 8, Tailwind CSS, Framer Motion, Lucide React, Nginx Alpine | Lightweight static bundle (~650 KB gzip) |
| **Backend** | Node.js 20+, Express 4, Mongoose, JWT, Express Rate Limit | $\sim 150\text{ MB}$ RSS |
| **ML Microservice** | Python 3.11+, PyTorch 2.2+ (CPU), SentenceTransformers, FastAPI, Uvicorn | $\sim 1.08\text{ GB}$ RSS, 2-4 CPU threads |
| **Database** | MongoDB 7.0 (with automatic in-memory store fallback) | $\sim 100\text{ MB}$ RSS |
| **LLM (Optional)** | Ollama with `qwen2.5:3b` | 4-8 GB RAM (if enabled) |

---

## 🚀 Local Development Setup (Without Docker)

### Prerequisites
- Node.js `v20+` or `v22+`
- Python `3.10+` or `3.11+` or `3.12+` or `3.13+`
- Windows PowerShell or macOS/Linux Terminal

### 1. Python ML Microservice Setup
```powershell
cd ml-services

# Create virtual environment (optional but recommended)
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install CPU PyTorch and dependencies
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt

# Run microservice (runs on http://127.0.0.1:8001)
python -m src.api
```

### 2. Node.js Backend Setup
Open a second terminal:
```powershell
cd backend

# Install dependencies
npm install

# Copy environment template if not present
Copy-Item .env.example .env

# Run backend API (runs on http://localhost:5000)
npm run dev
```

### 3. Frontend Setup
Open a third terminal:
```powershell
cd frontend

# Install dependencies
npm install

# Run Vite development server (runs on http://localhost:3000, proxies /api to :5000)
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🐳 Docker Deployment Setup

EmoLyrics provides production-grade containerization with multi-stage builds, non-root security profiles, and automatic health checks.

### 1. Configure Environment
```powershell
# Copy the master docker compose environment template
Copy-Item .env.example .env
```

### 2. Start Services with Docker Compose
```powershell
# Launch Frontend, Backend, ML Microservice, and MongoDB
docker compose up --build -d
```

### 3. Verify Container Health
```powershell
docker compose ps
```
All containers (`emolyrics-frontend`, `emolyrics-backend`, `emolyrics-ml-services`, `emolyrics-mongo`) will report `healthy`.

Access the application:
- **Frontend App**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:5000/api/health](http://localhost:5000/api/health)
- **ML Service**: [http://localhost:8001/health](http://localhost:8001/health)

### 4. Optional: Run Containerized Ollama
To include a containerized Ollama LLM instance:
```powershell
docker compose --profile with-ollama up -d
docker compose exec ollama ollama pull qwen2.5:3b
```

---

## 🔒 Production Security Hardening

1. **Content Security Policy (CSP)**: Strict `default-src 'self'` policy preventing unauthorized external script injection.
2. **Reverse Proxy & Client IP Trust**: `app.set("trust proxy", 1)` accurately calculates client rate limits behind load balancers.
3. **NoSQL Operator Sanitization**: Rejects queries with Mongo `$` operators and dot notation.
4. **Input Boundary Enforcement**: Lyrics payloads $> 30,000$ characters rejected by backend; ML service caps individual inference queries to $5,000$ characters.
5. **No Secret or Stack Trace Leakage**: In `NODE_ENV=production`, stack traces and internal file paths are masked; client errors return clean error codes (`BAD_REQUEST`, `NOT_FOUND`, `INTERNAL_ERROR`).
6. **Privacy-Preserving Logging**: Request logs track response times, HTTP statuses, and Request IDs without outputting copyrighted lyrics or sensitive credentials.

---

## 🧪 Testing & Verification

### Running All Automated Tests Locally:

```powershell
# 1. Run Backend Unit & Integration Tests
cd backend
npm test

# 2. Run Python ML Service Production Readiness Test Suite (10 Checks)
cd ../ml-services
python tests/test_stage7_production.py

# 3. Verify Frontend Production Build & Linter
cd ../frontend
npm run lint
npm run build
```

---

## 🔄 CI/CD Pipeline (GitHub Actions)

Continuous Integration is automated via [`.github/workflows/ci.yml`](file:///.github/workflows/ci.yml):

* **Job 1 (Frontend)**: Runs `npm ci`, `npm run lint` (oxlint), and `npm run build` on `ubuntu-latest`.
* **Job 2 (Backend)**: Runs `npm ci` and `npm test` verifying section analysis, journeys, and error middleware.
* **Job 3 (ML Services)**: Sets up Python 3.11, installs CPU PyTorch, and runs `test_stage7_production.py` (verifying 0 data leakage, metadata safety, LRU caching, and API consistency without re-downloading training corpora).

---

## 🌐 Production Hosting Recommendations & Cost Estimates

| Hosting Tier | Recommended Providers | Setup Architecture | Estimated Monthly Cost | Hardware Specifications |
|---|---|---|---|---|
| **Option A (Recommended): Single VPS / Cloud VM** | Hetzner Cloud (CX32 / CPX31), DigitalOcean Droplet, AWS Lightsail | Run `docker compose up -d` on Linux VM. Nginx container serves frontend and proxies backend. | **$12 – $24 / month** | 4 vCPU, 8 GB RAM, 80 GB SSD (Comfortably hosts ML, Backend, Mongo, and Ollama) |
| **Option B: Split PaaS Deployment** | Frontend: Vercel / Cloudflare Pages<br/>Backend: Render / Railway<br/>ML: Render / Railway<br/>DB: MongoDB Atlas | Static SPA on Vercel (Free).<br/>Node API on Render ($7/mo).<br/>Python ML on Render ($15/mo for 2GB RAM container).<br/>MongoDB Atlas M0 (Free). | **$22 / month** | 2 GB RAM allocated to Python ML container |
| **Option C: Serverless with NLP Fallback** | Frontend: Netlify<br/>Backend: AWS Lambda / Render<br/>Ollama: Offline NLP fallback | Run backend on serverless or basic container. When ML service is offline, English lexical fallback runs at $0 extra cost. | **$7 / month** | Low-cost entry tier |

---

## 👥 Research & Engineering Team

* **Chandrima Chawdhury** (359) — Team Lead & Research Architect
* **Harshit Raj** (403) — Model Training & Feature Extraction
* **Sristi Priya** (399) — Frontend UI/UX & Interaction Design
* **Dibyendu Khamaru** (412) — Dataset Curation & Benchmark Evaluation
* **Tribeni Ghorai** (455) — System Architecture & Integration

---

## 📚 References & Datasets
- **MIREX Dataset**: [Kaggle MIREX Lyrics Emotion Corpus](https://www.kaggle.com/datasets/saikatdatta2000/mirex-dataset)
- **GoEmotions**: [Google Research GoEmotions Corpus](https://github.com/google-research/google-research/tree/master/goemotions)
- **BEmoC**: [Avishek Das et al., Bengali Emotion Corpus](https://github.com/avishek-018/BEmoC-Bengali-Emotion-Courpus)
- **XED**: [Helsinki-NLP Multilingual Emotion Dataset](https://github.com/Helsinki-NLP/XED)
- **Official Repository**: [GitHub - Chandrima2507/SONG_LYRICS_EMOTION_CLASSIFICATION07](https://github.com/Chandrima2507/SONG_LYRICS_EMOTION_CLASSIFICATION07)
