from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class HealthResponse(BaseModel):
    """Health check response model."""

    status: str
    service: str
    version: str
    timestamp: datetime


class DBHealthResponse(BaseModel):
    """Database health check response model."""

    status: str
    database_version: str
    connection_info: str
    session_context: str
    timestamp: datetime


class ErrorResponse(BaseModel):
    """Standard error response model."""

    error: str
    detail: Optional[str] = None
    request_id: Optional[str] = None


class PaginatedResponse(BaseModel):
    """Paginated response model."""

    data: list[Any]
    total: int
    page: int
    page_size: int
    total_pages: int
