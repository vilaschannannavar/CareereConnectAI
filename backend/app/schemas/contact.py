"""Schemas for contact management."""
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class ContactCreate(BaseModel):
    """Payload to create or ingest a contact."""
    first_name: str = Field(min_length=1, max_length=100)
    last_name: Optional[str] = Field(default="", max_length=100)
    profile_url: Optional[str] = Field(default="", max_length=500)
    email: Optional[str] = Field(default=None, max_length=255)
    company: Optional[str] = Field(default="Unknown", max_length=255)
    position: Optional[str] = Field(default="Unknown", max_length=255)
    connected_on: Optional[str] = Field(default=None, max_length=50)
    notes: Optional[str] = None


class ContactUpdate(BaseModel):
    """Payload to update an existing contact."""
    first_name: Optional[str] = Field(default=None, max_length=100)
    last_name: Optional[str] = Field(default=None, max_length=100)
    profile_url: Optional[str] = Field(default=None, max_length=500)
    email: Optional[str] = Field(default=None, max_length=255)
    company: Optional[str] = Field(default=None, max_length=255)
    position: Optional[str] = Field(default=None, max_length=255)
    connected_on: Optional[str] = Field(default=None, max_length=50)
    notes: Optional[str] = None
    is_archived: Optional[bool] = None


class ContactResponse(BaseModel):
    """Contact response schema."""
    id: str
    user_id: str
    first_name: str
    last_name: str
    profile_url: str
    profile_url_normalized: str
    email: Optional[str] = None
    company: str
    position: str
    connected_on: Optional[str] = None
    notes: Optional[str] = None
    is_archived: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ContactListResponse(BaseModel):
    """Paginated contact list response."""
    items: List[ContactResponse]
    total: int
    page: int
    size: int


class CSVPreviewResponse(BaseModel):
    """CSV preview and column mapping suggestions response."""
    preamble_lines_stripped: int
    headers: List[str]
    preview: List[dict]
    total_rows: int
    mapping_suggestions: dict


class CSVImportResponse(BaseModel):
    """Result of importing contacts CSV."""
    total: int
    added: int
    updated: int

