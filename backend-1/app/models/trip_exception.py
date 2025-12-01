"""Pydantic models for trip exception data."""

from typing import Optional

from pydantic import BaseModel, Field


class OpenTripException(BaseModel):
    """Model representing an open trip exception record."""

    noofopenlines: int = Field(
        ...,
        description="Number of open lines for the trip",
    )
    route_id: Optional[int] = Field(
        None,
        description="Route ID",
    )
    trip_id: int = Field(
        ...,
        description="Trip ID",
    )
    issueorder: Optional[str] = Field(
        None,
        description="Comma-separated list of issue orders (order_number-line_number.shipment_number)",
    )
    mdsprocessstatus: Optional[str] = Field(
        None,
        description="MDS process status",
    )
    mdsprocessmsg: Optional[str] = Field(
        None,
        description="MDS process message",
    )
    route_description: Optional[str] = Field(
        None,
        description="Route description",
    )
    driver1: Optional[str] = Field(
        None,
        description="Primary driver name",
    )
    tractionstatus: Optional[str] = Field(
        None,
        description="Traction process status",
    )
    tractionmsg: Optional[str] = Field(
        None,
        description="Traction process message",
    )

    class Config:
        """Pydantic configuration."""

        from_attributes = True
        populate_by_name = True


class OpenTripExceptionListResponse(BaseModel):
    """Response model for list of open trip exception records."""

    data: list[OpenTripException] = Field(
        default_factory=list,
        description="List of open trip exception records",
    )
    total: int = Field(
        ...,
        description="Total number of records",
    )
    org_id: int = Field(
        ...,
        description="Organization ID queried",
    )
