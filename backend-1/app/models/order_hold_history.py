"""Pydantic models for order hold history data."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class OrderHoldHistory(BaseModel):
    """Model representing an order hold history record from Oracle EBS."""

    held_by: Optional[str] = Field(
        None,
        description="User or process that placed the hold",
    )
    hold_name: Optional[str] = Field(
        None,
        description="Name/type of the hold",
    )
    hold_level: Optional[str] = Field(
        None,
        alias="holdlevel",
        description="Hold entity code value indicating the level (header/line)",
    )
    applied_date: Optional[datetime] = Field(
        None,
        description="Date when the hold was applied",
    )
    applied_by: Optional[str] = Field(
        None,
        description="User who applied the hold",
    )
    released_flag: Optional[str] = Field(
        None,
        description="Y/N flag indicating if hold has been released",
    )
    released_date: Optional[datetime] = Field(
        None,
        description="Date when the hold was released",
    )
    released_by: Optional[str] = Field(
        None,
        description="User who released the hold",
    )
    release_reason_code: Optional[str] = Field(
        None,
        description="Reason code for releasing the hold",
    )
    release_comment: Optional[str] = Field(
        None,
        description="Comment provided when releasing the hold",
    )

    class Config:
        """Pydantic configuration."""

        from_attributes = True
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "held_by": "SYSTEM",
                "hold_name": "Credit Check Hold",
                "hold_level": "ORDER",
                "applied_date": "2024-11-15T10:30:00",
                "applied_by": "ADMIN_USER",
                "released_flag": "Y",
                "released_date": "2024-11-16T14:00:00",
                "released_by": "CREDIT_MGR",
                "release_reason_code": "APPROVED",
                "release_comment": "Credit approved after review",
            }
        }


class OrderHoldHistoryListResponse(BaseModel):
    """Response model for list of order hold history records."""

    data: list[OrderHoldHistory] = Field(
        default_factory=list,
        description="List of order hold history records",
    )
    total: int = Field(
        ...,
        description="Total number of records returned",
    )
    header_id: int = Field(
        ...,
        description="Order header ID queried",
    )
    line_id: Optional[int] = Field(
        None,
        description="Order line ID queried (if provided)",
    )
