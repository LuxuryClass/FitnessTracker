from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, Numeric, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class WorkoutExerciseTargetSet(Base):
    """
    Запланированный (target) подход для упражнения внутри тренировки.

    Зеркалит `WorkoutSessionSet`, но для plan-стороны: пользователь при создании
    тренировки может опционально указать сколько подходов и с какими reps/весом
    он хочет выполнить. Если не указал — строк нет, заполнит при тренировочной
    сессии. Также допускается частичное заполнение (например, только число подходов
    без указания reps/веса) — тогда соответствующие поля NULL.
    """

    __tablename__ = "workout_exercise_target_sets"
    __table_args__ = (
        CheckConstraint("set_index > 0", name="ck_workout_exercise_target_sets_set_index_positive"),
        CheckConstraint(
            "target_reps IS NULL OR target_reps > 0",
            name="ck_workout_exercise_target_sets_reps_positive",
        ),
        CheckConstraint(
            "target_weight_kg IS NULL OR target_weight_kg >= 0",
            name="ck_workout_exercise_target_sets_weight_non_negative",
        ),
        UniqueConstraint(
            "workout_id",
            "exercise_id",
            "set_index",
            name="uq_workout_exercise_target_sets_position",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workout_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workouts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    exercise_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("exercises.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    set_index: Mapped[int] = mapped_column(Integer, nullable=False)
    target_reps: Mapped[int | None] = mapped_column(Integer, nullable=True)
    target_weight_kg: Mapped[Decimal | None] = mapped_column(Numeric(8, 2), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
