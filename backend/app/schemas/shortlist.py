"""Schemas for named shortlist creation, management, membership, and CSV export."""
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field
from app.schemas.contact import ContactResponse


class ShortlistCreate(BaseModel):
    """Payload to create a new named shortlist."""
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=255)


class ShortlistUpdate(BaseModel):
    """Payload to rename or update shortlist description."""
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=255)


class ShortlistResponse(BaseModel):
    """Summary representation of a shortlist."""
    id: str
    user_id: str
    name: str
    description: Optional[str] = None
    items_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ShortlistDetailResponse(BaseModel):
    """Detailed shortlist response with contact entities."""
    id: str
    user_id: str
    name: str
    description: Optional[str] = None
    contacts: List[ContactResponse] = []
    created_at: datetime
    updated_at: datetime


class ManageContactsPayload(BaseModel):
    """Payload to add or remove contacts from a shortlist."""
    contact_ids: List[str] = Field(min_length=1)
    action: str = Field(default="add", pattern="^(add|remove)$")
