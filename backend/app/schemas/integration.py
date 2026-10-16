"""Schemas for third-party integrations."""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel


class IntegrationResponse(BaseModel):
    """Integration status response (excluding secret tokens)."""
    id: str
    user_id: str
    provider: str
    scopes: str
    account_id: Optional[str] = None
    account_email: Optional[str] = None
    is_active: bool
    token_expires_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
