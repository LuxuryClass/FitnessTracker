from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.workout_session import WorkoutSession
from app.models.workout_session_set import WorkoutSessionSet


class WorkoutSessionSetRepository:
    async def list_by_session_id(self, db: AsyncSession, session_id: UUID) -> list[WorkoutSessionSet]:
        statement = (
            select(WorkoutSessionSet)
            .where(WorkoutSessionSet.session_id == session_id)
            .order_by(WorkoutSessionSet.exercise_id, WorkoutSessionSet.set_index)
        )
        result = await db.execute(statement)
        return list(result.scalars().all())

    async def get_by_session_and_client_event_id(
        self,
        db: AsyncSession,
        session_id: UUID,
        client_event_id: UUID,
    ) -> WorkoutSessionSet | None:
        statement = select(WorkoutSessionSet).where(
            WorkoutSessionSet.session_id == session_id,
            WorkoutSessionSet.client_event_id == client_event_id,
        )
        result = await db.execute(statement)
        return result.scalar_one_or_none()

    async def get_by_session_exercise_set_index(
        self,
        db: AsyncSession,
        session_id: UUID,
        exercise_id: UUID,
        set_index: int,
    ) -> WorkoutSessionSet | None:
        statement = select(WorkoutSessionSet).where(
            WorkoutSessionSet.session_id == session_id,
            WorkoutSessionSet.exercise_id == exercise_id,
            WorkoutSessionSet.set_index == set_index,
        )
        result = await db.execute(statement)
        return result.scalar_one_or_none()

    async def create(
        self,
        db: AsyncSession,
        session_id: UUID,
        exercise_id: UUID,
        client_event_id: UUID,
        set_index: int,
        weight_kg: Decimal,
        reps: int,
    ) -> WorkoutSessionSet:
        session_set = WorkoutSessionSet(
            session_id=session_id,
            exercise_id=exercise_id,
            client_event_id=client_event_id,
            set_index=set_index,
            weight_kg=weight_kg,
            reps=reps,
        )
        db.add(session_set)
        await db.flush()
        return session_set

    async def update(
        self,
        db: AsyncSession,
        session_set: WorkoutSessionSet,
        client_event_id: UUID,
        weight_kg: Decimal,
        reps: int,
    ) -> WorkoutSessionSet:
        session_set.client_event_id = client_event_id
        session_set.weight_kg = weight_kg
        session_set.reps = reps
        await db.flush()
        return session_set

    async def calculate_weekly_volume_tons(
        self,
        db: AsyncSession,
        user_id: UUID,
        week_start: datetime,
        week_end: datetime,
    ) -> Decimal:
        statement = (
            select(func.coalesce(func.sum(WorkoutSessionSet.weight_kg * WorkoutSessionSet.reps), 0))
            .select_from(WorkoutSessionSet)
            .join(WorkoutSession, WorkoutSession.id == WorkoutSessionSet.session_id)
            .where(
                WorkoutSession.user_id == user_id,
                WorkoutSession.status == "completed",
                WorkoutSession.completed_at >= week_start,
                WorkoutSession.completed_at < week_end,
            )
        )
        result = await db.execute(statement)
        total_kg = result.scalar_one()
        return Decimal(total_kg) / Decimal("1000")


workout_session_set_repository = WorkoutSessionSetRepository()
