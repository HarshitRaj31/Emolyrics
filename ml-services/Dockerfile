# ==============================================================================
# Production Dockerfile for EmoLyrics Python Multilingual Emotion ML Service
# Optimized for CPU-Only Inference (Windows / Linux Docker Host)
# ==============================================================================
FROM python:3.11-slim

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8001
ENV HOST=0.0.0.0
ENV TORCH_NUM_THREADS=4
ENV HF_HOME=/app/cache/huggingface

WORKDIR /app

# Install system dependencies (curl for healthchecks)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements specification
COPY requirements.txt .

# Install CPU-only PyTorch wheel first to avoid downloading 2GB+ CUDA binaries
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt

# Create non-root user and pre-create cache/model directories
RUN useradd -m -u 1000 appuser && \
    mkdir -p /app/cache/huggingface /app/models /app/reports && \
    chown -R appuser:appuser /app

# Copy application source code and models
COPY --chown=appuser:appuser src/ ./src/
COPY --chown=appuser:appuser config/ ./config/
COPY --chown=appuser:appuser models/ ./models/

# Switch to non-root user
USER appuser

# Expose FastAPI port
EXPOSE 8001

# Health check probing /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:8001/health || exit 1

# Start FastAPI server using uvicorn module
CMD ["python", "-m", "src.api"]

