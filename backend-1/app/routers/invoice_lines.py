from fastapi import APIRouter, Query, Request
from loguru import logger

from app.models.invoice_lines import InvoiceLineListResponse
from app.services.invoice_lines_service import InvoiceLinesService


router = APIRouter(prefix="/invoice-lines", tags=["Invoice Lines"])


@router.get("/", response_model=InvoiceLineListResponse)
async def get_invoice_lines(
    request: Request,
    dcid: int = Query(
        ...,
        ge=1,
        description="Distribution Center ID (warehouse_id) - required",
        example=84,
    ),
) -> InvoiceLineListResponse:
    """
    Get invoice lines with tax information for a distribution center.

    Retrieves invoice line data from today onwards for the specified DC.
    Results include both regular invoice lines (LINE type) and associated
    tax lines with tax details.

    The query returns:
    - Invoice header information (transaction number, date, customer)
    - Line details (quantity, amounts, sales order reference)
    - Item information (product group, vendor, style)
    - Tax information (tax name, tax rate) for tax lines

    **Line Types:**
    - LINE: Regular invoice lines with item information
    - TAX: Tax lines with tax name and rate

    Results are ordered by transaction number, customer transaction line ID,
    and line type for proper grouping of invoice lines with their tax details.
    """
    request_id = getattr(request.state, "request_id", "unknown")

    logger.info(f"[{request_id}] GET /api/v1/invoice-lines - dcid={dcid}")

    service = InvoiceLinesService(request_id)
    result = service.get_invoice_lines(dcid=dcid)

    logger.info(f"[{request_id}] Returning {result.total} invoice lines")

    return result
