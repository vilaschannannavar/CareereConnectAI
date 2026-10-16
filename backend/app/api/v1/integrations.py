"""Integrations endpoints managing third-party accounts."""
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.user import User
from app.models.integration import Integration
from app.schemas.integration import IntegrationResponse
from app.schemas.auth import MessageResponse
from app.services.audit import record_audit_event
from app.api.deps import get_current_user, enforce_user_ownership, verify_csrf
from fastapi import HTTPException, status

router = APIRouter(prefix="/integrations", tags=["Integrations"])


@router.get("", response_model=List[IntegrationResponse])
async def list_user_integrations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List third-party integrations connected to the authenticated user's account."""
    stmt = (
        select(Integration)
        .where(Integration.user_id == current_user.id)
        .order_by(Integration.created_at.desc())
    )
    result = await db.execute(stmt)
    integrations = result.scalars().all()
    return [IntegrationResponse.model_validate(i) for i in integrations]


@router.delete("/{provider}", response_model=MessageResponse, dependencies=[Depends(verify_csrf)])
async def disconnect_integration(
    provider: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Disconnect third-party integration, revoking and deleting stored tokens."""
    stmt = select(Integration).where(
        Integration.user_id == current_user.id,
        Integration.provider == provider.lower()
    )
    integration = (await db.execute(stmt)).scalar_one_or_none()

    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Integration '{provider}' not found."
        )

    enforce_user_ownership(integration.user_id, current_user.id)

    int_id = integration.id
    await db.delete(integration)
    await db.commit()

    await record_audit_event(
        db=db,
        user_id=current_user.id,
        action="disconnect_integration",
        entity_type="integration",
        entity_id=int_id,
        details={"provider": provider}
    )

    return MessageResponse(message=f"Integration '{provider}' disconnected and stored credentials purged.")
