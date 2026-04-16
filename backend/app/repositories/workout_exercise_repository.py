from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.workout_exercise import WorkoutExercise


class WorkoutExerciseRepository:
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


workout_exercise_repository = WorkoutExerciseRepository()
