"""JobOpening schemas."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class JobOpeningCreate(BaseModel):
    """Payload to record a target job opening manually."""
    company: str = Field(..., min_length=1, max_length=255)
    title: str = Field(..., min_length=1, max_length=255)
    url: Optional[str] = Field(None, max_length=500)
    notes: Optional[str] = None
    status: str = Field("active", max_length=50)


class JobOpeningUpdate(BaseModel):
    """Payload to update an existing job opening record."""
    company: Optional[str] = None
    title: Optional[str] = None
    url: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class JobOpeningResponse(BaseModel):
    """Schema representing a user's tracked job opening."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    company: str
    title: str
    url: Optional[str] = None
    career_page_url: Optional[str] = None
    notes: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime
