"""Pydantic models for Descartes info data."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class DescartesInfo(BaseModel):
    """Model representing Descartes payload information."""

    payload_id: Optional[int] = Field(
        None,
        description="Payload ID",
    )
    msg_id: Optional[str] = Field(
        None,
        description="Message ID",
    )
    message_purpose: Optional[str] = Field(
        None,
        description="Message purpose",
    )
    earliest_date: Optional[datetime] = Field(
        None,
        alias="earliestdate",
        description="Earliest date",
    )
    latest_date: Optional[datetime] = Field(
        None,
        alias="latestdate",
        description="Latest date",
    )
    profit_value: Optional[float] = Field(
        None,
        alias="profitvalue",
        description="Profit value",
    )
    send_time: Optional[datetime] = Field(
        None,
        alias="sendtime",
        description="Send time",
    )
    qty: Optional[float] = Field(
        None,
        description="Quantity",
    )

    class Config:
        """Pydantic configuration."""

        from_attributes = True
        populate_by_name = True


class DescartesInfoListResponse(BaseModel):
    """Response model for list of Descartes info records."""

    data: list[DescartesInfo] = Field(
        default_factory=list,
        description="List of Descartes info records",
    )
    total: int = Field(
        ...,
        description="Total number of records",
    )
    order_number: int = Field(
        ...,
        description="Order number queried",
    )
    line_id: int = Field(
        ...,
        description="Line ID queried",
    )
