# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FastAPI-based backend service providing REST API access to Oracle EBS (E-Business Suite) for DC (Distribution Center) order operations. Connects to Oracle database using `oracledb` driver with mandatory session configuration for APPS schema and multi-org context.

## Commands

### Development

```bash
# Install dependencies
uv sync

# Run development server (with auto-reload)
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run production server
uv run gunicorn app.main:app --config=gunicorn_config.py
```

### Testing

```bash
# Run all tests
uv run pytest

# Run specific test file
uv run pytest tests/test_file.py
```

### Code Quality

```bash
# Lint code
uv run ruff check .

# Format code
uv run ruff format .
```

### Docker

```bash
# Build image
docker build -t dc-dashboard-api:latest .

# Run container
docker run -d -p 8000:8000 --env-file .env --name dc-dashboard-api dc-dashboard-api:latest
```

## Architecture

### Service Layer Pattern

The application follows a three-layer architecture:

1. **Routers** (`app/routers/`) - FastAPI route handlers that receive HTTP requests, validate input, and return responses
2. **Services** (`app/services/`) - Business logic and database operations. Each service corresponds to a data domain (e.g., `dc_order_line_service.py`)
3. **Models** (`app/models/`) - Pydantic models for request/response validation and serialization

### Database Connection Management

All Oracle database connections MUST use the `get_oracle_connection()` context manager from `app/services/database.py`. This is critical because:

- It automatically executes mandatory session setup SQL: `ALTER SESSION SET CURRENT_SCHEMA = APPS` and `apps.XXATD_ORG_ACCESS_UTILS_PKG.SET_multi_ORG_CONTEXT`
- Ensures proper connection cleanup via context manager pattern
- Integrates request tracing with correlation IDs

**Example usage:**
```python
from app.services.database import get_oracle_connection

with get_oracle_connection(request_id=self.request_id) as conn:
    with conn.cursor() as cursor:
        cursor.execute(sql, params)
        results = cursor.fetchall()
```

### Request Tracing

Every HTTP request receives a unique 8-character request ID (UUID prefix) via middleware in `app/main.py`. This ID:
- Is stored in `request.state.request_id`
- Appears in all log entries for that request
- Is returned in response headers as `X-Request-ID`
- Should be passed to service constructors for consistent logging

### Configuration

Settings are managed via Pydantic Settings (`app/config/settings.py`) and loaded from environment variables or `.env` file. The `get_settings()` function uses `@lru_cache` for singleton behavior.

Required environment variables:
- `ORACLE_USER`, `ORACLE_PASSWORD`, `ORACLE_HOST`, `ORACLE_PORT`, `ORACLE_SERVICE`
- Optional: `DEBUG` (boolean)

### Logging

Uses `loguru` for structured logging configured in `app/main.py`:
- Console output (stdout) with level based on DEBUG setting
- File output to `logs/app.log` with 10 MB rotation and 7-day retention
- All logs include correlation IDs in format `[{request_id}] message`

## Adding New Endpoints

When adding a new endpoint for a data domain:

1. **Create Model** in `app/models/` - Define Pydantic models for request/response
2. **Create Service** in `app/services/` - Implement database operations using `get_oracle_connection()` context manager
3. **Create Router** in `app/routers/` - Define FastAPI routes, extract `request_id` from request state, instantiate service with request_id
4. **Register Router** in `app/main.py` - Add `app.include_router(your_router.router, prefix="/api/v1")`

### Service Class Pattern

Services should follow this pattern:

```python
class YourService:
    def __init__(self, request_id: str):
        self.request_id = request_id

    def your_method(self, params) -> ResponseModel:
        logger.info(f"[{self.request_id}] Operation description")

        with get_oracle_connection(request_id=self.request_id) as conn:
            with conn.cursor() as cursor:
                cursor.execute(sql, params)
                # ... process results

        return ResponseModel(...)
```

## Oracle EBS Query Patterns

### Common Tables/Views

- `mtl_parameters` - Organization/inventory parameters
- `oe_order_lines_v` - Order lines view (pre-joined)
- `wsh_delivery_details` - Shipping/delivery information
- `OE_HOLDS_HISTORY_V` - Order holds history
- `mtl_reservations` - Material reservations

### Multi-Org Context

Session setup (`XXATD_ORG_ACCESS_UTILS_PKG.SET_multi_ORG_CONTEXT`) is required for proper data access across organizations in Oracle EBS. This is automatically handled by `get_oracle_connection()`.

## Error Handling

Global exception handlers are registered in `app/exceptions/handlers.py` via `register_exception_handlers(app)`. All error responses include:
- `error` field with description
- `request_id` field for tracing
- Optional `detail` field for additional context

## Production Deployment

Gunicorn is configured in `gunicorn_config.py` to use:
- UvicornWorker worker class (ASGI)
- Workers = CPU count * 2 + 1 (configurable via `WORKERS` env var)
- 300 second timeout for long-running Oracle queries (configurable via `WORKER_TIMEOUT`)
- Logs to stdout/stderr for container compatibility

## API Documentation

Interactive API documentation available when server is running:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
