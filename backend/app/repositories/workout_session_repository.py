from datetime import datetime
from typing import Sequence
from uuid import UUID

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.workout import Workout
from app.models.workout_session import WorkoutSession


class WorkoutSessionRepository:
    async def get_by_id_for_user(self, db: AsyncSession, session_id: UUID, user_id: UUID) -> WorkoutSession | None:
        statement = select(WorkoutSession).where(WorkoutSession.id == session_id, WorkoutSession.user_id == user_id)
        result = await db.execute(statement)
        return result.scalar_one_or_none()

    async def get_active_by_user_id(self, db: AsyncSession, user_id: UUID) -> WorkoutSession | None:
        statement = select(WorkoutSession).where(
            WorkoutSession.user_id == user_id,
            WorkoutSession.status == "in_progress",
        )
        result = await db.execute(statement)
        return result.scalar_one_or_none()

    async def get_completed_by_workout_id(
        self, db: AsyncSession, workout_id: UUID, user_id: UUID
    ) -> WorkoutSession | None:
        # Самая свежая завершённая сессия тренировки
        statement = (
            select(WorkoutSession)
            .where(
                WorkoutSession.workout_id == workout_id,
                WorkoutSession.user_id == user_id,
                WorkoutSession.status == "completed",
                WorkoutSession.completed_at.is_not(None),
            )
            .order_by(desc(WorkoutSession.completed_at))
        )
        result = await db.execute(statement)
        return result.scalars().first()

    async def create(self, db: AsyncSession, user_id: UUID, workout_id: UUID) -> WorkoutSession:
        session = WorkoutSession(user_id=user_id, workout_id=workout_id)
        db.add(session)
        await db.flush()
        return session

    async def complete(self, db: AsyncSession, session: WorkoutSession, completed_at: datetime) -> WorkoutSession:
        session.status = "completed"
        session.completed_at = completed_at
        await db.flush()
        return session

    async def list_completed_week_starts(self, db: AsyncSession, user_id: UUID) -> list[datetime]:
        statement = (
            select(func.date_trunc("week", WorkoutSession.completed_at).label("week_start"))
            .where(
                WorkoutSession.user_id == user_id,
                WorkoutSession.status == "completed",
                WorkoutSession.completed_at.is_not(None),
            )
            .distinct()
            .order_by(desc("week_start"))
        )
        result = await db.execute(statement)
        return list(result.scalars().all())

    async def list_completed_workout_ids_in_range(
        self,
        db: AsyncSession,
        user_id: UUID,
        date_from: datetime,
        date_to: datetime,
    ) -> set[UUID]:
        statement = select(WorkoutSession.workout_id).where(
            WorkoutSession.user_id == user_id,
            WorkoutSession.status == "completed",
            WorkoutSession.completed_at.is_not(None),
            WorkoutSession.completed_at >= date_from,
            WorkoutSession.completed_at <= date_to,
        )
        result = await db.execute(statement)
        return set(result.scalars().all())

    async def list_completed_workout_ids(
        self,
        db: AsyncSession,
        workout_ids: Sequence[UUID],
    ) -> set[UUID]:
        if not workout_ids:
            return set()
        statement = select(WorkoutSession.workout_id).where(
            WorkoutSession.workout_id.in_(workout_ids),
            WorkoutSession.status == "completed",
            WorkoutSession.completed_at.is_not(None),
        )
        result = await db.execute(statement)
        return set(result.scalars().all())

    async def count_completed_workouts_in_range(
        self,
        db: AsyncSession,
        user_id: UUID,
        range_start: datetime,
        range_end: datetime,
    ) -> int:
        effective_date = func.coalesce(Workout.planned_for, Workout.created_at)
        statement = (
            select(func.count(func.distinct(WorkoutSession.workout_id)))
            .join(Workout, Workout.id == WorkoutSession.workout_id)
            .where(
                WorkoutSession.user_id == user_id,
                WorkoutSession.status == "completed",
                WorkoutSession.completed_at.is_not(None),
                effective_date >= range_start,
                effective_date < range_end,
            )
        )
        result = await db.execute(statement)
        return int(result.scalar_one())


workout_session_repository = WorkoutSessionRepository()
