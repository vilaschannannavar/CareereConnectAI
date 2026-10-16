"""Schemas for resume management."""
from typing import Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel


class ResumeResponse(BaseModel):
    """Resume metadata response."""
    id: str
    user_id: str
    file_name: str
    file_size: int
    mime_type: str
    parsed_data: Dict[str, Any]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
