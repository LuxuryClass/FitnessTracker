from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.exercise import Exercise


class ExerciseRepository:
    async def get_by_ids(self, db: AsyncSession, exercise_ids: list[UUID]) -> list[Exercise]:
        if not exercise_ids:
            return []
        statement = select(Exercise).where(Exercise.id.in_(exercise_ids))
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
        muscle_groups: list[str],
        equipment: str | None,
    ) -> Exercise:
        exercise = Exercise(
            created_by_user_id=created_by_user_id,
            name=name,
            description=description,
            muscle_groups=muscle_groups,
            equipment=equipment,
        )
        db.add(exercise)
        await db.flush()
        return exercise


exercise_repository = ExerciseRepository()
