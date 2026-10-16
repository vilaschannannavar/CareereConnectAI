"""Schemas for classification, scoring, weight adjustment, and explanation breakdowns."""
from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class CustomWeightsPayload(BaseModel):
    """Payload for user-adjusted scoring weights."""
    role_relevance: float = Field(default=30.0, ge=0.0, le=100.0)
    ability_to_help: float = Field(default=25.0, ge=0.0, le=100.0)
    company_industry: float = Field(default=20.0, ge=0.0, le=100.0)
    technical_domain: float = Field(default=15.0, ge=0.0, le=100.0)
    recruitment_referral_evidence: float = Field(default=10.0, ge=0.0, le=100.0)


class UpdateAnalysisCategoriesPayload(BaseModel):
    """Payload allowing users to manually edit assigned category tags."""
    categories: List[str] = Field(min_length=1)
    notes: Optional[str] = None


class ContactAnalysisResponse(BaseModel):
    """Contact analysis evaluation response."""
    id: str
    contact_id: str
    score: float
    priority: str
    confidence: float
    categories: List[str]
    reasons: List[str]
    missing_info: List[str]
    factor_breakdown: Dict[str, Any]
    weights_used: Dict[str, float]
    user_override: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BatchAnalyzeResponse(BaseModel):
    """Result of batch analyzing connection contacts."""
    total_processed: int
    newly_analyzed: int
    cached_hits: int
    high_priority_count: int
