from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories import workout_repository
from app.schemas.workout import WorkoutCreateRequest, WorkoutResponse


class WorkoutService:
    async def create_workout(
        self,
        db: AsyncSession,
        current_user: User,
        payload: WorkoutCreateRequest,
    ) -> WorkoutResponse:
        workout = await workout_repository.create(
            db=db,
            user_id=current_user.id,
            title=payload.title,
            is_planned=payload.is_planned,
            planned_for=payload.planned_for,
            description=payload.description,
        )
        await db.commit()
        await db.refresh(workout)
        return WorkoutResponse.model_validate(workout)


workout_service = WorkoutService()
