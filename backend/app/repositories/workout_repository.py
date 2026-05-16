from datetime import datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.workout import Workout


class WorkoutRepository:
    async def get_by_id(self, db: AsyncSession, workout_id: UUID) -> Workout | None:
        statement = select(Workout).where(Workout.id == workout_id)
        result = await db.execute(statement)
        return result.scalar_one_or_none()

    async def get_by_id_for_user(self, db: AsyncSession, workout_id: UUID, user_id: UUID) -> Workout | None:
        statement = select(Workout).where(Workout.id == workout_id, Workout.user_id == user_id)
        result = await db.execute(statement)
        return result.scalar_one_or_none()

    async def list_by_user_id(self, db: AsyncSession, user_id: UUID) -> list[Workout]:
        statement = select(Workout).where(Workout.user_id == user_id).order_by(Workout.created_at.desc(), Workout.id.desc())
        result = await db.execute(statement)
        return list(result.scalars().all())

    async def list_planned_in_range(
        self,
        db: AsyncSession,
        user_id: UUID,
        date_from: datetime,
        date_to: datetime,
    ) -> list[Workout]:
        statement = (
            select(Workout)
            .where(
                Workout.user_id == user_id,
                Workout.is_planned.is_(True),
                Workout.planned_for.is_not(None),
                Workout.planned_for >= date_from,
                Workout.planned_for <= date_to,
            )
            .order_by(Workout.planned_for)
        )
        result = await db.execute(statement)
        return list(result.scalars().all())

    async def count_planned_in_range(
        self,
        db: AsyncSession,
        user_id: UUID,
        range_start: datetime,
        range_end: datetime,
    ) -> int:
        statement = select(func.count(Workout.id)).where(
            Workout.user_id == user_id,
            Workout.is_planned.is_(True),
            Workout.planned_for.is_not(None),
            Workout.planned_for >= range_start,
            Workout.planned_for < range_end,
        )
        result = await db.execute(statement)
        return int(result.scalar_one())

    async def create(
        self,
        db: AsyncSession,
        user_id: UUID,
        title: str,
        is_planned: bool,
        planned_for: datetime | None,
        description: str | None,
    ) -> Workout:
        workout = Workout(
            user_id=user_id,
            title=title,
            is_planned=is_planned,
            planned_for=planned_for,
            description=description,
        )
        db.add(workout)
        await db.flush()
        return workout

    async def update(
        self,
        db: AsyncSession,
        workout: Workout,
        update_data: dict[str, str | bool | datetime | None],
    ) -> Workout:
        for field_name, field_value in update_data.items():
            setattr(workout, field_name, field_value)
        await db.flush()
        return workout

    async def delete(self, db: AsyncSession, workout: Workout) -> None:
        await db.delete(workout)
        await db.flush()


workout_repository = WorkoutRepository()
