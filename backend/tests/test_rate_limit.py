"""Unit and integration tests for authentication rate limiting."""
import pytest
from httpx import AsyncClient
from app.core.rate_limit import auth_rate_limiter


@pytest.mark.asyncio
async def test_auth_rate_limiting(client: AsyncClient):
    auth_rate_limiter.reset()

    # Attempt 10 rapid logins (allowed)
    for i in range(10):
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "attacker@example.com", "password": "WrongPassword!"}
        )
        assert response.status_code == 401

    # 11th request must be rejected with 429 Too Many Requests
    blocked_response = await client.post(
        "/api/v1/auth/login",
        json={"email": "attacker@example.com", "password": "WrongPassword!"}
    )
    assert blocked_response.status_code == 429
    assert "Retry-After" in blocked_response.headers
    assert "Too many requests" in blocked_response.json()["detail"]

    auth_rate_limiter.reset()
