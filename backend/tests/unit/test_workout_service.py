import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from uuid import uuid4
from datetime import datetime, timezone

from app.services.workout_service import workout_service
from app.schemas.workout import WorkoutCreateRequest, WorkoutUpdateRequest, WorkoutExerciseCreateItem
from app.core.exceptions import NotFoundException, ForbiddenException, BadRequestException
from tests.conftest import create_mock_workout, create_mock_workout_exercise, create_mock_exercise

@pytest.mark.asyncio
async def test_list_workouts_success(mock_db_session, mock_user):
    """
    Получение списка тренировок с группировкой упражнений.
    Одна тренировка с одним упражнением. Проверяется, что список не пуст и id тренировки совпадает.
    """
    w = create_mock_workout({"user_id": mock_user.id})
    we = create_mock_workout_exercise(uuid4(), 1)
    with patch("app.services.workout_service.workout_repository") as w_repo, \
         patch("app.services.workout_service.workout_exercise_repository") as we_repo:
        w_repo.list_by_user_id = AsyncMock(return_value=[w])
        we_repo.list_by_workout_ids = AsyncMock(return_value=[we])
        result = await workout_service.list_workouts(db=mock_db_session, current_user=mock_user)
    assert len(result) == 1
    assert result[0].id == w.id

@pytest.mark.asyncio
async def test_get_workout_success(mock_db_session, mock_user):
    """
    Получение конкретной тренировки по ID, принадлежащей пользователю.
    Возвращается ответ с корректным id.
    """
    w = create_mock_workout({"id": uuid4(), "user_id": mock_user.id})
    we = create_mock_workout_exercise(uuid4(), 1)
    with patch("app.services.workout_service.workout_repository") as w_repo, \
         patch("app.services.workout_service.workout_exercise_repository") as we_repo:
        w_repo.get_by_id_for_user = AsyncMock(return_value=w)
        we_repo.list_by_workout_id = AsyncMock(return_value=[we])
        result = await workout_service.get_workout(db=mock_db_session, current_user=mock_user, workout_id=w.id)
    assert result.id == w.id

@pytest.mark.asyncio
async def test_create_workout_success(mock_db_session, mock_user):
    """
    Создание плановой тренировки с двумя упражнениями (системным и своим).
    Проверяется, что репозитории create и create_many вызваны, id ответа совпадает.
    """
    eid1, eid2 = uuid4(), uuid4()
    payload = WorkoutCreateRequest(
        title="Planned workout",
        is_planned=True,
        planned_for=datetime(2025, 1, 1, tzinfo=timezone.utc),
        exercises=[WorkoutExerciseCreateItem(exercise_id=eid) for eid in (eid1, eid2)]
    )
    mock_workout = create_mock_workout({"user_id": mock_user.id})
    mock_ex1 = create_mock_exercise({"id": eid1, "created_by_user_id": None})  # системное
    mock_ex2 = create_mock_exercise({"id": eid2, "created_by_user_id": mock_user.id})  # своё
    mock_we = [create_mock_workout_exercise(eid1, 1), create_mock_workout_exercise(eid2, 2)]

    with patch("app.services.workout_service.exercise_repository") as e_repo, \
         patch("app.services.workout_service.workout_repository") as w_repo, \
         patch("app.services.workout_service.workout_exercise_repository") as we_repo:
        e_repo.get_by_ids = AsyncMock(return_value=[mock_ex1, mock_ex2])
        w_repo.create = AsyncMock(return_value=mock_workout)
        we_repo.create_many = AsyncMock(return_value=mock_we)

        result = await workout_service.create_workout(db=mock_db_session, current_user=mock_user, payload=payload)

    assert result.id == mock_workout.id
    w_repo.create.assert_awaited_once()
    we_repo.create_many.assert_awaited_once()

@pytest.mark.asyncio
async def test_create_workout_foreign_exercise_forbidden(mock_db_session, mock_user):
    """
    Создание тренировки с чужим пользовательским упражнением → ForbiddenException.
    """
    foreign_eid = uuid4()
    payload = WorkoutCreateRequest(
        title="Fail", is_planned=False,
        exercises=[WorkoutExerciseCreateItem(exercise_id=foreign_eid)]
    )
    foreign_ex = create_mock_exercise({"id": foreign_eid, "created_by_user_id": uuid4()})  # чужое
    with patch("app.services.workout_service.exercise_repository") as e_repo:
        e_repo.get_by_ids = AsyncMock(return_value=[foreign_ex])
        with pytest.raises(ForbiddenException):
            await workout_service.create_workout(db=mock_db_session, current_user=mock_user, payload=payload)

@pytest.mark.asyncio
async def test_update_workout_exercises_success(mock_db_session, mock_user):
    """
    Обновление списка упражнений: старые удаляются, новые создаются.
    Проверяется, что delete_by_workout_id и create_many вызваны с нужными параметрами.
    """
    w = create_mock_workout({"id": uuid4(), "user_id": mock_user.id, "is_planned": False, "planned_for": None})
    new_eid = uuid4()
    payload = WorkoutUpdateRequest(exercises=[WorkoutExerciseCreateItem(exercise_id=new_eid)])
    mock_ex = create_mock_exercise({"id": new_eid, "created_by_user_id": mock_user.id})
    with patch("app.services.workout_service.workout_repository") as w_repo, \
         patch("app.services.workout_service.exercise_repository") as e_repo, \
         patch("app.services.workout_service.workout_exercise_repository") as we_repo:
        w_repo.get_by_id_for_user = AsyncMock(return_value=w)
        e_repo.get_by_ids = AsyncMock(return_value=[mock_ex])
        we_repo.delete_by_workout_id = AsyncMock()
        we_repo.create_many = AsyncMock()
        we_repo.list_by_workout_id = AsyncMock(return_value=[])  # для ответа после обновления

        result = await workout_service.update_workout(db=mock_db_session, current_user=mock_user, workout_id=w.id, payload=payload)
    we_repo.delete_by_workout_id.assert_awaited_once_with(mock_db_session, w.id)
    we_repo.create_many.assert_awaited_once()

@pytest.mark.asyncio
async def test_delete_workout_success(mock_db_session, mock_user):
    """
    Удаление своей тренировки: репозиторий delete вызван, commit выполнен.
    """
    w = create_mock_workout({"id": uuid4(), "user_id": mock_user.id})
    with patch("app.services.workout_service.workout_repository") as w_repo:
        w_repo.get_by_id_for_user = AsyncMock(return_value=w)
        w_repo.delete = AsyncMock()
        await workout_service.delete_workout(db=mock_db_session, current_user=mock_user, workout_id=w.id)
    w_repo.delete.assert_awaited_once_with(mock_db_session, w)
    mock_db_session.commit.assert_awaited_once()