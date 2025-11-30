# Build stage
FROM python:3.12-slim AS builder

WORKDIR /app

# Install uv for fast package management
RUN pip install uv

# Copy dependency file
COPY pyproject.toml .

# Install dependencies
RUN uv pip install --system --no-cache .


# Runtime stage
FROM python:3.12-slim

# Install Oracle Instant Client dependencies if needed
# RUN apt-get update && apt-get install -y libaio1 && rm -rf /var/lib/apt/lists/*
# COPY --from=builder /opt/oracle /opt/oracle
# ENV LD_LIBRARY_PATH=/opt/oracle/instantclient_21_1

WORKDIR /app

# Create non-root user for security
RUN useradd -m -u 1000 appuser

# Create logs directory
RUN mkdir -p /app/logs && chown appuser:appuser /app/logs

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages

# Copy application code
COPY --chown=appuser:appuser app/ ./app/
COPY --chown=appuser:appuser gunicorn_config.py ./

# Switch to non-root user
USER appuser

# Environment defaults
ENV PORT=8000
ENV WORKERS=3
ENV WORKER_TIMEOUT=300

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Production: Use gunicorn with multiple workers
CMD ["gunicorn", "app.main:app", "--config=gunicorn_config.py"]
