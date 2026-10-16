"""MessageDraft model storing personalized AI outreach drafts."""
from typing import Dict, Any, List, Optional, TYPE_CHECKING
from datetime import datetime
from sqlalchemy import String, Text, Integer, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, UUIDModelMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.contact import Contact
    from app.models.outreach_event import OutreachEvent
    from app.models.resume import Resume


class MessageDraft(Base, UUIDModelMixin, TimestampMixin):
    """Personalized message draft generated for a connection with server-side state enforcement."""
    __tablename__ = "message_drafts"

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
    resume_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("resumes.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default="Draft",
        nullable=False,
        index=True
    )  # Draft, Reviewed, Approved, Awaiting manual send, User-confirmed sent, Sending, Sent (verified), Failed, Cancelled
    template_code: Mapped[str] = mapped_column(String(10), default="A", nullable=False)  # A, B, C
    tone: Mapped[str] = mapped_column(String(30), default="formal", nullable=False)  # formal, concise, conversational, technical
    subject: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    character_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    character_limit_warning: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    details_used: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    delivery_channel: Mapped[str] = mapped_column(String(50), default="linkedin_manual", nullable=False)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    follow_up_suggested_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Legacy variables column preserved for backward compatibility
    template_type: Mapped[str] = mapped_column(String(50), default="cold_intro", nullable=False)
    variables: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="message_drafts")
    contact: Mapped["Contact"] = relationship("Contact", back_populates="message_drafts")
    resume: Mapped[Optional["Resume"]] = relationship("Resume")
    outreach_events: Mapped[List["OutreachEvent"]] = relationship(
        "OutreachEvent",
        back_populates="draft",
        cascade="all, delete-orphan"
    )

