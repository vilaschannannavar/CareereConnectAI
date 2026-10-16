"""Integration tests for LinkedIn Connections CSV ingestion, preamble stripping,
BOM/encoding tolerance, column mapping, duplicate detection, and upsert logic.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.contact import Contact
from app.core.rate_limit import auth_rate_limiter
from app.services.csv_parser import (
    decode_csv_bytes,
    strip_preamble_notes,
    parse_csv_preview,
    upsert_connections_csv
)


SAMPLE_LINKEDIN_CSV_WITH_PREAMBLE = """Notes:
1. When exporting your connection data, that data will only include 1st-degree connections.
2. We do not export your connections' email addresses if they have opted out.

First Name,Last Name,URL,Email Address,Company,Position,Connected On
Sarah,Connor,https://www.linkedin.com/in/sarah-connor-123?trk=public_profile,sconnor@skynet.com,Cyberdyne Systems,Head of Security,15 Jan 2024
John,Doe,https://www.linkedin.com/in/john-doe,johndoe@example.com,Acme Corp,Senior Software Engineer,10 Mar 2023
Jane,Smith,,,Innovate Inc,Product Manager,05 Dec 2022
"""


@pytest.mark.asyncio
async def test_preamble_notes_stripping():
    """Verify parser strips LinkedIn preamble lines and begins at the CSV header row."""
    lines_stripped, cleaned_text = strip_preamble_notes(SAMPLE_LINKEDIN_CSV_WITH_PREAMBLE)
    assert lines_stripped >= 3
    first_clean_line = cleaned_text.strip().splitlines()[0]
    assert "First Name" in first_clean_line
    assert "Company" in first_clean_line


@pytest.mark.asyncio
async def test_bom_and_encoding_tolerance():
    """Verify parser handles UTF-8 with BOM (\xef\xbb\xbf) and Latin-1 encodings."""
    # 1. UTF-8 BOM
    bom_bytes = b"\xef\xbb\xbfFirst Name,Last Name,Company\nAlice,Wonder,Wonderland Ltd\n"
    decoded_bom = decode_csv_bytes(bom_bytes)
    assert not decoded_bom.startswith("\ufeff")
    assert "Alice" in decoded_bom

    # 2. Latin-1 with accented characters
    latin1_bytes = "First Name,Last Name,Company\nRené,Müller,Siemens AG\n".encode("latin-1")
    decoded_latin1 = decode_csv_bytes(latin1_bytes)
    assert "René" in decoded_latin1
    assert "Müller" in decoded_latin1


@pytest.mark.asyncio
async def test_csv_preview_endpoint(client: AsyncClient):
    """Test preview endpoint extracts headers, suggestions, and preamble metrics."""
    auth_rate_limiter.reset()

    reg = await client.post("/api/v1/auth/register", json={
        "email": "preview_user@example.com",
        "password": "Password123!",
        "full_name": "Preview User"
    })
    csrf = reg.json()["csrf_token"]

    csv_bytes = SAMPLE_LINKEDIN_CSV_WITH_PREAMBLE.encode("utf-8")
    files = {"file": ("Connections.csv", csv_bytes, "text/csv")}

    response = await client.post(
        "/api/v1/contacts/preview-csv",
        files=files,
        headers={"X-CSRF-Token": csrf}
    )
    assert response.status_code == 200
    data = response.json()

    assert data["preamble_lines_stripped"] >= 3
    assert "First Name" in data["headers"]
    assert "Company" in data["headers"]
    assert len(data["preview"]) == 3
    assert data["mapping_suggestions"]["First Name"] == "first_name"
    assert data["mapping_suggestions"]["Company"] == "company"


@pytest.mark.asyncio
async def test_csv_import_and_duplicate_upsert(client: AsyncClient, db_session: AsyncSession):
    """Verify that importing Connections.csv creates contacts and re-importing updates them (upsert)."""
    auth_rate_limiter.reset()

    reg = await client.post("/api/v1/auth/register", json={
        "email": "upsert_user@example.com",
        "password": "Password123!",
        "full_name": "Upsert User"
    })
    csrf = reg.json()["csrf_token"]
    user_id = reg.json()["user"]["id"]

    # Initial Import
    csv_bytes_1 = SAMPLE_LINKEDIN_CSV_WITH_PREAMBLE.encode("utf-8")
    res1 = await client.post(
        "/api/v1/contacts/import-csv",
        files={"file": ("Connections.csv", csv_bytes_1, "text/csv")},
        headers={"X-CSRF-Token": csrf}
    )
    assert res1.status_code == 200
    res1_data = res1.json()
    assert res1_data["added"] == 3
    assert res1_data["updated"] == 0

    # Verify contacts in database
    contacts_stmt = select(Contact).where(Contact.user_id == user_id)
    contacts = (await db_session.execute(contacts_stmt)).scalars().all()
    assert len(contacts) == 3

    # Check Sarah Connor URL normalization
    sarah = next(c for c in contacts if c.first_name == "Sarah")
    assert "sarah-connor-123" in sarah.profile_url_normalized
    assert "trk=" not in sarah.profile_url_normalized

    # Check Jane Smith missing URL & Email (should default company/position, None for email)
    jane = next(c for c in contacts if c.first_name == "Jane")
    assert jane.email is None
    assert jane.company == "Innovate Inc"

    # Second Import: Sarah Connor got promoted to VP and changed company to "Resistance AI"
    # URL has different tracking param, but same canonical profile URL
    UPDATED_CSV = """First Name,Last Name,URL,Email Address,Company,Position,Connected On
Sarah,Connor,https://www.linkedin.com/in/sarah-connor-123/?lipi=urn%3Ali%3Apage,sconnor@resistance.org,Resistance AI,VP of Defense,15 Jan 2024
"""
    res2 = await client.post(
        "/api/v1/contacts/import-csv",
        files={"file": ("Connections.csv", UPDATED_CSV.encode("utf-8"), "text/csv")},
        headers={"X-CSRF-Token": csrf}
    )
    assert res2.status_code == 200
    res2_data = res2.json()
    assert res2_data["added"] == 0
    assert res2_data["updated"] == 1

    # Verify total count is STILL 3, not 4
    updated_contacts = (await db_session.execute(contacts_stmt)).scalars().all()
    assert len(updated_contacts) == 3

    # Verify Sarah's fields were updated
    sarah_updated = next(c for c in updated_contacts if c.first_name == "Sarah")
    assert sarah_updated.company == "Resistance AI"
    assert sarah_updated.position == "VP of Defense"
    assert sarah_updated.email == "sconnor@resistance.org"


@pytest.mark.asyncio
async def test_contacts_search_sort_and_filter(client: AsyncClient):
    """Test filtering by role, company, and sorting by name, company, connected_on."""
    auth_rate_limiter.reset()

    reg = await client.post("/api/v1/auth/register", json={
        "email": "filter_user@example.com",
        "password": "Password123!",
        "full_name": "Filter User"
    })
    csrf = reg.json()["csrf_token"]

    csv_data = """First Name,Last Name,URL,Email Address,Company,Position,Connected On
Alice,Recruiter,https://linkedin.com/in/alice-recruiter,alice@google.com,Google,Technical Recruiter,2024-01-10
Bob,Staff,https://linkedin.com/in/bob-staff,bob@meta.com,Meta,Staff Engineer,2024-02-15
Charlie,Talent,https://linkedin.com/in/charlie-talent,charlie@google.com,Google,Senior Recruiter,2023-11-20
David,Lead,https://linkedin.com/in/david-lead,david@amazon.com,Amazon,Engineering Manager,2024-03-01
"""
    await client.post(
        "/api/v1/contacts/import-csv",
        files={"file": ("Connections.csv", csv_data.encode("utf-8"), "text/csv")},
        headers={"X-CSRF-Token": csrf}
    )

    # 1. Filter by company = Google
    google_res = await client.get("/api/v1/contacts?company=Google")
    assert google_res.status_code == 200
    google_data = google_res.json()
    assert google_data["total"] == 2
    assert all(c["company"] == "Google" for c in google_data["items"])

    # 2. Filter by role = Recruiter
    recruiter_res = await client.get("/api/v1/contacts?role=Recruiter")
    assert recruiter_res.status_code == 200
    recruiter_data = recruiter_res.json()
    assert recruiter_data["total"] == 2
    assert all("Recruiter" in c["position"] for c in recruiter_data["items"])

    # 3. Sort by company descending
    sort_res = await client.get("/api/v1/contacts?sort_by=company&sort_order=desc")
    assert sort_res.status_code == 200
    items = sort_res.json()["items"]
    companies = [c["company"] for c in items]
    assert companies == sorted(companies, reverse=True)


@pytest.mark.asyncio
async def test_csv_injection_and_malformed_input_safety(client: AsyncClient, db_session: AsyncSession):
    """Verify that potentially malicious strings in CSV rows are safely stored without executing."""
    auth_rate_limiter.reset()

    reg = await client.post("/api/v1/auth/register", json={
        "email": "safe_user@example.com",
        "password": "Password123!",
        "full_name": "Safe User"
    })
    csrf = reg.json()["csrf_token"]
    user_id = reg.json()["user"]["id"]

    malicious_csv = """First Name,Last Name,URL,Email Address,Company,Position,Connected On
Robert'); DROP TABLE contacts; --,XSS<script>alert(1)</script>,https://linkedin.com/in/hacker,safe@test.com,EvilCorp{{7*7}},Hacker,2024-01-01
"""
    import_res = await client.post(
        "/api/v1/contacts/import-csv",
        files={"file": ("malicious.csv", malicious_csv.encode("utf-8"), "text/csv")},
        headers={"X-CSRF-Token": csrf}
    )
    assert import_res.status_code == 200

    # Ensure table was NOT dropped and record is preserved as inert literal text
    stmt = select(Contact).where(Contact.user_id == user_id)
    contacts = (await db_session.execute(stmt)).scalars().all()
    assert len(contacts) == 1
    assert "DROP TABLE" in contacts[0].first_name
    assert "<script>" in contacts[0].last_name
    assert "{{7*7}}" in contacts[0].company


@pytest.mark.asyncio
async def test_zip_archive_connections_import(client: AsyncClient, db_session: AsyncSession):
    """Verify that uploading a LinkedIn data export .zip directly extracts Connections.csv and auto-categorizes."""
    import io
    import zipfile
    from app.models.contact_analysis import ContactAnalysis

    auth_rate_limiter.reset()
    reg = await client.post("/api/v1/auth/register", json={
        "email": "zip_user@example.edu",
        "password": "Password123!",
        "full_name": "Zip User"
    })
    csrf = reg.json()["csrf_token"]
    user_id = reg.json()["user"]["id"]

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w") as zf:
        zf.writestr("LinkedInDataExport/Connections.csv", SAMPLE_LINKEDIN_CSV_WITH_PREAMBLE)
    zip_bytes = zip_buffer.getvalue()

    # 1. Preview ZIP
    preview_res = await client.post(
        "/api/v1/contacts/preview-csv",
        files={"file": ("LinkedInDataExport.zip", zip_bytes, "application/zip")},
        headers={"X-CSRF-Token": csrf}
    )
    assert preview_res.status_code == 200
    assert preview_res.json()["total_rows"] == 3

    # 2. Import ZIP
    import_res = await client.post(
        "/api/v1/contacts/import-csv",
        files={"file": ("LinkedInDataExport.zip", zip_bytes, "application/zip")},
        headers={"X-CSRF-Token": csrf}
    )
    assert import_res.status_code == 200
    assert import_res.json()["added"] == 3

    # 3. Verify contacts were stored
    stmt = select(Contact).where(Contact.user_id == user_id)
    contacts = (await db_session.execute(stmt)).scalars().all()
    assert len(contacts) == 3

    # 4. Verify automatic categorization ran immediately
    ana_stmt = select(ContactAnalysis).where(ContactAnalysis.user_id == user_id)
    analyses = (await db_session.execute(ana_stmt)).scalars().all()
    assert len(analyses) == 3
