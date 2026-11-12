# ==============================================================================
# Production Dockerfile for EmoLyrics Python Multilingual Emotion ML Service
# Target: Render Docker Web Service (1 CPU, 2 GB RAM) & Local Docker
# ==============================================================================
FROM python:3.11-slim

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# CPU & memory optimization for 1-CPU / 2GB-RAM containers
ENV TORCH_NUM_THREADS=1
ENV OMP_NUM_THREADS=1
ENV MKL_NUM_THREADS=1
ENV TOKENIZERS_PARALLELISM=false

# Bake Hugging Face cache inside the image so restarts/cold starts need zero network pulls
ENV HF_HOME=/app/cache/huggingface
ENV HF_HUB_OFFLINE=1
ENV TRANSFORMERS_OFFLINE=1

WORKDIR /app

# Install curl for container healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install CPU-only PyTorch wheel first to avoid downloading 2GB+ CUDA binaries
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt

# Create non-root user and required directories
RUN useradd -m -u 1000 appuser && \
    mkdir -p /app/cache/huggingface /app/models /app/reports && \
    chown -R appuser:appuser /app

# Pre-download Hugging Face Sentence Transformer into /app/cache/huggingface during image build
RUN HF_HUB_OFFLINE=0 TRANSFORMERS_OFFLINE=0 python -c "\
from sentence_transformers import SentenceTransformer; \
SentenceTransformer('sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2', device='cpu')" && \
    chown -R appuser:appuser /app/cache/huggingface

# Copy application source code, config, and required model artifacts
COPY --chown=appuser:appuser src/ ./src/
COPY --chown=appuser:appuser config/ ./config/
COPY --chown=appuser:appuser models/ ./models/

# Switch to non-root user
USER appuser

# Health check probing /health using Render's injected PORT (fallback 8001 for local runs)
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD sh -c 'curl -fsS http://127.0.0.1:${PORT:-8001}/health || exit 1'

# Start FastAPI server with single-worker Uvicorn bound to 0.0.0.0:$PORT
CMD ["sh", "-c", "uvicorn src.api:app --host 0.0.0.0 --port ${PORT:-8001} --workers 1"]
