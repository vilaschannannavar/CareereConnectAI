"""Systematic authorization and security review across all endpoints."""
import pytest
from httpx import AsyncClient
from app.core.rate_limit import (
    auth_rate_limiter,
    upload_rate_limiter,
    import_rate_limiter,
    analyze_rate_limiter,
    generate_rate_limiter
)


@pytest.fixture(autouse=True)
def reset_rate_limiters():
    auth_rate_limiter.reset()
    upload_rate_limiter.reset()
    import_rate_limiter.reset()
    analyze_rate_limiter.reset()
    generate_rate_limiter.reset()


@pytest.mark.asyncio
async def test_security_headers_present_on_all_responses(client: AsyncClient):
    """Verify OWASP-recommended security headers are set on HTTP responses."""
    res = await client.get("/health")
    assert res.status_code == 200
    assert res.headers.get("x-content-type-options") == "nosniff"
    assert res.headers.get("x-frame-options") == "DENY"
    assert "strict-transport-security" in res.headers
    assert "content-security-policy" in res.headers
    assert "permissions-policy" in res.headers


@pytest.mark.asyncio
async def test_systematic_unauthenticated_access_denied(client: AsyncClient):
    """Verify that all protected routes reject unauthenticated requests with 401 Unauthorized."""
    protected_routes = [
        ("GET", "/api/v1/auth/me"),
        ("GET", "/api/v1/auth/budget"),
        ("GET", "/api/v1/auth/export-data"),
        ("DELETE", "/api/v1/auth/account"),
        ("GET", "/api/v1/profile"),
        ("PUT", "/api/v1/profile"),
        ("GET", "/api/v1/resumes"),
        ("GET", "/api/v1/contacts"),
        ("POST", "/api/v1/contacts"),
        ("GET", "/api/v1/integrations"),
        ("DELETE", "/api/v1/integrations/linkedin"),
        ("GET", "/api/v1/scoring/analyses"),
        ("POST", "/api/v1/scoring/batch-analyze"),
        ("GET", "/api/v1/shortlists"),
        ("POST", "/api/v1/messages/generate"),
        ("GET", "/api/v1/tracker"),
        ("GET", "/api/v1/audit/logs"),
        ("GET", "/api/v1/openings"),
    ]

    for method, path in protected_routes:
        if method == "GET":
            res = await client.get(path)
        elif method == "POST":
            res = await client.post(path, json={})
        elif method == "PUT":
            res = await client.put(path, json={})
        elif method == "DELETE":
            res = await client.delete(path)
        
        assert res.status_code == 401, f"Route {method} {path} should return 401 for unauthenticated client, got {res.status_code}"


@pytest.mark.asyncio
async def test_full_data_export_and_disconnect_integration_flow(client: AsyncClient):
    """Verify full data export (JSON) and integration disconnect with audit logging."""
    # 1. Register user
    reg_res = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "export_test@example.com",
            "password": "StrongPassword123!",
            "full_name": "Export User"
        }
    )
    assert reg_res.status_code == 201
    csrf = reg_res.json()["csrf_token"]
    client.cookies.update(reg_res.cookies)

    # 2. Add a contact
    contact_res = await client.post(
        "/api/v1/contacts",
        json={
            "first_name": "Ada",
            "last_name": "Lovelace",
            "company": "Babbage Labs",
            "position": "Lead Mathematician",
            "profile_url": "https://linkedin.com/in/ada-lovelace"
        },
        headers={"X-CSRF-Token": csrf}
    )
    assert contact_res.status_code == 201

    # 3. Export all user data
    export_res = await client.get("/api/v1/auth/export-data")
    assert export_res.status_code == 200
    assert "application/json" in export_res.headers["content-type"]
    assert "careerconnect_export_" in export_res.headers.get("content-disposition", "")

    export_data = export_res.json()
    assert export_data["user"]["email"] == "export_test@example.com"
    assert len(export_data["contacts"]) >= 1
    assert export_data["contacts"][0]["first_name"] == "Ada"

    # 4. Attempt to disconnect non-existent integration returns 404
    disc_res = await client.delete(
        "/api/v1/integrations/linkedin",
        headers={"X-CSRF-Token": csrf}
    )
    assert disc_res.status_code == 404

    # 5. Check audit logs to confirm full_data_export was recorded
    audit_res = await client.get("/api/v1/audit/logs")
    assert audit_res.status_code == 200
    logs = audit_res.json()
    actions = [log["action"] for log in logs]
    assert "register" in actions
    assert "full_data_export" in actions
