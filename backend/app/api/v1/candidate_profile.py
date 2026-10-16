"""Candidate target profile endpoints."""
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.user import User
from app.models.candidate_profile import CandidateProfile
from app.schemas.candidate_profile import CandidateProfileResponse, CandidateProfileUpdate
from app.api.deps import get_current_user, verify_csrf

router = APIRouter(prefix="/profile", tags=["Candidate Profile"])


@router.get("", response_model=CandidateProfileResponse)
async def get_candidate_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve the candidate target profile for the authenticated user."""
    stmt = select(CandidateProfile).where(CandidateProfile.user_id == current_user.id)
    profile = (await db.execute(stmt)).scalar_one_or_none()

    if not profile:
        # Create empty default profile
        profile = CandidateProfile(
            user_id=current_user.id,
            target_roles=[],
            target_companies=[],
            target_locations=[],
            skills=[],
            education=[],
            experience_years=0.0,
            bio="",
            preferences={}
        )
        db.add(profile)
        await db.commit()
        await db.refresh(profile)

    return CandidateProfileResponse.model_validate(profile)


@router.put("", response_model=CandidateProfileResponse, dependencies=[Depends(verify_csrf)])
async def update_candidate_profile(
    payload: CandidateProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update career goals, target roles, companies, and skills for the authenticated user."""
    stmt = select(CandidateProfile).where(CandidateProfile.user_id == current_user.id)
    profile = (await db.execute(stmt)).scalar_one_or_none()

    if not profile:
        profile = CandidateProfile(user_id=current_user.id)
        db.add(profile)

    profile.target_roles = payload.target_roles
    profile.target_companies = payload.target_companies
    profile.target_locations = payload.target_locations
    profile.skills = payload.skills
    profile.education = payload.education
    profile.experience_years = payload.experience_years
    profile.bio = payload.bio
    profile.preferences = payload.preferences

    await db.commit()
    await db.refresh(profile)
    return CandidateProfileResponse.model_validate(profile)
