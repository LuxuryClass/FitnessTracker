from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestException, NotFoundException
from app.models.user import User
from app.models.workout import Workout
from app.models.workout_exercise import WorkoutExercise
from app.models.workout_session import WorkoutSession
from app.models.workout_session_set import WorkoutSessionSet
from app.repositories import (
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

    async def start_session(
        self,
        db: AsyncSession,
        current_user: User,
        payload: WorkoutSessionStartRequest,
    ) -> WorkoutSessionResponse:
        workout = await self._get_workout_for_user_or_raise(db, current_user, payload.workout_id)
        # Сохраняем идентификаторы в локальные переменные до commit/rollback: после rollback
        # ORM-объекты истекают, и обращение к current_user.id/workout.id вызвало бы синхронную
        # подгрузку атрибута, недопустимую в async-сессии (MissingGreenlet).
        user_id = current_user.id
        workout_id = workout.id

        active_session = await workout_session_repository.get_active_by_user_id(db, user_id)

        if active_session is not None:
            if active_session.workout_id != workout_id:
                raise BadRequestException(
                    "У вас уже есть активная сессия другой тренировки. Завершите её перед запуском новой."
                )
            return await self._build_session_response(db, active_session)

        completed_workout_ids = await workout_session_repository.list_completed_workout_ids(db, [workout_id])
        if workout_id in completed_workout_ids:
            raise BadRequestException("Эта тренировка уже завершена. Повторный запуск недоступен.")

        try:
            session = await workout_session_repository.create(
                db=db,
                user_id=user_id,
                workout_id=workout_id,
            )
            await db.commit()
        except IntegrityError:
            # Гонка двойного старта (например, повторный маунт страницы в dev/StrictMode):
            # параллельный запрос успел создать активную сессию, и уникальный констрейнт
            # uq_workout_sessions_one_active_per_user отклонил вставку.
            # Откатываемся и возвращаем уже существующую активную сессию (идемпотентный старт).
            await db.rollback()
            active_session = await workout_session_repository.get_active_by_user_id(db, user_id)
            if active_session is None:
                raise
            return await self._build_session_response(db, active_session)

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

    async def get_completed_session_by_workout(
        self,
        db: AsyncSession,
        current_user: User,
        workout_id: UUID,
    ) -> WorkoutSessionResponse | None:
        await self._get_workout_for_user_or_raise(db, current_user, workout_id)
        session = await workout_session_repository.get_completed_by_workout_id(
            db, workout_id, current_user.id
        )
        if session is None:
            return None
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

    async def delete_session_set(
        self,
        db: AsyncSession,
        current_user: User,
        session_id: UUID,
        set_id: UUID,
    ) -> None:
        session = await self._get_session_for_user_or_raise(db, current_user, session_id)
        if session.status != "in_progress":
            raise BadRequestException("Нельзя изменять подходы в завершённой сессии.")

        session_set = await workout_session_set_repository.get_by_id_for_session(
            db=db,
            session_id=session.id,
            set_id=set_id,
        )
        if session_set is None:
            raise NotFoundException("Подход не найден.")

        await workout_session_set_repository.delete(db=db, session_set=session_set)
        await db.commit()

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
        await db.commit()
        await db.refresh(session)
        return await self._build_session_response(db, session)


workout_session_service = WorkoutSessionService()
