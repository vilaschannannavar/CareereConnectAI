"""UserSession model for cookie-based authentication."""
from typing import Optional, TYPE_CHECKING
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, UUIDModelMixin, TimestampMixin, get_utc_now

if TYPE_CHECKING:
    from app.models.user import User


class UserSession(Base, UUIDModelMixin, TimestampMixin):
    """Session entity tracking authenticated login sessions."""
    __tablename__ = "user_sessions"

    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    session_token: Mapped[str] = mapped_column(
        String(128),
        unique=True,
        nullable=False,
        index=True
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False
    )
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="sessions")

    @property
    def is_expired(self) -> bool:
        """Check if the session has expired."""
        exp = self.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        return datetime.now(timezone.utc) >= exp
