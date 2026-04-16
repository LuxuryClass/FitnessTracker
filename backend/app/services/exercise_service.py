from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AlreadyExistsException
from app.models.user import User
from app.repositories import exercise_repository
from app.schemas.exercise import ExerciseCreateRequest, ExerciseResponse


class ExerciseService:
    async def create_exercise(
        self,
        db: AsyncSession,
        current_user: User,
        payload: ExerciseCreateRequest,
    ) -> ExerciseResponse:
        existing_exercise = await exercise_repository.get_user_exercise_by_name(db, current_user.id, payload.name)
        if existing_exercise is not None:
            raise AlreadyExistsException("У вас уже есть упражнение с таким названием.")

        exercise = await exercise_repository.create(
            db=db,
            created_by_user_id=current_user.id,
            name=payload.name,
            description=payload.description,
            muscle_groups=payload.muscle_groups,
            equipment=payload.equipment,
        )
        await db.commit()
        await db.refresh(exercise)
        return ExerciseResponse.model_validate(exercise)


exercise_service = ExerciseService()
