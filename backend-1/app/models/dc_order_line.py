from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class DCOpenOrderLine(BaseModel):
    """
    Model representing an open DC order line from Oracle EBS.

    Contains all fields from the open DC order lines query including
    order details, shipping information, and status flags.
    """

    # Order identification
    ordered_date: Optional[datetime] = Field(None, description="Date the order was placed")
    line_category_code: Optional[str] = Field(None, description="Line category code")
    ordered_item: Optional[str] = Field(None, description="Ordered item number/SKU")
    order_category: Optional[str] = Field( None, description="Order category: INTERNAL ORDER or CUSTOMER ORDER" )
    inventory_item_id: Optional[int] = Field(None, description="Inventory item ID")
    orig_sys_document_ref: Optional[str] = Field(None, description="Original system document reference")
    order_number: Optional[int] = Field(None, description="Order number")
    line_id: Optional[int] = Field(None, description="Order line ID")
    shipping_instructions: Optional[str] = Field(None, description="Shipping instructions")
    line: Optional[str] = Field(None, description="Line number.shipment number")
    schedule_ship_date: Optional[datetime] = Field(None, description="Scheduled ship date")
    ordered_quantity: Optional[int] = Field(None, description="Ordered quantity")
    reserved_qty: Optional[int] = Field(None, description="Reserved quantity")
    shipping_method_code: Optional[str] = Field(None, description="Shipping method code")
    iso: Optional[str] = Field(None, description="Internal sales order reference (attribute8)")
    fulfillment_type: Optional[str] = Field(None, description="Fulfillment type (attribute17)")
    order_type: Optional[str] = Field(None, description="Order type (line type without 'Line')")
    price_list: Optional[str] = Field(None, description="Price list name")
    sold_to: Optional[str] = Field(None, description="Sold to customer")
    dc: Optional[str] = Field(None, description="DC/Ship from location")
    ship_to: Optional[str] = Field(None, description="Ship to customer")
    ship_to_address1: Optional[str] = Field(None, description="Ship to address line 1")
    ship_to_address5: Optional[str] = Field(None, description="Ship to address line 5")
    set_name: Optional[str] = Field(None, description="Ship set name")
    header_id: Optional[int] = Field(None, description="Order header ID")
    ship_to_addressee: Optional[str] = Field(None, description="Ship to addressee")
    delivery_id: Optional[int] = Field(None, description="Delivery ID")
    original_line_status: Optional[str] = Field( None, description="line status (Ready to Release, Backordered, Release to Warehouse, Staged/Pick Confirmed, Shipped)" )

    # Status flags
    hold_applied: Optional[str] = Field(None, description="Y/N flag if hold was applied")
    hold_released: Optional[str] = Field(None, description="Y/N flag if hold was released")
    routed: Optional[str] = Field(None, description="Y/N flag if order is routed (Sent to descartes routing system from oracle)")
    productgrp: Optional[str] = Field(None, description="item Product group")
    vendor: Optional[str] = Field(None, description="item Vendor")
    style: Optional[str] = Field(None, description="item Style")
    item_description: Optional[str] = Field(None, description="item Description")
    trip_id: Optional[int] = Field(None, description="Trip ID")
    localplusqtyexists: Optional[str] = Field(None, description="Y/N flag if local+ quantity exists")
    localplusqty: Optional[float] = Field(None, description="Local+ quantity")
    planned: Optional[str] = Field(None, description="Y/N flag if order is planned (Sent to oracle from  descartes routing system)")
    

    class Config:
        """Pydantic model configuration."""

        from_attributes = True
        json_schema_extra = {
            "example": {
                "ordered_date": "2024-11-15T10:30:00",
                "line_category_code": "ORDER",
                "ordered_item": "ABC123",
                "order_category": "CUSTOMER ORDER",
                "inventory_item_id": 12345,
                "orig_sys_document_ref": "REF001",
                "order_number": 100001,
                "line_id": 200001,
                "shipping_instructions": "Handle with care",
                "line": "1.1",
                "schedule_ship_date": "2024-11-20T00:00:00",
                "ordered_quantity": 10.0,
                "reserved_qty": 10.0,
                "shipping_method_code": "GROUND",
                "iso": None,
                "fulfillment_type": "STANDARD",
                "order_type": "ATD Standard ",
                "price_list": "STANDARD",
                "sold_to": "CUSTOMER001",
                "dc": "DC01",
                "ship_to": "LOCATION001",
                "ship_to_address1": "123 Main St",
                "ship_to_address5": "12345",
                "set_name": None,
                "header_id": 300001,
                "ship_to_addressee": "",
                "delivery_id": 400001,
                "original_line_status": "Ready to Release",
                "requested_quantity": 10.0,
                "hold_applied": "N",
                "hold_released": "N",
                "routed": "Y",
                "planned": "Y",
            }
        }


class DCOpenOrderLineListResponse(BaseModel):
    """Response model for list of open DC order lines."""

    data: list[DCOpenOrderLine]
    total: int = Field(description="Total number of records returned")
    days_back: int = Field(description="Number of days back used in query")
