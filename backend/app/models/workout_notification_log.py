from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class WorkoutNotificationLog(Base):
    __tablename__ = "workout_notification_logs"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "workout_id",
            "remind_at",
            name="uq_workout_notification_logs_unique",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    workout_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workouts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    remind_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
