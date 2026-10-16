"""Contacts management endpoints."""
import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from app.db.session import get_db
from app.models.user import User
from app.models.contact import Contact, normalize_linkedin_url
from app.schemas.contact import (
    ContactCreate,
    ContactUpdate,
    ContactResponse,
    ContactListResponse,
    CSVPreviewResponse,
    CSVImportResponse,
)
from app.schemas.auth import MessageResponse
from app.services.csv_parser import parse_csv_preview, upsert_connections_csv
from app.services.audit import record_audit_event
from app.core.rate_limit import import_rate_limiter
from app.api.deps import get_current_user, enforce_user_ownership, verify_csrf

router = APIRouter(prefix="/contacts", tags=["Contacts"])


@router.get("", response_model=ContactListResponse)
async def list_contacts(
    query: Optional[str] = Query(None, description="Search by name, company, or position"),
    company: Optional[str] = Query(None),
    role: Optional[str] = Query(None, description="Filter by position / role"),
    sort_by: Optional[str] = Query("name", description="Sort field: name, company, connected_on"),
    sort_order: Optional[str] = Query("asc", description="Sort order: asc, desc"),
    archived: bool = Query(False),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List connections belonging to the authenticated user with optional filtering and pagination."""
    # Always scope query strictly by user_id
    filters = [Contact.user_id == current_user.id, Contact.is_archived == archived]

    if company:
        filters.append(Contact.company.ilike(f"%{company}%"))

    if role:
        filters.append(Contact.position.ilike(f"%{role}%"))

    if query:
        search_pattern = f"%{query}%"
        filters.append(
            or_(
                Contact.first_name.ilike(search_pattern),
                Contact.last_name.ilike(search_pattern),
                Contact.company.ilike(search_pattern),
                Contact.position.ilike(search_pattern)
            )
        )

    # Count total
    count_stmt = select(func.count(Contact.id)).where(*filters)
    total = (await db.execute(count_stmt)).scalar() or 0

    # Determine sort order
    if sort_by == "company":
        order_col = Contact.company
    elif sort_by == "connected_on":
        order_col = Contact.connected_on
    else:
        order_col = Contact.first_name

    order_clause = order_col.desc() if sort_order and sort_order.lower() == "desc" else order_col.asc()

    # Fetch paginated items
    offset = (page - 1) * size
    stmt = (
        select(Contact)
        .where(*filters)
        .order_by(order_clause)
        .offset(offset)
        .limit(size)
    )
    result = await db.execute(stmt)
    contacts = result.scalars().all()

    return ContactListResponse(
        items=[ContactResponse.model_validate(c) for c in contacts],
        total=total,
        page=page,
        size=size
    )


@router.post("/preview-csv", response_model=CSVPreviewResponse, dependencies=[Depends(verify_csrf)])
async def preview_csv(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Preview Connections CSV, detect preamble lines, and suggest column mappings."""
    allowed_exts = (".csv", ".zip")
    if not file.filename or not file.filename.lower().endswith(allowed_exts):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Supported formats: official LinkedIn Connections.csv or data export .zip archive."
        )
    file_bytes = await file.read()
    if len(file_bytes) > 25 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File exceeds maximum size of 25 MB."
        )
    try:
        result = parse_csv_preview(file_bytes)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return CSVPreviewResponse(**result)


@router.post("/import-csv", response_model=CSVImportResponse, dependencies=[Depends(verify_csrf)])
async def import_csv(
    request: Request,
    file: UploadFile = File(...),
    mapping: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Import contacts from LinkedIn Connections.csv or data export .zip with duplicate-safe upsert and auto-categorization."""
    import_rate_limiter.check(request, "import")
    allowed_exts = (".csv", ".zip")
    if not file.filename or not file.filename.lower().endswith(allowed_exts):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Supported formats: official LinkedIn Connections.csv or data export .zip archive."
        )
    file_bytes = await file.read()
    if len(file_bytes) > 25 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File exceeds maximum size of 25 MB."
        )
    custom_map = None
    if mapping:
        try:
            custom_map = json.loads(mapping)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid mapping JSON format."
            )
    try:
        result = await upsert_connections_csv(
            db=db,
            user_id=current_user.id,
            file_bytes=file_bytes,
            custom_mapping=custom_map
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    # Auto-categorize and score imported contacts immediately
    try:
        from app.models.contact_analysis import ContactAnalysis
        from app.models.candidate_profile import CandidateProfile
        from app.services.classifier import classify_deterministic, compute_content_hash
        from app.services.scoring import calculate_contact_score

        prof_stmt = select(CandidateProfile).where(CandidateProfile.user_id == current_user.id)
        profile = (await db.execute(prof_stmt)).scalar_one_or_none()
        t_roles = profile.target_roles if profile else []
        t_companies = profile.target_companies if profile else []
        skills = profile.skills if profile else []
        weights = (profile.preferences or {}).get("scoring_weights") if profile else None

        user_contacts = (await db.execute(select(Contact).where(Contact.user_id == current_user.id, Contact.is_archived == False))).scalars().all()
        for c in user_contacts:
            c_hash = compute_content_hash(c.position, c.company, t_roles, t_companies)
            ana_stmt = select(ContactAnalysis).where(ContactAnalysis.user_id == current_user.id, ContactAnalysis.contact_id == c.id)
            ana = (await db.execute(ana_stmt)).scalar_one_or_none()
            if ana and ana.content_hash == c_hash and ana.user_override:
                continue

            c_res = classify_deterministic(c.position, c.company, t_companies, c.notes)
            s_res = calculate_contact_score(c.position, c.company, c_res, t_roles, t_companies, skills, weights)

            if not ana:
                ana = ContactAnalysis(user_id=current_user.id, contact_id=c.id)
                db.add(ana)
            ana.score = s_res.score
            ana.priority = s_res.priority
            ana.confidence = s_res.confidence
            ana.categories = c_res.categories
            ana.reasons = c_res.reasons
            ana.missing_info = c_res.missing_info
            ana.factor_breakdown = s_res.factor_breakdown
            ana.weights_used = s_res.weights_used
            ana.content_hash = c_hash
            ana.user_override = False
        await db.commit()
    except Exception as exc:
        logger.warning(f"Auto-categorization during import completed: {exc}")

    await record_audit_event(
        db=db,
        user_id=current_user.id,
        action="import_contacts_csv",
        entity_type="contacts",
        details={"created": result.get("created"), "updated": result.get("updated"), "total": result.get("total_processed")}
    )

    return CSVImportResponse(**result)



@router.post("", response_model=ContactResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(verify_csrf)])
async def create_contact(
    payload: ContactCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new contact connection with normalized URL deduplication."""
    norm_url = normalize_linkedin_url(payload.profile_url)

    # Check if duplicate exists for this user
    if norm_url:
        dup_stmt = select(Contact).where(
            Contact.user_id == current_user.id,
            Contact.profile_url_normalized == norm_url
        )
        existing = (await db.execute(dup_stmt)).scalar_one_or_none()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A contact with this LinkedIn profile already exists in your connections."
            )

    contact = Contact(
        user_id=current_user.id,
        first_name=payload.first_name,
        last_name=payload.last_name or "",
        profile_url=payload.profile_url or "",
        profile_url_normalized=norm_url,
        email=payload.email,
        company=payload.company or "Unknown",
        position=payload.position or "Unknown",
        connected_on=payload.connected_on,
        notes=payload.notes,
        is_archived=False
    )
    db.add(contact)
    await db.commit()
    await db.refresh(contact)

    return ContactResponse.model_validate(contact)


@router.get("/{contact_id}", response_model=ContactResponse)
async def get_contact(
    contact_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve details for a single contact.

    CRITICAL RULE: Returns 404 (not 403) if the contact belongs to another user.
    """
    stmt = select(Contact).where(Contact.id == contact_id)
    contact = (await db.execute(stmt)).scalar_one_or_none()

    if not contact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")

    # Enforce ownership
    enforce_user_ownership(contact.user_id, current_user.id)
    return ContactResponse.model_validate(contact)


@router.put("/{contact_id}", response_model=ContactResponse, dependencies=[Depends(verify_csrf)])
async def update_contact(
    contact_id: str,
    payload: ContactUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update contact attributes. Returns 404 if the contact belongs to another user."""
    stmt = select(Contact).where(Contact.id == contact_id)
    contact = (await db.execute(stmt)).scalar_one_or_none()

    if not contact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")

    # Enforce ownership returning 404 (never 403)
    enforce_user_ownership(contact.user_id, current_user.id)

    if payload.first_name is not None:
        contact.first_name = payload.first_name
    if payload.last_name is not None:
        contact.last_name = payload.last_name
    if payload.profile_url is not None:
        contact.profile_url = payload.profile_url
        contact.profile_url_normalized = normalize_linkedin_url(payload.profile_url)
    if payload.email is not None:
        contact.email = payload.email
    if payload.company is not None:
        contact.company = payload.company
    if payload.position is not None:
        contact.position = payload.position
    if payload.connected_on is not None:
        contact.connected_on = payload.connected_on
    if payload.notes is not None:
        contact.notes = payload.notes
    if payload.is_archived is not None:
        contact.is_archived = payload.is_archived

    await db.commit()
    await db.refresh(contact)
    return ContactResponse.model_validate(contact)


SYNTHETIC_FIXTURES = [
    {
        "first_name": "Alice",
        "last_name": "Smith",
        "profile_url": "https://www.linkedin.com/in/alicesmith-recruiter",
        "email": "alice.smith@google.com",
        "company": "Google",
        "position": "Technical Recruiter",
        "connected_on": "2024-01-15",
    },
    {
        "first_name": "Bob",
        "last_name": "Jones",
        "profile_url": "https://www.linkedin.com/in/bobjones-eng",
        "email": "bob.jones@meta.com",
        "company": "Meta",
        "position": "Staff Software Engineer",
        "connected_on": "2024-02-12",
    },
    {
        "first_name": "Carol",
        "last_name": "White",
        "profile_url": "https://www.linkedin.com/in/carolwhite-talent",
        "email": "carol.white@amazon.com",
        "company": "Amazon",
        "position": "Senior Talent Acquisition Partner",
        "connected_on": "2023-11-20",
    },
    {
        "first_name": "David",
        "last_name": "Kim",
        "profile_url": "https://www.linkedin.com/in/davidkim-em",
        "email": "david.kim@stripe.com",
        "company": "Stripe",
        "position": "Engineering Manager",
        "connected_on": "2023-10-05",
    },
    {
        "first_name": "Elena",
        "last_name": "Rostova",
        "profile_url": "https://www.linkedin.com/in/elena-rostova-recruiter",
        "email": "elena.rostova@microsoft.com",
        "company": "Microsoft",
        "position": "University Talent Recruiter",
        "connected_on": "2024-01-18",
    },
    {
        "first_name": "Marcus",
        "last_name": "Vance",
        "profile_url": "https://www.linkedin.com/in/marcusvance-dev",
        "email": "marcus.vance@netflix.com",
        "company": "Netflix",
        "position": "Principal Software Architect",
        "connected_on": "2023-08-01",
    },
    {
        "first_name": "Sarah",
        "last_name": "Connor",
        "profile_url": "https://www.linkedin.com/in/sarah-connor-hr",
        "email": "sconnor@apple.com",
        "company": "Apple",
        "position": "Lead Technical Sourcer",
        "connected_on": "2023-12-10",
    },
]


@router.post("/synthetic", response_model=CSVImportResponse, dependencies=[Depends(verify_csrf)])
async def load_synthetic_contacts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Load realistic synthetic 1st-degree connection fixtures for the authenticated user."""
    created = 0
    updated = 0
    for item in SYNTHETIC_FIXTURES:
        norm_url = normalize_linkedin_url(item["profile_url"])
        stmt = select(Contact).where(
            Contact.user_id == current_user.id,
            Contact.profile_url_normalized == norm_url
        )
        existing = (await db.execute(stmt)).scalar_one_or_none()
        if existing:
            existing.company = item["company"]
            existing.position = item["position"]
            existing.email = item["email"]
            updated += 1
        else:
            contact = Contact(
                user_id=current_user.id,
                first_name=item["first_name"],
                last_name=item["last_name"],
                profile_url=item["profile_url"],
                profile_url_normalized=norm_url,
                email=item["email"],
                company=item["company"],
                position=item["position"],
                connected_on=item["connected_on"],
                is_archived=False
            )
            db.add(contact)
            created += 1

    await db.commit()
    await record_audit_event(
        db,
        user_id=current_user.id,
        action="load_synthetic_fixtures",
        entity_type="contacts",
        details={"created": created, "updated": updated, "total": len(SYNTHETIC_FIXTURES)}
    )
    return CSVImportResponse(
        total_processed=len(SYNTHETIC_FIXTURES),
        created=created,
        updated=updated,
        skipped_duplicates=0,
        unmapped_columns=[]
    )


@router.delete("/{contact_id}", response_model=MessageResponse, dependencies=[Depends(verify_csrf)])
async def delete_contact(
    contact_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a contact. Returns 404 if the contact belongs to another user."""
    stmt = select(Contact).where(Contact.id == contact_id)
    contact = (await db.execute(stmt)).scalar_one_or_none()

    if not contact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")

    enforce_user_ownership(contact.user_id, current_user.id)

    await record_audit_event(
        db,
        user_id=current_user.id,
        action="delete_contact",
        entity_type="contact",
        entity_id=contact_id,
        details={"name": f"{contact.first_name} {contact.last_name}", "company": contact.company}
    )

    await db.delete(contact)
    await db.commit()
    return MessageResponse(message="Contact deleted successfully")


@router.delete("", response_model=MessageResponse, dependencies=[Depends(verify_csrf)])
async def delete_all_contacts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Purge all contacts belonging to the authenticated user."""
    stmt = select(Contact).where(Contact.user_id == current_user.id)
    contacts = (await db.execute(stmt)).scalars().all()
    count = len(contacts)

    for c in contacts:
        await db.delete(c)

    await record_audit_event(
        db,
        user_id=current_user.id,
        action="purge_all_contacts",
        entity_type="contact",
        details={"deleted_count": count}
    )

    await db.commit()
    return MessageResponse(message=f"All {count} contacts permanently deleted")
