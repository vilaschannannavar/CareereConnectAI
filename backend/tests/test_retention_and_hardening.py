"""Integration tests for Phase 6: Retention controls, account hard deletion, LLM budget cap, and IDOR audits."""
import pytest
import io
from pathlib import Path
from httpx import AsyncClient
from app.core.rate_limit import auth_rate_limiter
from app.core.config import settings
from app.services.budget import reset_user_budget, record_llm_spend
from tests.test_resume_processing import create_synthetic_docx


@pytest.mark.asyncio
async def test_contact_retention_and_bulk_purge(client: AsyncClient):
    """Test single contact deletion and complete bulk contact purge with audit logging."""
    auth_rate_limiter.reset()

    # 1. Register user
    reg = await client.post("/api/v1/auth/register", json={
        "email": "retention_user@example.com",
        "password": "Password123!",
        "full_name": "Retention Tester"
    })
    csrf = reg.json()["csrf_token"]
    user_id = reg.json()["user"]["id"]

    # 2. Create 3 contacts
    c_ids = []
    for i in range(3):
        res = await client.post(
            "/api/v1/contacts",
            json={
                "first_name": f"Contact{i}",
                "company": "Company",
                "position": "Engineer",
                "profile_url": f"https://linkedin.com/in/contact-{i}-{user_id[:4]}"
            },
            headers={"X-CSRF-Token": csrf}
        )
        c_ids.append(res.json()["id"])

    # Verify 3 contacts exist
    list_res = await client.get("/api/v1/contacts")
    assert list_res.json()["total"] == 3

    # 3. Delete single contact
    del_single = await client.delete(f"/api/v1/contacts/{c_ids[0]}", headers={"X-CSRF-Token": csrf})
    assert del_single.status_code == 200

    # Verify single contact is gone
    get_del = await client.get(f"/api/v1/contacts/{c_ids[0]}")
    assert get_del.status_code == 404

    list_res2 = await client.get("/api/v1/contacts")
    assert list_res2.json()["total"] == 2

    # 4. Bulk purge all contacts
    purge_res = await client.delete("/api/v1/contacts", headers={"X-CSRF-Token": csrf})
    assert purge_res.status_code == 200
    assert "permanently deleted" in purge_res.json()["message"]

    # Verify total is now 0
    list_res3 = await client.get("/api/v1/contacts")
    assert list_res3.json()["total"] == 0

    # 5. Check audit logs
    audit_res = await client.get("/api/v1/audit/logs")
    assert audit_res.status_code == 200
    actions = [log["action"] for log in audit_res.json()]
    assert "delete_contact" in actions
    assert "purge_all_contacts" in actions


@pytest.mark.asyncio
async def test_account_hard_deletion_cascades_all_data_and_storage(client: AsyncClient):
    """Test full account deletion: cascades all database tables and physically cleans up storage."""
    auth_rate_limiter.reset()

    # 1. Register user
    reg = await client.post("/api/v1/auth/register", json={
        "email": "hard_delete_user@example.com",
        "password": "Password123!",
        "full_name": "Hard Delete Tester"
    })
    csrf = reg.json()["csrf_token"]
    user_id = reg.json()["user"]["id"]

    # 2. Upload dummy resume
    dummy_docx = create_synthetic_docx("Hard Delete Candidate", "hd@example.com")
    upload_res = await client.post(
        "/api/v1/resumes",
        files={"file": ("test_resume.docx", dummy_docx, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
        headers={"X-CSRF-Token": csrf}
    )
    assert upload_res.status_code == 201

    # Verify file exists in local storage
    user_storage_dir = Path(settings.LOCAL_STORAGE_PATH) / user_id
    assert user_storage_dir.exists()

    # 3. Create contact & draft
    c = await client.post(
        "/api/v1/contacts",
        json={"first_name": "Dave", "company": "Meta", "profile_url": "https://linkedin.com/in/dave-hd"},
        headers={"X-CSRF-Token": csrf}
    )
    d = await client.post(
        "/api/v1/messages/generate",
        json={"contact_id": c.json()["id"], "template_code": "A"},
        headers={"X-CSRF-Token": csrf}
    )
    assert d.status_code == 201

    # 4. Call Account Hard Deletion
    del_acc = await client.delete("/api/v1/auth/account", headers={"X-CSRF-Token": csrf})
    assert del_acc.status_code == 200
    assert "permanently deleted" in del_acc.json()["message"]

    # 5. Verify user storage directory was completely purged
    assert not user_storage_dir.exists()

    # 6. Verify session is dead (calling /api/auth/me returns 401)
    me_res = await client.get("/api/auth/me")
    assert me_res.status_code == 401

    # 7. Verify login with deleted credentials fails
    login_res = await client.post("/api/v1/auth/login", json={
        "email": "hard_delete_user@example.com",
        "password": "Password123!"
    })
    assert login_res.status_code == 401


@pytest.mark.asyncio
async def test_per_user_llm_budget_cap_enforcement(client: AsyncClient):
    """Test that per-user LLM usage is tracked and blocked with 429 when cap is exceeded."""
    auth_rate_limiter.reset()

    reg = await client.post("/api/v1/auth/register", json={
        "email": "budget_user@example.com",
        "password": "Password123!",
        "full_name": "Budget Tester"
    })
    csrf = reg.json()["csrf_token"]
    user_id = reg.json()["user"]["id"]
    reset_user_budget(user_id)

    # 1. Check initial budget status
    b_res = await client.get("/api/v1/auth/budget")
    assert b_res.status_code == 200
    b_data = b_res.json()
    assert b_data["budget_cap_usd"] == settings.LLM_USER_BUDGET_CAP_USD
    assert b_data["total_spent_usd"] == 0.0
    assert b_data["is_capped"] is False

    # 2. Artificially record spend right up to the cap
    record_llm_spend(user_id, settings.LLM_USER_BUDGET_CAP_USD)

    # 3. Check status is now capped
    b_res2 = await client.get("/api/v1/auth/budget")
    assert b_res2.json()["is_capped"] is True

    # 4. Attempting an LLM operation (upload resume) must be blocked with HTTP 429
    dummy_docx = create_synthetic_docx("Budget Candidate", "budget@example.com")
    upload_res = await client.post(
        "/api/v1/resumes",
        files={"file": ("budget_exceeded.docx", dummy_docx, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
        headers={"X-CSRF-Token": csrf}
    )
    assert upload_res.status_code == 429
    assert "budget cap" in upload_res.json()["detail"].lower()

    # 5. Reset user budget and verify access is restored
    reset_user_budget(user_id)
    b_res3 = await client.get("/api/v1/auth/budget")
    assert b_res3.json()["is_capped"] is False


@pytest.mark.asyncio
async def test_comprehensive_idor_audit_across_all_entities(client: AsyncClient):
    """Comprehensive IDOR verification: User 2 attempting to access any User 1 resource gets strict 404."""
    auth_rate_limiter.reset()

    # Setup User 1 with resources
    r1 = await client.post("/api/v1/auth/register", json={
        "email": "victim_u1@example.com",
        "password": "Password123!",
        "full_name": "Victim One"
    })
    csrf1 = r1.json()["csrf_token"]

    dummy_docx = create_synthetic_docx("Victim One", "victim@example.com")
    res1 = await client.post(
        "/api/v1/resumes",
        files={"file": ("u1.docx", dummy_docx, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
        headers={"X-CSRF-Token": csrf1}
    )
    u1_resume_id = res1.json()["id"]

    c1 = await client.post(
        "/api/v1/contacts",
        json={"first_name": "Alice", "company": "Apple", "profile_url": "https://linkedin.com/in/alice-idor"},
        headers={"X-CSRF-Token": csrf1}
    )
    u1_contact_id = c1.json()["id"]

    s1 = await client.post(
        "/api/v1/shortlists",
        json={"name": "Confidential Shortlist"},
        headers={"X-CSRF-Token": csrf1}
    )
    u1_shortlist_id = s1.json()["id"]

    d1 = await client.post(
        "/api/v1/messages/generate",
        json={"contact_id": u1_contact_id, "template_code": "A"},
        headers={"X-CSRF-Token": csrf1}
    )
    u1_draft_id = d1.json()["id"]

    # Setup Attacker User 2
    r2 = await client.post("/api/v1/auth/register", json={
        "email": "attacker_u2@example.com",
        "password": "Password123!",
        "full_name": "Attacker Two"
    })
    csrf2 = r2.json()["csrf_token"]

    # IDOR Audits: Every cross-tenant access MUST return HTTP 404 (NEVER 403 or 200)
    assert (await client.get(f"/api/v1/resumes/{u1_resume_id}")).status_code == 404
    assert (await client.get(f"/api/v1/resumes/{u1_resume_id}/download")).status_code == 404
    assert (await client.delete(f"/api/v1/resumes/{u1_resume_id}", headers={"X-CSRF-Token": csrf2})).status_code == 404

    assert (await client.get(f"/api/v1/contacts/{u1_contact_id}")).status_code == 404
    assert (await client.put(f"/api/v1/contacts/{u1_contact_id}", json={"company": "Hacked"}, headers={"X-CSRF-Token": csrf2})).status_code == 404
    assert (await client.delete(f"/api/v1/contacts/{u1_contact_id}", headers={"X-CSRF-Token": csrf2})).status_code == 404

    assert (await client.get(f"/api/v1/shortlists/{u1_shortlist_id}")).status_code == 404
    assert (await client.get(f"/api/v1/shortlists/{u1_shortlist_id}/export-csv")).status_code == 404
    assert (await client.delete(f"/api/v1/shortlists/{u1_shortlist_id}", headers={"X-CSRF-Token": csrf2})).status_code == 404

    assert (await client.get(f"/api/v1/messages/{u1_draft_id}")).status_code == 404
    assert (await client.put(f"/api/v1/messages/{u1_draft_id}", json={"body": "Hacked"}, headers={"X-CSRF-Token": csrf2})).status_code == 404
    assert (await client.post(f"/api/v1/messages/{u1_draft_id}/transition", json={"target_state": "Approved"}, headers={"X-CSRF-Token": csrf2})).status_code == 404
    assert (await client.post(f"/api/v1/messages/{u1_draft_id}/copy", headers={"X-CSRF-Token": csrf2})).status_code == 404
    assert (await client.post(f"/api/v1/tracker/{u1_draft_id}/schedule-follow-up", json={"follow_up_days": 10}, headers={"X-CSRF-Token": csrf2})).status_code == 404
    assert (await client.post(f"/api/v1/tracker/contact/{u1_contact_id}/mark-replied", headers={"X-CSRF-Token": csrf2})).status_code == 404


@pytest.mark.asyncio
async def test_audit_log_tracking_of_exports_and_actions(client: AsyncClient):
    """Test that CSV exports and sensitive data operations record immutable audit entries."""
    auth_rate_limiter.reset()

    reg = await client.post("/api/v1/auth/register", json={
        "email": "audit_export_user@example.com",
        "password": "Password123!",
        "full_name": "Audit Export"
    })
    csrf = reg.json()["csrf_token"]

    # Create shortlist
    s = await client.post(
        "/api/v1/shortlists",
        json={"name": "Export Audit Shortlist"},
        headers={"X-CSRF-Token": csrf}
    )
    s_id = s.json()["id"]

    # Export shortlist CSV
    export_res = await client.get(f"/api/v1/shortlists/{s_id}/export-csv")
    assert export_res.status_code == 200

    # Retrieve audit log
    logs_res = await client.get("/api/v1/audit/logs")
    assert logs_res.status_code == 200
    logs = logs_res.json()
    assert any(log["action"] == "export_shortlist_csv" and log["entity_id"] == s_id for log in logs)
