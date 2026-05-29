from collections import defaultdict
from datetime import date, datetime, time, timezone
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from app.models.exercise import Exercise
from app.models.workout import Workout
from app.models.workout_exercise import WorkoutExercise
from app.models.workout_exercise_target_set import WorkoutExerciseTargetSet
from app.models.workout_session import WorkoutSession
from app.models.user import User
from app.repositories import (
    exercise_repository,
    workout_exercise_repository,
    workout_exercise_target_set_repository,
    workout_repository,
    workout_session_repository,
)
from app.schemas.schedule import ScheduleWorkoutItem
from app.schemas.workout import (
    NextWorkoutExerciseItem,
    NextWorkoutResponse,
    WorkoutCreateRequest,
    WorkoutExerciseCreateItem,
    WorkoutExerciseResponse,
    WorkoutResponse,
    WorkoutTargetSetItem,
    WorkoutUpdateRequest,
)

# Грубая оценка времени на один подход (минут). Используется для
# estimated_duration_minutes в карточке «ближайшая тренировка» и для превью на фронте.
MINUTES_PER_SET = 5


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
    def _flatten_target_sets(
        exercise_items: list[WorkoutExerciseCreateItem],
    ) -> list[tuple[UUID, int, int | None, Decimal | None]]:
        flattened: list[tuple[UUID, int, int | None, Decimal | None]] = []
        for item in exercise_items:
            if not item.target_sets:
                continue
            for target_set in item.target_sets:
                flattened.append(
                    (
                        item.exercise_id,
                        target_set.set_index,
                        target_set.target_reps,
                        target_set.target_weight_kg,
                    )
                )
        return flattened

    @staticmethod
    def _build_workout_response(
        workout: Workout,
        workout_exercises: list[WorkoutExercise],
        target_sets: list[WorkoutExerciseTargetSet],
    ) -> WorkoutResponse:
        target_sets_by_exercise: dict[UUID, list[WorkoutExerciseTargetSet]] = defaultdict(list)
        for target_set in target_sets:
            target_sets_by_exercise[target_set.exercise_id].append(target_set)

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
                    target_sets=[
                        WorkoutTargetSetItem(
                            set_index=ts.set_index,
                            target_reps=ts.target_reps,
                            target_weight_kg=ts.target_weight_kg,
                        )
                        for ts in sorted(
                            target_sets_by_exercise.get(workout_exercise.exercise_id, []),
                            key=lambda ts: ts.set_index,
                        )
                    ],
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
        target_sets = await workout_exercise_target_set_repository.list_by_workout_ids(db, workout_ids)

        grouped_exercises: dict[UUID, list[WorkoutExercise]] = defaultdict(list)
        for workout_exercise in workout_exercises:
            grouped_exercises[workout_exercise.workout_id].append(workout_exercise)

        grouped_target_sets: dict[UUID, list[WorkoutExerciseTargetSet]] = defaultdict(list)
        for target_set in target_sets:
            grouped_target_sets[target_set.workout_id].append(target_set)

        return [
            self._build_workout_response(
                workout,
                grouped_exercises.get(workout.id, []),
                grouped_target_sets.get(workout.id, []),
            )
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
        target_sets = await workout_exercise_target_set_repository.list_by_workout_id(db, workout.id)
        return self._build_workout_response(workout, workout_exercises, target_sets)

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
        target_sets = await workout_exercise_target_set_repository.replace_for_workout(
            db=db,
            workout_id=workout.id,
            items=self._flatten_target_sets(payload.exercises),
        )
        await db.commit()
        await db.refresh(workout)
        return self._build_workout_response(workout, workout_exercises, target_sets)

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
            # Полностью перезаписываем targets — список упражнений изменился,
            # старые ссылки на exercise_id могут быть невалидны.
            await workout_exercise_target_set_repository.replace_for_workout(
                db=db,
                workout_id=workout.id,
                items=self._flatten_target_sets(exercise_items),
            )

        await db.commit()
        await db.refresh(workout)
        workout_exercises = await workout_exercise_repository.list_by_workout_id(db, workout.id)
        target_sets = await workout_exercise_target_set_repository.list_by_workout_id(db, workout.id)
        return self._build_workout_response(workout, workout_exercises, target_sets)

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
        dt_from = datetime.combine(date_from, time.min, tzinfo=timezone.utc)
        dt_to = datetime.combine(date_to, time.max, tzinfo=timezone.utc)

        statement = (
            select(Workout, WorkoutExercise, Exercise, WorkoutSession.workout_id.label("completed_workout_id"))
            .where(
                Workout.user_id == current_user.id,
                Workout.is_planned.is_(True),
                Workout.planned_for.is_not(None),
                Workout.planned_for >= dt_from,
                Workout.planned_for <= dt_to,
            )
            .outerjoin(WorkoutExercise, WorkoutExercise.workout_id == Workout.id)
            .outerjoin(Exercise, Exercise.id == WorkoutExercise.exercise_id)
            .outerjoin(
                WorkoutSession,
                (WorkoutSession.workout_id == Workout.id)
                & (WorkoutSession.user_id == current_user.id)
                & (WorkoutSession.status == "completed")
                & (WorkoutSession.completed_at.is_not(None))
                & (WorkoutSession.completed_at >= dt_from)
                & (WorkoutSession.completed_at <= dt_to),
            )
            .order_by(Workout.planned_for)
        )

        rows = (await db.execute(statement)).all()

        workouts_order: list[UUID] = []
        workouts_map: dict[UUID, Workout] = {}
        completed_ids: set[UUID] = set()
        grouped: dict[UUID, list[WorkoutExercise]] = defaultdict(list)
        exercise_map: dict[UUID, Exercise] = {}
        seen_we: set[tuple[UUID, UUID]] = set()

        for workout, we, exercise, completed_workout_id in rows:
            if workout.id not in workouts_map:
                workouts_map[workout.id] = workout
                workouts_order.append(workout.id)
            if completed_workout_id is not None:
                completed_ids.add(completed_workout_id)
            if we is not None and exercise is not None:
                key = (workout.id, we.exercise_id)
                if key not in seen_we:
                    seen_we.add(key)
                    exercise_map[we.exercise_id] = exercise
                    grouped[workout.id].append(we)

        result: list[ScheduleWorkoutItem] = []
        for workout_id in workouts_order:
            workout = workouts_map[workout_id]
            assert workout.planned_for is not None
            muscle_groups_set: list[str] = []
            seen_mg: set[str] = set()
            for we in grouped.get(workout_id, []):
                ex = exercise_map.get(we.exercise_id)
                if ex:
                    for mg in ex.primary_muscle_groups:
                        if mg not in seen_mg:
                            seen_mg.add(mg)
                            muscle_groups_set.append(mg)

            result.append(ScheduleWorkoutItem(
                id=workout.id,
                title=workout.title,
                date=workout.planned_for.date(),
                time=workout.planned_for.strftime("%H:%M"),
                status="completed" if workout_id in completed_ids else "planned",
                exercises_count=len(grouped.get(workout_id, [])),
                muscle_groups=muscle_groups_set,
            ))

        return result

    async def get_next_workout(
        self,
        db: AsyncSession,
        current_user: User,
    ) -> NextWorkoutResponse | None:
        now_utc = datetime.now(timezone.utc)
        # Граница — начало сегодняшнего UTC-дня
        start_of_today_utc = now_utc.replace(hour=0, minute=0, second=0, microsecond=0)

        statement = (
            select(Workout)
            .where(
                Workout.user_id == current_user.id,
                Workout.is_planned.is_(True),
                Workout.planned_for.is_not(None),
                Workout.planned_for >= start_of_today_utc,
            )
            .order_by(Workout.planned_for.asc())
            .limit(1)
        )
        workout = (await db.execute(statement)).scalar_one_or_none()
        if workout is None or workout.planned_for is None:
            return None

        # Подтягиваем упражнения тренировки и сами объекты Exercise (имя, группы мышц).
        workout_exercises = await workout_exercise_repository.list_by_workout_id(db, workout.id)
        if not workout_exercises:
            return NextWorkoutResponse(
                id=workout.id,
                title=workout.title,
                planned_for=workout.planned_for,
                estimated_duration_minutes=None,
                exercises_count=0,
                muscle_groups=[],
                exercises=[],
            )

        exercise_ids = [we.exercise_id for we in workout_exercises]
        exercises = await exercise_repository.get_by_ids(db, exercise_ids)
        exercises_map: dict[UUID, Exercise] = {ex.id: ex for ex in exercises}

        target_sets = await workout_exercise_target_set_repository.list_by_workout_id(db, workout.id)
        target_sets_by_exercise: dict[UUID, list[WorkoutExerciseTargetSet]] = defaultdict(list)
        for target_set in target_sets:
            target_sets_by_exercise[target_set.exercise_id].append(target_set)

        exercise_items: list[NextWorkoutExerciseItem] = []
        muscle_groups_aggregated: list[str] = []
        seen_muscle_groups: set[str] = set()
        total_sets_for_duration: int = 0
        any_target_sets = False

        for workout_exercise in workout_exercises:
            ex = exercises_map.get(workout_exercise.exercise_id)
            if ex is None:
                continue

            for muscle_group in ex.primary_muscle_groups:
                if muscle_group not in seen_muscle_groups:
                    seen_muscle_groups.add(muscle_group)
                    muscle_groups_aggregated.append(muscle_group)

            ts_for_exercise = target_sets_by_exercise.get(workout_exercise.exercise_id, [])
            sets_count: int | None = len(ts_for_exercise) if ts_for_exercise else None

            reps_values = [ts.target_reps for ts in ts_for_exercise if ts.target_reps is not None]
            target_reps_min = min(reps_values) if reps_values else None
            target_reps_max = max(reps_values) if reps_values else None

            weight_values = [ts.target_weight_kg for ts in ts_for_exercise if ts.target_weight_kg is not None]
            target_weight_kg_min = min(weight_values) if weight_values else None
            target_weight_kg_max = max(weight_values) if weight_values else None

            if sets_count is not None:
                any_target_sets = True
                total_sets_for_duration += sets_count

            exercise_items.append(
                NextWorkoutExerciseItem(
                    name=ex.name,
                    muscle_groups=list(ex.primary_muscle_groups),
                    order_index=workout_exercise.order_index,
                    sets_count=sets_count,
                    target_reps_min=target_reps_min,
                    target_reps_max=target_reps_max,
                    target_weight_kg_min=target_weight_kg_min,
                    target_weight_kg_max=target_weight_kg_max,
                )
            )

        exercise_items.sort(key=lambda item: item.order_index)

        estimated_duration_minutes = (
            total_sets_for_duration * MINUTES_PER_SET if any_target_sets else None
        )

        return NextWorkoutResponse(
            id=workout.id,
            title=workout.title,
            planned_for=workout.planned_for,
            estimated_duration_minutes=estimated_duration_minutes,
            exercises_count=len(exercise_items),
            muscle_groups=muscle_groups_aggregated,
            exercises=exercise_items,
        )


workout_service = WorkoutService()
