from datetime import datetime, timezone

from fastapi import APIRouter, Request
from loguru import logger

from app.config.settings import get_settings
from app.models.common import DBHealthResponse, HealthResponse
from app.services.database import get_oracle_connection


router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """
    Service health check endpoint.

    Returns basic service information and status.
    """
    settings = get_settings()
    return HealthResponse(
        status="healthy",
        service=settings.app_name,
        version=settings.app_version,
        timestamp=datetime.now(timezone.utc),
    )


@router.get("/dbhealth", response_model=DBHealthResponse)
async def db_health_check(request: Request) -> DBHealthResponse:
    """
    Database health check endpoint.

    Verifies Oracle database connectivity and session configuration.
    Returns database version and current schema context.
    """
    request_id = getattr(request.state, "request_id", "unknown")
    logger.info(f"[{request_id}] Database health check initiated")

    settings = get_settings()

    with get_oracle_connection(request_id) as conn:
        with conn.cursor() as cursor:
            # Get Oracle version
            cursor.execute("SELECT banner FROM v$version WHERE ROWNUM = 1")
            row = cursor.fetchone()
            version = row[0] if row else "Unknown"

            # Verify session schema context
            cursor.execute("SELECT SYS_CONTEXT('USERENV', 'CURRENT_SCHEMA') FROM DUAL")
            row = cursor.fetchone()
            schema = row[0] if row else "Unknown"

    logger.info(f"[{request_id}] Database health check completed: schema={schema}")

    return DBHealthResponse(
        status="healthy",
        database_version=version,
        connection_info=f"{settings.oracle_host}:{settings.oracle_port}",
        session_context=schema,
        timestamp=datetime.now(timezone.utc),
    )
