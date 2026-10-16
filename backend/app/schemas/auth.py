"""Schemas for authentication and user management."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class UserRegisterRequest(BaseModel):
    """Payload for user registration."""
    email: EmailStr
    password: str = Field(min_length=8, description="Password must be at least 8 characters")
    full_name: Optional[str] = Field(default=None, max_length=255)


class UserLoginRequest(BaseModel):
    """Payload for user login."""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """User response schema."""
    id: str
    email: EmailStr
    full_name: Optional[str] = None
    headline: Optional[str] = None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AuthSessionResponse(BaseModel):
    """Response returned upon successful authentication or session check."""
    user: UserResponse
    csrf_token: str
    message: str = "Authenticated successfully"


class MessageResponse(BaseModel):
    """Generic message response."""
    message: str
    success: bool = True
