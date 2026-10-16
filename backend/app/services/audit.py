"""Audit logging service for tracking exports, sensitive actions, and data modifications."""
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit_log import AuditLog
from app.core.logging import logger


async def record_audit_event(
    db: AsyncSession,
    user_id: Optional[str],
    action: str,
    entity_type: str,
    entity_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
) -> AuditLog:
    """Record an immutable compliance and security audit event."""
    log_entry = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        ip_address=ip_address,
        user_agent=user_agent,
        details=details or {}
    )
    db.add(log_entry)
    await db.commit()
    await db.refresh(log_entry)

    logger.info(f"Audit event logged: action={action}, entity={entity_type}, user={user_id}")
    return log_entry
