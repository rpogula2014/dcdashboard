"""Router for order hold history endpoints."""

from typing import Optional

from fastapi import APIRouter, Query, Request
from loguru import logger

from app.models.order_hold_history import OrderHoldHistoryListResponse
from app.services.order_hold_history_service import OrderHoldHistoryService


router = APIRouter(prefix="/order-holds", tags=["Order Holds"])


@router.get("/history", response_model=OrderHoldHistoryListResponse)
async def get_order_hold_history(
    request: Request,
    header_id: int = Query(
        ...,
        description="Order header ID (required)",
        example=12345678,
    ),
    line_id: Optional[int] = Query(
        None,
        description="Order line ID (optional - when provided, includes line-level holds)",
        example=87654321,
    ),
) -> OrderHoldHistoryListResponse:
    """
    Get order hold history for a specific order.

    Retrieves hold history from the OE_HOLDS_HISTORY_V view in Oracle EBS.

    **Behavior:**
    - Always returns header-level holds (where line_id IS NULL)
    - When `line_id` is provided, also includes line-level holds for that specific line

    **Response includes:**
    - held_by: User or process that placed the hold
    - hold_name: Name/type of the hold
    - hold_level: Hold entity code value (header/line level indicator)
    - applied_date: When the hold was applied
    - applied_by: User who applied the hold
    - released_flag: Y/N indicating if the hold has been released
    - released_date: When the hold was released
    - released_by: User who released the hold
    - release_reason_code: Reason code for release
    - release_comment: Comment provided during release

    Results are ordered by applied_date.
    """
    request_id = getattr(request.state, "request_id", "unknown")

    logger.info(
        f"[{request_id}] GET /api/v1/order-holds/history - "
        f"header_id={header_id}, line_id={line_id}"
    )

    service = OrderHoldHistoryService(request_id)
    result = service.get_hold_history(
        header_id=header_id,
        line_id=line_id,
    )

    logger.info(f"[{request_id}] Returning {result.total} hold history records")

    return result
