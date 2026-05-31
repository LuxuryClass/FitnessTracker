from uuid import UUID

from fastapi import UploadFile
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AlreadyExistsException, BadRequestException, ForbiddenException, NotFoundException
from app.models.exercise import Exercise
from app.models.user import User
from app.repositories import exercise_repository
from app.schemas.exercise import ExerciseCreateRequest, ExerciseResponse, ExerciseUpdateRequest
from app.services.storage_service import storage_service


class ExerciseService:
    async def _to_response(self, exercise: Exercise) -> ExerciseResponse:
        response = ExerciseResponse.model_validate(exercise)
        response.media_url = await storage_service.build_exercise_media_access_url(exercise.media_object_key)
        return response

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
        return [await self._to_response(exercise) for exercise in exercises]

    async def list_system_exercises(self, db: AsyncSession) -> list[ExerciseResponse]:
        exercises = await exercise_repository.list_system(db)
        return [await self._to_response(exercise) for exercise in exercises]

    async def get_exercise(
        self,
        db: AsyncSession,
        current_user: User,
        exercise_id: UUID,
    ) -> ExerciseResponse:
        exercise = await self._get_owned_exercise(db, current_user, exercise_id)
        return await self._to_response(exercise)

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
            primary_muscle_groups=payload.primary_muscle_groups,
            secondary_muscles=payload.secondary_muscles,
            equipment=payload.equipment,
        )
        await db.commit()
        await db.refresh(exercise)
        return await self._to_response(exercise)

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
        return await self._to_response(exercise)

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

    async def upload_media(
        self,
        db: AsyncSession,
        current_user: User,
        exercise_id: UUID,
        file: UploadFile,
    ) -> tuple[ExerciseResponse, str | None]:
        exercise = await self._get_owned_exercise(db, current_user, exercise_id)
        old_media_key = exercise.media_object_key
        media_key, media_type = await storage_service.upload_exercise_media(
            user_id=current_user.id, exercise_id=exercise.id, file=file
        )
        try:
            exercise = await exercise_repository.update_media(
                db=db, exercise=exercise, media_object_key=media_key, media_type=media_type
            )
            await db.commit()
            await db.refresh(exercise)
            response = await self._to_response(exercise)
            old_media_to_delete = old_media_key if old_media_key and old_media_key != media_key else None
            return response, old_media_to_delete
        except (BadRequestException, SQLAlchemyError):
            await db.rollback()
            await storage_service.delete_exercise_media(media_key, ignore_missing=True)
            raise

    async def delete_media(
        self,
        db: AsyncSession,
        current_user: User,
        exercise_id: UUID,
    ) -> tuple[ExerciseResponse, str | None]:
        exercise = await self._get_owned_exercise(db, current_user, exercise_id)
        old_media_key = exercise.media_object_key
        exercise = await exercise_repository.update_media(
            db=db, exercise=exercise, media_object_key=None, media_type=None
        )
        await db.commit()
        await db.refresh(exercise)
        response = await self._to_response(exercise)
        return response, old_media_key


exercise_service = ExerciseService()
