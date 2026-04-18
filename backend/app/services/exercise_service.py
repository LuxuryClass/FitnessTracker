from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AlreadyExistsException, BadRequestException, ForbiddenException, NotFoundException
from app.models.exercise import Exercise
from app.models.user import User
from app.repositories import exercise_repository
from app.schemas.exercise import ExerciseCreateRequest, ExerciseResponse, ExerciseUpdateRequest


class ExerciseService:
    async def _get_owned_exercise(self, db: AsyncSession, current_user: User, exercise_id: UUID) -> Exercise:
        exercise = await exercise_repository.get_by_id(db, exercise_id)
        if exercise is None:
            raise NotFoundException("Упражнение не найдено.")
        if exercise.created_by_user_id != current_user.id:
            raise ForbiddenException("Нельзя работать с чужим упражнением.")
        return exercise

    async def list_exercises(
        self,
        db: AsyncSession,
        current_user: User,
    ) -> list[ExerciseResponse]:
        exercises = await exercise_repository.list_by_owner(db, current_user.id)
        return [ExerciseResponse.model_validate(exercise) for exercise in exercises]

    async def get_exercise(
        self,
        db: AsyncSession,
        current_user: User,
        exercise_id: UUID,
    ) -> ExerciseResponse:
        exercise = await self._get_owned_exercise(db, current_user, exercise_id)
        return ExerciseResponse.model_validate(exercise)

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

    async def update_exercise(
        self,
        db: AsyncSession,
        current_user: User,
        exercise_id: UUID,
        payload: ExerciseUpdateRequest,
    ) -> ExerciseResponse:
        exercise = await self._get_owned_exercise(db, current_user, exercise_id)
        update_data = payload.to_update_dict()

        if "name" in update_data and update_data["name"] != exercise.name:
            existing_exercise = await exercise_repository.get_user_exercise_by_name(db, current_user.id, update_data["name"])
            if existing_exercise is not None and existing_exercise.id != exercise.id:
                raise AlreadyExistsException("У вас уже есть упражнение с таким названием.")

        exercise = await exercise_repository.update(db, exercise, update_data)
        await db.commit()
        await db.refresh(exercise)
        return ExerciseResponse.model_validate(exercise)

    async def delete_exercise(
        self,
        db: AsyncSession,
        current_user: User,
        exercise_id: UUID,
    ) -> None:
        exercise = await self._get_owned_exercise(db, current_user, exercise_id)
        try:
            await exercise_repository.delete(db, exercise)
            await db.commit()
        except IntegrityError as exc:
            await db.rollback()
            raise BadRequestException("Нельзя удалить упражнение, которое используется в тренировках.") from exc


exercise_service = ExerciseService()
