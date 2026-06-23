from collections import defaultdict
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AlreadyExistsException, ForbiddenException, NotFoundException
from app.models.user import User
from app.models.workout_template import WorkoutTemplate
from app.models.workout_template_exercise import WorkoutTemplateExercise
from app.repositories import (
    exercise_repository,
    workout_template_exercise_repository,
    workout_template_favorite_repository,
    workout_template_repository,
)
from app.schemas.workout_template import (
    WorkoutTemplateCreateRequest,
    WorkoutTemplateExerciseCreateItem,
    WorkoutTemplateExerciseResponse,
    WorkoutTemplateResponse,
    WorkoutTemplateUpdateRequest,
)


class WorkoutTemplateService:
    async def _validate_exercises_access(
        self,
        db: AsyncSession,
        current_user: User,
        exercise_ids: list[UUID],
    ) -> None:
        if not exercise_ids:
            return
        exercises = await exercise_repository.get_by_ids(db, exercise_ids)
        if len(exercises) != len(exercise_ids):
            raise NotFoundException("Одно или несколько упражнений не найдены.")

        for exercise in exercises:
            if exercise.created_by_user_id is not None and exercise.created_by_user_id != current_user.id:
                raise ForbiddenException("Нельзя использовать чужие пользовательские упражнения.")

    @staticmethod
    def _build_template_response(
        template: WorkoutTemplate,
        template_exercises: list[WorkoutTemplateExercise],
        is_favorite: bool,
    ) -> WorkoutTemplateResponse:
        return WorkoutTemplateResponse(
            id=template.id,
            created_by_user_id=template.created_by_user_id,
            title=template.title,
            description=template.description,
            is_favorite=is_favorite,
            exercises=[
                WorkoutTemplateExerciseResponse(
                    exercise_id=template_exercise.exercise_id,
                    order_index=template_exercise.order_index,
                )
                for template_exercise in sorted(template_exercises, key=lambda te: te.order_index)
            ],
            created_at=template.created_at,
            updated_at=template.updated_at,
        )

    async def list_templates(
        self,
        db: AsyncSession,
        current_user: User,
    ) -> list[WorkoutTemplateResponse]:
        templates = await workout_template_repository.list_for_user(db, current_user.id)
        if not templates:
            return []

        template_ids = [template.id for template in templates]
        template_exercises = await workout_template_exercise_repository.list_by_template_ids(db, template_ids)
        favorite_ids = await workout_template_favorite_repository.get_favorite_template_ids(
            db, current_user.id, set(template_ids)
        )

        grouped_exercises: dict[UUID, list[WorkoutTemplateExercise]] = defaultdict(list)
        for template_exercise in template_exercises:
            grouped_exercises[template_exercise.template_id].append(template_exercise)

        return [
            self._build_template_response(
                template,
                grouped_exercises.get(template.id, []),
                is_favorite=template.id in favorite_ids,
            )
            for template in templates
        ]

    async def get_template(
        self,
        db: AsyncSession,
        current_user: User,
        template_id: UUID,
    ) -> WorkoutTemplateResponse:
        template = await workout_template_repository.get_for_user(db, template_id, current_user.id)
        if template is None:
            raise NotFoundException("Шаблон тренировки не найден.")

        template_exercises = await workout_template_exercise_repository.list_by_template_id(db, template.id)
        favorite_ids = await workout_template_favorite_repository.get_favorite_template_ids(
            db, current_user.id, {template.id}
        )
        return self._build_template_response(
            template,
            template_exercises,
            is_favorite=template.id in favorite_ids,
        )

    async def create_template(
        self,
        db: AsyncSession,
        current_user: User,
        payload: WorkoutTemplateCreateRequest,
    ) -> WorkoutTemplateResponse:
        exercise_ids = [item.exercise_id for item in payload.exercises]
        await self._validate_exercises_access(db, current_user, exercise_ids)

        existing = await workout_template_repository.get_user_template_by_title(
            db, current_user.id, payload.title
        )
        if existing is not None:
            raise AlreadyExistsException("Шаблон с таким названием уже существует.")

        template = await workout_template_repository.create(
            db=db,
            user_id=current_user.id,
            title=payload.title,
            description=payload.description,
        )
        template_exercises = await workout_template_exercise_repository.create_many(
            db=db,
            template_id=template.id,
            exercise_ids=exercise_ids,
        )
        await db.commit()
        await db.refresh(template)
        return self._build_template_response(template, template_exercises, is_favorite=False)

    async def update_template(
        self,
        db: AsyncSession,
        current_user: User,
        template_id: UUID,
        payload: WorkoutTemplateUpdateRequest,
    ) -> WorkoutTemplateResponse:
        template = await workout_template_repository.get_owned(db, template_id, current_user.id)
        if template is None:
            raise NotFoundException("Шаблон тренировки не найден.")

        update_data = payload.to_update_dict()

        if "title" in update_data:
            new_title = update_data["title"]
            assert isinstance(new_title, str)
            existing = await workout_template_repository.get_user_template_by_title(
                db, current_user.id, new_title
            )
            if existing is not None and existing.id != template.id:
                raise AlreadyExistsException("Шаблон с таким названием уже существует.")

        template_update_data: dict[str, str | None] = {}
        if "title" in update_data:
            template_update_data["title"] = update_data["title"]
        if "description" in update_data:
            template_update_data["description"] = update_data["description"]

        if template_update_data:
            template = await workout_template_repository.update(
                db=db,
                template=template,
                update_data=template_update_data,
            )

        if "exercises" in update_data:
            exercise_items: list[WorkoutTemplateExerciseCreateItem] = update_data["exercises"]
            exercise_ids = [item.exercise_id for item in exercise_items]
            await self._validate_exercises_access(db, current_user, exercise_ids)
            await workout_template_exercise_repository.delete_by_template_id(db, template.id)
            await workout_template_exercise_repository.create_many(
                db=db,
                template_id=template.id,
                exercise_ids=exercise_ids,
            )

        await db.commit()
        await db.refresh(template)
        template_exercises = await workout_template_exercise_repository.list_by_template_id(db, template.id)
        favorite_ids = await workout_template_favorite_repository.get_favorite_template_ids(
            db, current_user.id, {template.id}
        )
        return self._build_template_response(
            template,
            template_exercises,
            is_favorite=template.id in favorite_ids,
        )

    async def delete_template(
        self,
        db: AsyncSession,
        current_user: User,
        template_id: UUID,
    ) -> None:
        template = await workout_template_repository.get_owned(db, template_id, current_user.id)
        if template is None:
            raise NotFoundException("Шаблон тренировки не найден.")

        await workout_template_repository.delete(db, template)
        await db.commit()

    async def add_favorite(
        self,
        db: AsyncSession,
        current_user: User,
        template_id: UUID,
    ) -> None:
        template = await workout_template_repository.get_for_user(db, template_id, current_user.id)
        if template is None:
            raise NotFoundException("Шаблон тренировки не найден.")

        existing = await workout_template_favorite_repository.get_favorite(
            db, current_user.id, template_id
        )
        if existing is not None:
            return

        await workout_template_favorite_repository.add_favorite(db, current_user.id, template_id)
        await db.commit()

    async def remove_favorite(
        self,
        db: AsyncSession,
        current_user: User,
        template_id: UUID,
    ) -> None:
        template = await workout_template_repository.get_for_user(db, template_id, current_user.id)
        if template is None:
            raise NotFoundException("Шаблон тренировки не найден.")

        await workout_template_favorite_repository.remove_favorite(db, current_user.id, template_id)
        await db.commit()


workout_template_service = WorkoutTemplateService()