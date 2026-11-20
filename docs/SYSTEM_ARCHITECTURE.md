# 🎵 EmoLyrics — Complete System Architecture & Pipeline Specification

> **Official Project Architecture Document**  
> **Repository:** [https://github.com/HarshitRaj31/Emolyrics](https://github.com/HarshitRaj31/Emolyrics)  
> **Version:** `v1.2.0-production-calibrated`  
> **Target Audience:** Technical Evaluation, Presentation Defense & Architectural Reference  

---

## 🏛️ Executive Summary

**EmoLyrics** is a high-performance, multilingual music sentiment intelligence platform. It processes song lyrics across five major languages (**English, Hindi, Bengali, Spanish, French**) and transliterated code-switched scripts (**Hinglish, Banglish**), predicting lyrical sentiment across **10 fine-grained canonical emotion categories** using a calibrated deep learning pipeline.

The architecture strictly adheres to a **6-stage pipeline (01–06)** that bridges user input to calibrated neural emotion classification and interactive musical intelligence without distortion from automated machine translation.

---

## 🧭 Six-Stage Architecture Flowchart

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 01. USER INPUT                                         │
│  - User submits lyrics or searches MusicBrainz / LRCLIB open metadata                  │
│  - Supported languages: en, hi, bn, es, fr + Hinglish / Banglish code-switching        │
│  - React 19 + Vite SPA collects input, manages state & user preferences                │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │  Raw Lyrics & Language Hint
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              02. TEXT PREPROCESSING                                    │
│  - Unicode Normalization (NBSP / zero-width space removal)                             │
│  - Poetic Character Elongation Compression (e.g., "happpyyy" -> "happyy")              │
│  - Script Identification & Lexicon Breakdown (Devanagari, Bengali, Latin)              │
│  - Code-Switching Detection without destructive machine translation                    │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │  Clean Normalized Text
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              03. FEATURE EXTRACTION                                    │
│  - Multilingual Transformer: sentence-transformers/paraphrase-multilingual-MiniLM-L12   │
│  - Subword tokenization & Transformer encoder forward pass                             │
│  - Mean Pooling over token representations with L2 Normalization                       │
│  - Yields 384-dimensional dense semantic embedding vectors: x ∈ ℝ³⁸⁴                  │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │  384-d Dense Semantic Vector
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                          04. MACHINE LEARNING PROCESSING                               │
│  - PyTorch Neural MLP Classifier (NeuralEmotionClassifier)                             │
│  - Architecture: LayerNorm(384) -> Linear(256) -> LayerNorm -> ReLU -> Dropout(0.3)    │
│                  -> Linear(128) -> LayerNorm -> ReLU -> Dropout(0.3) -> Linear(10)     │
│  - Thread-Safe LRU Prediction Cache for sub-millisecond repeat queries                 │
│  - Computes raw logit vector: z = [z₁, z₂, ..., z₁₀] ∈ ℝ¹⁰                             │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │  Raw Emotion Logits
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              05. MOOD CLASSIFICATION                                   │
│  - Temperature-Scaled Softmax Calibration: p_i = exp(z_i / T) / Σ exp(z_j / T)         │
│  - Empirically Calibrated Temperature: T = 1.0295 (ECE reduced to 0.0538, -12.38%)     │
│  - Predicts confidence across 10 Canonical Categories:                                 │
│    1. Happiness  2. Sadness    3. Love        4. Anger      5. Nostalgia               │
│    6. Fear       7. Excitement 8. Hope        9. Loneliness 10. Calmness               │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │  Calibrated Probabilities & Emotion Metrics
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   06. OUTPUT                                           │
│  - Primary Emotion showcase & holographic confidence gauge                             │
│  - Secondary emotion cues & 10-class interactive SVG distribution donut                │
│  - Line-by-line lyrics emotional journey timeline & section mood breakdown             │
│  - Personalized music recommendations with instant Spotify & YouTube links             │
│  - Client-side vector PDF-1.4 report generation (zero server render load)              │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔬 In-Depth Stage Specifications (01–06)

### Stage 01: User Input
* **Purpose:** Collect raw song lyrics and optional metadata while respecting language diversity.
* **Component:** `frontend/src/pages/AnalyzerPage.jsx`, `frontend/src/components/SongDiscovery.jsx`.
* **Workflow:**
  1. User enters lyrics manually into the studio workbench or searches tracks via integrated open metadata services (**MusicBrainz API** and **LRCLIB API**).
  2. User selects an explicit language (`en`, `hi`, `bn`, `es`, `fr`, or `auto`).
  3. Frontend validates character limits (up to 5,000 characters per analysis run) and dispatches an HTTP POST request to `/api/lyrics/analyze-advanced`.

### Stage 02: Text Preprocessing
* **Purpose:** Clean and normalize poetic text without stripping emotional nuance or distorting non-English vocabulary through machine translation.
* **Component:** `ml-services/src/code_switch.py`, `backend/nlp/multilingualPreprocessor.js`.
* **Workflow:**
  1. **Character Sanitization:** Strips zero-width spaces (`\u200b`) and non-breaking spaces (`\xa0`).
  2. **Elongation Compression:** Normalizes poetic character elongations using regex `(.)\1{2,}` $\to$ `\1\1` (e.g., *"happpyyy"* $\to$ *"happyy"*, *"pyaaaar"* $\to$ *"pyaar"*). This preserves words with double vowels like *"feel"* or *"too"* while preventing out-of-vocabulary tokenization explosions.
  3. **Script & Code-Switching Identification:**
     - Evaluates native Unicode blocks: Devanagari (`\u0900`–`\u097F`) for Hindi, Bengali (`\u0980`–`\u09FF`) for Bengali, and Latin accented characters (`[áéíóúñ...]` / `[éèêëàâ...]`) for Spanish/French.
     - Detects transliterated code-switching (**Hinglish**, **Banglish**) using specialized bilingual lexicons.

### Stage 03: Feature Extraction
* **Purpose:** Convert preprocessed multilingual text into dense, semantically rich continuous vectors.
* **Component:** `ml-services/src/predict.py`, `ml-services/src/embedding_manager.py`.
* **Specification:**
  - **Base Model:** `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`
  - **Embedding Dimension:** $d = 384$
  - **Pooling Strategy:** Mean pooling across non-padding token contextual vectors followed by $L_2$ normalization:
    $$\mathbf{e} = \frac{\sum_{i=1}^{L} \mathbf{h}_i \cdot m_i}{\sum_{i=1}^{L} m_i}, \quad \mathbf{x} = \frac{\mathbf{e}}{\|\mathbf{e}\|_2}$$
    where $\mathbf{h}_i$ represents token hidden states, $m_i \in \{0, 1\}$ is the attention mask, and $\mathbf{x} \in \mathbb{R}^{384}$.
  - **Runtime Execution:** Supports dual backends:
    - **PyTorch FP32:** Native PyTorch CPU execution.
    - **ONNX Runtime INT8:** Quantized inference (`encoder_int8.onnx`) fitting within Render Free's 512 MB memory threshold ($<460\text{ MB}$ peak RSS).

### Stage 04: Machine Learning Processing
* **Purpose:** Process the 384-dimensional dense semantic vectors through a specialized trained classification head.
* **Component:** `ml-services/src/model.py` (`NeuralEmotionClassifier`).
* **Topology:**
  $$\mathbf{h}_1 = \text{Dropout}_{0.3}\Big(\text{ReLU}\big(\text{LayerNorm}_{256}(\mathbf{W}_1 \text{LayerNorm}_{384}(\mathbf{x}) + \mathbf{b}_1)\big)\Big)$$
  $$\mathbf{h}_2 = \text{Dropout}_{0.3}\Big(\text{ReLU}\big(\text{LayerNorm}_{128}(\mathbf{W}_2 \mathbf{h}_1 + \mathbf{b}_2)\big)\Big)$$
  $$\mathbf{z} = \mathbf{W}_3 \mathbf{h}_2 + \mathbf{b}_3, \quad \mathbf{z} \in \mathbb{R}^{10}$$
* **Mathematical Constraints:**
  - $\mathbf{W}_1 \in \mathbb{R}^{256 \times 384}, \mathbf{b}_1 \in \mathbb{R}^{256}$
  - $\mathbf{W}_2 \in \mathbb{R}^{128 \times 256}, \mathbf{b}_2 \in \mathbb{R}^{128}$
  - $\mathbf{W}_3 \in \mathbb{R}^{10 \times 128}, \mathbf{b}_3 \in \mathbb{R}^{10}$
  - Zero data leakage verified across 3,290 canonical records (Train: 2,321, Val: 485, Test: 484).
  - Thread-safe LRU caching: Stores hashes of `(language, text)` with eviction size 1,000 for $<1.0\text{ ms}$ response times on repeated lyrics.

### Stage 05: Mood Classification
* **Purpose:** Convert raw logits into trustworthy, well-calibrated posterior emotion probabilities across the 10 target classes.
* **Component:** `ml-services/src/calibration.py`, `ml-services/models/model_metadata.json`.
* **Formulation:**
  $$P(Y = c_i \mid \mathbf{x}) = \frac{\exp(z_i / T)}{\sum_{j=1}^{10} \exp(z_j / T)}, \quad i \in \{1, \dots, 10\}$$
  where $T = 1.0295$ is the empirical temperature parameter obtained via negative log-likelihood minimization on validation splits.
* **Expected Calibration Error (ECE):**
  - Raw ECE: $0.0614$
  - Calibrated ECE: **$0.0538$** ($-12.38\%$ calibration error reduction)
* **The 10 Emotion Categories:**
  1. ☀️ **Happiness** (Joy, cheerful, dance, celebration)
  2. 🌧️ **Sadness** (Melancholy, grief, heartbreak)
  3. 💖 **Love** (Romance, tender affection, devotion)
  4. 🔥 **Anger** (Fiery rage, hostile defiance, resentment)
  5. 🕰️ **Nostalgia** (Bittersweet retrospection, wistful longing)
  6. 🌑 **Fear** (Tense anxiety, dread, panic)
  7. ⚡ **Excitement** (Adrenaline, exuberance, party energy)
  8. 🕊️ **Hope** (Optimism, faith, uplifting solidarity)
  9. 🥀 **Loneliness** (Isolation, solitude, alienation)
  10. 🌿 **Calmness** (Serenity, peaceful chill, tranquility)

### Stage 06: Output & Delivery
* **Purpose:** Render comprehensive, actionable music intelligence to the client.
* **Components:**
  - `frontend/src/components/dashboard/EmotionDashboard.jsx` (Primary & secondary emotion showcases)
  - `frontend/src/components/dashboard/EmotionDonutChart.jsx` (10-class interactive SVG distribution)
  - `frontend/src/components/analysis/AdvancedMoodAnalysis.jsx` (Line-by-line sentiment timeline & section analysis)
  - `frontend/src/components/MoodRecommendations.jsx` (Curated track recommendations with Spotify & YouTube deep links)
  - `frontend/src/components/dashboard/PdfDownloadButton.jsx` (Pure client-side binary PDF-1.4 report generator)

---

## 💻 Full Software Architecture Stack

| Subsystem | Core Technology | Role & Responsibilities |
|---|---|---|
| **Frontend SPA** | React 19, Vite 8, Tailwind CSS, Framer Motion | User interface, real-time audio visualization, responsive theme toggling (Dark/Light), interactive charts |
| **API Gateway** | Node.js 20+, Express 4 | Reverse proxy `/api`, rate limiting, security headers (CSP, HSTS), orchestrator for ML and database services |
| **Database** | MongoDB Atlas, Mongoose ODM | Persistent user authentication, custom playlists, analysis history, saved track libraries |
| **ML Microservice** | Python 3.11+, FastAPI, Uvicorn | High-throughput CPU inference, code-switch audit, embedding generation, calibrated classification |
| **Feature Extraction** | Hugging Face SentenceTransformers | `paraphrase-multilingual-MiniLM-L12-v2` dense 384-d semantic encoding |
| **Classifier Head** | PyTorch 2.2+ (CPU) | Custom `NeuralEmotionClassifier` (384 $\to$ 256 $\to$ 128 $\to$ 10) |
| **Optional LLM** | Ollama (`qwen2.5:3b`) | Qualitative narrative lyrics interpretation with instant fallback to deterministic lexical engine if offline |
| **PDF Reporting** | Custom Pure JS PDF-1.4 Engine | In-browser client-side PDF document synthesis (0 server load, 0 headless browser dependencies) |

---

## 🛡️ Strict Architectural Constraints Maintained

1. **Zero Replacement of ML Model:** The system preserves the original trained PyTorch model and weights (`multilingual_classifier.pt`). It is not replaced with Naive Bayes, TF-IDF, or recurrent networks.
2. **Preserved Multilingual Integrity:** Zero machine translation to English is enforced for non-English lyrics. Embeddings are extracted directly from native script representations.
3. **No Paid APIs:** All core capabilities operate on free, open-source technologies (MusicBrainz, LRCLIB, Hugging Face, PyTorch, MongoDB Atlas Free Tier).
4. **Stable Backend Endpoints:** All existing API contracts (`/api/lyrics/analyze-advanced`, `/api/recommendations`, `/api/playlists`, `/api/auth`) remain unchanged.

---

*Authored by the EmoLyrics Research & Engineering Team (Larana, Inc.)*  
*Contributors: Chandrima Chawdhury (Lead), Harshit Raj (ML & Features), Sristi Priya (Frontend), Dibyendu Khamaru (Datasets), Tribeni Ghorai (Architecture & Integration)*
