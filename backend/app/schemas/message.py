"""Schemas for outreach message generation, state machine transitions, and event tracking."""
from typing import Dict, Any, Optional, List
from datetime import datetime
from pydantic import BaseModel, Field
from app.schemas.contact import ContactResponse


class GenerateMessagePayload(BaseModel):
    """Payload to generate a personalized outreach draft."""
    contact_id: str
    template_code: str = Field(default="A", pattern="^[A-C]$")
    tone: str = Field(default="formal", pattern="^(formal|concise|conversational|technical)$")
    allow_referral_override: bool = False
    resume_id: Optional[str] = None


class EditMessagePayload(BaseModel):
    """Payload to edit message text, resetting status to Draft if previously Approved."""
    body: str = Field(min_length=1)
    subject: Optional[str] = None
    resume_id: Optional[str] = None


class TransitionStatePayload(BaseModel):
    """Payload to trigger a legal state transition."""
    target_state: str = Field(min_length=1)
    notes: Optional[str] = None


class MessageDraftResponse(BaseModel):
    """Outreach message draft response schema."""
    id: str
    user_id: str
    contact_id: str
    resume_id: Optional[str] = None
    status: str
    template_code: str
    tone: str
    subject: str
    body: str
    character_count: int
    character_limit_warning: bool
    details_used: Dict[str, Any]
    delivery_channel: str
    sent_at: Optional[datetime] = None
    follow_up_suggested_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    contact: Optional[ContactResponse] = None

    model_config = {"from_attributes": True}


class OutreachEventResponse(BaseModel):
    """Outreach action and state event representation."""
    id: str
    user_id: str
    contact_id: str
    draft_id: Optional[str] = None
    event_type: str
    status: str
    notes: Optional[str] = None
    metadata_json: Dict[str, Any] = {}
    occurred_at: datetime

    model_config = {"from_attributes": True}


class ScheduleFollowUpPayload(BaseModel):
    """Payload to update follow-up date."""
    follow_up_days: int = Field(default=7, ge=1, le=90)
    notes: Optional[str] = None
