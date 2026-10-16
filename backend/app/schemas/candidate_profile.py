"""Schemas for candidate profile management."""
from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class CandidateProfileUpdate(BaseModel):
    """Payload to update candidate profile."""
    target_roles: List[str] = Field(default_factory=list)
    target_companies: List[str] = Field(default_factory=list)
    target_locations: List[str] = Field(default_factory=list)
    skills: List[str] = Field(default_factory=list)
    education: List[Dict[str, Any]] = Field(default_factory=list)
    experience_years: Optional[float] = 0.0
    bio: Optional[str] = None
    preferences: Dict[str, Any] = Field(default_factory=dict)


class CandidateProfileResponse(BaseModel):
    """Candidate profile response."""
    id: str
    user_id: str
    target_roles: List[str]
    target_companies: List[str]
    target_locations: List[str]
    skills: List[str]
    education: List[Dict[str, Any]]
    experience_years: Optional[float]
    bio: Optional[str]
    preferences: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
