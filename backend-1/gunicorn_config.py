"""Gunicorn configuration for production deployment."""

import multiprocessing
from os import environ as env


# Server binding
PORT = int(env.get("PORT", 8000))
bind = f"0.0.0.0:{PORT}"

# Worker configuration
workers = int(env.get("WORKERS", multiprocessing.cpu_count() * 2 + 1))
worker_class = "uvicorn.workers.UvicornWorker"

# Timeouts - set higher for Oracle queries that may take longer
timeout = int(env.get("WORKER_TIMEOUT", 300))
graceful_timeout = 30
keepalive = 5

# Logging
accesslog = "-"  # stdout
errorlog = "-"   # stderr
loglevel = env.get("LOG_LEVEL", "info")

# Process naming
proc_name = "dc-dashboard-api"

# Security
limit_request_line = 4094
limit_request_fields = 100
limit_request_field_size = 8190
