"""Schemas for platform capabilities."""
from typing import Dict
from pydantic import BaseModel
from app.core.capabilities import CapabilityItem


class CapabilitiesResponse(BaseModel):
    """Schema returning the full capability registry."""
    capabilities: Dict[str, CapabilityItem]
