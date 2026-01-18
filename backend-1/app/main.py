import sys
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.config.settings import get_settings
from app.exceptions.handlers import register_exception_handlers
from app.routers import dc_locations, dc_onhand, dc_order_lines, descartes_info, health, invoice_lines, network_inventory, order_hold_history, trip_exceptions


# Configure loguru logging
logger.remove()
logger.add(
    sys.stdout,
    format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {message}",
    level="DEBUG" if get_settings().debug else "INFO",
)

# Add file logging
logger.add(
    "logs/app.log",
    rotation="10 MB",
    retention="7 days",
    format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {message}",
    level="DEBUG" if get_settings().debug else "INFO",
)


# Create FastAPI application
app = FastAPI(
    title=get_settings().app_name,
    version=get_settings().app_version,
    description="DC Dashboard API for managing and viewing DC order operations",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)


# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_request_id(request: Request, call_next):
    """Add unique request ID for tracing and logging."""
    request_id = str(uuid.uuid4())[:8]
    request.state.request_id = request_id

    logger.info(f"[{request_id}] {request.method} {request.url.path}")

    response = await call_next(request)

    response.headers["X-Request-ID"] = request_id
    logger.info(f"[{request_id}] Response: {response.status_code}")

    return response


# Register exception handlers
register_exception_handlers(app)

# Include routers
app.include_router(health.router)
app.include_router(dc_locations.router, prefix="/api/v1")
app.include_router(dc_onhand.router, prefix="/api/v1")
app.include_router(dc_order_lines.router, prefix="/api/v1")
app.include_router(descartes_info.router, prefix="/api/v1")
app.include_router(network_inventory.router, prefix="/api/v1")
app.include_router(order_hold_history.router, prefix="/api/v1")
app.include_router(trip_exceptions.router, prefix="/api/v1")
app.include_router(invoice_lines.router, prefix="/api/v1")


@app.on_event("startup")
async def startup_event():
    """Application startup event handler."""
    settings = get_settings()
    logger.info(f"Starting {settings.app_name} v{settings.app_version}")
    logger.info(f"Debug mode: {settings.debug}")
    logger.info(f"Oracle host: {settings.oracle_host}:{settings.oracle_port}")


@app.on_event("shutdown")
async def shutdown_event():
    """Application shutdown event handler."""
    logger.info("Shutting down DC Dashboard API")
