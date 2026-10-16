"""ShortlistItem model linking contacts to named shortlists."""
from typing import TYPE_CHECKING
from sqlalchemy import String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, UUIDModelMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.shortlist import Shortlist
    from app.models.contact import Contact


class ShortlistItem(Base, UUIDModelMixin, TimestampMixin):
    """Membership of a connection contact within a user shortlist."""
    __tablename__ = "shortlist_items"

    shortlist_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("shortlists.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    contact_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("contacts.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    __table_args__ = (
        UniqueConstraint("shortlist_id", "contact_id", name="uq_shortlist_contact"),
    )

    # Relationships
    shortlist: Mapped["Shortlist"] = relationship("Shortlist", back_populates="items")
    contact: Mapped["Contact"] = relationship("Contact")
