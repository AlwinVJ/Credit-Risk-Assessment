# ==============================================================================
# Credit Risk Management — Production Dockerfile
# Multi-stage-clean, non-root, Render-ready container for FastAPI + XGBoost
# ==============================================================================

# Base image: Official Python 3.12 slim Debian (stable, minimal CVE footprint)
FROM python:3.12-slim-bookworm

# Metadata labels
LABEL maintainer="Credit Risk Management Team"
LABEL description="Production container for Credit Risk Underwriting API and Dashboard"
LABEL version="1.0.0"

# Python runtime optimization flags:
# - PYTHONDONTWRITEBYTECODE: Prevents writing .pyc files to container layer
# - PYTHONUNBUFFERED: Immediate logging without I/O buffering
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

# Set application working directory
WORKDIR /app

# Install minimal OS dependencies required by XGBoost and health monitoring:
# - libgomp1: OpenMP shared library used by XGBoost and Scikit-learn parallel execution
# - curl: Required for container HEALTHCHECK probe
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        libgomp1 \
        curl && \
    rm -rf /var/lib/apt/lists/*

# Layer Caching: Copy and install Python dependencies first
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code, model artifacts, and static frontend assets
COPY main.py .
COPY credit_risk_model.pkl .
COPY best_threshold.pkl .
COPY static/ ./static/

# Security Hardening: Run as unprivileged non-root user
RUN groupadd -g 1000 appgroup && \
    useradd -u 1000 -g appgroup -s /bin/bash -m appuser && \
    chown -R appuser:appgroup /app

USER appuser

# Expose default HTTP port
EXPOSE 8000

# Container Healthcheck (polls the /health endpoint)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

# Production Start Command:
# Evaluates Render's dynamically injected $PORT variable while defaulting to 8000.
# 'exec' replaces shell PID 1 with Uvicorn so SIGTERM/SIGINT signals trigger graceful shutdown.
CMD ["sh", "-c", "exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
