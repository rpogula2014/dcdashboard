"""Router for Descartes info endpoints."""

from fastapi import APIRouter, Query, Request
from loguru import logger

from app.models.descartes_info import DescartesInfoListResponse, RoutePlanListResponse
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


@router.get("/route-plans", response_model=RoutePlanListResponse)
async def get_route_plans(
    request: Request,
    dcid: int = Query(
        ...,
        description="DC/Organization ID (SHIP_FROM_ORG_ID)",
        example=85,
    ),
) -> RoutePlanListResponse:
    """
    Get route plan data for a specific DC/organization.

    Retrieves route plan information from Descartes route planning tables,
    including route details, stops, and order line information for routes
    created today.

    Returns:
    - route_id: Route identifier
    - route_name: Route name
    - schedule_key: Schedule key
    - driver_key: Driver key
    - truck_key: Truck key
    - process_code: Process code
    - trip_id: Trip identifier
    - route_start_date: Route start date and time
    - location_key: Location key
    - location_type: Location type
    - location_name: Location name
    - stop_number: Stop number in the route
    - order_number: Order number
    - linenum: Line number and shipment number (format: line.shipment)
    - delivery_id: Delivery identifier
    - ordered_item: Ordered item
    - quantity: Quantity
    - order_key: Order key
    - product_key: Product key
    - back_order_flag: Back order flag
    """
    request_id = getattr(request.state, "request_id", "unknown")

    logger.info(
        f"[{request_id}] GET /api/v1/descartes/route-plans - dcid={dcid}"
    )

    service = DescartesInfoService(request_id)
    result = service.get_route_plans(dcid=dcid)

    logger.info(f"[{request_id}] Returning {result.total} route plan records")

    return result
