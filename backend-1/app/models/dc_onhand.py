from typing import Optional

from pydantic import BaseModel, Field


class DCOnhandItem(BaseModel):
    """
    Model representing a DC onhand inventory record from Oracle EBS.

    Contains onhand quantity information including item details, locator,
    product group, vendor, and style information.
    """

    inventory_item_id: Optional[int] = Field(None, description="Inventory item ID")
    itemnumber: Optional[str] = Field(None, description="Item number (segment1)")
    item_description: Optional[str] = Field(None, description="Item description")
    subinventory_code: Optional[str] = Field(None, description="Subinventory code")
    quantity: Optional[float] = Field(None, description="Onhand quantity")
    locator: Optional[str] = Field(None, description="Locator concatenated segments")
    aisle: Optional[str] = Field(None, description="Aisle (segment1 from locator)")
    customsubinventory: Optional[str] = Field(None, description="Locator custom subinventory")
    vendor: Optional[str] = Field(None, description="Vendor code with description")
    product_group: Optional[str] = Field(None, description="Product group code")
    productgrp_display: Optional[str] = Field(None, description="Product group with description")
    vendor_display: Optional[str] = Field(None, description="Vendor with description")
    style: Optional[str] = Field(None, description="Style from category")

    class Config:
        """Pydantic model configuration."""

        from_attributes = True
        json_schema_extra = {
            "example": {
                "inventory_item_id": 12345,
                "itemnumber": "ABC123",
                "item_description": "Sample Item",
                "subinventory_code": "STAGE",
                "quantity": 100.0,
                "locator": "A.01.01.01",
                "aisle": "A",
                "attribute7": "BULK",
                "vendor": "001",
                "product_group": "TBR",
                "productgrp_display": "TBR-Truck/Bus Radial",
                "vendor_display": "001-Vendor Name",
                "style": "Performance",
            }
        }


class DCOnhandListResponse(BaseModel):
    """Response model for list of DC onhand inventory records."""

    data: list[DCOnhandItem]
    total: int = Field(description="Total number of records returned")
    dcid: int = Field(description="DC/Organization ID used in query")
