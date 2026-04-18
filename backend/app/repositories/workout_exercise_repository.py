from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.workout_exercise import WorkoutExercise


class WorkoutExerciseRepository:
    async def list_by_workout_id(self, db: AsyncSession, workout_id: UUID) -> list[WorkoutExercise]:
        statement = select(WorkoutExercise).where(WorkoutExercise.workout_id == workout_id).order_by(WorkoutExercise.order_index)
        result = await db.execute(statement)
        return list(result.scalars().all())

    async def list_by_workout_ids(self, db: AsyncSession, workout_ids: list[UUID]) -> list[WorkoutExercise]:
        if not workout_ids:
            return []
        statement = (
            select(WorkoutExercise)
            .where(WorkoutExercise.workout_id.in_(workout_ids))
            .order_by(WorkoutExercise.workout_id, WorkoutExercise.order_index)
        )
        result = await db.execute(statement)
        return list(result.scalars().all())

    async def create_many(
        self,
        db: AsyncSession,
        workout_id: UUID,
        exercise_ids: list[UUID],
    ) -> list[WorkoutExercise]:
        workout_exercises = [
            WorkoutExercise(
                workout_id=workout_id,
                exercise_id=exercise_id,
                order_index=index,
            )
            for index, exercise_id in enumerate(exercise_ids, start=1)
        ]
        db.add_all(workout_exercises)
        await db.flush()
        return workout_exercises

    async def delete_by_workout_id(self, db: AsyncSession, workout_id: UUID) -> None:
        statement = delete(WorkoutExercise).where(WorkoutExercise.workout_id == workout_id)
        await db.execute(statement)
        await db.flush()


workout_exercise_repository = WorkoutExerciseRepository()
