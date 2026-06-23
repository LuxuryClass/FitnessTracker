from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user_exercise_favorite import UserExerciseFavorite


class ExerciseFavoriteRepository:
    async def get_favorite_exercise_ids(
        self, db: AsyncSession, user_id: UUID, exercise_ids: set[UUID]
    ) -> set[UUID]:
        if not exercise_ids:
            return set()
        statement = select(UserExerciseFavorite.exercise_id).where(
            UserExerciseFavorite.user_id == user_id,
            UserExerciseFavorite.exercise_id.in_(exercise_ids),
        )
        result = await db.execute(statement)
        return set(result.scalars().all())

    async def get_favorite(
        self, db: AsyncSession, user_id: UUID, exercise_id: UUID
    ) -> UserExerciseFavorite | None:
        statement = select(UserExerciseFavorite).where(
            UserExerciseFavorite.user_id == user_id,
            UserExerciseFavorite.exercise_id == exercise_id,
        )
        result = await db.execute(statement)
        return result.scalar_one_or_none()

    async def add_favorite(self, db: AsyncSession, user_id: UUID, exercise_id: UUID) -> None:
        favorite = UserExerciseFavorite(user_id=user_id, exercise_id=exercise_id)
        db.add(favorite)
        await db.flush()

    async def remove_favorite(self, db: AsyncSession, user_id: UUID, exercise_id: UUID) -> None:
        statement = delete(UserExerciseFavorite).where(
            UserExerciseFavorite.user_id == user_id,
            UserExerciseFavorite.exercise_id == exercise_id,
        )
        await db.execute(statement)
        await db.flush()


exercise_favorite_repository = ExerciseFavoriteRepository()