"""Shortlist model capturing user-curated groups of priority connections."""
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, UUIDModelMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.shortlist_item import ShortlistItem


class Shortlist(Base, UUIDModelMixin, TimestampMixin):
    """Named user shortlist for targeted outreach campaigns."""
    __tablename__ = "shortlists"

    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="shortlists")
    items: Mapped[List["ShortlistItem"]] = relationship(
        "ShortlistItem",
        back_populates="shortlist",
        cascade="all, delete-orphan"
    )
