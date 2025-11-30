from typing import Optional

from pydantic import BaseModel, Field


class NetworkInventoryItem(BaseModel):
    """
    Model representing a network inventory record from Oracle EBS.

    Contains inventory quantity information for a specific item at a DC location,
    including both local DC inventory and LocalPlus DC inventory.
    """

    dc: str = Field(
        description="DC type indicator: 'Local' for local DC or 'Local+' for LocalPlus DC"
    )
    organization_code: Optional[str] = Field(
        None, description="Organization code for the DC"
    )
    local_qty: Optional[float] = Field(
        None, description="Local inventory quantity available"
    )

    class Config:
        """Pydantic model configuration."""

        from_attributes = True
        json_schema_extra = {
            "example": {
                "dc": "Local",
                "organization_code": "DC01",
                "local_qty": 150.0,
            }
        }


class NetworkInventoryListResponse(BaseModel):
    """Response model for list of network inventory records."""

    data: list[NetworkInventoryItem]
    total: int = Field(description="Total number of records returned")
    dcid: int = Field(description="DC/Organization ID used in query")
    itemid: int = Field(description="Inventory item ID used in query")
