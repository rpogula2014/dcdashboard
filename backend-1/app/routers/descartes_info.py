"""Router for Descartes info endpoints."""

from fastapi import APIRouter, Query, Request
from loguru import logger

from app.models.descartes_info import DescartesInfoListResponse
from app.services.descartes_info_service import DescartesInfoService


router = APIRouter(prefix="/descartes", tags=["Descartes"])


@router.get("/info", response_model=DescartesInfoListResponse)
async def get_descartes_info(
    request: Request,
    order_number: int = Query(
        ...,
        description="Order number (required)",
        example=272093533,
    ),
    line_id: int = Query(
        ...,
        description="Line ID (required)",
        example=516646794,
    ),
) -> DescartesInfoListResponse:
    """
    Get Descartes payload information for an order line.

    Retrieves payload details from the XXATDMSA_DCARTORDER_OBPAYLOAD table,
    parsing JSON payload to extract BOL line information.

    Returns:
    - payload_id: Payload identifier
    - msg_id: Message identifier
    - earliest_date: Earliest delivery date
    - latest_date: Latest delivery date
    - profit_value: Profit value
    - send_time: Time payload was sent
    - qty: Quantity from JSON payload
    """
    request_id = getattr(request.state, "request_id", "unknown")

    logger.info(
        f"[{request_id}] GET /api/v1/descartes/info - "
        f"order_number={order_number}, line_id={line_id}"
    )

    service = DescartesInfoService(request_id)
    result = service.get_descartes_info(
        order_number=order_number,
        line_id=line_id,
    )

    logger.info(f"[{request_id}] Returning {result.total} Descartes info records")

    return result
