from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from loguru import logger

import oracledb


def register_exception_handlers(app: FastAPI) -> None:
    """
    Register global exception handlers for the FastAPI application.

    Args:
        app: FastAPI application instance
    """

    @app.exception_handler(oracledb.Error)
    async def oracle_exception_handler(
        request: Request, exc: oracledb.Error
    ) -> JSONResponse:
        """Handle Oracle database errors."""
        request_id = getattr(request.state, "request_id", "unknown")
        logger.exception(f"[{request_id}] Oracle database error: {exc}")

        return JSONResponse(
            status_code=500,
            content={
                "error": "Database operation failed",
                "detail": "An error occurred while accessing the database",
                "request_id": request_id,
            },
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(
        request: Request, exc: HTTPException
    ) -> JSONResponse:
        """Handle HTTP exceptions."""
        request_id = getattr(request.state, "request_id", "unknown")
        logger.warning(f"[{request_id}] HTTP {exc.status_code}: {exc.detail}")

        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": exc.detail,
                "request_id": request_id,
            },
        )

    @app.exception_handler(ValueError)
    async def value_error_handler(
        request: Request, exc: ValueError
    ) -> JSONResponse:
        """Handle value validation errors."""
        request_id = getattr(request.state, "request_id", "unknown")
        logger.warning(f"[{request_id}] Validation error: {exc}")

        return JSONResponse(
            status_code=400,
            content={
                "error": "Invalid input",
                "detail": str(exc),
                "request_id": request_id,
            },
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        """Handle all other unhandled exceptions."""
        request_id = getattr(request.state, "request_id", "unknown")
        logger.exception(f"[{request_id}] Unhandled exception: {exc}")

        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal server error",
                "detail": "An unexpected error occurred",
                "request_id": request_id,
            },
        )
