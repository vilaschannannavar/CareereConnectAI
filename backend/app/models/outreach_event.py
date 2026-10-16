"""OutreachEvent model tracking manual outreach pipeline milestones."""
from typing import Optional, TYPE_CHECKING
from datetime import datetime
from sqlalchemy import String, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, UUIDModelMixin, TimestampMixin, get_utc_now

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.contact import Contact
    from app.models.message_draft import MessageDraft


class OutreachEvent(Base, UUIDModelMixin, TimestampMixin):
    """Event tracking user outreach progress and conversation status."""
    __tablename__ = "outreach_events"

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
    draft_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("message_drafts.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    event_type: Mapped[str] = mapped_column(
        String(50),
        default="status_changed",
        nullable=False,
        index=True
    )  # draft_created, draft_edited, reviewed, approved, copied, marked_sent, sent_verified, send_failed, replied, follow_up_scheduled
    status: Mapped[str] = mapped_column(
        String(50),
        default="drafted",
        nullable=False,
        index=True
    )  # drafted, reviewed, approved, awaiting_manual_send, marked_sent, sent_verified, replied, follow_up_suggested, cancelled
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=get_utc_now,
        nullable=False
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="outreach_events")
    contact: Mapped["Contact"] = relationship("Contact", back_populates="outreach_events")
    draft: Mapped[Optional["MessageDraft"]] = relationship("MessageDraft", back_populates="outreach_events")
