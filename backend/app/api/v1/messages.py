"""Outreach message drafting, approval state machine, and copy-to-send endpoints."""
from datetime import timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.db.base import get_utc_now
from app.models.user import User
from app.models.contact import Contact
from app.models.candidate_profile import CandidateProfile
from app.models.contact_analysis import ContactAnalysis
from app.models.message_draft import MessageDraft
from app.models.outreach_event import OutreachEvent
from app.schemas.message import (
    GenerateMessagePayload,
    EditMessagePayload,
    TransitionStatePayload,
    MessageDraftResponse,
    OutreachEventResponse,
)
from app.schemas.contact import ContactResponse
from app.schemas.auth import MessageResponse
from app.services.message_generator import generate_outreach_draft, LINKEDIN_NOTE_LIMIT
from app.services.state_machine import validate_state_transition, reset_to_draft_if_edited
from app.services.audit import record_audit_event
from app.core.rate_limit import generate_rate_limiter
from app.api.deps import get_current_user, enforce_user_ownership, verify_csrf

router = APIRouter(prefix="/messages", tags=["Messages & Outreach"])


@router.post("/generate", response_model=MessageDraftResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(verify_csrf)])
async def generate_message_draft(
    request: Request,
    payload: GenerateMessagePayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Generate a personalized outreach draft based on confirmed profile and contact fields."""
    generate_rate_limiter.check(request, "generate")
    contact_stmt = select(Contact).where(Contact.id == payload.contact_id)
    contact = (await db.execute(contact_stmt)).scalar_one_or_none()

    if not contact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    enforce_user_ownership(contact.user_id, current_user.id)

    # Fetch confirmed profile
    prof_stmt = select(CandidateProfile).where(CandidateProfile.user_id == current_user.id)
    profile = (await db.execute(prof_stmt)).scalar_one_or_none()
    target_roles = profile.target_roles if profile else []
    skills = profile.skills if profile else []

    # Fetch contact analysis for categories
    ana_stmt = select(ContactAnalysis).where(
        ContactAnalysis.user_id == current_user.id,
        ContactAnalysis.contact_id == contact.id
    )
    analysis = (await db.execute(ana_stmt)).scalar_one_or_none()
    categories = analysis.categories if analysis else []

    # Generate message
    draft_result = generate_outreach_draft(
        template_code=payload.template_code,
        tone=payload.tone,
        contact_first_name=contact.first_name,
        contact_company=contact.company,
        contact_position=contact.position,
        contact_categories=categories,
        candidate_name=current_user.full_name or "Candidate",
        candidate_target_roles=target_roles,
        candidate_skills=skills,
        allow_referral_override=payload.allow_referral_override
    )

    # Save to database with initial status 'Draft'
    draft = MessageDraft(
        user_id=current_user.id,
        contact_id=contact.id,
        resume_id=payload.resume_id,
        status="Draft",
        template_code=draft_result.template_code,
        tone=draft_result.tone,
        subject=draft_result.subject,
        body=draft_result.body,
        character_count=draft_result.character_count,
        character_limit_warning=draft_result.character_limit_warning,
        details_used=draft_result.details_used,
        delivery_channel="linkedin_manual"
    )
    db.add(draft)
    await db.commit()
    await db.refresh(draft)

    # Log initial draft event
    event = OutreachEvent(
        user_id=current_user.id,
        contact_id=contact.id,
        draft_id=draft.id,
        event_type="draft_created",
        status="drafted",
        notes=f"Generated Template {draft.template_code} ({draft.tone} tone)"
    )
    db.add(event)
    await db.commit()

    res = MessageDraftResponse.model_validate(draft)
    res.contact = ContactResponse.model_validate(contact)
    return res


@router.get("", response_model=List[MessageDraftResponse])
async def list_message_drafts(
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all message drafts for authenticated user with contact metadata."""
    stmt = (
        select(MessageDraft)
        .where(MessageDraft.user_id == current_user.id)
        .order_by(MessageDraft.updated_at.desc())
    )
    if status_filter:
        stmt = stmt.where(MessageDraft.status == status_filter)

    result = await db.execute(stmt)
    drafts = result.scalars().all()

    response_list = []
    for d in drafts:
        c_stmt = select(Contact).where(Contact.id == d.contact_id)
        contact = (await db.execute(c_stmt)).scalar_one_or_none()
        item = MessageDraftResponse.model_validate(d)
        if contact:
            item.contact = ContactResponse.model_validate(contact)
        response_list.append(item)

    return response_list


@router.get("/{draft_id}", response_model=MessageDraftResponse)
async def get_message_draft(
    draft_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve draft details, personalization factors used, and contact metadata. Returns 404 for other users."""
    stmt = select(MessageDraft).where(MessageDraft.id == draft_id)
    draft = (await db.execute(stmt)).scalar_one_or_none()

    if not draft:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    enforce_user_ownership(draft.user_id, current_user.id)

    c_stmt = select(Contact).where(Contact.id == draft.contact_id)
    contact = (await db.execute(c_stmt)).scalar_one_or_none()

    res = MessageDraftResponse.model_validate(draft)
    if contact:
        res.contact = ContactResponse.model_validate(contact)
    return res


@router.put("/{draft_id}", response_model=MessageDraftResponse, dependencies=[Depends(verify_csrf)])
async def edit_message_draft(
    draft_id: str,
    payload: EditMessagePayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Edit message draft text. Editing an 'Approved' message automatically resets state to 'Draft'."""
    stmt = select(MessageDraft).where(MessageDraft.id == draft_id)
    draft = (await db.execute(stmt)).scalar_one_or_none()

    if not draft:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    enforce_user_ownership(draft.user_id, current_user.id)

    # Server-side rule: editing resets status back to Draft if Approved
    old_status = draft.status
    draft.status = reset_to_draft_if_edited(draft.status)

    draft.body = payload.body.strip()
    if payload.subject is not None:
        draft.subject = payload.subject.strip()
    if payload.resume_id is not None:
        draft.resume_id = payload.resume_id

    draft.character_count = len(draft.body)
    draft.character_limit_warning = draft.character_count > LINKEDIN_NOTE_LIMIT

    await db.commit()
    await db.refresh(draft)

    # Log edit event
    event = OutreachEvent(
        user_id=current_user.id,
        contact_id=draft.contact_id,
        draft_id=draft.id,
        event_type="draft_edited",
        status=draft.status.lower().replace(" ", "_"),
        notes=f"Draft edited. Status changed from '{old_status}' to '{draft.status}'."
    )
    db.add(event)
    await db.commit()

    c_stmt = select(Contact).where(Contact.id == draft.contact_id)
    contact = (await db.execute(c_stmt)).scalar_one_or_none()

    res = MessageDraftResponse.model_validate(draft)
    if contact:
        res.contact = ContactResponse.model_validate(contact)
    return res


@router.post("/{draft_id}/transition", response_model=MessageDraftResponse, dependencies=[Depends(verify_csrf)])
async def transition_draft_state(
    draft_id: str,
    payload: TransitionStatePayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Execute a validated state machine transition (e.g. Reviewed -> Approved -> User-confirmed sent)."""
    stmt = select(MessageDraft).where(MessageDraft.id == draft_id)
    draft = (await db.execute(stmt)).scalar_one_or_none()

    if not draft:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    enforce_user_ownership(draft.user_id, current_user.id)

    # Enforce state machine rules (raises 409 if illegal)
    validate_state_transition(draft.status, payload.target_state)

    old_status = draft.status
    draft.status = payload.target_state

    # If marked sent, schedule default 7-day follow-up
    if payload.target_state == "User-confirmed sent":
        now = get_utc_now()
        draft.sent_at = now
        draft.follow_up_suggested_at = now + timedelta(days=7)

    await db.commit()
    await db.refresh(draft)

    # Log transition event
    event = OutreachEvent(
        user_id=current_user.id,
        contact_id=draft.contact_id,
        draft_id=draft.id,
        event_type=payload.target_state.lower().replace(" ", "_"),
        status=draft.status.lower().replace(" ", "_"),
        notes=payload.notes or f"Transitioned from '{old_status}' to '{draft.status}'"
    )
    db.add(event)
    await db.commit()

    if payload.target_state == "Approved":
        await record_audit_event(
            db=db,
            user_id=current_user.id,
            action="approve",
            entity_type="message_draft",
            entity_id=draft.id,
            details={"template": draft.template_type, "contact_id": draft.contact_id}
        )
    elif payload.target_state == "User-confirmed sent":
        await record_audit_event(
            db=db,
            user_id=current_user.id,
            action="mark_sent",
            entity_type="message_draft",
            entity_id=draft.id,
            details={"template": draft.template_type, "contact_id": draft.contact_id}
        )

    c_stmt = select(Contact).where(Contact.id == draft.contact_id)
    contact = (await db.execute(c_stmt)).scalar_one_or_none()

    res = MessageDraftResponse.model_validate(draft)
    if contact:
        res.contact = ContactResponse.model_validate(contact)
    return res


@router.post("/{draft_id}/copy", response_model=MessageResponse, dependencies=[Depends(verify_csrf)])
async def copy_draft_message(
    draft_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Log a 'copied' event in outreach audit trail. State remains unchanged (copying is never sending)."""
    stmt = select(MessageDraft).where(MessageDraft.id == draft_id)
    draft = (await db.execute(stmt)).scalar_one_or_none()

    if not draft:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    enforce_user_ownership(draft.user_id, current_user.id)

    # CRITICAL RULE: Copying never alters draft status! Only logs event.
    event = OutreachEvent(
        user_id=current_user.id,
        contact_id=draft.contact_id,
        draft_id=draft.id,
        event_type="copied",
        status=draft.status.lower().replace(" ", "_"),
        notes="Message draft copied to clipboard for manual delivery."
    )
    db.add(event)
    await db.commit()

    return MessageResponse(message="Draft copied to clipboard and audit event logged.")


@router.post("/{draft_id}/send", response_model=MessageResponse, dependencies=[Depends(verify_csrf)])
async def direct_send_message(
    draft_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Direct sending endpoint. Strictly returns 501/409 as direct LinkedIn messaging is unauthorized."""
    stmt = select(MessageDraft).where(MessageDraft.id == draft_id)
    draft = (await db.execute(stmt)).scalar_one_or_none()

    if not draft:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    enforce_user_ownership(draft.user_id, current_user.id)

    # HARD PROHIBITION ENFORCEMENT
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Unavailable: LinkedIn messaging not authorized. Direct programmatic messaging requires an approved LinkedIn Enterprise Partner integration. Outreach must be sent manually."
    )


@router.delete("/{draft_id}", response_model=MessageResponse, dependencies=[Depends(verify_csrf)])
async def delete_message_draft(
    draft_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a message draft."""
    stmt = select(MessageDraft).where(MessageDraft.id == draft_id)
    draft = (await db.execute(stmt)).scalar_one_or_none()

    if not draft:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    enforce_user_ownership(draft.user_id, current_user.id)

    await db.delete(draft)
    await db.commit()
    return MessageResponse(message="Draft deleted successfully")
