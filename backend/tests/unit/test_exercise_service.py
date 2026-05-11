import pytest
from unittest.mock import patch, AsyncMock
from uuid import uuid4
from sqlalchemy.exc import IntegrityError

from app.services.exercise_service import exercise_service
from app.schemas.exercise import ExerciseCreateRequest, ExerciseUpdateRequest
from app.core.exceptions import AlreadyExistsException, ForbiddenException, NotFoundException, BadRequestException
from tests.conftest import create_mock_exercise

@pytest.mark.asyncio
async def test_list_exercises_success(mock_db_session, mock_user):
    """
    Получение списка пользовательских упражнений.
    Репозиторий возвращает одно упражнение, принадлежащее пользователю.
    Проверяется, что длина списка = 1 и вызов list_by_owner сделан с правильным user_id.
    """
    mock_ex = create_mock_exercise({"created_by_user_id": mock_user.id})
    with patch("app.services.exercise_service.exercise_repository") as mock_repo:
        mock_repo.list_by_owner = AsyncMock(return_value=[mock_ex])
        result = await exercise_service.list_exercises(db=mock_db_session, current_user=mock_user)
    assert len(result) == 1
    mock_repo.list_by_owner.assert_awaited_once_with(mock_db_session, mock_user.id)

@pytest.mark.asyncio
async def test_list_system_exercises_success(mock_db_session):
    """
    Получение системных упражнений (created_by_user_id = None).
    Ожидается один элемент, list_system вызван с сессией.
    """
    mock_ex = create_mock_exercise({"created_by_user_id": None})
    with patch("app.services.exercise_service.exercise_repository") as mock_repo:
        mock_repo.list_system = AsyncMock(return_value=[mock_ex])
        result = await exercise_service.list_system_exercises(db=mock_db_session)
    assert len(result) == 1
    mock_repo.list_system.assert_awaited_once_with(mock_db_session)

@pytest.mark.asyncio
async def test_get_exercise_success(mock_db_session, mock_user):
    """
    Получение конкретного упражнения, принадлежащего текущему пользователю.
    Успех: возвращается ExerciseResponse с верным id.
    """
    exercise_id = uuid4()
    mock_ex = create_mock_exercise({"id": exercise_id, "created_by_user_id": mock_user.id})
    with patch("app.services.exercise_service.exercise_repository") as mock_repo:
        mock_repo.get_by_id = AsyncMock(return_value=mock_ex)
        result = await exercise_service.get_exercise(db=mock_db_session, current_user=mock_user, exercise_id=exercise_id)
    assert result.id == exercise_id

@pytest.mark.asyncio
async def test_get_exercise_foreign_forbidden(mock_db_session, mock_user):
    """
    Попытка получить чужое упражнение → ForbiddenException.
    created_by_user_id отличается от id текущего пользователя.
    """
    exercise_id = uuid4()
    foreign_ex = create_mock_exercise({"id": exercise_id, "created_by_user_id": uuid4()})  # другой пользователь
    with patch("app.services.exercise_service.exercise_repository") as mock_repo:
        mock_repo.get_by_id = AsyncMock(return_value=foreign_ex)
        with pytest.raises(ForbiddenException):
            await exercise_service.get_exercise(db=mock_db_session, current_user=mock_user, exercise_id=exercise_id)

@pytest.mark.asyncio
async def test_get_exercise_not_found(mock_db_session, mock_user):
    """
    Упражнение не найдено → NotFoundException.
    """
    with patch("app.services.exercise_service.exercise_repository") as mock_repo:
        mock_repo.get_by_id = AsyncMock(return_value=None)
        with pytest.raises(NotFoundException):
            await exercise_service.get_exercise(db=mock_db_session, current_user=mock_user, exercise_id=uuid4())

@pytest.mark.asyncio
async def test_create_exercise_success(mock_db_session, mock_user):
    """
    Успешное создание упражнения с уникальным именем.
    Проверка конфликта имени возвращает None, репозиторий создаёт запись, commit/refresh выполняется.
    """
    payload = ExerciseCreateRequest(name="New Exercise", description="Some desc", muscle_groups=["arms"], equipment="dumbbells")
    new_ex = create_mock_exercise({"name": payload.name, "created_by_user_id": mock_user.id})
    with patch("app.services.exercise_service.exercise_repository") as mock_repo:
        mock_repo.get_user_exercise_by_name = AsyncMock(return_value=None)
        mock_repo.create = AsyncMock(return_value=new_ex)
        result = await exercise_service.create_exercise(db=mock_db_session, current_user=mock_user, payload=payload)
    assert result.name == payload.name
    mock_repo.create.assert_awaited_once()
    mock_db_session.commit.assert_awaited_once()

@pytest.mark.asyncio
async def test_create_exercise_name_conflict(mock_db_session, mock_user):
    """
    Создание с уже существующим именем → AlreadyExistsException.
    get_user_exercise_by_name возвращает существующее упражнение.
    """
    payload = ExerciseCreateRequest(name="Duplicate", muscle_groups=["legs"], equipment="barbell")
    with patch("app.services.exercise_service.exercise_repository") as mock_repo:
        mock_repo.get_user_exercise_by_name = AsyncMock(return_value=create_mock_exercise())
        with pytest.raises(AlreadyExistsException):
            await exercise_service.create_exercise(db=mock_db_session, current_user=mock_user, payload=payload)

@pytest.mark.asyncio
async def test_update_exercise_success(mock_db_session, mock_user):
    """
    Обновление названия своего упражнения, новое имя уникально.
    Репозиторий update вызван, commit выполнен.
    """
    exercise_id = uuid4()
    old_ex = create_mock_exercise({"id": exercise_id, "created_by_user_id": mock_user.id, "name": "Old"})
    payload = ExerciseUpdateRequest(name="New Name")
    with patch("app.services.exercise_service.exercise_repository") as mock_repo:
        mock_repo.get_by_id = AsyncMock(return_value=old_ex)
        mock_repo.get_user_exercise_by_name = AsyncMock(return_value=None)
        mock_repo.update = AsyncMock(return_value=old_ex)
        result = await exercise_service.update_exercise(db=mock_db_session, current_user=mock_user, exercise_id=exercise_id, payload=payload)
    mock_repo.update.assert_awaited_once()
    mock_db_session.commit.assert_awaited_once()

@pytest.mark.asyncio
async def test_update_exercise_name_conflict(mock_db_session, mock_user):
    """
    Обновление имени на уже занятое другим упражнением → AlreadyExistsException.
    """
    exercise_id = uuid4()
    old_ex = create_mock_exercise({"id": exercise_id, "created_by_user_id": mock_user.id, "name": "Old"})
    conflict_ex = create_mock_exercise({"id": uuid4()})  # другой id
    payload = ExerciseUpdateRequest(name="Conflict")
    with patch("app.services.exercise_service.exercise_repository") as mock_repo:
        mock_repo.get_by_id = AsyncMock(return_value=old_ex)
        mock_repo.get_user_exercise_by_name = AsyncMock(return_value=conflict_ex)
        with pytest.raises(AlreadyExistsException):
            await exercise_service.update_exercise(db=mock_db_session, current_user=mock_user, exercise_id=exercise_id, payload=payload)

@pytest.mark.asyncio
async def test_delete_exercise_success(mock_db_session, mock_user):
    """
    Удаление собственного упражнения, не связанного с тренировками.
    Репозиторий delete вызван, commit выполнен.
    """
    exercise_id = uuid4()
    mock_ex = create_mock_exercise({"id": exercise_id, "created_by_user_id": mock_user.id})
    with patch("app.services.exercise_service.exercise_repository") as mock_repo:
        mock_repo.get_by_id = AsyncMock(return_value=mock_ex)
        mock_repo.delete = AsyncMock()
        await exercise_service.delete_exercise(db=mock_db_session, current_user=mock_user, exercise_id=exercise_id)
    mock_repo.delete.assert_awaited_once_with(mock_db_session, mock_ex)
    mock_db_session.commit.assert_awaited_once()

@pytest.mark.asyncio
async def test_delete_exercise_integrity_error(mock_db_session, mock_user):
    """
    Удаление упражнения, на которое есть ссылки (IntegrityError) → BadRequestException.
    Транзакция откатывается.
    """
    exercise_id = uuid4()
    mock_ex = create_mock_exercise({"id": exercise_id, "created_by_user_id": mock_user.id})
    with patch("app.services.exercise_service.exercise_repository") as mock_repo:
        mock_repo.get_by_id = AsyncMock(return_value=mock_ex)
        mock_repo.delete = AsyncMock(side_effect=IntegrityError("fake", {}, BaseException()))
        with pytest.raises(BadRequestException):
            await exercise_service.delete_exercise(db=mock_db_session, current_user=mock_user, exercise_id=exercise_id)
    mock_db_session.rollback.assert_awaited_once()