from fastapi import APIRouter, Query, Request
from loguru import logger

from app.models.network_inventory import NetworkInventoryListResponse
from app.services.network_inventory_service import NetworkInventoryService


router = APIRouter(prefix="/network-inventory", tags=["Network Inventory"])


@router.get("/", response_model=NetworkInventoryListResponse)
async def get_network_inventory(
    request: Request,
    dcid: int = Query(
        ...,
        ge=1,
        description="DC/Organization ID (required)",
        example=84,
    ),
    itemid: int = Query(
        ...,
        ge=1,
        description="Inventory item ID (required)",
        example=12345,
    ),
) -> NetworkInventoryListResponse:
    """
    Get network inventory for a specific DC and item.

    Retrieves inventory quantities from the network inventory tables for both
    Local DC and LocalPlus DC locations.

    **Response includes:**
    - Local DC inventory (dc='Local'): Inventory at the specified DC
    - LocalPlus DC inventory (dc='Local+'): Inventory at associated LocalPlus DCs
      (only records with local_qty > 0)

    **Tables queried:**
    - xxatdont_network_inventory: Main inventory data
    - mtl_parameters: Organization codes for local DC
    - xxatdont_localplus_dc: LocalPlus DC associations

    **Parameters:**
    - **dcid**: The DC/organization ID to query inventory for
    - **itemid**: The specific inventory item ID to look up
    """
    request_id = getattr(request.state, "request_id", "unknown")

    logger.info(
        f"[{request_id}] GET /api/v1/network-inventory - dcid={dcid}, itemid={itemid}"
    )

    service = NetworkInventoryService(request_id)
    result = service.get_network_inventory(dcid=dcid, itemid=itemid)

    logger.info(f"[{request_id}] Returning {result.total} network inventory records")

    return result
