"""Integration tests for user authentication, session cookies, CSRF, and user isolation."""
import pytest
from httpx import AsyncClient
from app.core.config import settings
from app.api.deps import enforce_user_ownership
from fastapi import HTTPException


@pytest.mark.asyncio
async def test_register_and_me_flow(client: AsyncClient):
    payload = {
        "email": "student@university.edu",
        "password": "StrongPassword123!",
        "full_name": "Test Student"
    }
    
    # 1. Register
    reg_response = await client.post("/api/v1/auth/register", json=payload)
    assert reg_response.status_code == 201
    reg_data = reg_response.json()
    
    assert reg_data["user"]["email"] == "student@university.edu"
    assert "csrf_token" in reg_data
    assert settings.SESSION_COOKIE_NAME in reg_response.cookies
    
    # Keep session cookie on the client
    client.cookies.update(reg_response.cookies)
    
    # 2. Check /me with cookie
    me_response = await client.get("/api/v1/auth/me")
    assert me_response.status_code == 200
    me_data = me_response.json()
    assert me_data["user"]["email"] == "student@university.edu"
    assert "csrf_token" in me_data


@pytest.mark.asyncio
async def test_login_invalid_password(client: AsyncClient):
    # Register first
    await client.post("/api/v1/auth/register", json={
        "email": "user1@example.com",
        "password": "CorrectPassword123!"
    })
    
    # Attempt login with wrong password
    bad_login = await client.post("/api/v1/auth/login", json={
        "email": "user1@example.com",
        "password": "WrongPassword!"
    })
    assert bad_login.status_code == 401


@pytest.mark.asyncio
async def test_logout_csrf_protection(client: AsyncClient):
    # Register
    reg_response = await client.post("/api/v1/auth/register", json={
        "email": "logout_test@example.com",
        "password": "ValidPassword123!"
    })
    csrf_token = reg_response.json()["csrf_token"]
    
    # Set cookies on client
    client.cookies.update(reg_response.cookies)
    
    # Logout without CSRF header must be rejected with 403 Forbidden
    unauthorized_logout = await client.post("/api/v1/auth/logout")
    assert unauthorized_logout.status_code == 403
    
    # Logout with valid CSRF header succeeds
    success_logout = await client.post(
        "/api/v1/auth/logout",
        headers={"X-CSRF-Token": csrf_token}
    )
    assert success_logout.status_code == 200


def test_user_ownership_enforcement_returns_404():
    """Verify strictly: Return 404 (not 403) for other users' resources."""
    user_a = "uuid-user-a"
    user_b = "uuid-user-b"
    
    # Accessing own resource raises nothing
    enforce_user_ownership(user_a, user_a)
    
    # Accessing another user's resource MUST raise 404 NOT FOUND
    with pytest.raises(HTTPException) as exc_info:
        enforce_user_ownership(resource_owner_id=user_b, authenticated_user_id=user_a)
    
    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Resource not found"
