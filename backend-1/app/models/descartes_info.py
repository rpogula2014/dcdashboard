"""Pydantic models for Descartes info data."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class RoutePlan(BaseModel):
    """Model representing a route plan record from Descartes."""

    route_id: int = Field(...,description="Route identifier",)
    route_name: Optional[str] = Field(None,description="Route name",)
    schedule_key: Optional[str] = Field(None,description="Schedule key",)
    driver_key: Optional[str] = Field( None,description="Driver key",)
    truck_key: Optional[str] = Field(None,description="Truck key",    )
    process_code: Optional[str] = Field(None,description="Process code",    )
    trip_id: Optional[int] = Field(None,description="Trip identifier",)
    route_start_date: Optional[datetime] = Field(None,description="Route start date and time",)
    location_key: Optional[str] = Field(None,description="Location key",)
    location_type: Optional[str] = Field(None,description="Location type",)
    location_name: Optional[str] = Field(None,description="Location name",)
    stop_number: Optional[int] = Field(None,description="Stop number in the route",)
    order_number: Optional[int] = Field( None, description="Order number", )
    linenum: Optional[str] = Field( None, description="Line number and shipment number (format: line.shipment)", )
    order_type: Optional[str] = Field( None, description="Order type", )
    delivery_id: Optional[str] = Field( None, description="Delivery identifier", )
    ordered_item: Optional[str] = Field(None,description="Ordered item",)
    quantity: Optional[float] = Field(None,description="Quantity",)
    order_key: Optional[str] = Field(None,description="Order key",)
    product_key: Optional[str] = Field(None,description="Product key",)
    back_order_flag: Optional[str] = Field(None,description="Back order flag",)

    class Config:"""Pydantic configuration."""
from_attributes = Truepopulate_by_name = True


class RoutePlanListResponse(BaseModel):
    """Response model for list of route plan records."""

    data: list[RoutePlan] = Field(default_factory=list,description="List of route plan records",
    )
    total: int = Field(...,description="Total number of records",
    )
    dcid: int = Field(...,description="DC/Organization ID queried",
    )


class DescartesInfo(BaseModel):
    """Model representing Descartes payload information."""

    payload_id: Optional[int] = Field(None,description="Payload ID",
    )
    msg_id: Optional[str] = Field(None,description="Message ID",
    )
    message_purpose: Optional[str] = Field(None,description="Message purpose",
    )
    earliest_date: Optional[datetime] = Field(None,alias="earliestdate",description="Earliest date",
    )
    latest_date: Optional[datetime] = Field(None,alias="latestdate",description="Latest date",
    )
    profit_value: Optional[float] = Field(None,alias="profitvalue",description="Profit value",
    )
    send_time: Optional[datetime] = Field(None,alias="sendtime",description="Send time",
    )
    qty: Optional[float] = Field(None,description="Quantity",
    )

    class Config:"""Pydantic configuration."""
from_attributes = Truepopulate_by_name = True


class DescartesInfoListResponse(BaseModel):
    """Response model for list of Descartes info records."""

    data: list[DescartesInfo] = Field(default_factory=list,description="List of Descartes info records",
    )
    total: int = Field(...,description="Total number of records",
    )
    order_number: int = Field(...,description="Order number queried",
    )
    line_id: int = Field(...,description="Line ID queried",
    )
