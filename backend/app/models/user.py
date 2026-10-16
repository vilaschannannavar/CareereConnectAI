"""User model with relationships to profile, contacts, resumes, and integrations."""
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, UUIDModelMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.session import UserSession
    from app.models.candidate_profile import CandidateProfile
    from app.models.resume import Resume
    from app.models.integration import Integration
    from app.models.contact import Contact
    from app.models.contact_analysis import ContactAnalysis
    from app.models.message_draft import MessageDraft
    from app.models.outreach_event import OutreachEvent
    from app.models.audit_log import AuditLog
    from app.models.shortlist import Shortlist
    from app.models.job_opening import JobOpening


class User(Base, UUIDModelMixin, TimestampMixin):
    """User account model."""
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    full_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    headline: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    sessions: Mapped[List["UserSession"]] = relationship(
        "UserSession",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    candidate_profile: Mapped[Optional["CandidateProfile"]] = relationship(
        "CandidateProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan"
    )
    resumes: Mapped[List["Resume"]] = relationship(
        "Resume",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    integrations: Mapped[List["Integration"]] = relationship(
        "Integration",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    contacts: Mapped[List["Contact"]] = relationship(
        "Contact",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    contact_analyses: Mapped[List["ContactAnalysis"]] = relationship(
        "ContactAnalysis",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    message_drafts: Mapped[List["MessageDraft"]] = relationship(
        "MessageDraft",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    outreach_events: Mapped[List["OutreachEvent"]] = relationship(
        "OutreachEvent",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    audit_logs: Mapped[List["AuditLog"]] = relationship(
        "AuditLog",
        back_populates="user"
    )
    shortlists: Mapped[List["Shortlist"]] = relationship(
        "Shortlist",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    job_openings: Mapped[List["JobOpening"]] = relationship(
        "JobOpening",
        back_populates="user",
        cascade="all, delete-orphan"
    )
