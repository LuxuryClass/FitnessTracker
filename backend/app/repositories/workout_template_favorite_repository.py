from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user_workout_template_favorite import UserWorkoutTemplateFavorite


class WorkoutTemplateFavoriteRepository:
    async def get_favorite_template_ids(
        self, db: AsyncSession, user_id: UUID, template_ids: set[UUID]
    ) -> set[UUID]:
        if not template_ids:
            return set()
        statement = select(UserWorkoutTemplateFavorite.workout_template_id).where(
            UserWorkoutTemplateFavorite.user_id == user_id,
            UserWorkoutTemplateFavorite.workout_template_id.in_(template_ids),
        )
        result = await db.execute(statement)
        return set(result.scalars().all())

    async def get_favorite(
        self, db: AsyncSession, user_id: UUID, template_id: UUID
    ) -> UserWorkoutTemplateFavorite | None:
        statement = select(UserWorkoutTemplateFavorite).where(
            UserWorkoutTemplateFavorite.user_id == user_id,
            UserWorkoutTemplateFavorite.workout_template_id == template_id,
        )
        result = await db.execute(statement)
        return result.scalar_one_or_none()

    async def add_favorite(self, db: AsyncSession, user_id: UUID, template_id: UUID) -> None:
        favorite = UserWorkoutTemplateFavorite(user_id=user_id, workout_template_id=template_id)
        db.add(favorite)
        await db.flush()

    async def remove_favorite(self, db: AsyncSession, user_id: UUID, template_id: UUID) -> None:
        statement = delete(UserWorkoutTemplateFavorite).where(
            UserWorkoutTemplateFavorite.user_id == user_id,
            UserWorkoutTemplateFavorite.workout_template_id == template_id,
        )
        await db.execute(statement)
        await db.flush()


workout_template_favorite_repository = WorkoutTemplateFavoriteRepository()