"""
EmoLyrics Multilingual Emotion ML HTTP Service (FastAPI)
Provides high-speed CPU inference across 5 languages:
  - English (en)
  - Hindi (hi) [Devanagari + Hinglish]
  - Bengali (bn) [Bengali script + Banglish]
  - Spanish (es)
  - French (fr)

Predicts 10 canonical emotions with zero translation beforehand:
  Happiness, Sadness, Love, Anger, Nostalgia,
  Fear, Excitement, Hope, Loneliness, Calmness
"""

import os
import sys
import time
import uuid
import logging
from typing import Dict, Any, List, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Ensure ml-services root is in Python path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ML_DIR = os.path.dirname(CURRENT_DIR)
if ML_DIR not in sys.path:
    sys.path.insert(0, ML_DIR)

from src.predict import MultilingualEmotionPredictor, DEFAULT_CHECKPOINT
from src.embedding_manager import TARGET_TAXONOMY

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("emolyrics-ml-api")

SUPPORTED_LANGUAGES = {
    "en": "English",
    "hi": "Hindi",
    "bn": "Bengali",
    "es": "Spanish",
    "fr": "French"
}

# Global predictor instance (loaded once on startup)
predictor_instance: Optional[MultilingualEmotionPredictor] = None


def get_predictor() -> MultilingualEmotionPredictor:
    """Returns singleton MultilingualEmotionPredictor, loading once if needed."""
    global predictor_instance
    if predictor_instance is None:
        logger.info("Initializing MultilingualEmotionPredictor on CPU...")
        start_time = time.time()
        predictor_instance = MultilingualEmotionPredictor(device="cpu")
        load_duration = round((time.time() - start_time) * 1000, 2)
        logger.info(f"Model successfully loaded in {load_duration}ms. Checkpoint: {DEFAULT_CHECKPOINT}")
    return predictor_instance


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager for the FastAPI service."""
    logger.info("Starting up Multilingual Emotion ML Service...")
    yield
    logger.info("Shutting down Multilingual Emotion ML Service...")


app = FastAPI(
    title="EmoLyrics Multilingual Emotion Prediction API",
    description="Original-language song lyrics emotion classification microservice using MiniLM & PyTorch MLP",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for local Node backend and React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global Secure Error Handlers (Sanitizes stack traces & paths from client responses)
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    req_id = request.headers.get("X-Request-ID") or f"req_{uuid.uuid4().hex[:10]}"
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": f"HTTP_{exc.status_code}",
                "message": str(exc.detail),
                "requestId": req_id
            }
        }
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    req_id = request.headers.get("X-Request-ID") or f"req_{uuid.uuid4().hex[:10]}"
    logger.error(f"Internal server error [requestId={req_id}]: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "code": "ERR_INTERNAL_SERVER_ERROR",
                "message": "An internal error occurred during emotion processing. Please try again.",
                "requestId": req_id
            }
        }
    )


# Request & Response Schemas
class PredictRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Song lyrics or text snippet to analyze")
    language: Optional[str] = Field(None, description="Optional explicit language code ('en', 'hi', 'bn', 'es', 'fr')")


class BatchPredictRequest(BaseModel):
    texts: List[str] = Field(..., min_length=1, description="List of lyrics texts to analyze")
    language: Optional[str] = Field(None, description="Optional explicit language code")


class PredictLinesRequest(BaseModel):
    lines: List[str] = Field(..., min_length=1, description="List of lyric lines to analyze")
    contextWindow: int = Field(1, ge=0, le=3, description="Context window size (0 to 3 lines)")
    language: Optional[str] = Field(None, description="Optional explicit language code")


class SecondaryEmotionItem(BaseModel):
    emotion: str
    confidence: float
    percentage: Optional[int] = None


class PredictResponse(BaseModel):
    success: bool
    requestId: Optional[str] = None
    language: str
    languageName: str
    primaryEmotion: str
    secondaryEmotions: List[SecondaryEmotionItem]
    confidence: float
    emotionProbabilities: Dict[str, float]
    modelVersion: str
    durationMs: Optional[float] = None
    isCached: Optional[bool] = False
    isCodeSwitched: bool
    codeSwitchType: Optional[str] = None
    scriptBreakdown: Optional[Dict[str, float]] = None
    languageDistribution: Optional[Dict[str, float]] = None
    isUncertain: bool = False
    uncertaintyDetails: Optional[Dict[str, Any]] = None
    temperature: Optional[float] = 1.0295
    isSupported: bool
    languageConfidence: str
    warning: Optional[str] = None
    textPreview: str

    # Snake-case aliases for backward compatibility
    detected_language: Optional[str] = None
    primary_emotion: Optional[str] = None
    secondary_emotions: Optional[List[Dict[str, Any]]] = None
    probabilities: Optional[Dict[str, float]] = None
    model_version: Optional[str] = None


@app.get("/")
def root():
    return {
        "service": "EmoLyrics Multilingual Emotion ML Microservice",
        "status": "online",
        "version": "1.0.0",
        "docsUrl": "/docs"
    }


@app.get("/health")
def health_check():
    try:
        predictor = get_predictor()
    except Exception as e:
        return {
            "status": "degraded",
            "message": f"Model loading error: {str(e)}",
            "checkpointPath": DEFAULT_CHECKPOINT,
            "checkpointExists": os.path.exists(DEFAULT_CHECKPOINT)
        }

    telemetry = predictor.get_system_telemetry() if hasattr(predictor, "get_system_telemetry") else {}

    return {
        "status": "healthy",
        "modelVersion": getattr(predictor, "model_version", "v1.2.0-production-calibrated"),
        "device": predictor.device,
        "supportedLanguages": list(SUPPORTED_LANGUAGES.keys()),
        "supportedEmotions": TARGET_TAXONOMY,
        "checkpointPath": DEFAULT_CHECKPOINT,
        "checkpointExists": os.path.exists(DEFAULT_CHECKPOINT),
        "memoryRssMb": telemetry.get("memoryRssMb", 0.0),
        "cpuThreads": telemetry.get("cpuThreads", 4),
        "cacheEntries": telemetry.get("cacheEntries", 0),
        "cacheMaxSize": telemetry.get("cacheMaxSize", 1000)
    }


def _process_prediction(text: str, specified_lang: Optional[str] = None, req_id: Optional[str] = None) -> Dict[str, Any]:
    try:
        predictor = get_predictor()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Multilingual emotion classifier model is unavailable: {str(e)}"
        )

    clean_text = text.strip() if text else ""
    if not clean_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lyrics text cannot be empty or whitespace only."
        )

    assigned_req_id = req_id or f"req_{uuid.uuid4().hex[:10]}"

    # Execute original-language inference (NO translation)
    raw_res = predictor.predict(clean_text, specified_language=specified_lang)

    lang_code = raw_res.get("detected_language", "en")
    lang_info = raw_res.get("language_info", {})
    lang_conf = "high" if lang_info.get("confidence", 0.0) >= 0.75 else ("medium" if lang_info.get("confidence", 0.0) >= 0.5 else "low")
    is_supported = lang_code in SUPPORTED_LANGUAGES

    is_code_switched = raw_res.get("is_code_switched", False)
    code_switch_type = raw_res.get("code_switch_type")
    script_breakdown = raw_res.get("script_breakdown", {})
    language_distribution = raw_res.get("language_distribution", {})
    is_uncertain = raw_res.get("is_uncertain", False)
    uncertainty_details = raw_res.get("uncertainty_details", {})
    temperature_val = raw_res.get("temperature_used", 1.0295)

    lang_name = raw_res.get("language_name") or SUPPORTED_LANGUAGES.get(lang_code, lang_code.upper())

    warning = raw_res.get("warning")
    if not is_supported:
        warning = f"Detected language ({lang_code}) is not one of the 5 officially supported languages (en, hi, bn, es, fr)."
    elif is_uncertain and not warning:
        warning = uncertainty_details.get("warningReason", "Emotion prediction carries high uncertainty.")

    primary_emotion = raw_res["primary_emotion"]
    confidence = raw_res["confidence"]
    probabilities = raw_res["probabilities"]

    # Secondary emotions with percentages
    secondary_emotions = []
    for s in raw_res.get("secondary_emotions", []):
        sec_prob = s.get("confidence", 0.0)
        secondary_emotions.append(SecondaryEmotionItem(
            emotion=s.get("emotion"),
            confidence=sec_prob,
            percentage=int(round(sec_prob * 100))
        ))

    model_version = raw_res.get("model_version", "v1.2.0-production-calibrated")
    duration_ms = raw_res.get("durationMs", 0.0)
    is_cached = raw_res.get("isCached", False)

    return {
        "success": True,
        "requestId": assigned_req_id,
        "language": lang_code,
        "languageName": lang_name,
        "primaryEmotion": primary_emotion,
        "secondaryEmotions": secondary_emotions,
        "confidence": confidence,
        "emotionProbabilities": probabilities,
        "probabilities": probabilities,
        "modelVersion": model_version,
        "durationMs": duration_ms,
        "isCached": is_cached,
        "isCodeSwitched": is_code_switched,
        "codeSwitchType": code_switch_type,
        "scriptBreakdown": script_breakdown,
        "languageDistribution": language_distribution,
        "isUncertain": is_uncertain,
        "uncertaintyDetails": uncertainty_details,
        "temperature": temperature_val,
        "isSupported": is_supported,
        "languageConfidence": lang_conf,
        "warning": warning,
        "textPreview": raw_res.get("text_preview", clean_text[:120]),

        # snake_case backward compatibility
        "detected_language": lang_code,
        "primary_emotion": primary_emotion,
        "secondary_emotions": [s.model_dump() for s in secondary_emotions],
        "probabilities": probabilities,
        "model_version": model_version
    }


@app.post("/predict", response_model=PredictResponse)
def predict_emotion(req: PredictRequest, request: Request = None):
    req_id = None
    if request:
        req_id = request.headers.get("X-Request-ID")
    return _process_prediction(req.text, req.language, req_id=req_id)


@app.post("/predict-batch")
def predict_emotion_batch(req: BatchPredictRequest, request: Request = None):
    if not req.texts:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Texts list cannot be empty.")
    batch_req_id = request.headers.get("X-Request-ID") if request else f"batch_{uuid.uuid4().hex[:8]}"
    results = [_process_prediction(t, req.language, req_id=f"{batch_req_id}_{i}") for i, t in enumerate(req.texts)]
    return {
        "success": True,
        "requestId": batch_req_id,
        "count": len(results),
        "results": results
    }


@app.post("/predict-lines")
def predict_lines_endpoint(req: PredictLinesRequest, request: Request = None):
    try:
        predictor = get_predictor()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Multilingual emotion classifier model is unavailable: {str(e)}"
        )

    if not req.lines:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Lines list cannot be empty.")

    req_id = request.headers.get("X-Request-ID") if request else f"lines_{uuid.uuid4().hex[:8]}"
    start_time = time.time()
    results = predictor.predict_lines(
        lines=req.lines,
        context_window=req.contextWindow,
        specified_language=req.language
    )
    duration_ms = round((time.time() - start_time) * 1000, 2)

    return {
        "success": True,
        "requestId": req_id,
        "count": len(results),
        "lines": results,
        "contextWindow": req.contextWindow,
        "durationMs": duration_ms,
        "modelVersion": getattr(predictor, "model_version", "v1.2.0-production-calibrated")
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("ML_SERVICE_PORT", 8001))
    host = os.environ.get("ML_SERVICE_HOST", "127.0.0.1")
    logger.info(f"Starting EmoLyrics Multilingual ML Service on http://{host}:{port}")
    uvicorn.run(app, host=host, port=port, log_level="info")
