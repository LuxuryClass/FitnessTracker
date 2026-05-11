import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from uuid import uuid4
from datetime import datetime, timezone
from decimal import Decimal

from app.services.workout_session_service import workout_session_service
from app.schemas.workout_session import WorkoutSessionStartRequest, WorkoutSessionSetUpsertRequest
from app.core.exceptions import BadRequestException, NotFoundException
from tests.conftest import create_mock_workout_session, create_mock_workout_session_set, create_mock_workout_exercise

@pytest.mark.asyncio
async def test_start_session_success(mock_db_session, mock_user):
    """
    Успешный старт новой сессии для тренировки.
    Активных сессий нет → создаётся новая, возвращается её id.
    """
    workout_id = uuid4()
    workout = MagicMock()
    workout.id = workout_id
    session = create_mock_workout_session({"id": uuid4(), "user_id": mock_user.id, "workout_id": workout_id})

    with patch("app.services.workout_session_service.workout_repository") as w_repo, \
         patch("app.services.workout_session_service.workout_session_repository") as s_repo, \
         patch("app.services.workout_session_service.workout_session_set_repository") as set_repo, \
         patch("app.services.workout_session_service.workout_exercise_repository") as we_repo:
        w_repo.get_by_id_for_user = AsyncMock(return_value=workout)
        s_repo.get_active_by_user_id = AsyncMock(return_value=None)
        s_repo.create = AsyncMock(return_value=session)
        set_repo.list_by_session_id = AsyncMock(return_value=[])
        we_repo.list_by_workout_id = AsyncMock(return_value=[])

        result = await workout_session_service.start_session(
            db=mock_db_session,
            current_user=mock_user,
            payload=WorkoutSessionStartRequest(workout_id=workout_id),
        )

    assert result.id == session.id
    s_repo.create.assert_awaited_once_with(db=mock_db_session, user_id=mock_user.id, workout_id=workout_id)

@pytest.mark.asyncio
async def test_start_session_already_active_same_workout(mock_db_session, mock_user):
    """
    Повторный старт той же тренировки при уже активной сессии → возвращается существующая сессия.
    """
    workout_id = uuid4()
    workout = MagicMock()
    workout.id = workout_id
    active = create_mock_workout_session({"workout_id": workout_id})

    with patch("app.services.workout_session_service.workout_repository") as w_repo, \
         patch("app.services.workout_session_service.workout_session_repository") as s_repo, \
         patch("app.services.workout_session_service.workout_session_set_repository") as set_repo, \
         patch("app.services.workout_session_service.workout_exercise_repository") as we_repo:
        w_repo.get_by_id_for_user = AsyncMock(return_value=workout)
        s_repo.get_active_by_user_id = AsyncMock(return_value=active)
        set_repo.list_by_session_id = AsyncMock(return_value=[])
        we_repo.list_by_workout_id = AsyncMock(return_value=[])

        result = await workout_session_service.start_session(
            db=mock_db_session,
            current_user=mock_user,
            payload=WorkoutSessionStartRequest(workout_id=workout_id),
        )
    assert result.id == active.id

@pytest.mark.asyncio
async def test_start_session_another_active_conflict(mock_db_session, mock_user):
    """
    Попытка начать другую тренировку при уже активной сессии → BadRequestException.
    """
    active = create_mock_workout_session({"workout_id": uuid4()})  # другая тренировка
    with patch("app.services.workout_session_service.workout_repository") as w_repo, \
         patch("app.services.workout_session_service.workout_session_repository") as s_repo:
        w_repo.get_by_id_for_user = AsyncMock(return_value=MagicMock())
        s_repo.get_active_by_user_id = AsyncMock(return_value=active)
        with pytest.raises(BadRequestException):
            await workout_session_service.start_session(
                db=mock_db_session,
                current_user=mock_user,
                payload=WorkoutSessionStartRequest(workout_id=uuid4()),
            )

@pytest.mark.asyncio
async def test_upsert_set_new_set(mock_db_session, mock_user):
    """
    Добавление нового подхода в активную сессию.
    Подход с данным set_index не существует → создаётся новый.
    """
    session_id = uuid4()
    session = create_mock_workout_session({"id": session_id, "status": "in_progress", "workout_id": uuid4()})
    exercise_id = uuid4()
    payload = WorkoutSessionSetUpsertRequest(
        exercise_id=exercise_id,
        client_event_id=uuid4(),
        set_index=1,
        weight_kg=50.0,
        reps=10
    )
    with patch("app.services.workout_session_service.workout_session_repository") as s_repo, \
         patch("app.services.workout_session_service.workout_exercise_repository") as we_repo, \
         patch("app.services.workout_session_service.workout_session_set_repository") as set_repo:
        s_repo.get_by_id_for_user = AsyncMock(return_value=session)
        we_repo.list_by_workout_id = AsyncMock(return_value=[create_mock_workout_exercise(exercise_id, 1)])
        set_repo.get_by_session_and_client_event_id = AsyncMock(return_value=None)
        set_repo.get_by_session_exercise_set_index = AsyncMock(return_value=None)
        created_set = create_mock_workout_session_set({"session_id": session_id, "exercise_id": exercise_id})
        set_repo.create = AsyncMock(return_value=created_set)

        result = await workout_session_service.upsert_session_set(
            db=mock_db_session,
            current_user=mock_user,
            session_id=session_id,
            payload=payload,
        )
    assert result.id == created_set.id
    set_repo.create.assert_awaited_once()

@pytest.mark.asyncio
async def test_upsert_set_completed_session_error(mock_db_session, mock_user):
    """
    Попытка добавить подход в завершённую сессию → BadRequestException.
    """
    session = create_mock_workout_session({"status": "completed"})
    with patch("app.services.workout_session_service.workout_session_repository") as s_repo:
        s_repo.get_by_id_for_user = AsyncMock(return_value=session)
        with pytest.raises(BadRequestException):
            await workout_session_service.upsert_session_set(
                db=mock_db_session,
                current_user=mock_user,
                session_id=uuid4(),
                payload=WorkoutSessionSetUpsertRequest(
                    exercise_id=uuid4(), client_event_id=uuid4(),
                    set_index=1, weight_kg=50, reps=10
                )
            )

@pytest.mark.asyncio
async def test_complete_session_success(mock_db_session, mock_user):
    """
    Успешное завершение сессии: статус меняется на completed, пересчитываются метрики пользователя.
    Проверяется, что complete и commit вызваны.
    """
    session = create_mock_workout_session({"id": uuid4(), "status": "in_progress", "workout_id": uuid4()})
    with patch("app.services.workout_session_service.workout_session_repository") as s_repo, \
         patch("app.services.workout_session_service.workout_session_set_repository") as set_repo, \
         patch("app.services.workout_session_service.workout_exercise_repository") as we_repo, \
         patch("app.services.workout_session_service.user_repository") as u_repo:
        set_repo.calculate_weekly_volume_tons = AsyncMock(return_value=Decimal("0"))
        s_repo.get_by_id_for_user = AsyncMock(return_value=session)
        s_repo.complete = AsyncMock(return_value=session)
        s_repo.list_completed_week_starts = AsyncMock(return_value=[])
        u_repo.update_metrics = AsyncMock()
        set_repo.list_by_session_id = AsyncMock(return_value=[])
        we_repo.list_by_workout_id = AsyncMock(return_value=[])

        result = await workout_session_service.complete_session(
            db=mock_db_session,
            current_user=mock_user,
            session_id=session.id,
        )
    s_repo.complete.assert_awaited_once()
    mock_db_session.commit.assert_awaited_once()