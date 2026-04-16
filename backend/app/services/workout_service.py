from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenException, NotFoundException
from app.models.user import User
from app.repositories import exercise_repository, workout_exercise_repository, workout_repository
from app.schemas.workout import WorkoutCreateRequest, WorkoutExerciseResponse, WorkoutResponse


class WorkoutService:
    async def create_workout(
        self,
        db: AsyncSession,
        current_user: User,
        payload: WorkoutCreateRequest,
    ) -> WorkoutResponse:
        exercise_ids = [item.exercise_id for item in payload.exercises]
        exercises = await exercise_repository.get_by_ids(db, exercise_ids)
        if len(exercises) != len(exercise_ids):
            raise NotFoundException("Одно или несколько упражнений не найдены.")

        for exercise in exercises:
            if exercise.created_by_user_id is not None and exercise.created_by_user_id != current_user.id:
                raise ForbiddenException("Нельзя использовать чужие пользовательские упражнения.")

        workout = await workout_repository.create(
            db=db,
            user_id=current_user.id,
            title=payload.title,
            is_planned=payload.is_planned,
            planned_for=payload.planned_for,
            description=payload.description,
        )
        workout_exercises = await workout_exercise_repository.create_many(
            db=db,
            workout_id=workout.id,
            exercise_ids=exercise_ids,
        )
        await db.commit()
        await db.refresh(workout)
        return WorkoutResponse(
            id=workout.id,
            user_id=workout.user_id,
            title=workout.title,
            is_planned=workout.is_planned,
            planned_for=workout.planned_for,
            description=workout.description,
            exercises=[
                WorkoutExerciseResponse(
                    exercise_id=workout_exercise.exercise_id,
                    order_index=workout_exercise.order_index,
                )
                for workout_exercise in workout_exercises
            ],
            created_at=workout.created_at,
            updated_at=workout.updated_at,
        )


workout_service = WorkoutService()
