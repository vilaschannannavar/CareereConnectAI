"""Contact model representing 1st-degree LinkedIn connections."""
import re
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, Boolean, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, UUIDModelMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.contact_analysis import ContactAnalysis
    from app.models.message_draft import MessageDraft
    from app.models.outreach_event import OutreachEvent


def normalize_linkedin_url(url: Optional[str]) -> str:
    """Normalize a LinkedIn profile URL for reliable deduplication."""
    if not url:
        return ""
    cleaned = url.strip().lower()
    # Strip protocol and www
    cleaned = re.sub(r"^https?://(www\.)?", "", cleaned)
    # Strip query parameters and trailing slash
    cleaned = cleaned.split("?")[0].rstrip("/")
    return cleaned


class Contact(Base, UUIDModelMixin, TimestampMixin):
    """User connection contact entity."""
    __tablename__ = "contacts"

    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), default="", nullable=False)
    profile_url: Mapped[str] = mapped_column(String(500), default="", nullable=False)
    profile_url_normalized: Mapped[str] = mapped_column(String(500), default="", nullable=False, index=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    company: Mapped[str] = mapped_column(String(255), default="Unknown", nullable=False)
    position: Mapped[str] = mapped_column(String(255), default="Unknown", nullable=False)
    connected_on: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "profile_url_normalized", name="uq_user_profile_url"),
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="contacts")
    analyses: Mapped[List["ContactAnalysis"]] = relationship(
        "ContactAnalysis",
        back_populates="contact",
        cascade="all, delete-orphan"
    )
    message_drafts: Mapped[List["MessageDraft"]] = relationship(
        "MessageDraft",
        back_populates="contact",
        cascade="all, delete-orphan"
    )
    outreach_events: Mapped[List["OutreachEvent"]] = relationship(
        "OutreachEvent",
        back_populates="contact",
        cascade="all, delete-orphan"
    )
