from contextlib import contextmanager
from typing import Generator

import oracledb
from loguru import logger

from app.config.settings import get_settings


# Mandatory session setup SQL for Oracle EBS
SESSION_SETUP_SQL = """
begin
    execute immediate 'ALTER SESSION SET CURRENT_SCHEMA = APPS';
    apps.XXATD_ORG_ACCESS_UTILS_PKG.SET_multi_ORG_CONTEXT;
end;
"""


@contextmanager
def get_oracle_connection(request_id: str = "") -> Generator[oracledb.Connection, None, None]:
    """
    Get Oracle connection with session setup.

    Always use as a context manager to ensure proper resource cleanup.

    Args:
        request_id: Request correlation ID for logging

    Yields:
        oracledb.Connection: Configured Oracle database connection

    Raises:
        oracledb.Error: If connection or session setup fails
    """
    settings = get_settings()
    conn = None

    try:
        logger.info(
            f"[{request_id}] Connecting to Oracle: "
            f"{settings.oracle_host}:{settings.oracle_port}/{settings.oracle_service}"
        )

        conn = oracledb.connect(
            user=settings.oracle_user,
            password=settings.oracle_password,
            dsn=settings.oracle_dsn
        )
        logger.info(f"[{request_id}] Oracle connection established")

        # MANDATORY: Execute session setup for Oracle EBS
        with conn.cursor() as cursor:
            cursor.execute(SESSION_SETUP_SQL)
            logger.info(f"[{request_id}] Oracle session context configured (APPS schema, multi-org)")

        yield conn

    except oracledb.Error as e:
        logger.exception(f"[{request_id}] Oracle connection error: {e}")
        raise
    finally:
        if conn:
            conn.close()
            logger.debug(f"[{request_id}] Oracle connection closed")
