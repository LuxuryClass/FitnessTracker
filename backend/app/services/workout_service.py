from collections import defaultdict
from datetime import date, datetime, time, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from app.models.workout import Workout
from app.models.workout_exercise import WorkoutExercise
from app.models.user import User
from app.repositories import exercise_repository, workout_exercise_repository, workout_repository, workout_session_repository
from app.schemas.schedule import ScheduleWorkoutItem
from app.schemas.workout import (
    WorkoutCreateRequest,
    WorkoutExerciseCreateItem,
    WorkoutExerciseResponse,
    WorkoutResponse,
    WorkoutUpdateRequest,
)


class WorkoutService:
    async def _validate_exercises_access(
        self,
        db: AsyncSession,
        current_user: User,
        exercise_ids: list[UUID],
    ) -> None:
        exercises = await exercise_repository.get_by_ids(db, exercise_ids)
        if len(exercises) != len(exercise_ids):
            raise NotFoundException("Одно или несколько упражнений не найдены.")

        for exercise in exercises:
            if exercise.created_by_user_id is not None and exercise.created_by_user_id != current_user.id:
                raise ForbiddenException("Нельзя использовать чужие пользовательские упражнения.")

    async def _get_workout_for_user_or_raise(
        self,
        db: AsyncSession,
        current_user: User,
        workout_id: UUID,
    ) -> Workout:
        workout = await workout_repository.get_by_id_for_user(db, workout_id, current_user.id)
        if workout is None:
            raise NotFoundException("Тренировка не найдена.")
        return workout

    @staticmethod
    def _build_workout_response(workout: Workout, workout_exercises: list[WorkoutExercise]) -> WorkoutResponse:
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

    async def list_workouts(
        self,
        db: AsyncSession,
        current_user: User,
    ) -> list[WorkoutResponse]:
        workouts = await workout_repository.list_by_user_id(db, current_user.id)
        if not workouts:
            return []

        workout_ids = [workout.id for workout in workouts]
        workout_exercises = await workout_exercise_repository.list_by_workout_ids(db, workout_ids)

        grouped_exercises: dict[UUID, list[WorkoutExercise]] = defaultdict(list)
        for workout_exercise in workout_exercises:
            grouped_exercises[workout_exercise.workout_id].append(workout_exercise)

        return [
            self._build_workout_response(workout, grouped_exercises.get(workout.id, []))
            for workout in workouts
        ]

    async def get_workout(
        self,
        db: AsyncSession,
        current_user: User,
        workout_id: UUID,
    ) -> WorkoutResponse:
        workout = await self._get_workout_for_user_or_raise(db, current_user, workout_id)
        workout_exercises = await workout_exercise_repository.list_by_workout_id(db, workout.id)
        return self._build_workout_response(workout, workout_exercises)

    async def create_workout(
        self,
        db: AsyncSession,
        current_user: User,
        payload: WorkoutCreateRequest,
    ) -> WorkoutResponse:
        exercise_ids = [item.exercise_id for item in payload.exercises]
        await self._validate_exercises_access(db, current_user, exercise_ids)

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
        return self._build_workout_response(workout, workout_exercises)

    async def update_workout(
        self,
        db: AsyncSession,
        current_user: User,
        workout_id: UUID,
        payload: WorkoutUpdateRequest,
    ) -> WorkoutResponse:
        workout = await self._get_workout_for_user_or_raise(db, current_user, workout_id)
        update_data = payload.to_update_dict()

        resolved_is_planned = workout.is_planned
        if "is_planned" in update_data:
            resolved_is_planned = update_data["is_planned"]

        resolved_planned_for = workout.planned_for
        if "planned_for" in update_data:
            resolved_planned_for = update_data["planned_for"]

        if resolved_is_planned and resolved_planned_for is None:
            raise BadRequestException("Для запланированной тренировки поле planned_for обязательно.")
        if not resolved_is_planned and resolved_planned_for is not None:
            raise BadRequestException("Для тренировки «сейчас» поле planned_for должно быть null.")

        workout_update_data: dict[str, str | bool | datetime | None] = {}
        if "title" in update_data:
            workout_update_data["title"] = update_data["title"]
        if "is_planned" in update_data:
            workout_update_data["is_planned"] = update_data["is_planned"]
        if "planned_for" in update_data:
            workout_update_data["planned_for"] = update_data["planned_for"]
        if "description" in update_data:
            workout_update_data["description"] = update_data["description"]

        if workout_update_data:
            workout = await workout_repository.update(
                db=db,
                workout=workout,
                update_data=workout_update_data,
            )

        if "exercises" in update_data:
            exercise_items: list[WorkoutExerciseCreateItem] = update_data["exercises"]
            exercise_ids = [item.exercise_id for item in exercise_items]
            await self._validate_exercises_access(db, current_user, exercise_ids)
            await workout_exercise_repository.delete_by_workout_id(db, workout.id)
            await workout_exercise_repository.create_many(
                db=db,
                workout_id=workout.id,
                exercise_ids=exercise_ids,
            )

        await db.commit()
        await db.refresh(workout)
        workout_exercises = await workout_exercise_repository.list_by_workout_id(db, workout.id)
        return self._build_workout_response(workout, workout_exercises)

    async def delete_workout(
        self,
        db: AsyncSession,
        current_user: User,
        workout_id: UUID,
    ) -> None:
        workout = await self._get_workout_for_user_or_raise(db, current_user, workout_id)
        await workout_repository.delete(db, workout)
        await db.commit()

    async def get_schedule(
        self,
        db: AsyncSession,
        current_user: User,
        date_from: date,
        date_to: date,
    ) -> list[ScheduleWorkoutItem]:
        # Конвертируем даты в datetime с учётом UTC (начало и конец дня)
        dt_from = datetime.combine(date_from, time.min, tzinfo=timezone.utc)
        dt_to = datetime.combine(date_to, time.max, tzinfo=timezone.utc)

        workouts = await workout_repository.list_planned_in_range(db, current_user.id, dt_from, dt_to)
        if not workouts:
            return []

        # Получаем id завершённых сессий одним запросом
        completed_ids = await workout_session_repository.list_completed_workout_ids_in_range(
            db, current_user.id, dt_from, dt_to
        )

        # Загружаем все упражнения одним запросом
        workout_ids = [w.id for w in workouts]
        workout_exercises = await workout_exercise_repository.list_by_workout_ids(db, workout_ids)

        exercise_ids = list({we.exercise_id for we in workout_exercises})
        exercises = await exercise_repository.get_by_ids(db, exercise_ids)
        exercise_map = {ex.id: ex for ex in exercises}

        # Группируем упражнения по тренировке
        grouped: dict[UUID, list[WorkoutExercise]] = defaultdict(list)
        for we in workout_exercises:
            grouped[we.workout_id].append(we)

        result: list[ScheduleWorkoutItem] = []
        for workout in workouts:
            assert workout.planned_for is not None
            muscle_groups_set: list[str] = []
            seen: set[str] = set()
            for we in grouped.get(workout.id, []):
                ex = exercise_map.get(we.exercise_id)
                if ex:
                    for mg in ex.muscle_groups:
                        if mg not in seen:
                            seen.add(mg)
                            muscle_groups_set.append(mg)

            status = "completed" if workout.id in completed_ids else "planned"
            planned_local = workout.planned_for
            result.append(
                ScheduleWorkoutItem(
                    id=workout.id,
                    title=workout.title,
                    date=planned_local.date(),
                    time=planned_local.strftime("%H:%M"),
                    status=status,
                    exercises_count=len(grouped.get(workout.id, [])),
                    muscle_groups=muscle_groups_set,
                )
            )

        return result


workout_service = WorkoutService()
