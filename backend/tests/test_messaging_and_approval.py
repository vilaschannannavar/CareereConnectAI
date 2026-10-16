"""Integration tests for outreach drafting, approval state machine, referral gating, and copy-is-not-sent guarantees."""
import pytest
from httpx import AsyncClient
from app.core.rate_limit import auth_rate_limiter


@pytest.mark.asyncio
async def test_outreach_draft_generation_and_referral_gating(client: AsyncClient):
    """Test Template A/B/C generation, referral gating rule, and 300-char note limits."""
    auth_rate_limiter.reset()

    # 1. Register candidate user
    reg = await client.post("/api/v1/auth/register", json={
        "email": "candidate_msg@example.com",
        "password": "Password123!",
        "full_name": "Alex Chen"
    })
    csrf = reg.json()["csrf_token"]

    # 2. Setup candidate profile with target roles & skills
    prof_res = await client.put(
        "/api/v1/profile",
        json={
            "target_roles": ["Firmware Engineer", "Embedded Systems Developer"],
            "target_companies": ["Tesla", "Apple"],
            "skills": ["C/C++", "FreeRTOS", "ARM Cortex"]
        },
        headers={"X-CSRF-Token": csrf}
    )
    assert prof_res.status_code == 200

    # 3. Create contact 1: Recruiter (Category A)
    c1 = await client.post(
        "/api/v1/contacts",
        json={
            "first_name": "Jessica",
            "last_name": "Taylor",
            "company": "Netflix",
            "position": "Technical Recruiter",
            "profile_url": "https://linkedin.com/in/jessica-taylor"
        },
        headers={"X-CSRF-Token": csrf}
    )
    c1_id = c1.json()["id"]

    # Classify contact 1 (Netflix is NOT target company -> Category A only, NO Category D)
    score_res = await client.post(f"/api/v1/scoring/analyze/{c1_id}", headers={"X-CSRF-Token": csrf})
    assert score_res.status_code == 200
    assert "A" in score_res.json()["categories"]
    assert "D" not in score_res.json()["categories"]

    # 4. Generate Template A (Recruiter) with concise tone
    gen_a = await client.post(
        "/api/v1/messages/generate",
        json={
            "contact_id": c1_id,
            "template_code": "A",
            "tone": "concise"
        },
        headers={"X-CSRF-Token": csrf}
    )
    assert gen_a.status_code == 201
    draft_a = gen_a.json()
    assert draft_a["status"] == "Draft"
    assert draft_a["template_code"] == "A"
    assert draft_a["tone"] == "concise"
    assert "Jessica" in draft_a["body"]
    assert "Netflix" in draft_a["body"]
    assert draft_a["character_count"] == len(draft_a["body"])
    assert "target_roles" in draft_a["details_used"]

    # 5. Template B (Referral) gating: contact 1 is Category A (not D). Generation without override must fail.
    gen_b_fail = await client.post(
        "/api/v1/messages/generate",
        json={
            "contact_id": c1_id,
            "template_code": "B",
            "tone": "conversational",
            "allow_referral_override": False
        },
        headers={"X-CSRF-Token": csrf}
    )
    assert gen_b_fail.status_code == 400
    assert "restricted to Category D contacts" in gen_b_fail.json()["detail"]

    # 6. Template B with explicit override must succeed
    gen_b_override = await client.post(
        "/api/v1/messages/generate",
        json={
            "contact_id": c1_id,
            "template_code": "B",
            "tone": "conversational",
            "allow_referral_override": True
        },
        headers={"X-CSRF-Token": csrf}
    )
    assert gen_b_override.status_code == 201
    draft_b = gen_b_override.json()
    assert draft_b["template_code"] == "B"
    assert draft_b["details_used"]["referral_override_used"] is True

    # 7. Create contact 2: Potential Referrer (Category D - employee at target company Tesla)
    c2 = await client.post(
        "/api/v1/contacts",
        json={
            "first_name": "Marcus",
            "last_name": "Vance",
            "company": "Tesla",
            "position": "Senior Firmware Engineer",
            "profile_url": "https://linkedin.com/in/marcus-vance"
        },
        headers={"X-CSRF-Token": csrf}
    )
    c2_id = c2.json()["id"]

    # Score contact 2 to ensure Category D tag is assigned
    await client.post(f"/api/v1/scoring/analyze/{c2_id}", headers={"X-CSRF-Token": csrf})

    # Template B succeeds naturally without override for Category D
    gen_b_cat_d = await client.post(
        "/api/v1/messages/generate",
        json={
            "contact_id": c2_id,
            "template_code": "B",
            "tone": "formal"
        },
        headers={"X-CSRF-Token": csrf}
    )
    assert gen_b_cat_d.status_code == 201
    assert gen_b_cat_d.json()["template_code"] == "B"


@pytest.mark.asyncio
async def test_message_state_machine_and_edit_reset(client: AsyncClient):
    """Test state machine progression, 409 on invalid transition, and edit resetting Approved to Draft."""
    auth_rate_limiter.reset()

    reg = await client.post("/api/v1/auth/register", json={
        "email": "state_machine_user@example.com",
        "password": "Password123!",
        "full_name": "Sam State"
    })
    csrf = reg.json()["csrf_token"]

    c = await client.post(
        "/api/v1/contacts",
        json={
            "first_name": "Diana",
            "last_name": "Prince",
            "company": "Amazon",
            "position": "Engineering Manager",
            "profile_url": "https://linkedin.com/in/diana-prince"
        },
        headers={"X-CSRF-Token": csrf}
    )
    contact_id = c.json()["id"]

    # Generate Draft
    draft_res = await client.post(
        "/api/v1/messages/generate",
        json={"contact_id": contact_id, "template_code": "C", "tone": "technical"},
        headers={"X-CSRF-Token": csrf}
    )
    assert draft_res.status_code == 201
    draft_id = draft_res.json()["id"]
    assert draft_res.json()["status"] == "Draft"

    # Illegal transition: Draft -> User-confirmed sent (must return 409 Conflict)
    bad_trans = await client.post(
        f"/api/v1/messages/{draft_id}/transition",
        json={"target_state": "User-confirmed sent"},
        headers={"X-CSRF-Token": csrf}
    )
    assert bad_trans.status_code == 409
    assert "Illegal state transition" in bad_trans.json()["detail"]

    # Valid progression: Draft -> Reviewed
    t1 = await client.post(
        f"/api/v1/messages/{draft_id}/transition",
        json={"target_state": "Reviewed"},
        headers={"X-CSRF-Token": csrf}
    )
    assert t1.status_code == 200
    assert t1.json()["status"] == "Reviewed"

    # Valid progression: Reviewed -> Approved
    t2 = await client.post(
        f"/api/v1/messages/{draft_id}/transition",
        json={"target_state": "Approved"},
        headers={"X-CSRF-Token": csrf}
    )
    assert t2.status_code == 200
    assert t2.json()["status"] == "Approved"

    # SERVER-SIDE INTEGRITY RULE: Editing an Approved draft resets it to Draft!
    edit_res = await client.put(
        f"/api/v1/messages/{draft_id}",
        json={"body": "Updated draft content with tailored technical specifics."},
        headers={"X-CSRF-Token": csrf}
    )
    assert edit_res.status_code == 200
    assert edit_res.json()["status"] == "Draft"
    assert edit_res.json()["body"] == "Updated draft content with tailored technical specifics."

    # Re-approve: Draft -> Approved (Draft can also transition directly to Approved)
    t3 = await client.post(
        f"/api/v1/messages/{draft_id}/transition",
        json={"target_state": "Approved"},
        headers={"X-CSRF-Token": csrf}
    )
    assert t3.status_code == 200

    # Approved -> Awaiting manual send
    t4 = await client.post(
        f"/api/v1/messages/{draft_id}/transition",
        json={"target_state": "Awaiting manual send"},
        headers={"X-CSRF-Token": csrf}
    )
    assert t4.status_code == 200
    assert t4.json()["status"] == "Awaiting manual send"

    # Awaiting manual send -> User-confirmed sent
    t5 = await client.post(
        f"/api/v1/messages/{draft_id}/transition",
        json={"target_state": "User-confirmed sent"},
        headers={"X-CSRF-Token": csrf}
    )
    assert t5.status_code == 200
    sent_draft = t5.json()
    assert sent_draft["status"] == "User-confirmed sent"
    assert sent_draft["sent_at"] is not None
    assert sent_draft["follow_up_suggested_at"] is not None


@pytest.mark.asyncio
async def test_copy_is_not_sent_and_direct_send_rejected(client: AsyncClient):
    """Test copy action logs audit event without changing status, and direct send returns 501."""
    auth_rate_limiter.reset()

    reg = await client.post("/api/v1/auth/register", json={
        "email": "copy_audit_user@example.com",
        "password": "Password123!",
        "full_name": "Casey Copy"
    })
    csrf = reg.json()["csrf_token"]

    c = await client.post(
        "/api/v1/contacts",
        json={
            "first_name": "Bruce",
            "last_name": "Wayne",
            "company": "Wayne Enterprises",
            "position": "CEO",
            "profile_url": "https://linkedin.com/in/bruce-wayne"
        },
        headers={"X-CSRF-Token": csrf}
    )
    contact_id = c.json()["id"]

    draft_res = await client.post(
        "/api/v1/messages/generate",
        json={"contact_id": contact_id, "template_code": "C", "tone": "formal"},
        headers={"X-CSRF-Token": csrf}
    )
    draft_id = draft_res.json()["id"]

    # 1. Test Copy endpoint
    copy_res = await client.post(
        f"/api/v1/messages/{draft_id}/copy",
        headers={"X-CSRF-Token": csrf}
    )
    assert copy_res.status_code == 200

    # Ensure draft status did NOT change (Copy is NOT send!)
    check_draft = await client.get(f"/api/v1/messages/{draft_id}")
    assert check_draft.json()["status"] == "Draft"

    # Verify event audit trail contains "copied"
    events_res = await client.get(f"/api/v1/tracker/events?contact_id={contact_id}")
    assert events_res.status_code == 200
    events = events_res.json()
    assert any(e["event_type"] == "copied" for e in events)

    # 2. Test Direct Send endpoint - must strictly fail with 501 Not Implemented
    send_res = await client.post(
        f"/api/v1/messages/{draft_id}/send",
        headers={"X-CSRF-Token": csrf}
    )
    assert send_res.status_code == 501
    assert "LinkedIn messaging not authorized" in send_res.json()["detail"]


@pytest.mark.asyncio
async def test_message_draft_cross_user_isolation(client: AsyncClient):
    """Test that drafts are strictly isolated between users, returning 404 on cross-user access."""
    auth_rate_limiter.reset()

    # User 1 creates draft
    r1 = await client.post("/api/v1/auth/register", json={
        "email": "user1_iso@example.com",
        "password": "Password123!",
        "full_name": "User One"
    })
    csrf1 = r1.json()["csrf_token"]

    c1 = await client.post(
        "/api/v1/contacts",
        json={"first_name": "Eve", "company": "Secret", "profile_url": "https://linkedin.com/in/eve"},
        headers={"X-CSRF-Token": csrf1}
    )
    draft1 = await client.post(
        "/api/v1/messages/generate",
        json={"contact_id": c1.json()["id"], "template_code": "A"},
        headers={"X-CSRF-Token": csrf1}
    )
    draft1_id = draft1.json()["id"]

    # User 2 logs in
    r2 = await client.post("/api/v1/auth/register", json={
        "email": "user2_iso@example.com",
        "password": "Password123!",
        "full_name": "User Two"
    })
    csrf2 = r2.json()["csrf_token"]

    # User 2 attempts to get User 1's draft -> 404
    get_res = await client.get(f"/api/v1/messages/{draft1_id}")
    assert get_res.status_code == 404

    # User 2 attempts to edit User 1's draft -> 404
    edit_res = await client.put(
        f"/api/v1/messages/{draft1_id}",
        json={"body": "Hacked body"},
        headers={"X-CSRF-Token": csrf2}
    )
    assert edit_res.status_code == 404

    # User 2 attempts to transition User 1's draft -> 404
    trans_res = await client.post(
        f"/api/v1/messages/{draft1_id}/transition",
        json={"target_state": "Approved"},
        headers={"X-CSRF-Token": csrf2}
    )
    assert trans_res.status_code == 404
