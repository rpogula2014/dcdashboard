"""Router for trip exception endpoints."""

from fastapi import APIRouter, Query, Request
from loguru import logger

from app.models.trip_exception import OpenTripExceptionListResponse
from app.services.trip_exception_service import TripExceptionService


router = APIRouter(prefix="/exceptions", tags=["Exceptions"])


@router.get("/open-trips", response_model=OpenTripExceptionListResponse)
async def get_open_trip_exceptions(
    request: Request,
    org_id: int = Query(
        ...,
        description="Organization ID (required)",
        example=121,
    ),
) -> OpenTripExceptionListResponse:
    """
    Get open trip exceptions for an organization.

    Retrieves trips that have not been successfully processed (status not 'S')
    from the past 2 days, along with associated open order lines and route information.

    Returns:
    - noofopenlines: Number of open order lines for the trip
    - route_id: Route identifier
    - trip_id: Trip identifier
    - issueorder: Comma-separated list of issue orders (order_number-line_number.shipment_number)
    - mdsprocessstatus: MDS process status
    - mdsprocessmsg: MDS process message
    - route_description: Route description
    - driver1: Primary driver name
    - tractionstatus: Traction process status
    - tractionmsg: Traction process message
    """
    request_id = getattr(request.state, "request_id", "unknown")

    logger.info(
        f"[{request_id}] GET /api/v1/exceptions/open-trips - org_id={org_id}"
    )

    service = TripExceptionService(request_id)
    result = service.get_open_trip_exceptions(org_id=org_id)

    logger.info(f"[{request_id}] Returning {result.total} open trip exception records")

    return result
