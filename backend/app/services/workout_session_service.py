from __future__ import annotations

from datetime import datetime, time, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestException, NotFoundException
from app.models.user import User
from app.models.workout import Workout
from app.models.workout_exercise import WorkoutExercise
from app.models.workout_session import WorkoutSession
from app.models.workout_session_set import WorkoutSessionSet
from app.repositories import (
    user_repository,
    workout_exercise_repository,
    workout_repository,
    workout_session_repository,
    workout_session_set_repository,
)
from app.schemas.workout_session import (
    WorkoutSessionResponse,
    WorkoutSessionSetResponse,
    WorkoutSessionSetUpsertRequest,
    WorkoutSessionStartRequest,
)


class WorkoutSessionService:
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

    async def _get_session_for_user_or_raise(
        self,
        db: AsyncSession,
        current_user: User,
        session_id: UUID,
    ) -> WorkoutSession:
        session = await workout_session_repository.get_by_id_for_user(db, session_id, current_user.id)
        if session is None:
            raise NotFoundException("Тренировочная сессия не найдена.")
        return session

    @staticmethod
    def _build_set_response(session_set: WorkoutSessionSet) -> WorkoutSessionSetResponse:
        return WorkoutSessionSetResponse(
            id=session_set.id,
            session_id=session_set.session_id,
            exercise_id=session_set.exercise_id,
            client_event_id=session_set.client_event_id,
            set_index=session_set.set_index,
            weight_kg=session_set.weight_kg,
            reps=session_set.reps,
            created_at=session_set.created_at,
            updated_at=session_set.updated_at,
        )

    async def _build_session_response(self, db: AsyncSession, session: WorkoutSession) -> WorkoutSessionResponse:
        session_sets = await workout_session_set_repository.list_by_session_id(db, session.id)
        workout_exercises = await workout_exercise_repository.list_by_workout_id(db, session.workout_id)
        exercise_order_map = {
            workout_exercise.exercise_id: workout_exercise.order_index for workout_exercise in workout_exercises
        }
        sorted_sets = sorted(
            session_sets,
            key=lambda item: (exercise_order_map.get(item.exercise_id, 10**9), item.set_index, item.created_at),
        )
        return WorkoutSessionResponse(
            id=session.id,
            user_id=session.user_id,
            workout_id=session.workout_id,
            status=session.status,
            started_at=session.started_at,
            completed_at=session.completed_at,
            created_at=session.created_at,
            updated_at=session.updated_at,
            sets=[self._build_set_response(session_set) for session_set in sorted_sets],
        )

    async def _validate_exercise_in_workout(self, db: AsyncSession, workout_id: UUID, exercise_id: UUID) -> None:
        workout_exercises = await workout_exercise_repository.list_by_workout_id(db, workout_id)
        allowed_exercise_ids = {workout_exercise.exercise_id for workout_exercise in workout_exercises}
        if exercise_id not in allowed_exercise_ids:
            raise BadRequestException("Упражнение не входит в состав выбранной тренировки.")

    async def _update_user_metrics_on_complete(
        self,
        db: AsyncSession,
        current_user: User,
    ) -> None:
        now_utc = datetime.now(timezone.utc)
        current_week_start_date = now_utc.date() - timedelta(days=now_utc.weekday())
        current_week_start = datetime.combine(current_week_start_date, time.min, tzinfo=timezone.utc)
        next_week_start = current_week_start + timedelta(days=7)

        weekly_volume_tons = await workout_session_set_repository.calculate_weekly_volume_tons(
            db=db,
            user_id=current_user.id,
            week_start=current_week_start,
            week_end=next_week_start,
        )
        weekly_volume_tons = weekly_volume_tons.quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)

        completed_week_starts = await workout_session_repository.list_completed_week_starts(db, current_user.id)
        completed_week_start_dates = {week_start.date() for week_start in completed_week_starts}

        streak_weeks = 0
        check_week = current_week_start.date()
        while check_week in completed_week_start_dates:
            streak_weeks += 1
            check_week -= timedelta(days=7)

        await user_repository.update_metrics(
            db=db,
            user=current_user,
            streak_weeks=streak_weeks,
            weekly_volume_tons=weekly_volume_tons,
        )

    async def start_session(
        self,
        db: AsyncSession,
        current_user: User,
        payload: WorkoutSessionStartRequest,
    ) -> WorkoutSessionResponse:
        workout = await self._get_workout_for_user_or_raise(db, current_user, payload.workout_id)
        active_session = await workout_session_repository.get_active_by_user_id(db, current_user.id)

        if active_session is not None:
            if active_session.workout_id != workout.id:
                raise BadRequestException(
                    "У вас уже есть активная сессия другой тренировки. Завершите её перед запуском новой."
                )
            return await self._build_session_response(db, active_session)

        session = await workout_session_repository.create(
            db=db,
            user_id=current_user.id,
            workout_id=workout.id,
        )
        await db.commit()
        await db.refresh(session)
        return await self._build_session_response(db, session)

    async def get_active_session(
        self,
        db: AsyncSession,
        current_user: User,
    ) -> WorkoutSessionResponse | None:
        session = await workout_session_repository.get_active_by_user_id(db, current_user.id)
        if session is None:
            return None
        return await self._build_session_response(db, session)

    async def get_session(
        self,
        db: AsyncSession,
        current_user: User,
        session_id: UUID,
    ) -> WorkoutSessionResponse:
        session = await self._get_session_for_user_or_raise(db, current_user, session_id)
        return await self._build_session_response(db, session)

    async def upsert_session_set(
        self,
        db: AsyncSession,
        current_user: User,
        session_id: UUID,
        payload: WorkoutSessionSetUpsertRequest,
    ) -> WorkoutSessionSetResponse:
        session = await self._get_session_for_user_or_raise(db, current_user, session_id)
        if session.status != "in_progress":
            raise BadRequestException("Нельзя добавлять подходы в завершённую сессию.")

        await self._validate_exercise_in_workout(db, session.workout_id, payload.exercise_id)

        existing_by_event = await workout_session_set_repository.get_by_session_and_client_event_id(
            db=db,
            session_id=session.id,
            client_event_id=payload.client_event_id,
        )
        if existing_by_event is not None:
            return self._build_set_response(existing_by_event)

        existing_set = await workout_session_set_repository.get_by_session_exercise_set_index(
            db=db,
            session_id=session.id,
            exercise_id=payload.exercise_id,
            set_index=payload.set_index,
        )
        if existing_set is None:
            session_set = await workout_session_set_repository.create(
                db=db,
                session_id=session.id,
                exercise_id=payload.exercise_id,
                client_event_id=payload.client_event_id,
                set_index=payload.set_index,
                weight_kg=payload.weight_kg,
                reps=payload.reps,
            )
        else:
            session_set = await workout_session_set_repository.update(
                db=db,
                session_set=existing_set,
                client_event_id=payload.client_event_id,
                weight_kg=payload.weight_kg,
                reps=payload.reps,
            )

        await db.commit()
        await db.refresh(session_set)
        return self._build_set_response(session_set)

    async def complete_session(
        self,
        db: AsyncSession,
        current_user: User,
        session_id: UUID,
    ) -> WorkoutSessionResponse:
        session = await self._get_session_for_user_or_raise(db, current_user, session_id)
        if session.status != "in_progress":
            raise BadRequestException("Эта сессия уже завершена.")

        completed_at = datetime.now(timezone.utc)
        session = await workout_session_repository.complete(db=db, session=session, completed_at=completed_at)
        await self._update_user_metrics_on_complete(db=db, current_user=current_user)
        await db.commit()
        await db.refresh(session)
        await db.refresh(current_user)
        return await self._build_session_response(db, session)


workout_session_service = WorkoutSessionService()
