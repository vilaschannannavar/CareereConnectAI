"""Schemas for authentication and user management."""
from datetime import datetime
from typing import Optional, List
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


class ForgotPasswordRequest(BaseModel):
    """Payload to initiate password reset."""
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Payload to confirm password reset."""
    token: str
    new_password: str = Field(min_length=8, description="Password must be at least 8 characters")


class ChangePasswordRequest(BaseModel):
    """Payload to change current user's password."""
    current_password: str
    new_password: str = Field(min_length=8, description="Password must be at least 8 characters")


class SessionItemResponse(BaseModel):
    """Active session metadata."""
    id: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime
    expires_at: datetime
    is_current: bool = False

    model_config = {"from_attributes": True}


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
