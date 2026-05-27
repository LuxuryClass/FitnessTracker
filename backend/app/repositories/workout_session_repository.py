from datetime import datetime
from uuid import UUID

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

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


workout_session_repository = WorkoutSessionRepository()
