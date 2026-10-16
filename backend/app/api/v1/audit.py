"""Audit log endpoints."""
from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.db.session import get_db
from app.models.user import User
from app.models.audit_log import AuditLog
from app.schemas.audit import AuditLogResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/audit", tags=["Audit Log"])


@router.get("/logs", response_model=List[AuditLogResponse])
async def list_user_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve immutable audit trail records belonging to the authenticated user."""
    stmt = (
        select(AuditLog)
        .where(AuditLog.user_id == current_user.id)
        .order_by(desc(AuditLog.created_at))
        .limit(limit)
    )
    result = await db.execute(stmt)
    logs = result.scalars().all()
    return [AuditLogResponse.model_validate(log) for log in logs]
