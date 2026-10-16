"""JobOpening model for tracking manually recorded target opportunities."""
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, UUIDModelMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class JobOpening(Base, UUIDModelMixin, TimestampMixin):
    """User-targeted job opening recorded manually without web scraping."""
    __tablename__ = "job_openings"

    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    company: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    career_page_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)  # active, applied, interviewing, closed

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="job_openings")
