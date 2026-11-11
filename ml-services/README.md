# EmoLyrics ML Services — Multilingual Emotion Model & Pipeline

## 1. Overview
The `ml-services` module provides the machine learning preprocessing, dataset alignment, and model pipelines for **EmoLyrics**.
- **Stage 1**: Established a canonical, leak-free, validated multilingual lyric emotion classification corpus from MIREX and the in-repo benchmark.
- **Stage 2**: Acquired, audited, normalized, and integrated approved multilingual datasets across all 5 target languages (`en`, `hi`, `bn`, `es`, `fr`), enforcing strict domain separation between **Song Lyrics** (Group A) and **General Emotion Text** (Group B).
- **Stage 3**: Trained and evaluated a CPU-optimized multilingual emotion classification model (`sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` + PyTorch MLP head) benchmarked against a balanced Logistic Regression baseline.

---

## 2. Target Taxonomy & Language Coverage

### 2.1 The 10 Canonical Emotion Classes
1. **Happiness** (Joy, cheerful, fun, good-natured)
2. **Sadness** (Melancholy, grief, poignant, brooding, gloom)
3. **Love** (Romance, sweet affection, passionate devotion)
4. **Anger** (Aggressive, fiery rage, hostile resentment)
5. **Nostalgia** (Bittersweet retrospection, wistful longing)
6. **Fear** (Tense anxiety, dread, terror, panic)
7. **Excitement** (Exuberance, boisterous party energy, rousing thrills)
8. **Hope** (Optimism, uplifting solidarity, patriotic inspiration)
9. **Loneliness** (Isolation, abandonment, solitude)
10. **Calmness** (Serenity, peaceful chill, meditative tranquility)

### 2.2 Target Languages (5 Languages + Transliterations)
- **English (`en`)**: Native Latin script
- **Hindi (`hi`)**: Devanagari script (`[\u0900-\u097F]`) and Latin transliterated (*Hinglish*)
- **Bengali (`bn`)**: Bengali script (`[\u0980-\u09FF]`) and Latin transliterated (*Banglish*)
- **Spanish (`es`)**: Latin script with Spanish diacritics (`á, é, í, ó, ú, ñ, ¿, ¡`) & function word signatures
- **French (`fr`)**: Latin script with French diacritics (`é, è, ê, ë, à, â, ç, î, ï, ô, ù, û, ü, œ, æ`) & function word signatures

---

## 3. Domain Separation Architecture

EmoLyrics is fundamentally a **song lyrics emotion classifier**. To guarantee high model precision while benefiting from cross-lingual transfer, datasets are explicitly separated:

### Group A — Song Lyrics (`domain: "lyrics"`)
- **MIREX**: 421 validated tracks (`en`).
- **In-repo Benchmark**: 45 validated tracks across `en`, `hi`, `bn`, `es`, `fr`.
- Preserved at 100% representation (466 samples). Primary target for downstream song lyrics fine-tuning.

### Group B — General Emotion Text (`domain: "social_media"` or `"general_text"`)
- **GoEmotions (Google Research)**: Social media text (Reddit comments, `en`).
- **XED (Helsinki-NLP)**: Conversational dialogue / subtitles (`fr` and `es`).
- **BEmoC (Avishek Das et al.)**: Literature and social discourse (`bn`).
- **Hindi Emotion Corpus**: Everyday sentences (`hi`).
- Balanced via stratified sampling quotas so that supplementary datasets strengthen low-resource languages without swamping the lyrics domain or smaller language groups.

---

## 4. Dataset Source, License & Acquisition Audit

| Dataset | Language | Domain | Raw Records | Source URL | License | Commercial Use | Redistribution | Acquisition Status |
|---|---|---|---|---|---|---|---|---|
| **MIREX** | `en` | `lyrics` | 897 | [Kaggle MIREX](https://www.kaggle.com/datasets/saikatdatta2000/mirex-dataset) | Academic Research | Non-commercial | Restricted | Pre-installed (`raw/mirex/`) |
| **Benchmark** | `en,hi,bn,es,fr` | `lyrics` | 45 | In-repo (`backend/nlp/benchmark/`) | Internal Resource | Permitted | Permitted | In-repo |
| **GoEmotions** | `en` | `social_media` | 5,426 | [Google Research](https://github.com/google-research/google-research/tree/master/goemotions) | **Apache 2.0** | **Permitted** | **Permitted** | Verified Automated Download |
| **XED** | `fr, es` | `general_text` | 18,860 | [Helsinki-NLP](https://github.com/Helsinki-NLP/XED) | **CC-BY 4.0** | **Permitted** | **Permitted** | Verified Automated Download |
| **BEmoC** | `bn` | `general_text` | 7,000 | [avishek-018/BEmoC](https://github.com/avishek-018/BEmoC-Bengali-Emotion-Courpus) | Academic Research | Non-commercial | Academic only | Verified Automated Download |
| **Hindi Corpus** | `hi` | `general_text` | 514 | [kush-2418/Hindi-Emotion](https://github.com/kush-2418/Hindi-Emotion-Analysis-ML) | Academic Open Use | Non-commercial | Permitted | Verified Automated Download |

### Gated Datasets Audit & Manual Instructions
- **IIT Patna EmoInHindi**: Gated behind an institutional Data Sharing Agreement form. Automated downloading is prohibited by license terms. To use manually, request access from IIT Patna AI-NLP-ML group and place files in `ml-services/datasets/raw/iitp_emoinhindi/`.
- **BHAAV (IIIT-Delhi / Zenodo 3457467)**: Zenodo API restricts automated bot downloads (HTTP 403) and authors request directing third parties to their page. Download manually from Zenodo into `ml-services/datasets/raw/bhaav/`.
- **EmoEvalEs (IberLEF 2021)**: Shared task evaluation zip archives (`pendrag/EmoEvalEs`) are password-encrypted for registered participants. If credentials exist, place extracted data into `ml-services/datasets/raw/emoevales/`.

---

## 5. Canonical JSONL Schema

Every record across all processed partitions implements:
```json
{
  "text": "Full text or lyric line...",
  "language": "hi",
  "emotion": "Happiness",
  "source": "hindi_corpus",
  "source_id": "hi_happy_0001",
  "artist": null,
  "title": null,
  "label_original": "happy",
  "domain": "general_text",
  "label_confidence": "high"
}
```

---

## 6. Strict Emotion Mapping Defensibility

Mappings in [`config/emotion_mapping.json`](file:///c:/Users/iamha/OneDrive/Desktop/Song/SONG_LYRICS_EMOTION_CLASSIFICATION07/ml-services/config/emotion_mapping.json) adhere to strict affective validity:
- **Positive Equivalence**:
  - `joy` / `happy` / `cheerful` $\to$ **Happiness**
  - `sad` / `sadness` / `grief` / `poignant` $\to$ **Sadness**
  - `anger` / `angry` / `aggressive` / `fiery` $\to$ **Anger**
  - `fear` / `nervousness` / `anxious` $\to$ **Fear**
  - `love` / `romantic` / `sweet` $\to$ **Love**
  - `excitement` / `rousing` / `boisterous` $\to$ **Excitement**
  - `optimism` / `anticipation` / `patriotic` $\to$ **Hope**
- **Strict Negative Constraints**:
  - `surprise` is **NOT** mapped to excitement (startle reflex has neutral valence).
  - `neutral` is **NOT** mapped to calmness (neutral lacks affective arousal/serenity).
  - `disgust` is **NOT** mapped to anger or sadness (distinct aversion response).
  - `trust`, `admiration`, `curiosity`, `amusement` remain unmapped.

---

## 7. Integrated Dataset Statistics (3,290 Balanced Samples)

### 7.1 By Language:
- **English (`en`)**: 1,229 samples (37.4%)
- **French (`fr`)**: 610 samples (18.5%)
- **Spanish (`es`)**: 609 samples (18.5%)
- **Bengali (`bn`)**: 490 samples (14.9%)
- **Hindi (`hi`)**: 352 samples (10.7%)

### 7.2 By Domain:
- **General Text (`general_text`)**: 2,023 samples (61.5%)
- **Social Media (`social_media`)**: 801 samples (24.3%)
- **Song Lyrics (`lyrics`)**: 466 samples (14.2%)

### 7.3 By Emotion:
- **Happiness**: 685 (20.8%)
- **Sadness**: 649 (19.7%)
- **Anger**: 634 (19.3%)
- **Fear**: 504 (15.3%)
- **Hope**: 365 (11.1%)
- **Excitement**: 199 (6.0%)
- **Love**: 186 (5.7%)
- **Nostalgia**: 63 (1.9%)
- **Calmness**: 5 (0.2%)

### 7.4 Partition Splits (Seed 42, 0 Artist Leakage):
- **Train**: 2,321 samples (70.5%)
- **Validation**: 485 samples (14.7%)
- **Test**: 484 samples (14.7%)
- $\text{Artists}_{\text{lyrics}}(\text{Train}) \cap \text{Artists}_{\text{lyrics}}(\text{Test}) = \emptyset$ (Verified).

---

## 8. Execution Commands

### Re-run Dataset Acquisition:
```powershell
cd SONG_LYRICS_EMOTION_CLASSIFICATION07/ml-services
python -m src.acquire_datasets
```

### Re-run Stage 2 Integration & Balancing:
```powershell
cd SONG_LYRICS_EMOTION_CLASSIFICATION07/ml-services
python -m src.stage2_integrator
```

### Re-run Stage 3 Training & Evaluation:
```powershell
cd SONG_LYRICS_EMOTION_CLASSIFICATION07/ml-services
python -m src.train
```

### Run Multilingual Inference (5 Languages, CPU):
```powershell
cd SONG_LYRICS_EMOTION_CLASSIFICATION07/ml-services
python -m src.predict
```

### Run Stage 4 Multilingual FastAPI Microservice:
```powershell
cd SONG_LYRICS_EMOTION_CLASSIFICATION07/ml-services
python -m src.api
# Service runs on http://127.0.0.1:8001
# Interactive Swagger docs: http://127.0.0.1:8001/docs
```

### Run Stage 4 Automated Unit Tests (API & Microservice):
```powershell
cd SONG_LYRICS_EMOTION_CLASSIFICATION07/ml-services
python -m unittest -v tests.test_stage4_service
```

### Run Full Test Suite (47 Automated Unit & Integration Tests across Stages 1, 2, 3, 4):
```powershell
cd SONG_LYRICS_EMOTION_CLASSIFICATION07/ml-services
python -m unittest discover -s tests -p "test_*.py" -v
```

---

## 9. Stage 4: Multilingual Microservice Integration & Architecture

### 9.1 API Endpoints
- **`GET /health`**: Returns service readiness, model version (`v1.0.0-multilingual-minilm`), device (`cpu`), supported languages (`en`, `hi`, `bn`, `es`, `fr`), and 10 canonical emotion categories.
- **`POST /predict`**: Accepts `{ "text": "...", "language": "optional_code" }`. Performs original-language classification without machine translation distortion and outputs:
  - `primaryEmotion`, `secondaryEmotions` (with confidence and percentages)
  - `emotionProbabilities` across all 10 canonical classes
  - `isCodeSwitched` (flags Hinglish or Banglish)
  - `warning` (flags uncataloged or ambiguous scripts)
- **`POST /predict-batch`**: Evaluates batches of lyrics in a single request.

### 9.2 Node.js Backend Integration & Strict Fallback Policy
- **Connection**: Managed via `backend/services/multilingualMLService.js` connecting to `http://127.0.0.1:8001` (configured via `ML_SERVICE_URL`).
- **Strict Fallback Policy**:
  - **English (`en`)**: If Python microservice is offline, gracefully evaluates via deterministic English lexical analyzer with notification.
  - **Non-English (`hi`, `bn`, `es`, `fr`)**: **Never** falls back to English lexical dictionary; strictly returns an informative HTTP 503 error instructing the operator to launch the Python microservice.

---

## 10. Stage 5: Multilingual Line-by-Line & Section Emotion Analysis

### 10.1 Feature Summary
- **Line-by-Line Classification**: High-speed batched CPU inference using `SentenceTransformer.encode(all_lines, batch_size=32)` evaluating 30+ lyric lines in < 200ms.
- **Context Windowing & Neighbor Smoothing**: Preserves line sequence and dampens abrupt noise by blending target line embedding ($75\%$) with neighboring lines ($25\%$).
- **Ambiguity & Interjection Damping**: Short interjections ($\le 3$ words like *"Yeah"*, *"Oh baby"*, *"Sanam"*) receive equal neighbor weighting ($45\% / 55\%$) and a confidence ceiling ($0.82$) to prevent artificial $99\%$ confidence spikes on filler syllables.
- **Structural Section Detection**: Identifies `Verse 1`, `Verse 2`, `Chorus`, `Bridge`, `Outro` via:
  1. Explicit section headers (`[Verse 1]`, `[Chorus]`, `(Bridge)`).
  2. Repeated stanza refrain hashing when explicit headers are absent.
- **Emotional Journey & Dynamics**:
  - Dominant emotion and intensity per section ($0-100$).
  - Section-level Shannon entropy score ($H = -\sum p_i \log_2(p_i) / \log_2(10) \in [0, 1]$) identifying the most emotionally diverse section.
  - Significant emotional transitions across sections ($\Delta \ge 20\%$).
  - Overarching beginning-to-ending narrative trajectory arc.

### 10.2 Endpoint: `POST /predict-lines`
```json
// Request
{
  "lines": [
    "[Verse 1]",
    "Deep in the ocean of despair I call your name",
    "Holding on to gentle peace and quiet breathing"
  ],
  "contextWindow": 1,
  "language": "en"
}

// Response
{
  "success": true,
  "count": 3,
  "lines": [
    {
      "lineNumber": 1,
      "text": "[Verse 1]",
      "language": "en",
      "primaryEmotion": "Structure",
      "secondaryEmotions": [],
      "confidence": 1.0,
      "isSectionHeader": true,
      "emotionProbabilities": {},
      "explanation": "Structural song section marker: [Verse 1]"
    },
    {
      "lineNumber": 2,
      "text": "Deep in the ocean of despair I call your name",
      "language": "en",
      "primaryEmotion": "Sadness",
      "secondaryEmotions": ["Loneliness"],
      "confidence": 0.892,
      "isSectionHeader": false,
      "emotionProbabilities": { "Happiness": 0.01, "Sadness": 0.72, ... },
      "explanation": "Predicted Sadness (89.2% confidence)..."
    }
  ],
  "durationMs": 142
}
```

---

## 11. Stage 6: Accuracy, Code-Switching & Confidence Calibration

### 11.1 Key Advancements
- **Code-Switching Support**: Detects and parses multi-lingual mixing across Latin, Devanagari, and Bengali scripts (Hinglish, Banglish, Spanglish, Franglish).
- **Post-Hoc Temperature Calibration**: Applies learned temperature scaling ($T = 1.0295$) optimizing logits to match empirical accuracy, reducing Expected Calibration Error (ECE) from $0.0614$ to $0.0538$ ($-12.38\%$ error reduction).
- **Shannon Uncertainty Engine**: Identifies boundary predictions via top-margin separation ($\Delta \le 0.08$) and entropy thresholding ($H \ge 0.70$).

---

## 12. Stage 7: Production Readiness, Model Validation & Performance Optimization

### 12.1 Production Model Details
- **Active Model Version**: `v1.2.0-production-calibrated`
- **Model Checkpoint**: `ml-services/models/multilingual_classifier.pt`
- **Rollback Backup Checkpoint**: `ml-services/models/multilingual_classifier.pt.bak`
- **Production Metadata**: `ml-services/models/model_metadata.json`
- **Hardware Profile**: Windows 16 GB RAM, CPU-only inference with thread capping (`torch.set_num_threads(4)`).

### 12.2 Production Performance & Optimization
- **Singleton Model Lifecycle**: Model weights and MiniLM encoder are loaded once at FastAPI process initialization.
- **In-Memory LRU Cache**: 1,000-entry LRU cache keyed by normalized text + language hash, reducing repeat query response times from $\sim 45\text{ms}$ down to $< 1.0\text{ms}$.
- **Safe Input Boundaries**: Protects against denial-of-service and memory spikes by truncating inputs $> 5,000$ characters with advisory warning.
- **Runtime Telemetry**: `/health` endpoint exposes real-time RSS memory tracking (`psutil`), thread count, and cache saturation.
- **Sanitized Error Handling**: Global FastAPI exception handlers return structured JSON `{ success: false, error: { code, message, requestId } }` without leaking stack traces or internal server file paths.

### 12.3 Validated Benchmark Metrics (Zero Data Leakage)
- **Zero Leakage Audit**: Evaluated across 2,321 train, 485 validation, and 484 test records with **0 text overlaps** across all partitions.
- **Overall Accuracy**: **42.56%**
- **Macro F1 Score**: **0.4071** (+6.96% improvement over baseline 0.3806)
- **Weighted F1 Score**: **0.4240**
- **Calibrated ECE**: **0.0538**
- **Per-Language Accuracy**: `hi`: 60.78%, `en`: 44.75%, `bn`: 41.67%, `es`: 40.00%, `fr`: 31.11%
- **Length Slices**: Short ($\le 20$ words): 44.63% Acc | Medium (21–50 words): 40.62% Acc | Long ($> 50$ words): 33.33% Acc.

### 12.4 How to Run the Production Microservice

#### Environment Variables (Optional):
```env
PORT=8001
HOST=0.0.0.0
TORCH_NUM_THREADS=4
PREDICTION_CACHE_SIZE=1000
MAX_INPUT_CHARS=5000
```

#### Launch Command:
```powershell
cd SONG_LYRICS_EMOTION_CLASSIFICATION07/ml-services
python -m src.api
```
The service initializes on `http://127.0.0.1:8001`.

#### Running Automated Production Tests:
```powershell
cd SONG_LYRICS_EMOTION_CLASSIFICATION07/ml-services
python tests/test_stage7_production.py
```

### 12.5 Rollback Procedure
If a production issue occurs with a newly trained checkpoint:
1. Stop the ML microservice (`Ctrl+C`).
2. Restore the backup checkpoint:
   ```powershell
   Copy-Item ml-services/models/multilingual_classifier.pt.bak ml-services/models/multilingual_classifier.pt -Force
   ```
3. Restart the service (`python -m src.api`).
4. Validate service health via `curl http://127.0.0.1:8001/health`.

---

## 13. Git Privacy & Copyright Safeguards
- All raw datasets (`ml-services/datasets/raw/`) and processed JSONL partitions (`ml-services/datasets/processed/*.jsonl`) are strictly ignored via [`.gitignore`](file:///c:/Users/iamha/OneDrive/Desktop/Song/SONG_LYRICS_EMOTION_CLASSIFICATION07/.gitignore).
- No copyrighted lyrics, large dataset archives, or binary checkpoints are committed to source control.
