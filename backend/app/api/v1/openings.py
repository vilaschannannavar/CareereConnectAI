"""Job openings management and official career page directory endpoints."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.db.session import get_db
from app.models.user import User
from app.models.job_opening import JobOpening
from app.schemas.job_opening import JobOpeningCreate, JobOpeningUpdate, JobOpeningResponse
from app.schemas.auth import MessageResponse
from app.services.career_directory import resolve_official_career_page
from app.services.audit import record_audit_event
from app.api.deps import get_current_user, enforce_user_ownership, verify_csrf

router = APIRouter(prefix="/openings", tags=["Job Openings & Company Research"])


@router.get("/career-url")
async def get_official_career_url(
    company: str = Query(..., min_length=1, description="Company name to resolve official career portal for")
):
    """Resolve the official verified career portal URL for a company without scraping."""
    portal_url = resolve_official_career_page(company)
    return {
        "company": company,
        "career_page_url": portal_url,
        "is_scraped": False,
        "policy": "Official verified direct link only"
    }


@router.post("", response_model=JobOpeningResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(verify_csrf)])
async def create_job_opening(
    payload: JobOpeningCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Record a targeted job opening manually (zero scraping). Automatically resolves official career page."""
    portal_url = resolve_official_career_page(payload.company)

    opening = JobOpening(
        user_id=current_user.id,
        company=payload.company.strip(),
        title=payload.title.strip(),
        url=payload.url.strip() if payload.url else None,
        career_page_url=portal_url,
        notes=payload.notes.strip() if payload.notes else None,
        status=payload.status
    )
    db.add(opening)
    await db.commit()
    await db.refresh(opening)

    await record_audit_event(
        db,
        user_id=current_user.id,
        action="create_job_opening",
        entity_type="job_opening",
        entity_id=opening.id,
        details={"company": opening.company, "title": opening.title}
    )

    return JobOpeningResponse.model_validate(opening)


@router.get("", response_model=List[JobOpeningResponse])
async def list_job_openings(
    company: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List tracked job openings belonging strictly to the authenticated user."""
    stmt = (
        select(JobOpening)
        .where(JobOpening.user_id == current_user.id)
        .order_by(desc(JobOpening.created_at))
    )
    if company:
        stmt = stmt.where(JobOpening.company.ilike(f"%{company}%"))
    if status_filter:
        stmt = stmt.where(JobOpening.status == status_filter)

    result = await db.execute(stmt)
    openings = result.scalars().all()
    return [JobOpeningResponse.model_validate(o) for o in openings]


@router.get("/{opening_id}", response_model=JobOpeningResponse)
async def get_job_opening(
    opening_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve details for a single job opening. Returns 404 for other users' openings."""
    stmt = select(JobOpening).where(JobOpening.id == opening_id)
    opening = (await db.execute(stmt)).scalar_one_or_none()

    if not opening:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    enforce_user_ownership(opening.user_id, current_user.id)

    return JobOpeningResponse.model_validate(opening)


@router.put("/{opening_id}", response_model=JobOpeningResponse, dependencies=[Depends(verify_csrf)])
async def update_job_opening(
    opening_id: str,
    payload: JobOpeningUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update job opening details. Returns 404 for other users' openings."""
    stmt = select(JobOpening).where(JobOpening.id == opening_id)
    opening = (await db.execute(stmt)).scalar_one_or_none()

    if not opening:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    enforce_user_ownership(opening.user_id, current_user.id)

    if payload.company is not None:
        opening.company = payload.company.strip()
        opening.career_page_url = resolve_official_career_page(opening.company)
    if payload.title is not None:
        opening.title = payload.title.strip()
    if payload.url is not None:
        opening.url = payload.url.strip()
    if payload.notes is not None:
        opening.notes = payload.notes.strip()
    if payload.status is not None:
        opening.status = payload.status

    await db.commit()
    await db.refresh(opening)
    return JobOpeningResponse.model_validate(opening)


@router.delete("/{opening_id}", response_model=MessageResponse, dependencies=[Depends(verify_csrf)])
async def delete_job_opening(
    opening_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a tracked job opening. Returns 404 for other users' openings."""
    stmt = select(JobOpening).where(JobOpening.id == opening_id)
    opening = (await db.execute(stmt)).scalar_one_or_none()

    if not opening:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    enforce_user_ownership(opening.user_id, current_user.id)

    await db.delete(opening)
    await db.commit()
    return MessageResponse(message="Job opening deleted successfully")
