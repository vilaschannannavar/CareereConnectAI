"""Multi-user data isolation tests proving User B receives 404 on User A's resources."""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.session import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.rate_limit import auth_rate_limiter


@pytest.mark.asyncio
async def test_two_user_resource_isolation_returns_404(db_session: AsyncSession):
    """Prove that User B cannot read, update, or delete User A's resources by ID.
    Must strictly return 404 Not Found (never 403).
    """
    auth_rate_limiter.reset()

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client_a:
        async with AsyncClient(transport=transport, base_url="http://test") as client_b:
            # 1. Register User Alpha
            reg_a = await client_a.post("/api/v1/auth/register", json={
                "email": "alpha@example.com",
                "password": "PasswordAlpha123!",
                "full_name": "User Alpha"
            })
            assert reg_a.status_code == 201
            csrf_a = reg_a.json()["csrf_token"]

            # 2. User Alpha creates a contact
            contact_res = await client_a.post(
                "/api/v1/contacts",
                json={
                    "first_name": "Alice",
                    "last_name": "Recruiter",
                    "profile_url": "https://www.linkedin.com/in/alice-recruiter-alpha",
                    "company": "TechCorp",
                    "position": "Lead Recruiter"
                },
                headers={"X-CSRF-Token": csrf_a}
            )
            assert contact_res.status_code == 201
            contact_a_id = contact_res.json()["id"]

            # 3. User Alpha uploads a resume
            import io
            from pypdf import PdfWriter
            pdf_writer = PdfWriter()
            pdf_writer.add_blank_page(width=72, height=72)
            pdf_buf = io.BytesIO()
            pdf_writer.write(pdf_buf)
            pdf_bytes = pdf_buf.getvalue()

            resume_files = {
                "file": ("alpha_resume.pdf", pdf_bytes, "application/pdf")
            }
            resume_res = await client_a.post(
                "/api/v1/resumes",
                files=resume_files,
                headers={"X-CSRF-Token": csrf_a}
            )
            assert resume_res.status_code == 201
            resume_a_id = resume_res.json()["id"]

            # 4. Register User Beta
            reg_b = await client_b.post("/api/v1/auth/register", json={
                "email": "beta@example.com",
                "password": "PasswordBeta123!",
                "full_name": "User Beta"
            })
            assert reg_b.status_code == 201
            csrf_b = reg_b.json()["csrf_token"]

            # 5. USER BETA ATTEMPTS TO ACCESS USER ALPHA'S CONTACT
            # GET by ID -> Expect 404
            get_contact = await client_b.get(f"/api/v1/contacts/{contact_a_id}")
            assert get_contact.status_code == 404
            assert get_contact.json()["detail"] == "Resource not found"

            # PUT by ID -> Expect 404
            put_contact = await client_b.put(
                f"/api/v1/contacts/{contact_a_id}",
                json={"first_name": "HackedName"},
                headers={"X-CSRF-Token": csrf_b}
            )
            assert put_contact.status_code == 404
            assert put_contact.json()["detail"] == "Resource not found"

            # DELETE by ID -> Expect 404
            del_contact = await client_b.delete(
                f"/api/v1/contacts/{contact_a_id}",
                headers={"X-CSRF-Token": csrf_b}
            )
            assert del_contact.status_code == 404
            assert del_contact.json()["detail"] == "Resource not found"

            # 6. USER BETA ATTEMPTS TO ACCESS USER ALPHA'S RESUME
            # GET by ID -> Expect 404
            get_resume = await client_b.get(f"/api/v1/resumes/{resume_a_id}")
            assert get_resume.status_code == 404
            assert get_resume.json()["detail"] == "Resource not found"

            # DELETE by ID -> Expect 404
            del_resume = await client_b.delete(
                f"/api/v1/resumes/{resume_a_id}",
                headers={"X-CSRF-Token": csrf_b}
            )
            assert del_resume.status_code == 404
            assert del_resume.json()["detail"] == "Resource not found"

            # 7. USER BETA LISTS CONTACTS & RESUMES -> User Alpha's records must NOT appear
            b_contacts = await client_b.get("/api/v1/contacts")
            assert b_contacts.status_code == 200
            assert b_contacts.json()["total"] == 0

            b_resumes = await client_b.get("/api/v1/resumes")
            assert b_resumes.status_code == 200
            assert len(b_resumes.json()) == 0

    app.dependency_overrides.clear()
