from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.exercise import Exercise


class ExerciseRepository:
    async def get_by_id(self, db: AsyncSession, exercise_id: UUID) -> Exercise | None:
        statement = select(Exercise).where(Exercise.id == exercise_id)
        result = await db.execute(statement)
        return result.scalar_one_or_none()

    async def get_by_ids(self, db: AsyncSession, exercise_ids: list[UUID]) -> list[Exercise]:
        if not exercise_ids:
            return []
        statement = select(Exercise).where(Exercise.id.in_(exercise_ids))
        result = await db.execute(statement)
        return list(result.scalars().all())

    async def list_by_owner(self, db: AsyncSession, user_id: UUID) -> list[Exercise]:
        statement = (
            select(Exercise)
            .where(Exercise.created_by_user_id == user_id)
            .order_by(Exercise.created_at.desc(), Exercise.id.desc())
        )
        result = await db.execute(statement)
        return list(result.scalars().all())

    async def list_system(self, db: AsyncSession) -> list[Exercise]:
        statement = (
            select(Exercise)
            .where(Exercise.created_by_user_id.is_(None))
            .order_by(Exercise.created_at.desc(), Exercise.id.desc())
        )
        result = await db.execute(statement)
        return list(result.scalars().all())

    async def get_user_exercise_by_name(self, db: AsyncSession, user_id: UUID, name: str) -> Exercise | None:
        statement = select(Exercise).where(
            Exercise.created_by_user_id == user_id,
            func.lower(Exercise.name) == name.lower(),
        )
        result = await db.execute(statement)
        return result.scalar_one_or_none()

    async def create(
        self,
        db: AsyncSession,
        created_by_user_id: UUID,
        name: str,
        description: str | None,
        primary_muscle_groups: list[str],
        secondary_muscles: list[str],
        equipment: str,
    ) -> Exercise:
        exercise = Exercise(
            created_by_user_id=created_by_user_id,
            name=name,
            description=description,
            primary_muscle_groups=primary_muscle_groups,
            secondary_muscles=secondary_muscles,
            equipment=equipment,
        )
        db.add(exercise)
        await db.flush()
        return exercise

    async def update(
        self,
        db: AsyncSession,
        exercise: Exercise,
        update_data: dict[str, str | list[str] | None],
    ) -> Exercise:
        for field_name, field_value in update_data.items():
            setattr(exercise, field_name, field_value)
        await db.flush()
        return exercise

    async def delete(self, db: AsyncSession, exercise: Exercise) -> None:
        await db.delete(exercise)
        await db.flush()


exercise_repository = ExerciseRepository()
