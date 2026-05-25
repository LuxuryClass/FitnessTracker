from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class UserNotificationSettings(Base):
    __tablename__ = "user_notification_settings"
    __table_args__ = (
        CheckConstraint(
            "reminder_offset_minutes >= 0 AND reminder_offset_minutes <= 1440",
            name="ck_user_notification_settings_offset_range",
        ),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    sound: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    vibration: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    do_not_disturb: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    reminders: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    reminder_offset_minutes: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
