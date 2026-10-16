"""CandidateProfile model storing user career target settings and background."""
from typing import Optional, List, Dict, Any, TYPE_CHECKING
from sqlalchemy import String, Float, Text, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, UUIDModelMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class CandidateProfile(Base, UUIDModelMixin, TimestampMixin):
    """User candidate profile capturing target job goals, skills, and background."""
    __tablename__ = "candidate_profiles"

    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True
    )
    target_roles: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    target_companies: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    target_locations: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    skills: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    education: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    experience_years: Mapped[Optional[float]] = mapped_column(Float, default=0.0, nullable=True)
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    preferences: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="candidate_profile")
