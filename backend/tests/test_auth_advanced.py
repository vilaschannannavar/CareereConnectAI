"""Comprehensive tests for advanced auth: password reset, email verification, sessions, and progressive lockout."""
import pytest
from httpx import AsyncClient
from app.api.v1.auth import FAILED_LOGIN_ATTEMPTS, PASSWORD_RESET_TOKENS


@pytest.mark.asyncio
async def test_forgot_password_and_reset_flow(client: AsyncClient):
    """Test forgot-password dispatches token and reset-password updates password."""
    email = "reset_flow_candidate@example.com"
    pwd = "InitialPassword123!"

    # 1. Register candidate
    reg = await client.post("/api/v1/auth/register", json={"email": email, "password": pwd})
    assert reg.status_code == 201

    # 2. Request forgot password
    res = await client.post("/api/v1/auth/forgot-password", json={"email": email})
    assert res.status_code == 200
    assert "instructions have been sent" in res.json()["message"]

    # Retrieve dispatched token
    tokens = [t for t, data in PASSWORD_RESET_TOKENS.items() if data["email"] == email.lower()]
    assert len(tokens) == 1
    reset_token = tokens[0]

    # 3. Reset password with valid token
    new_pwd = "BrandNewSecurePassword123!"
    reset_res = await client.post(
        "/api/v1/auth/reset-password",
        json={"token": reset_token, "new_password": new_pwd}
    )
    assert reset_res.status_code == 200
    assert "successfully reset" in reset_res.json()["message"]

    # 4. Old password should fail
    fail_login = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": pwd}
    )
    assert fail_login.status_code == 401

    # 5. New password should succeed
    succ_login = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": new_pwd}
    )
    assert succ_login.status_code == 200


@pytest.mark.asyncio
async def test_forgot_password_no_enumeration(client: AsyncClient):
    """Test that requesting forgot-password for non-existent email returns same response without error."""
    res = await client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "nonexistent_stranger@example.com"}
    )
    assert res.status_code == 200
    assert "instructions have been sent" in res.json()["message"]


@pytest.mark.asyncio
async def test_reset_password_invalid_token(client: AsyncClient):
    """Test that invalid or expired token is rejected with 400 Bad Request."""
    res = await client.post(
        "/api/v1/auth/reset-password",
        json={"token": "completely_bogus_token_123", "new_password": "ValidPassword999!"}
    )
    assert res.status_code == 400
    assert "invalid or has expired" in res.json()["detail"]


@pytest.mark.asyncio
async def test_change_password_authenticated(client: AsyncClient):
    """Test changing password while authenticated."""
    email = "change_pwd_user@example.com"
    pwd = "OldPassword123!"
    reg = await client.post("/api/v1/auth/register", json={"email": email, "password": pwd})
    assert reg.status_code == 201
    csrf_token = reg.json()["csrf_token"]
    headers = {"X-CSRF-Token": csrf_token}
    client.cookies.update(reg.cookies)

    new_pwd = "UpdatedSecurePassword456!"
    # Wrong current password fails
    wrong_res = await client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "WrongPassword!", "new_password": new_pwd},
        headers=headers
    )
    assert wrong_res.status_code == 400
    assert "Current password is incorrect" in wrong_res.json()["detail"]

    # Correct current password succeeds
    good_res = await client.post(
        "/api/v1/auth/change-password",
        json={"current_password": pwd, "new_password": new_pwd},
        headers=headers
    )
    assert good_res.status_code == 200
    assert "changed successfully" in good_res.json()["message"]


@pytest.mark.asyncio
async def test_active_sessions_list_and_revocation(client: AsyncClient):
    """Test retrieving active sessions and revoking one."""
    email = "sessions_user@example.com"
    pwd = "SessionPassword123!"
    reg = await client.post("/api/v1/auth/register", json={"email": email, "password": pwd})
    assert reg.status_code == 201
    csrf_token = reg.json()["csrf_token"]
    headers = {"X-CSRF-Token": csrf_token}
    client.cookies.update(reg.cookies)

    sessions_res = await client.get("/api/v1/auth/sessions")
    assert sessions_res.status_code == 200
    sessions = sessions_res.json()
    assert len(sessions) >= 1
    assert any(s["is_current"] for s in sessions)

    # Revoking foreign session returns 404
    fake_revoke = await client.delete(
        "/api/v1/auth/sessions/00000000-0000-0000-0000-000000000000",
        headers=headers
    )
    assert fake_revoke.status_code == 404


@pytest.mark.asyncio
async def test_progressive_lockout_after_consecutive_failures(client: AsyncClient):
    """Test that 10 consecutive failed login attempts triggers HTTP 429 lockout."""
    from app.core.rate_limit import auth_rate_limiter
    target_email = "lockout_test_candidate@example.com"
    FAILED_LOGIN_ATTEMPTS.clear()
    auth_rate_limiter.reset()

    # Register target user
    reg = await client.post(
        "/api/v1/auth/register",
        json={"email": target_email, "password": "OriginalCorrectPassword123!"}
    )
    assert reg.status_code == 201

    auth_rate_limiter.reset()

    # Attempt 10 consecutive invalid logins
    for _ in range(10):
        fail_res = await client.post(
            "/api/v1/auth/login",
            json={"email": target_email, "password": "WrongPasswordAttempt"}
        )
        assert fail_res.status_code == 401

    # 11th attempt should be locked out with HTTP 429
    locked_res = await client.post(
        "/api/v1/auth/login",
        json={"email": target_email, "password": "WrongPasswordAttempt"}
    )
    assert locked_res.status_code == 429
    assert "locked" in locked_res.json()["detail"]

    FAILED_LOGIN_ATTEMPTS.clear()
