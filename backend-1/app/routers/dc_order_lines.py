from typing import Optional

from fastapi import APIRouter, Query, Request
from loguru import logger

from app.models.dc_order_line import DCOpenOrderLineListResponse
from app.services.dc_order_line_service import DCOrderLineService


router = APIRouter(prefix="/dc-order-lines", tags=["DC Order Lines"])


@router.get("/open", response_model=DCOpenOrderLineListResponse)
async def get_open_dc_order_lines(
    request: Request,
    order_number: Optional[int] = Query(
        None,
        description="Filter by specific order number",
        example=100001,
    ),
    ordered_item: Optional[str] = Query(
        None,
        description="Filter by item (partial match, case-insensitive)",
        example="ABC123",
    ),
    dc: int = Query(
        ...,
        ge=1,
        description="DC/ship_from organization id (required)",
        example=84,
    ),
    days_back: int = Query(
        60,
        ge=1,
        le=365,
        description="Number of days to look back for orders (1-365)",
    ),
) -> DCOpenOrderLineListResponse:
    """
    Get all open DC order lines.

    Retrieves open order lines from the DC (Distribution Center) with ship_from_org_id = 84.
    Results can be filtered by order number, item, DC location, and date range.

    The query includes:
    - Order and line details
    - Reservation quantities
    - Shipping information
    - Delivery status
    - Hold status (applied/released)
    - Routing status

    **Excluded line types:**
    - ATD Bill Only Line
    - ATD Vendor Direct Ship Line
    - ATD STHVendor Direct Ship Line
    """
    request_id = getattr(request.state, "request_id", "unknown")

    logger.info(
        f"[{request_id}] GET /api/v1/dc-order-lines/open - "
        f"order_number={order_number}, ordered_item={ordered_item}, "
        f"dc={dc}, days_back={days_back}"
    )

    service = DCOrderLineService(request_id)
    result = service.get_open_order_lines(
        order_number=order_number,
        ordered_item=ordered_item,
        dc=dc,
        days_back=days_back,
    )

    logger.info(f"[{request_id}] Returning {result.total} open order lines")

    return result
