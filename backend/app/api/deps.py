"""Authentication, authorization, session validation, and CSRF protection dependencies."""
from typing import Optional, AsyncGenerator
from datetime import datetime, timezone
from fastapi import Request, Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.user import User
from app.models.session import UserSession
from app.core.config import settings
from app.core.security import verify_csrf_token


async def get_current_session(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> UserSession:
    """Extract and validate the active session from the httpOnly cookie."""
    session_token = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if not session_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. No session cookie found.",
            headers={"WWW-Authenticate": "Cookie"},
        )

    # Lookup session in database
    stmt = (
        select(UserSession)
        .where(UserSession.session_token == session_token)
    )
    result = await db.execute(stmt)
    user_session = result.scalar_one_or_none()

    if not user_session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session.",
            headers={"WWW-Authenticate": "Cookie"},
        )

    if user_session.is_expired:
        await db.delete(user_session)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired. Please log in again.",
            headers={"WWW-Authenticate": "Cookie"},
        )

    return user_session


async def get_current_user(
    user_session: UserSession = Depends(get_current_session),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Retrieve the currently authenticated active user."""
    stmt = select(User).where(User.id == user_session.user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive or not found.",
        )

    # If running on PostgreSQL, set session variable for Row-Level Security
    bind = db.get_bind()
    if bind and getattr(bind, "dialect", None) and bind.dialect.name == "postgresql":
        from sqlalchemy import text
        await db.execute(text(f"SET LOCAL app.current_user_id = '{user.id}'"))

    return user


async def verify_csrf(
    request: Request,
    x_csrf_token: Optional[str] = Header(None, alias="X-CSRF-Token"),
    user_session: UserSession = Depends(get_current_session)
) -> None:
    """Enforce CSRF token verification on state-changing requests (POST, PUT, PATCH, DELETE)."""
    # Safe HTTP methods do not mutate state
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return

    if not x_csrf_token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing required X-CSRF-Token header.",
        )

    if not verify_csrf_token(x_csrf_token, user_session.session_token):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or expired CSRF token.",
        )


def enforce_user_ownership(resource_owner_id: str, authenticated_user_id: str) -> None:
    """Enforce server-side user data isolation.

    CRITICAL RULE: Return 404 (not 403) for other users' resources to prevent
    resource existence enumeration attacks.
    """
    if str(resource_owner_id) != str(authenticated_user_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resource not found",
        )
