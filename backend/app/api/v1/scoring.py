"""Scoring, classification, re-weighting, and analysis explanation endpoints."""
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.db.session import get_db
from app.models.user import User
from app.models.contact import Contact
from app.models.candidate_profile import CandidateProfile
from app.models.contact_analysis import ContactAnalysis
from app.schemas.scoring import (
    ContactAnalysisResponse,
    CustomWeightsPayload,
    UpdateAnalysisCategoriesPayload,
    BatchAnalyzeResponse,
)
from app.schemas.auth import MessageResponse
from app.services.classifier import classify_deterministic, compute_content_hash
from app.services.scoring import calculate_contact_score
from app.core.rate_limit import analyze_rate_limiter
from app.api.deps import get_current_user, enforce_user_ownership, verify_csrf

router = APIRouter(prefix="/scoring", tags=["Scoring & Classification"])


@router.get("/analyses", response_model=List[ContactAnalysisResponse])
async def list_analyses(
    priority: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List contact analyses for the current authenticated user with optional priority/category filtering."""
    stmt = (
        select(ContactAnalysis)
        .where(ContactAnalysis.user_id == current_user.id)
        .order_by(ContactAnalysis.score.desc())
    )
    if priority:
        stmt = stmt.where(ContactAnalysis.priority == priority)

    result = await db.execute(stmt)
    analyses = result.scalars().all()

    # Filter by category tag in-memory if requested (since categories is JSON list)
    if category:
        cat_upper = category.upper()
        analyses = [a for a in analyses if cat_upper in (a.categories or [])]

    return [ContactAnalysisResponse.model_validate(a) for a in analyses]


@router.get("/analysis/{contact_id}", response_model=ContactAnalysisResponse)
async def get_analysis_for_contact(
    contact_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve scoring breakdown and explanation for a single contact. Returns 404 for other users."""
    contact_stmt = select(Contact).where(Contact.id == contact_id)
    contact = (await db.execute(contact_stmt)).scalar_one_or_none()

    if not contact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    enforce_user_ownership(contact.user_id, current_user.id)

    stmt = select(ContactAnalysis).where(
        ContactAnalysis.user_id == current_user.id,
        ContactAnalysis.contact_id == contact_id
    )
    analysis = (await db.execute(stmt)).scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found for this contact")

    return ContactAnalysisResponse.model_validate(analysis)


@router.post("/analyze/{contact_id}", response_model=ContactAnalysisResponse, dependencies=[Depends(verify_csrf)])
async def analyze_contact(
    contact_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Classify and score a single contact against user's candidate profile."""
    analyze_rate_limiter.check(request, "analyze")
    contact_stmt = select(Contact).where(Contact.id == contact_id)
    contact = (await db.execute(contact_stmt)).scalar_one_or_none()

    if not contact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    enforce_user_ownership(contact.user_id, current_user.id)

    # Fetch candidate profile
    prof_stmt = select(CandidateProfile).where(CandidateProfile.user_id == current_user.id)
    profile = (await db.execute(prof_stmt)).scalar_one_or_none()
    target_roles = profile.target_roles if profile else []
    target_companies = profile.target_companies if profile else []
    candidate_skills = profile.skills if profile else []
    custom_weights = (profile.preferences or {}).get("scoring_weights") if profile else None

    # 1. Deterministic classification
    cat_res = classify_deterministic(
        position=contact.position,
        company=contact.company,
        target_companies=target_companies,
        contact_notes=contact.notes
    )

    # 2. 5-Factor scoring
    score_res = calculate_contact_score(
        position=contact.position,
        company=contact.company,
        category_result=cat_res,
        target_roles=target_roles,
        target_companies=target_companies,
        candidate_skills=candidate_skills,
        custom_weights=custom_weights
    )

    c_hash = compute_content_hash(contact.position, contact.company, target_roles, target_companies)

    # Upsert ContactAnalysis
    stmt = select(ContactAnalysis).where(
        ContactAnalysis.user_id == current_user.id,
        ContactAnalysis.contact_id == contact_id
    )
    analysis = (await db.execute(stmt)).scalar_one_or_none()
    if not analysis:
        analysis = ContactAnalysis(
            user_id=current_user.id,
            contact_id=contact_id
        )
        db.add(analysis)

    analysis.score = score_res.score
    analysis.priority = score_res.priority
    analysis.confidence = score_res.confidence
    analysis.categories = cat_res.categories
    analysis.reasons = cat_res.reasons
    analysis.missing_info = cat_res.missing_info
    analysis.factor_breakdown = score_res.factor_breakdown
    analysis.weights_used = score_res.weights_used
    analysis.content_hash = c_hash
    analysis.user_override = False

    await db.commit()
    await db.refresh(analysis)
    return ContactAnalysisResponse.model_validate(analysis)


@router.post("/batch-analyze", response_model=BatchAnalyzeResponse, dependencies=[Depends(verify_csrf)])
async def batch_analyze_contacts(
    request: Request,
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Batch classify and score contacts with hash caching and cost bounds."""
    analyze_rate_limiter.check(request, "analyze")
    # Fetch candidate profile
    prof_stmt = select(CandidateProfile).where(CandidateProfile.user_id == current_user.id)
    profile = (await db.execute(prof_stmt)).scalar_one_or_none()
    target_roles = profile.target_roles if profile else []
    target_companies = profile.target_companies if profile else []
    candidate_skills = profile.skills if profile else []
    custom_weights = (profile.preferences or {}).get("scoring_weights") if profile else None

    contacts_stmt = (
        select(Contact)
        .where(Contact.user_id == current_user.id, Contact.is_archived == False)
        .limit(limit)
    )
    contacts = (await db.execute(contacts_stmt)).scalars().all()

    newly_analyzed = 0
    cached_hits = 0
    high_priority_count = 0

    for contact in contacts:
        c_hash = compute_content_hash(contact.position, contact.company, target_roles, target_companies)

        # Check existing analysis
        ana_stmt = select(ContactAnalysis).where(
            ContactAnalysis.user_id == current_user.id,
            ContactAnalysis.contact_id == contact.id
        )
        existing = (await db.execute(ana_stmt)).scalar_one_or_none()

        if existing and existing.content_hash == c_hash and not existing.user_override:
            cached_hits += 1
            if existing.priority == "High":
                high_priority_count += 1
            continue

        cat_res = classify_deterministic(
            position=contact.position,
            company=contact.company,
            target_companies=target_companies,
            contact_notes=contact.notes
        )

        score_res = calculate_contact_score(
            position=contact.position,
            company=contact.company,
            category_result=cat_res,
            target_roles=target_roles,
            target_companies=target_companies,
            candidate_skills=candidate_skills,
            custom_weights=custom_weights
        )

        if not existing:
            existing = ContactAnalysis(user_id=current_user.id, contact_id=contact.id)
            db.add(existing)

        existing.score = score_res.score
        existing.priority = score_res.priority
        existing.confidence = score_res.confidence
        existing.categories = cat_res.categories
        existing.reasons = cat_res.reasons
        existing.missing_info = cat_res.missing_info
        existing.factor_breakdown = score_res.factor_breakdown
        existing.weights_used = score_res.weights_used
        existing.content_hash = c_hash
        existing.user_override = False

        newly_analyzed += 1
        if score_res.priority == "High":
            high_priority_count += 1

    await db.commit()
    return BatchAnalyzeResponse(
        total_processed=len(contacts),
        newly_analyzed=newly_analyzed,
        cached_hits=cached_hits,
        high_priority_count=high_priority_count
    )


@router.post("/re-score", response_model=MessageResponse, dependencies=[Depends(verify_csrf)])
async def rescore_with_custom_weights(
    payload: CustomWeightsPayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Re-calculate scores for all analyzed contacts using custom weights without re-calling LLM."""
    prof_stmt = select(CandidateProfile).where(CandidateProfile.user_id == current_user.id)
    profile = (await db.execute(prof_stmt)).scalar_one_or_none()
    target_roles = profile.target_roles if profile else []
    target_companies = profile.target_companies if profile else []
    candidate_skills = profile.skills if profile else []

    custom_weights = {
        "role_relevance": payload.role_relevance,
        "ability_to_help": payload.ability_to_help,
        "company_industry": payload.company_industry,
        "technical_domain": payload.technical_domain,
        "recruitment_referral_evidence": payload.recruitment_referral_evidence,
    }

    analyses_stmt = select(ContactAnalysis).where(ContactAnalysis.user_id == current_user.id)
    analyses = (await db.execute(analyses_stmt)).scalars().all()

    for ana in analyses:
        contact_stmt = select(Contact).where(Contact.id == ana.contact_id)
        contact = (await db.execute(contact_stmt)).scalar_one_or_none()
        if not contact:
            continue

        cat_res = classify_deterministic(
            position=contact.position,
            company=contact.company,
            target_companies=target_companies,
            contact_notes=contact.notes
        )

        score_res = calculate_contact_score(
            position=contact.position,
            company=contact.company,
            category_result=cat_res,
            target_roles=target_roles,
            target_companies=target_companies,
            candidate_skills=candidate_skills,
            custom_weights=custom_weights
        )

        ana.score = score_res.score
        ana.priority = score_res.priority
        ana.confidence = score_res.confidence
        ana.factor_breakdown = score_res.factor_breakdown
        ana.weights_used = score_res.weights_used

    await db.commit()
    return MessageResponse(message=f"Successfully re-scored {len(analyses)} contacts with customized weights.")


@router.put("/analysis/{analysis_id}", response_model=ContactAnalysisResponse, dependencies=[Depends(verify_csrf)])
async def update_analysis_categories(
    analysis_id: str,
    payload: UpdateAnalysisCategoriesPayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Allow user to manually edit and override category tags for a contact."""
    stmt = select(ContactAnalysis).where(ContactAnalysis.id == analysis_id)
    analysis = (await db.execute(stmt)).scalar_one_or_none()

    if not analysis:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    enforce_user_ownership(analysis.user_id, current_user.id)

    # Valid categories: A, B, C, D, E
    valid_cats = {"A", "B", "C", "D", "E"}
    clean_cats = [c.upper().strip() for c in payload.categories if c.upper().strip() in valid_cats]
    if not clean_cats:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least one valid category (A, B, C, D, E) must be provided.")

    analysis.categories = clean_cats
    analysis.user_override = True
    if payload.notes:
        analysis.reasons.append(f"User manual adjustment: {payload.notes}")

    await db.commit()
    await db.refresh(analysis)
    return ContactAnalysisResponse.model_validate(analysis)
