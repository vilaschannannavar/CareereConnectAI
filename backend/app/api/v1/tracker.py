"""Outreach tracker pipeline, follow-up scheduling, and conversation event history."""
from datetime import timedelta, timezone
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.db.session import get_db
from app.db.base import get_utc_now
from app.models.user import User
from app.models.contact import Contact
from app.models.message_draft import MessageDraft
from app.models.outreach_event import OutreachEvent
from app.schemas.message import (
    MessageDraftResponse,
    OutreachEventResponse,
    ScheduleFollowUpPayload,
)
from app.schemas.contact import ContactResponse
from app.schemas.auth import MessageResponse
from app.api.deps import get_current_user, enforce_user_ownership, verify_csrf

router = APIRouter(prefix="/tracker", tags=["Outreach Tracker"])


@router.get("", response_model=Dict[str, List[MessageDraftResponse]])
async def get_outreach_pipeline(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve full outreach pipeline categorized by status and follow-up readiness."""
    stmt = (
        select(MessageDraft)
        .where(MessageDraft.user_id == current_user.id)
        .order_by(desc(MessageDraft.updated_at))
    )
    result = await db.execute(stmt)
    drafts = result.scalars().all()

    pipeline: Dict[str, List[MessageDraftResponse]] = {
        "drafted": [],
        "approved": [],
        "awaiting_manual_send": [],
        "marked_sent": [],
        "sent_verified": [],
        "follow_up_suggested": [],
        "replied": [],
    }

    now = get_utc_now()

    for d in drafts:
        c_stmt = select(Contact).where(Contact.id == d.contact_id)
        contact = (await db.execute(c_stmt)).scalar_one_or_none()
        item = MessageDraftResponse.model_validate(d)
        if contact:
            item.contact = ContactResponse.model_validate(contact)

        # Check if replied event exists for this contact
        rep_stmt = select(OutreachEvent).where(
            OutreachEvent.user_id == current_user.id,
            OutreachEvent.contact_id == d.contact_id,
            OutreachEvent.event_type == "replied"
        )
        replied_event = (await db.execute(rep_stmt)).scalar_one_or_none()

        if replied_event:
            pipeline["replied"].append(item)
        elif d.status == "Draft" or d.status == "Reviewed":
            pipeline["drafted"].append(item)
        elif d.status == "Approved":
            pipeline["approved"].append(item)
        elif d.status == "Awaiting manual send":
            pipeline["awaiting_manual_send"].append(item)
        elif d.status == "User-confirmed sent":
            # Check if 7-day follow-up has arrived
            if d.follow_up_suggested_at:
                fu_time = d.follow_up_suggested_at
                if fu_time.tzinfo is None:
                    fu_time = fu_time.replace(tzinfo=timezone.utc)
                if fu_time <= now:
                    pipeline["follow_up_suggested"].append(item)
                else:
                    pipeline["marked_sent"].append(item)
            else:
                pipeline["marked_sent"].append(item)
        elif d.status == "Sent (verified)":
            pipeline["sent_verified"].append(item)

    return pipeline


@router.get("/events", response_model=List[OutreachEventResponse])
async def list_outreach_events(
    contact_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve full audit log timeline of outreach actions and conversation status updates."""
    stmt = (
        select(OutreachEvent)
        .where(OutreachEvent.user_id == current_user.id)
        .order_by(desc(OutreachEvent.occurred_at))
    )
    if contact_id:
        stmt = stmt.where(OutreachEvent.contact_id == contact_id)

    result = await db.execute(stmt)
    events = result.scalars().all()
    return [OutreachEventResponse.model_validate(e) for e in events]


@router.post("/{draft_id}/schedule-follow-up", response_model=MessageDraftResponse, dependencies=[Depends(verify_csrf)])
async def schedule_follow_up(
    draft_id: str,
    payload: ScheduleFollowUpPayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update or reschedule the recommended follow-up date for a sent message."""
    stmt = select(MessageDraft).where(MessageDraft.id == draft_id)
    draft = (await db.execute(stmt)).scalar_one_or_none()

    if not draft:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    enforce_user_ownership(draft.user_id, current_user.id)

    now = get_utc_now()
    draft.follow_up_suggested_at = now + timedelta(days=payload.follow_up_days)

    event = OutreachEvent(
        user_id=current_user.id,
        contact_id=draft.contact_id,
        draft_id=draft.id,
        event_type="follow_up_scheduled",
        status="follow_up_scheduled",
        notes=payload.notes or f"Follow-up scheduled in {payload.follow_up_days} days"
    )
    db.add(event)
    await db.commit()
    await db.refresh(draft)

    c_stmt = select(Contact).where(Contact.id == draft.contact_id)
    contact = (await db.execute(c_stmt)).scalar_one_or_none()
    res = MessageDraftResponse.model_validate(draft)
    if contact:
        res.contact = ContactResponse.model_validate(contact)
    return res


@router.post("/contact/{contact_id}/mark-replied", response_model=MessageResponse, dependencies=[Depends(verify_csrf)])
async def mark_contact_replied(
    contact_id: str,
    notes: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Mark a contact as having replied. Strictly requires user confirmation."""
    c_stmt = select(Contact).where(Contact.id == contact_id)
    contact = (await db.execute(c_stmt)).scalar_one_or_none()

    if not contact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    enforce_user_ownership(contact.user_id, current_user.id)

    event = OutreachEvent(
        user_id=current_user.id,
        contact_id=contact.id,
        event_type="replied",
        status="replied",
        notes=notes or "Connection replied on LinkedIn"
    )
    db.add(event)
    await db.commit()

    return MessageResponse(message="Contact conversation marked as replied.")
