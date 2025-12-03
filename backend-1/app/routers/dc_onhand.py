from fastapi import APIRouter, Query, Request
from loguru import logger

from app.models.dc_onhand import DCOnhandListResponse
from app.services.dc_onhand_service import DCOnhandService


router = APIRouter(prefix="/inventory", tags=["Inventory"])


@router.get("/dc-onhand", response_model=DCOnhandListResponse)
async def get_dc_onhand(
    request: Request,
    dcid: int = Query(
        ...,
        ge=1,
        description="DC/Organization ID (required)",
        example=132,
    ),
) -> DCOnhandListResponse:
    """
    Get DC onhand inventory for a specific DC.

    Retrieves onhand inventory quantities with detailed item information including
    product group, vendor, and style.

    **Response includes:**
    - Item details (item number, description)
    - Locator information (subinventory, locator, aisle)
    - Quantity on hand
    - Product group with description
    - Vendor with description
    - Style from category

    **Tables queried:**
    - mtl_onhand_quantities_detail: Main onhand data
    - mtl_item_locations_kfv: Locator information
    - mtl_system_items_b: Item master data
    - xxatdmrp_item_elements_v: Item elements (vendor, product group)
    - fnd_flex_values_vl/fnd_flex_value_sets: Flex value descriptions
    - mtl_item_categories/mtl_categories: Style categories

    **Parameters:**
    - **dcid**: The DC/organization ID to query onhand for
    """
    request_id = getattr(request.state, "request_id", "unknown")

    logger.info(f"[{request_id}] GET /api/v1/inventory/dc-onhand - dcid={dcid}")

    service = DCOnhandService(request_id)
    result = service.get_dc_onhand(dcid=dcid)

    logger.info(f"[{request_id}] Returning {result.total} DC onhand records")

    return result
