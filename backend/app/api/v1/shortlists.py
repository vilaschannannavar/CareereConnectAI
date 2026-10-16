"""Shortlists management and CSV export endpoints."""
import io
import csv
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.session import get_db
from app.models.user import User
from app.models.contact import Contact
from app.models.contact_analysis import ContactAnalysis
from app.models.shortlist import Shortlist
from app.models.shortlist_item import ShortlistItem
from app.schemas.shortlist import (
    ShortlistCreate,
    ShortlistUpdate,
    ShortlistResponse,
    ShortlistDetailResponse,
    ManageContactsPayload,
)
from app.schemas.contact import ContactResponse
from app.schemas.auth import MessageResponse
from app.services.audit import record_audit_event
from app.api.deps import get_current_user, enforce_user_ownership, verify_csrf

router = APIRouter(prefix="/shortlists", tags=["Shortlists"])


@router.get("", response_model=List[ShortlistResponse])
async def list_shortlists(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all shortlists created by the authenticated user."""
    stmt = (
        select(Shortlist)
        .where(Shortlist.user_id == current_user.id)
        .order_by(Shortlist.created_at.desc())
    )
    result = await db.execute(stmt)
    shortlists = result.scalars().all()

    response_list = []
    for s in shortlists:
        count_stmt = select(func.count(ShortlistItem.id)).where(ShortlistItem.shortlist_id == s.id)
        count = (await db.execute(count_stmt)).scalar() or 0
        res = ShortlistResponse.model_validate(s)
        res.items_count = count
        response_list.append(res)

    return response_list


@router.post("", response_model=ShortlistResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(verify_csrf)])
async def create_shortlist(
    payload: ShortlistCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new named shortlist."""
    shortlist = Shortlist(
        user_id=current_user.id,
        name=payload.name.strip(),
        description=payload.description.strip() if payload.description else None
    )
    db.add(shortlist)
    await db.commit()
    await db.refresh(shortlist)

    res = ShortlistResponse.model_validate(shortlist)
    res.items_count = 0
    return res


@router.get("/{shortlist_id}", response_model=ShortlistDetailResponse)
async def get_shortlist_detail(
    shortlist_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve details and member contacts of a shortlist. Returns 404 for other users."""
    stmt = select(Shortlist).where(Shortlist.id == shortlist_id)
    shortlist = (await db.execute(stmt)).scalar_one_or_none()

    if not shortlist:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    enforce_user_ownership(shortlist.user_id, current_user.id)

    # Fetch contacts via items join
    items_stmt = select(ShortlistItem).where(ShortlistItem.shortlist_id == shortlist.id)
    items = (await db.execute(items_stmt)).scalars().all()
    contact_ids = [item.contact_id for item in items]

    contacts: List[Contact] = []
    if contact_ids:
        c_stmt = select(Contact).where(Contact.id.in_(contact_ids))
        contacts = (await db.execute(c_stmt)).scalars().all()

    return ShortlistDetailResponse(
        id=shortlist.id,
        user_id=shortlist.user_id,
        name=shortlist.name,
        description=shortlist.description,
        contacts=[ContactResponse.model_validate(c) for c in contacts],
        created_at=shortlist.created_at,
        updated_at=shortlist.updated_at
    )


@router.put("/{shortlist_id}", response_model=ShortlistResponse, dependencies=[Depends(verify_csrf)])
async def update_shortlist(
    shortlist_id: str,
    payload: ShortlistUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Rename or update shortlist description."""
    stmt = select(Shortlist).where(Shortlist.id == shortlist_id)
    shortlist = (await db.execute(stmt)).scalar_one_or_none()

    if not shortlist:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    enforce_user_ownership(shortlist.user_id, current_user.id)

    if payload.name:
        shortlist.name = payload.name.strip()
    if payload.description is not None:
        shortlist.description = payload.description.strip()

    await db.commit()
    await db.refresh(shortlist)

    count_stmt = select(func.count(ShortlistItem.id)).where(ShortlistItem.shortlist_id == shortlist.id)
    count = (await db.execute(count_stmt)).scalar() or 0

    res = ShortlistResponse.model_validate(shortlist)
    res.items_count = count
    return res


@router.delete("/{shortlist_id}", response_model=MessageResponse, dependencies=[Depends(verify_csrf)])
async def delete_shortlist(
    shortlist_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a shortlist. Returns 404 for other users."""
    stmt = select(Shortlist).where(Shortlist.id == shortlist_id)
    shortlist = (await db.execute(stmt)).scalar_one_or_none()

    if not shortlist:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    enforce_user_ownership(shortlist.user_id, current_user.id)

    await db.delete(shortlist)
    await db.commit()
    return MessageResponse(message="Shortlist deleted successfully")


@router.post("/{shortlist_id}/contacts", response_model=MessageResponse, dependencies=[Depends(verify_csrf)])
async def manage_shortlist_contacts(
    shortlist_id: str,
    payload: ManageContactsPayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Add or remove contacts from a shortlist."""
    stmt = select(Shortlist).where(Shortlist.id == shortlist_id)
    shortlist = (await db.execute(stmt)).scalar_one_or_none()

    if not shortlist:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    enforce_user_ownership(shortlist.user_id, current_user.id)

    for c_id in payload.contact_ids:
        # Verify contact ownership
        c_stmt = select(Contact).where(Contact.id == c_id)
        c = (await db.execute(c_stmt)).scalar_one_or_none()
        if not c or c.user_id != current_user.id:
            continue

        item_stmt = select(ShortlistItem).where(
            ShortlistItem.shortlist_id == shortlist.id,
            ShortlistItem.contact_id == c_id
        )
        existing_item = (await db.execute(item_stmt)).scalar_one_or_none()

        if payload.action == "add" and not existing_item:
            db.add(ShortlistItem(shortlist_id=shortlist.id, contact_id=c_id))
        elif payload.action == "remove" and existing_item:
            await db.delete(existing_item)

    await db.commit()
    return MessageResponse(message=f"Shortlist updated with action: {payload.action}")


@router.get("/{shortlist_id}/export-csv")
async def export_shortlist_csv(
    shortlist_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Export shortlist contacts, categories, and scores to a CSV file."""
    stmt = select(Shortlist).where(Shortlist.id == shortlist_id)
    shortlist = (await db.execute(stmt)).scalar_one_or_none()

    if not shortlist:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    enforce_user_ownership(shortlist.user_id, current_user.id)

    items_stmt = select(ShortlistItem).where(ShortlistItem.shortlist_id == shortlist.id)
    items = (await db.execute(items_stmt)).scalars().all()
    contact_ids = [item.contact_id for item in items]

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "First Name",
        "Last Name",
        "Company",
        "Position",
        "Score",
        "Priority",
        "Categories",
        "Profile URL",
        "Email",
        "Connected On"
    ])

    contacts = []
    if contact_ids:
        c_stmt = select(Contact).where(Contact.id.in_(contact_ids))
        contacts = list((await db.execute(c_stmt)).scalars().all())

        for c in contacts:
            # Fetch analysis if available
            ana_stmt = select(ContactAnalysis).where(
                ContactAnalysis.user_id == current_user.id,
                ContactAnalysis.contact_id == c.id
            )
            analysis = (await db.execute(ana_stmt)).scalar_one_or_none()

            score_val = str(analysis.score) if analysis else "N/A"
            priority_val = analysis.priority if analysis else "Unanalyzed"
            categories_val = ",".join(analysis.categories) if analysis else ""

            writer.writerow([
                c.first_name,
                c.last_name,
                c.company,
                c.position,
                score_val,
                priority_val,
                categories_val,
                c.profile_url,
                c.email or "",
                c.connected_on or ""
            ])

    await record_audit_event(
        db,
        user_id=current_user.id,
        action="export_shortlist_csv",
        entity_type="shortlist",
        entity_id=shortlist.id,
        details={"shortlist_name": shortlist.name, "contact_count": len(contacts)}
    )

    output.seek(0)
    filename = f"shortlist_{shortlist.name.lower().replace(' ', '_')}.csv"
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
