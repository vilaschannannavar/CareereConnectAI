"""Audit log schemas."""
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, ConfigDict


class AuditLogResponse(BaseModel):
    """Schema representing an audit trail log entry."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: Optional[str] = None
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    ip_address: Optional[str] = None
    details: Dict[str, Any] = {}
    created_at: datetime
