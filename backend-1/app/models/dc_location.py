"""Pydantic models for DC location data."""

from pydantic import BaseModel, Field


class DCLocation(BaseModel):
    """Model representing a DC/warehouse location."""

    organization_code: str = Field(
        ...,
        description="Organization code",
        example="ATD",
    )
    location_code: str = Field(
        ...,
        description="Location code/name",
        example="084 DENVER",
    )
    organization_id: int = Field(
        ...,
        description="Organization ID",
        example=84,
    )

    class Config:
        """Pydantic configuration."""

        from_attributes = True


class DCLocationListResponse(BaseModel):
    """Response model for list of DC locations."""

    data: list[DCLocation] = Field(
        default_factory=list,
        description="List of DC locations",
    )
    total: int = Field(
        ...,
        description="Total number of locations",
        example=50,
    )
