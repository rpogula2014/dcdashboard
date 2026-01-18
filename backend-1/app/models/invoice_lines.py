from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class InvoiceLine(BaseModel):
    """
    Model representing an invoice line with tax information from Oracle EBS.

    Contains invoice header, line details, item information, and tax data.
    """

    # Invoice header information
    batchsource: Optional[str] = Field(None, description="Batch source name")
    trx_number: Optional[str] = Field(None, description="Transaction/invoice number")
    invtranstype: Optional[str] = Field(None, description="Transaction type name")
    shipmethod: Optional[str] = Field(None, description="Ship method")
    trx_date: Optional[datetime] = Field(None, description="Transaction date")
    customer_trx_id: Optional[int] = Field(None, description="Customer transaction ID")
    ordertype: Optional[str] = Field(None, description="Order type (interface header attribute 2)")
    billcustname: Optional[str] = Field(None, description="Bill to customer name")
    shipcustname: Optional[str] = Field(None, description="Ship to customer name")
    shiploc: Optional[str] = Field(None, description="Ship to location")

    # Line details
    line_number: Optional[int] = Field(None, description="Invoice line number")
    line_type: Optional[str] = Field(None, description="Line type (LINE or TAX)")
    quantity_invoiced: Optional[float] = Field(None, description="Quantity invoiced")
    extended_amount: Optional[float] = Field(None, description="Extended amount")
    unit_selling_price: Optional[float] = Field(None, description="Unit selling price")
    sales_order: Optional[str] = Field(None, description="Sales order number")
    sales_order_line: Optional[str] = Field(None, description="Sales order line number")
    customer_trx_line_id: Optional[int] = Field(None, description="Customer transaction line ID")

    # Item information
    item_number: Optional[str] = Field(None, description="Item number")
    productgrp: Optional[str] = Field(None, description="Product group with description")
    vendor: Optional[str] = Field(None, description="Vendor with description")
    style: Optional[str] = Field(None, description="Item style/category description")

    # Tax information
    tax_name: Optional[str] = Field(None, description="Tax name/full name")
    tax_rate: Optional[float] = Field(None, description="Tax rate percentage")

    class Config:
        """Pydantic model configuration."""

        from_attributes = True
        json_schema_extra = {
            "example": {
                "bs_batch_source_name": "AUTO_INVOICE",
                "trx_number": "INV-001234",
                "ctt_type_name": "Invoice",
                "ship_via": "GROUND",
                "trx_date": "2024-12-01T00:00:00",
                "customer_trx_id": 123456,
                "ordertype": "STANDARD",
                "billcustname": "ACME Corporation",
                "shipcustname": "ACME Corporation - Warehouse",
                "shiploc": "MAIN",
                "line_number": 1,
                "line_type": "LINE",
                "quantity_invoiced": 10.0,
                "extended_amount": 1500.00,
                "unit_selling_price": 150.00,
                "sales_order": "SO-100001",
                "sales_order_line": "1.1",
                "customer_trx_line_id": 789012,
                "item_number": "TIRE-001",
                "productgrp": "TIRES-Passenger Tires",
                "vendor": "VENDOR01-Example Vendor",
                "style": "All Season",
                "tax_name": None,
                "tax_rate": None,
            }
        }


class InvoiceLineListResponse(BaseModel):
    """Response model for list of invoice lines."""

    data: list[InvoiceLine]
    total: int = Field(description="Total number of records returned")
    dcid: int = Field(description="Distribution center ID used in query")
