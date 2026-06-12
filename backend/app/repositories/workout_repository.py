from datetime import datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.exercise import Exercise
from app.models.workout import Workout
from app.models.workout_exercise import WorkoutExercise
from app.models.workout_session import WorkoutSession


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

    async def find_first_planned_from(
        self,
        db: AsyncSession,
        user_id: UUID,
        from_dt: datetime,
    ) -> Workout | None:
        completed_session_exists = (
            select(WorkoutSession.id)
            .where(
                WorkoutSession.workout_id == Workout.id,
                WorkoutSession.user_id == user_id,
                WorkoutSession.status == "completed",
            )
            .exists()
        )
        statement = (
            select(Workout)
            .where(
                Workout.user_id == user_id,
                Workout.is_planned.is_(True),
                Workout.planned_for.is_not(None),
                Workout.planned_for >= from_dt,
                ~completed_session_exists,
            )
            .order_by(Workout.planned_for.asc())
            .limit(1)
        )
        result = await db.execute(statement)
        return result.scalar_one_or_none()

    async def list_schedule_rows(
        self,
        db: AsyncSession,
        user_id: UUID,
        date_from: datetime,
        date_to: datetime,
    ) -> list[tuple[Workout, WorkoutExercise | None, Exercise | None, UUID | None]]:
        statement = (
            select(
                Workout,
                WorkoutExercise,
                Exercise,
                WorkoutSession.workout_id.label("completed_workout_id"),
            )
            .where(
                Workout.user_id == user_id,
                Workout.is_planned.is_(True),
                Workout.planned_for.is_not(None),
                Workout.planned_for >= date_from,
                Workout.planned_for <= date_to,
            )
            .outerjoin(WorkoutExercise, WorkoutExercise.workout_id == Workout.id)
            .outerjoin(Exercise, Exercise.id == WorkoutExercise.exercise_id)
            .outerjoin(
                WorkoutSession,
                (WorkoutSession.workout_id == Workout.id)
                & (WorkoutSession.user_id == user_id)
                & (WorkoutSession.status == "completed")
                & (WorkoutSession.completed_at.is_not(None))
                & (WorkoutSession.completed_at >= date_from)
                & (WorkoutSession.completed_at <= date_to),
            )
            .order_by(Workout.planned_for)
        )
        rows = (await db.execute(statement)).all()
        return [(row[0], row[1], row[2], row[3]) for row in rows]

    async def list_by_series_id(
        self,
        db: AsyncSession,
        user_id: UUID,
        series_id: UUID,
    ) -> list[Workout]:
        statement = (
            select(Workout)
            .where(Workout.user_id == user_id, Workout.series_id == series_id)
            .order_by(Workout.planned_for)
        )
        result = await db.execute(statement)
        return list(result.scalars().all())

    async def create(
        self,
        db: AsyncSession,
        user_id: UUID,
        title: str,
        is_planned: bool,
        planned_for: datetime | None,
        description: str | None,
        series_id: UUID | None = None,
    ) -> Workout:
        workout = Workout(
            user_id=user_id,
            title=title,
            is_planned=is_planned,
            planned_for=planned_for,
            description=description,
            series_id=series_id,
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
