# EmoLyrics — Changelog

All notable changes to the **EmoLyrics** Music Intelligence & Multilingual Emotion Classification Platform will be documented in this file.

The project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.4.0] — 2026-11-11 (Stage 10: Public Production Release)

### Added
- **Multi-Stage Docker Architecture**: Multi-stage `frontend/Dockerfile` with Nginx Alpine, Node.js 20 Alpine `backend/Dockerfile` with non-root execution, CPU-optimized Python 3.11 `ml-services/Dockerfile`, and multi-service `docker-compose.yml`.
- **Automated CI/CD Pipeline**: GitHub Actions workflow (`.github/workflows/ci.yml`) automating parallel checks for frontend lint/build, backend unit/integration tests, and ML production validation on CPU runners.
- **Client-Side PDF Unicode Transliteration**: Implemented `transliterateIndicAndAccents` in `pdfReportGenerator.js` supporting Hindi (Devanagari) and Bengali Unicode text rendering in standard PDF-1.4 Type-1 fonts.
- **Multilingual QA Test Suite**: Added `test_stage9_multilingual_qa.py` validating 5 target languages (`en`, `hi`, `bn`, `es`, `fr`), 4 code-switching varieties, 10 canonical emotions, and edge cases.
- **Unified Master Environment Configurations**: Created `.env.example` across root, backend, frontend, and ml-services.

### Changed
- **Enriched Code-Switching Lexicons**: Expanded `code_switch.py` stopword dictionaries with high-frequency lyric function words, resolving false negatives in Hinglish classification.
- **Hardened AI Assistant Response Composer**: Added defensive fallback normalization in `aiAssistantService.js` protecting against undefined emotion arrays and empty song lists.
- **Server Startup Isolation**: Guarded `startServer()` in `server.js` with `if (require.main === module)` to prevent port collisions during test runner execution.
- **Security & Headers**: Added Content-Security-Policy (CSP), Permissions-Policy, HSTS, trust proxy support, and Request ID propagation.

---

## [2.3.0] — 2026-11-11 (Stage 7 & Stage 8: Production Readiness & Release Engineering)

### Added
- **Zero Data Leakage Verification**: Automated mathematical proof verifying 0 text overlap between 2,321 train, 485 val, and 484 test records.
- **In-Memory LRU Prediction Cache**: 1,000-entry MD5-keyed cache delivering $< 1.0\text{ms}$ repeat query response times ($177\times$ speedup).
- **Safe Boundary Truncation**: Truncates inputs $> 5,000$ characters on ML service and enforces $30,000$ character body ceiling on backend.
- **Model Versioning & Safe Backup**: Registered checkpoint `v1.2.0-production-calibrated`, backed up to `multilingual_classifier.pt.bak`, and created `model_metadata.json`.
- **Runtime Telemetry**: Exposes RSS memory tracking (`psutil`), CPU threads, and cache metrics via `/health`.

---

## [2.2.0] — 2026-11-10 (Stage 6: Accuracy, Code-Switching & Calibration)

### Added
- **Post-Hoc Temperature Calibration**: Learned temperature scaling ($T = 1.0295$) reducing Expected Calibration Error (ECE) from $0.0614$ to $0.0538$ (-12.38% error reduction).
- **Code-Switching Support**: Detects script mixing across Latin, Devanagari, and Bengali scripts (Hinglish, Banglish, Spanglish, Franglish).
- **Uncertainty Quantification Engine**: Detects prediction ambiguity via top-margin separation ($\Delta \le 0.08$) and Shannon entropy thresholds ($H \ge 0.70$).

---

## [2.1.0] — 2026-11-10 (Stage 5: Multilingual Line-by-Line & Section Analysis)

### Added
- **Line-by-Line Emotion Classifier**: Batched CPU inference via `SentenceTransformer.encode(batch_size=32)`.
- **Context Window Smoothing**: Blends line embeddings ($75\%$) with neighboring context ($25\%$) to preserve emotional narrative.
- **Ambiguity & Interjection Damping**: Confidence ceilings ($0.82$) on short filler syllables ($\le 3$ words).
- **Structural Song Section Detection**: Detects `[Verse]`, `[Chorus]`, `[Bridge]`, `[Outro]`, and repeated stanza refrains.
- **Emotional Journey Dynamics**: Computes section dominant emotions, emotional diversity entropy, transitions ($\Delta \ge 20\%$), and overarching narrative trajectories.

---

## [2.0.0] — 2026-11-10 (Stage 3 & Stage 4: Multilingual Model Training & Integration)

### Added
- **Multilingual Neural Model Head**: PyTorch MLP head with residual connections and domain-informed features trained on `paraphrase-multilingual-MiniLM-L12-v2` embeddings.
- **FastAPI ML Microservice**: High-speed inference service on port 8001.
- **Strict Non-English Fallback Policy**: Blocks inaccurate English lexical fallback on non-English lyrics when microservice is offline, returning informative HTTP 503 errors.

---

## [1.0.0] — 2026-11-04 (Initial Release)

### Added
- Core 9-emotion lexical classification platform (English & Hindi).
- MusicBrainz and LRCLIB lyrics discovery integration.
- Emotion Donut Chart and Visualization Dashboard.
- Curated mood playlists and recommendations.
- Local Ollama AI Assistant integration.
