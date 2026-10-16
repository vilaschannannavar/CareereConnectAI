"""Integration tests for outreach tracker pipeline, follow-up scheduling, and replied status."""
import pytest
from datetime import timedelta
from httpx import AsyncClient
from app.core.rate_limit import auth_rate_limiter


@pytest.mark.asyncio
async def test_outreach_pipeline_grouping_and_events_timeline(client: AsyncClient):
    """Test tracker pipeline buckets, follow-up scheduling, and explicit mark replied flow."""
    auth_rate_limiter.reset()

    # 1. Register candidate user
    reg = await client.post("/api/v1/auth/register", json={
        "email": "tracker_user@example.com",
        "password": "Password123!",
        "full_name": "Jordan Tracker"
    })
    csrf = reg.json()["csrf_token"]

    # 2. Create contact 1
    c1 = await client.post(
        "/api/v1/contacts",
        json={
            "first_name": "Logan",
            "last_name": "Roy",
            "company": "Waystar",
            "position": "CEO",
            "profile_url": "https://linkedin.com/in/logan-roy"
        },
        headers={"X-CSRF-Token": csrf}
    )
    c1_id = c1.json()["id"]

    # 3. Generate Draft for contact 1
    d1 = await client.post(
        "/api/v1/messages/generate",
        json={"contact_id": c1_id, "template_code": "C", "tone": "concise"},
        headers={"X-CSRF-Token": csrf}
    )
    d1_id = d1.json()["id"]

    # 4. Check initial pipeline: d1 should be in "drafted"
    pipe1 = await client.get("/api/v1/tracker")
    assert pipe1.status_code == 200
    pdata1 = pipe1.json()
    assert len(pdata1["drafted"]) == 1
    assert pdata1["drafted"][0]["id"] == d1_id
    assert pdata1["drafted"][0]["contact"]["first_name"] == "Logan"
    assert len(pdata1["marked_sent"]) == 0

    # 5. Advance d1 to Approved -> Awaiting manual send -> User-confirmed sent
    await client.post(
        f"/api/v1/messages/{d1_id}/transition",
        json={"target_state": "Approved"},
        headers={"X-CSRF-Token": csrf}
    )
    await client.post(
        f"/api/v1/messages/{d1_id}/transition",
        json={"target_state": "Awaiting manual send"},
        headers={"X-CSRF-Token": csrf}
    )
    t_sent = await client.post(
        f"/api/v1/messages/{d1_id}/transition",
        json={"target_state": "User-confirmed sent"},
        headers={"X-CSRF-Token": csrf}
    )
    assert t_sent.status_code == 200
    assert t_sent.json()["sent_at"] is not None
    assert t_sent.json()["follow_up_suggested_at"] is not None

    # Pipeline should now have d1 in "marked_sent" (as follow-up is 7 days in future)
    pipe2 = await client.get("/api/v1/tracker")
    pdata2 = pipe2.json()
    assert len(pdata2["drafted"]) == 0
    assert len(pdata2["marked_sent"]) == 1
    assert pdata2["marked_sent"][0]["id"] == d1_id

    # 6. Reschedule follow-up
    sched_res = await client.post(
        f"/api/v1/tracker/{d1_id}/schedule-follow-up",
        json={"follow_up_days": 14, "notes": "Follow up after corporate conference"},
        headers={"X-CSRF-Token": csrf}
    )
    assert sched_res.status_code == 200

    # 7. Explicitly mark as replied
    reply_res = await client.post(
        f"/api/v1/tracker/contact/{c1_id}/mark-replied",
        headers={"X-CSRF-Token": csrf}
    )
    assert reply_res.status_code == 200
    assert "replied" in reply_res.json()["message"].lower()

    # Now pipeline should have d1 in "replied"
    pipe3 = await client.get("/api/v1/tracker")
    pdata3 = pipe3.json()
    assert len(pdata3["marked_sent"]) == 0
    assert len(pdata3["replied"]) == 1
    assert pdata3["replied"][0]["id"] == d1_id

    # 8. Check events timeline
    events_res = await client.get(f"/api/v1/tracker/events?contact_id={c1_id}")
    assert events_res.status_code == 200
    events = events_res.json()
    event_types = [e["event_type"] for e in events]
    assert "draft_created" in event_types
    assert "approved" in event_types
    assert "user-confirmed_sent" in event_types
    assert "follow_up_scheduled" in event_types
    assert "replied" in event_types


@pytest.mark.asyncio
async def test_tracker_cross_user_isolation(client: AsyncClient):
    """Test tracker endpoints strictly enforce user ownership with 404."""
    auth_rate_limiter.reset()

    # User 1 creates contact and draft
    r1 = await client.post("/api/v1/auth/register", json={
        "email": "u1_track@example.com",
        "password": "Password123!",
        "full_name": "U1"
    })
    csrf1 = r1.json()["csrf_token"]
    c1 = await client.post(
        "/api/v1/contacts",
        json={"first_name": "Roman", "company": "Waystar", "profile_url": "https://linkedin.com/in/roman"},
        headers={"X-CSRF-Token": csrf1}
    )
    c1_id = c1.json()["id"]
    d1 = await client.post(
        "/api/v1/messages/generate",
        json={"contact_id": c1_id, "template_code": "A"},
        headers={"X-CSRF-Token": csrf1}
    )
    d1_id = d1.json()["id"]

    # User 2 logs in
    r2 = await client.post("/api/v1/auth/register", json={
        "email": "u2_track@example.com",
        "password": "Password123!",
        "full_name": "U2"
    })
    csrf2 = r2.json()["csrf_token"]

    # User 2 attempts to schedule follow-up on User 1's draft -> 404
    sched_res = await client.post(
        f"/api/v1/tracker/{d1_id}/schedule-follow-up",
        json={"follow_up_days": 5},
        headers={"X-CSRF-Token": csrf2}
    )
    assert sched_res.status_code == 404

    # User 2 attempts to mark User 1's contact replied -> 404
    rep_res = await client.post(
        f"/api/v1/tracker/contact/{c1_id}/mark-replied",
        headers={"X-CSRF-Token": csrf2}
    )
    assert rep_res.status_code == 404

    # User 2's tracker pipeline should be completely empty
    p2 = await client.get("/api/v1/tracker")
    assert p2.status_code == 200
    for bucket in p2.json().values():
        assert len(bucket) == 0
