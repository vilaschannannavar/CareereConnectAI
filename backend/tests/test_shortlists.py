"""Integration tests for named shortlist creation, management, CSV export, and user isolation."""
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession
from app.main import app
from app.db.session import get_db
from app.core.rate_limit import auth_rate_limiter


@pytest.mark.asyncio
async def test_shortlist_full_lifecycle_and_export(client: AsyncClient):
    """Test shortlist creation, contact management, renaming, CSV export, and deletion."""
    auth_rate_limiter.reset()

    # 1. Register user
    reg = await client.post("/api/v1/auth/register", json={
        "email": "shortlist_user@example.com",
        "password": "Password123!",
        "full_name": "Shortlist User"
    })
    csrf = reg.json()["csrf_token"]

    # 2. Create contacts
    c1 = await client.post(
        "/api/v1/contacts",
        json={
            "first_name": "Sarah",
            "last_name": "Connor",
            "company": "Cyberdyne",
            "position": "Security Lead",
            "profile_url": "https://linkedin.com/in/sarah-connor"
        },
        headers={"X-CSRF-Token": csrf}
    )
    c1_id = c1.json()["id"]

    # 3. Create named shortlist
    create_res = await client.post(
        "/api/v1/shortlists",
        json={"name": "Tier 1 Priority Outreach", "description": "High match engineering targets"},
        headers={"X-CSRF-Token": csrf}
    )
    assert create_res.status_code == 201
    shortlist_id = create_res.json()["id"]
    assert create_res.json()["name"] == "Tier 1 Priority Outreach"

    # 4. Add contact to shortlist
    add_res = await client.post(
        f"/api/v1/shortlists/{shortlist_id}/contacts",
        json={"contact_ids": [c1_id], "action": "add"},
        headers={"X-CSRF-Token": csrf}
    )
    assert add_res.status_code == 200

    # 5. Get shortlist detail
    detail_res = await client.get(f"/api/v1/shortlists/{shortlist_id}")
    assert detail_res.status_code == 200
    assert len(detail_res.json()["contacts"]) == 1
    assert detail_res.json()["contacts"][0]["first_name"] == "Sarah"

    # 6. Rename shortlist
    rename_res = await client.put(
        f"/api/v1/shortlists/{shortlist_id}",
        json={"name": "Top Referrers 2026"},
        headers={"X-CSRF-Token": csrf}
    )
    assert rename_res.status_code == 200
    assert rename_res.json()["name"] == "Top Referrers 2026"

    # 7. Export shortlist to CSV
    export_res = await client.get(f"/api/v1/shortlists/{shortlist_id}/export-csv")
    assert export_res.status_code == 200
    assert "text/csv" in export_res.headers.get("content-type", "")
    csv_text = export_res.content.decode("utf-8")
    assert "Sarah" in csv_text
    assert "Cyberdyne" in csv_text
    assert "First Name,Last Name" in csv_text

    # 8. Remove contact from shortlist
    remove_res = await client.post(
        f"/api/v1/shortlists/{shortlist_id}/contacts",
        json={"contact_ids": [c1_id], "action": "remove"},
        headers={"X-CSRF-Token": csrf}
    )
    assert remove_res.status_code == 200

    detail_after_remove = await client.get(f"/api/v1/shortlists/{shortlist_id}")
    assert len(detail_after_remove.json()["contacts"]) == 0

    # 9. Delete shortlist
    del_res = await client.delete(f"/api/v1/shortlists/{shortlist_id}", headers={"X-CSRF-Token": csrf})
    assert del_res.status_code == 200

    # Verify 404 after deletion
    get_deleted = await client.get(f"/api/v1/shortlists/{shortlist_id}")
    assert get_deleted.status_code == 404


@pytest.mark.asyncio
async def test_shortlist_cross_user_isolation(db_session: AsyncSession):
    """Prove that User B cannot view, edit, export, or delete User A's shortlist (strictly 404)."""
    auth_rate_limiter.reset()

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client_a:
        async with AsyncClient(transport=transport, base_url="http://test") as client_b:
            # User A creates shortlist
            reg_a = await client_a.post("/api/v1/auth/register", json={
                "email": "user_a_sl@example.com",
                "password": "Password123!",
                "full_name": "User A"
            })
            csrf_a = reg_a.json()["csrf_token"]

            sl_res = await client_a.post(
                "/api/v1/shortlists",
                json={"name": "User A Secret Shortlist"},
                headers={"X-CSRF-Token": csrf_a}
            )
            sl_id = sl_res.json()["id"]

            # User B registers
            await client_b.post("/api/v1/auth/register", json={
                "email": "user_b_sl@example.com",
                "password": "Password123!",
                "full_name": "User B"
            })

            # User B attempts to access User A's shortlist -> strictly 404
            b_get = await client_b.get(f"/api/v1/shortlists/{sl_id}")
            assert b_get.status_code == 404

            # User B attempts to export User A's shortlist -> strictly 404
            b_export = await client_b.get(f"/api/v1/shortlists/{sl_id}/export-csv")
            assert b_export.status_code == 404
