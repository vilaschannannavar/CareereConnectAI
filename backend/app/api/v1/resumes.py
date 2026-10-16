"""Resume upload, text extraction, LLM parsing, authenticated download, and profile confirmation."""
import io
import uuid
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.user import User
from app.models.resume import Resume
from app.models.candidate_profile import CandidateProfile
from app.schemas.resume import ResumeResponse
from app.schemas.auth import MessageResponse
from app.core.config import settings
from app.core.storage import get_storage_service
from app.core.antivirus import scan_file_bytes
from app.core.llm import get_llm_service
from app.core.rate_limit import upload_rate_limiter
from app.services.resume_parser import validate_file_magic_bytes, extract_text_from_resume
from app.services.budget import enforce_llm_budget, record_llm_spend
from app.services.audit import record_audit_event
from app.api.deps import get_current_user, enforce_user_ownership, verify_csrf

router = APIRouter(prefix="/resumes", tags=["Resumes"])


@router.get("", response_model=List[ResumeResponse])
async def list_resumes(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all private resume documents uploaded by the authenticated user."""
    stmt = (
        select(Resume)
        .where(Resume.user_id == current_user.id)
        .order_by(Resume.created_at.desc())
    )
    result = await db.execute(stmt)
    resumes = result.scalars().all()
    return [ResumeResponse.model_validate(r) for r in resumes]


@router.post("", response_model=ResumeResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(verify_csrf)])
async def upload_resume(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload resume (PDF/DOCX, max 5MB), validate magic bytes, run AV hook, extract text, and parse with LLM."""
    upload_rate_limiter.check(request, "upload")
    content = await file.read()

    # 1. Validate file extension, magic bytes, and size (max 5 MB)
    file_type = validate_file_magic_bytes(content, file.filename or "resume.pdf")

    # 2. Run antivirus hook
    if not scan_file_bytes(content):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File failed security scan. Malicious content detected."
        )

    # 3. Store in private storage under random opaque key
    storage = get_storage_service()
    random_filename = f"{uuid.uuid4().hex}.{file_type}"
    storage_path = await storage.save_file(current_user.id, random_filename, content)

    # 4. Extract text from PDF / DOCX
    raw_text = extract_text_from_resume(content, file_type)

    # 5. Extract structured profile via provider-agnostic LLM with prompt-injection defense
    enforce_llm_budget(current_user.id, settings.LLM_ESTIMATED_COST_PER_CALL_USD)
    llm_service = get_llm_service()
    parsed_data = await llm_service.extract_resume_data(raw_text)
    record_llm_spend(current_user.id, settings.LLM_ESTIMATED_COST_PER_CALL_USD)

    # 6. Save in database
    mime_type = "application/pdf" if file_type == "pdf" else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    resume = Resume(
        user_id=current_user.id,
        file_name=file.filename or f"resume.{file_type}",
        file_path=storage_path,
        file_size=len(content),
        mime_type=mime_type,
        raw_text=raw_text,
        parsed_data=parsed_data.model_dump()
    )
    db.add(resume)
    await db.commit()
    await db.refresh(resume)

    return ResumeResponse.model_validate(resume)


@router.get("/{resume_id}", response_model=ResumeResponse)
async def get_resume(
    resume_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get metadata for a specific resume. Returns 404 for other users' resources."""
    stmt = select(Resume).where(Resume.id == resume_id)
    resume = (await db.execute(stmt)).scalar_one_or_none()

    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")

    # Strict user ownership returning 404 (never 403)
    enforce_user_ownership(resume.user_id, current_user.id)
    return ResumeResponse.model_validate(resume)


@router.get("/{resume_id}/download")
async def download_resume(
    resume_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Download private resume file via authenticated streaming endpoint. Returns 404 for other users."""
    stmt = select(Resume).where(Resume.id == resume_id)
    resume = (await db.execute(stmt)).scalar_one_or_none()

    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")

    enforce_user_ownership(resume.user_id, current_user.id)

    storage = get_storage_service()
    file_bytes = await storage.get_file(current_user.id, resume.file_path)
    if not file_bytes:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File content not found")

    return StreamingResponse(
        io.BytesIO(file_bytes),
        media_type=resume.mime_type,
        headers={"Content-Disposition": f'attachment; filename="{resume.file_name}"'}
    )


@router.delete("/{resume_id}", response_model=MessageResponse, dependencies=[Depends(verify_csrf)])
async def delete_resume(
    resume_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a resume document. Removes database record AND physically unlinks file from private storage."""
    stmt = select(Resume).where(Resume.id == resume_id)
    resume = (await db.execute(stmt)).scalar_one_or_none()

    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")

    enforce_user_ownership(resume.user_id, current_user.id)

    # Physically unlink from private disk storage
    storage = get_storage_service()
    await storage.delete_file(current_user.id, resume.file_path)

    await db.delete(resume)
    await db.commit()

    await record_audit_event(
        db=db,
        user_id=current_user.id,
        action="delete",
        entity_type="resume",
        entity_id=resume_id,
        details={"file_name": resume.file_name}
    )

    return MessageResponse(message="Resume and associated files deleted successfully")


@router.post("/{resume_id}/confirm-profile", response_model=MessageResponse, dependencies=[Depends(verify_csrf)])
async def confirm_profile_from_resume(
    resume_id: str,
    confirmed_data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Confirm and populate user candidate profile from verified resume extraction data."""
    stmt = select(Resume).where(Resume.id == resume_id)
    resume = (await db.execute(stmt)).scalar_one_or_none()

    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")

    enforce_user_ownership(resume.user_id, current_user.id)

    # Load or create candidate profile
    prof_stmt = select(CandidateProfile).where(CandidateProfile.user_id == current_user.id)
    profile = (await db.execute(prof_stmt)).scalar_one_or_none()
    if not profile:
        profile = CandidateProfile(user_id=current_user.id)
        db.add(profile)

    # Update profile fields with user-confirmed values
    if "skills" in confirmed_data:
        profile.skills = confirmed_data["skills"]
    if "education" in confirmed_data:
        profile.education = confirmed_data["education"]
    if "bio" in confirmed_data:
        profile.bio = confirmed_data["bio"]
    if "target_roles" in confirmed_data:
        profile.target_roles = confirmed_data["target_roles"]
    if "target_companies" in confirmed_data:
        profile.target_companies = confirmed_data["target_companies"]
    if "target_locations" in confirmed_data:
        profile.target_locations = confirmed_data["target_locations"]
    if "experience_years" in confirmed_data:
        profile.experience_years = float(confirmed_data["experience_years"])

    await db.commit()
    return MessageResponse(message="Profile confirmed and saved successfully")
