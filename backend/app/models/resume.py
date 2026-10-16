"""Resume model tracking uploaded resume files and parsed metadata."""
from typing import Optional, Dict, Any, TYPE_CHECKING
from sqlalchemy import String, Integer, Text, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, UUIDModelMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class Resume(Base, UUIDModelMixin, TimestampMixin):
    """Resume model representing private uploaded resume documents."""
    __tablename__ = "resumes"

    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(512), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    raw_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    parsed_data: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="resumes")
