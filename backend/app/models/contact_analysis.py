from typing import List, Dict, Any, TYPE_CHECKING
from sqlalchemy import String, Float, Text, Boolean, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, UUIDModelMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.contact import Contact


class ContactAnalysis(Base, UUIDModelMixin, TimestampMixin):
    """Scoring, categorization, and match analysis for a connection."""
    __tablename__ = "contact_analyses"

    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    contact_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("contacts.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False, index=True)
    priority: Mapped[str] = mapped_column(String(30), default="Medium", nullable=False, index=True)
    confidence: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    categories: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    reasons: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    missing_info: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    factor_breakdown: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    weights_used: Mapped[Dict[str, float]] = mapped_column(JSON, default=dict, nullable=False)
    content_hash: Mapped[str] = mapped_column(String(64), default="", nullable=False, index=True)
    user_override: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Legacy fields preserved for backward compatibility
    category: Mapped[str] = mapped_column(String(50), default="peer", nullable=False)
    reasoning: Mapped[str] = mapped_column(Text, default="", nullable=False)
    target_role_matched: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    score_breakdown: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="contact_analyses")
    contact: Mapped["Contact"] = relationship("Contact", back_populates="analyses")

