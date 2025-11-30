"""Router for DC location endpoints."""

from fastapi import APIRouter, Request
from loguru import logger

from app.models.dc_location import DCLocationListResponse
from app.services.dc_location_service import DCLocationService


router = APIRouter(prefix="/dc-locations", tags=["DC Locations"])


@router.get("", response_model=DCLocationListResponse)
async def get_dc_locations(request: Request) -> DCLocationListResponse:
    """
    Get all active DC/warehouse locations.

    Returns WMS-enabled organization locations, excluding:
    - Inactive locations
    - Wheels locations
    - Employee locations
    - Virtual locations
    - Tirebuyer locations
    - Various adjustment centers and special locations
    """
    request_id = getattr(request.state, "request_id", "unknown")

    logger.info(f"[{request_id}] GET /api/v1/dc-locations")

    service = DCLocationService(request_id)
    result = service.get_dc_locations()

    logger.info(f"[{request_id}] Returning {result.total} DC locations")

    return result
