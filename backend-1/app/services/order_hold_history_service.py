"""Service for order hold history operations."""

import time
from typing import Optional

from loguru import logger

from app.models.order_hold_history import OrderHoldHistory, OrderHoldHistoryListResponse
from app.services.database import get_oracle_connection


class OrderHoldHistoryService:
    """Service class for order hold history database operations."""

    def __init__(self, request_id: str = "unknown"):
        """
        Initialize the service with a request ID for logging.

        Args:
            request_id: Request correlation ID for logging
        """
        self.request_id = request_id

    def get_hold_history(
        self,
        header_id: int,
        line_id: Optional[int] = None,
    ) -> OrderHoldHistoryListResponse:
        """
        Retrieve order hold history for a given header_id and optional line_id.

        The query returns hold history at header level (line_id IS NULL) always,
        and optionally includes line-level holds when line_id is provided.

        Args:
            header_id: Order header ID (required)
            line_id: Order line ID (optional, when provided includes line-level holds)

        Returns:
            OrderHoldHistoryListResponse with list of hold history records
        """
        logger.info(
            f"[{self.request_id}] Fetching order hold history for "
            f"header_id={header_id}, line_id={line_id}"
        )
        start_time = time.perf_counter()

        # Build SQL query based on whether line_id is provided
        if line_id is not None:
            # Include both header-level and line-level holds
            sql = """
                SELECT held_by,
                       hold_name,
                       HOLD_ENTITY_CODE_VALUE AS holdlevel,
                       APPLIED_DATE,
                       APPLIED_BY,
                       RELEASED_FLAG,
                       RELEASED_DATE,
                       RELEASED_BY,
                       RELEASE_REASON_CODE,
                       RELEASE_COMMENT
                  FROM oe_holds_history_v
                 WHERE header_id = :header_id
                   AND line_id IS NULL
                 UNION
                SELECT held_by,
                       hold_name,
                       HOLD_ENTITY_CODE_VALUE AS holdlevel,
                       APPLIED_DATE,
                       APPLIED_BY,
                       RELEASED_FLAG,
                       RELEASED_DATE,
                       RELEASED_BY,
                       RELEASE_REASON_CODE,
                       RELEASE_COMMENT
                  FROM oe_holds_history_v
                 WHERE header_id = :header_id
                   AND line_id = :line_id
                 ORDER BY APPLIED_DATE
            """
            params = {"header_id": header_id, "line_id": line_id}
        else:
            # Only header-level holds
            sql = """
                SELECT held_by,
                       hold_name,
                       HOLD_ENTITY_CODE_VALUE AS holdlevel,
                       APPLIED_DATE,
                       APPLIED_BY,
                       RELEASED_FLAG,
                       RELEASED_DATE,
                       RELEASED_BY,
                       RELEASE_REASON_CODE,
                       RELEASE_COMMENT
                  FROM oe_holds_history_v
                 WHERE header_id = :header_id
                   AND line_id IS NULL
                 ORDER BY APPLIED_DATE
            """
            params = {"header_id": header_id}

        records: list[OrderHoldHistory] = []

        with get_oracle_connection(self.request_id) as connection:
            with connection.cursor() as cursor:
                logger.debug(
                    f"[{self.request_id}] Executing order hold history query with params: {params}"
                )
                cursor.execute(sql, params)

                # Get column names from cursor description
                columns = [col[0].lower() for col in cursor.description]

                for row in cursor:
                    row_dict = dict(zip(columns, row))
                    records.append(self._map_row_to_model(row_dict))

        elapsed_time = time.perf_counter() - start_time
        logger.info(
            f"[{self.request_id}] Fetched {len(records)} hold history records "
            f"in {elapsed_time:.3f}s"
        )

        return OrderHoldHistoryListResponse(
            data=records,
            total=len(records),
            header_id=header_id,
            line_id=line_id,
        )

    def _map_row_to_model(self, row_dict: dict) -> OrderHoldHistory:
        """
        Map a database row dictionary to OrderHoldHistory model.

        Args:
            row_dict: Dictionary with column names as keys

        Returns:
            OrderHoldHistory instance
        """
        return OrderHoldHistory(
            held_by=row_dict.get("held_by"),
            hold_name=row_dict.get("hold_name"),
            hold_level=row_dict.get("holdlevel"),
            applied_date=row_dict.get("applied_date"),
            applied_by=row_dict.get("applied_by"),
            released_flag=row_dict.get("released_flag"),
            released_date=row_dict.get("released_date"),
            released_by=row_dict.get("released_by"),
            release_reason_code=row_dict.get("release_reason_code"),
            release_comment=row_dict.get("release_comment"),
        )
