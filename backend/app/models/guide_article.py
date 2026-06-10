from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class GuideArticle(Base):
    __tablename__ = "guide_articles"
    __table_args__ = (
        UniqueConstraint("guide_category_id", "position", name="uq_guide_articles_category_position"),
        CheckConstraint("position > 0", name="ck_guide_articles_position_positive"),
        CheckConstraint("reading_time_minutes >= 0", name="ck_guide_articles_reading_time_non_negative"),
        CheckConstraint("views_count >= 0", name="ck_guide_articles_views_non_negative"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    guide_category_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("guide_categories.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    icon_object_key: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    reading_time_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    # deferred=True: тяжёлый markdown не грузится при выборке карточек,
    # подтягивается только при чтении одной статьи (обращение к article.content).
    content: Mapped[str] = mapped_column(Text, nullable=False, deferred=True)
    views_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"), index=True)
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )