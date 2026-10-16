"""Integration tests for Phase 8: Manual job openings tracking and official career portal resolver."""
import pytest
from httpx import AsyncClient
from app.core.rate_limit import auth_rate_limiter
from app.services.career_directory import resolve_official_career_page


def test_resolve_official_career_page():
    """Verify official career page resolution without scraping."""
    assert resolve_official_career_page("Google") == "https://careers.google.com"
    assert resolve_official_career_page("Tesla") == "https://www.tesla.com/careers"
    assert resolve_official_career_page("Apple") == "https://jobs.apple.com"
    assert resolve_official_career_page("Stripe") == "https://stripe.com/jobs"

    # Unknown company provides safe search portal link
    custom_url = resolve_official_career_page("Acme Robotics Inc")
    assert "https://www.google.com/search?q=" in custom_url
    assert "Acme" in custom_url


@pytest.mark.asyncio
async def test_job_openings_crud_lifecycle(client: AsyncClient):
    """Test manual creation, automatic career portal resolution, retrieval, update, and deletion."""
    auth_rate_limiter.reset()

    reg = await client.post("/api/v1/auth/register", json={
        "email": "openings_user@example.com",
        "password": "Password123!",
        "full_name": "Job Hunter"
    })
    csrf = reg.json()["csrf_token"]

    # 1. Create opening at Tesla
    c_res = await client.post(
        "/api/v1/openings",
        json={
            "company": "Tesla",
            "title": "Embedded Software Engineer - Autopilot",
            "url": "https://www.tesla.com/careers/search/job/embedded-swe-1234",
            "notes": "Target opening for spring graduation",
            "status": "active"
        },
        headers={"X-CSRF-Token": csrf}
    )
    assert c_res.status_code == 201
    opening = c_res.json()
    opening_id = opening["id"]
    assert opening["company"] == "Tesla"
    assert opening["title"] == "Embedded Software Engineer - Autopilot"
    assert opening["career_page_url"] == "https://www.tesla.com/careers"

    # 2. List openings
    list_res = await client.get("/api/v1/openings")
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1

    # 3. Update status to applied
    up_res = await client.put(
        f"/api/v1/openings/{opening_id}",
        json={"status": "applied", "notes": "Applied on portal; following up with connection"},
        headers={"X-CSRF-Token": csrf}
    )
    assert up_res.status_code == 200
    assert up_res.json()["status"] == "applied"
    assert up_res.json()["notes"] == "Applied on portal; following up with connection"

    # 4. Resolve official career URL endpoint
    url_res = await client.get("/api/v1/openings/career-url?company=Stripe")
    assert url_res.status_code == 200
    assert url_res.json()["career_page_url"] == "https://stripe.com/jobs"
    assert url_res.json()["is_scraped"] is False

    # 5. Delete opening
    del_res = await client.delete(f"/api/v1/openings/{opening_id}", headers={"X-CSRF-Token": csrf})
    assert del_res.status_code == 200

    # Verify 404 after deletion
    assert (await client.get(f"/api/v1/openings/{opening_id}")).status_code == 404


@pytest.mark.asyncio
async def test_job_openings_cross_user_isolation(client: AsyncClient):
    """Test that job openings are strictly isolated per user, returning 404 on foreign access."""
    auth_rate_limiter.reset()

    # User 1 creates opening
    r1 = await client.post("/api/v1/auth/register", json={
        "email": "user1_openings@example.com",
        "password": "Password123!",
        "full_name": "U1"
    })
    csrf1 = r1.json()["csrf_token"]

    op1 = await client.post(
        "/api/v1/openings",
        json={"company": "Apple", "title": "iOS Architect"},
        headers={"X-CSRF-Token": csrf1}
    )
    op1_id = op1.json()["id"]

    # User 2 logs in
    r2 = await client.post("/api/v1/auth/register", json={
        "email": "user2_openings@example.com",
        "password": "Password123!",
        "full_name": "U2"
    })
    csrf2 = r2.json()["csrf_token"]

    # User 2 attempts cross-tenant access -> 404
    assert (await client.get(f"/api/v1/openings/{op1_id}")).status_code == 404
    assert (await client.put(f"/api/v1/openings/{op1_id}", json={"title": "Hacked"}, headers={"X-CSRF-Token": csrf2})).status_code == 404
    assert (await client.delete(f"/api/v1/openings/{op1_id}", headers={"X-CSRF-Token": csrf2})).status_code == 404

    # User 2 list should be empty
    list2 = await client.get("/api/v1/openings")
    assert len(list2.json()) == 0
