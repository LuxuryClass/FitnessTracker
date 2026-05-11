import pytest
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4
from datetime import datetime, date, timezone
from decimal import Decimal
from app.schemas.user import WeeklySessionsProgress 

@pytest.fixture
def mock_db_session():
    """Асинхронная сессия БД с замоканными методами commit, refresh, rollback."""
    session = AsyncMock()
    session.commit = AsyncMock()
    session.refresh = AsyncMock()
    session.rollback = AsyncMock()
    return session

@pytest.fixture
def mock_redis():
    """Мок Redis-клиента с поддержкой set."""
    redis = AsyncMock()
    redis.set = AsyncMock(return_value=True)
    return redis

@pytest.fixture
def mock_user():
    """Базовый пользователь с полным набором полей, валидных для User модели."""
    user = MagicMock()
    user.id = uuid4()
    user.email = "test@example.com"
    user.name = "testuser"
    user.password_hash = "hashed_password"
    user.is_active = True
    user.gender = None
    user.birth_date = None
    user.height = None
    user.weight = None
    user.avatar_url = None
    user.streak_weeks = 0
    user.weekly_volume_tons = 0.0
    user.created_at = datetime.now(timezone.utc)
    user.updated_at = datetime.now(timezone.utc)
    return user

def create_mock_exercise(overrides=None):
    """Создаёт MagicMock с полями, необходимыми для ExerciseResponse."""
    data = {
        "id": uuid4(),
        "created_by_user_id": uuid4(),
        "name": "Default Exercise",
        "description": "Default desc",
        "muscle_groups": ["arms"],
        "equipment": "dumbbells",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    if overrides:
        data.update(overrides)
    mock = MagicMock()
    for k, v in data.items():
        setattr(mock, k, v)
    return mock

def create_mock_workout(overrides=None):
    """Создаёт мок тренировки, валидный для WorkoutResponse."""
    data = {
        "id": uuid4(),
        "user_id": uuid4(),
        "title": "Test Workout",
        "is_planned": False,
        "planned_for": None,
        "description": "Test description",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    if overrides:
        data.update(overrides)
    mock = MagicMock()
    for k, v in data.items():
        setattr(mock, k, v)
    return mock

def create_mock_workout_exercise(exercise_id, order_index):
    """Мок связи WorkoutExercise с exercise_id и order_index."""
    mock = MagicMock()
    mock.exercise_id = exercise_id
    mock.order_index = order_index
    return mock

def create_mock_workout_session(overrides=None):
    """Мок тренировочной сессии для WorkoutSessionResponse."""
    data = {
        "id": uuid4(),
        "user_id": uuid4(),
        "workout_id": uuid4(),
        "status": "in_progress",
        "started_at": datetime.now(timezone.utc),
        "completed_at": None,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    if overrides:
        data.update(overrides)
    mock = MagicMock()
    for k, v in data.items():
        setattr(mock, k, v)
    return mock

def create_mock_workout_session_set(overrides=None):
    """Мок подхода (WorkoutSessionSet) для ответа."""
    data = {
        "id": uuid4(),
        "session_id": uuid4(),
        "exercise_id": uuid4(),
        "client_event_id": uuid4(),
        "set_index": 1,
        "weight_kg": 60.0,
        "reps": 8,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    if overrides:
        data.update(overrides)
    mock = MagicMock()
    for k, v in data.items():
        setattr(mock, k, v)
    return mock

def create_mock_user_response():
    """Мок UserResponse с настоящим WeeklySessionsProgress для прохождения валидации Pydantic."""
    mock = MagicMock()
    mock.id = uuid4()
    mock.email = "test@example.com"
    mock.name = "testuser"
    mock.gender = None
    mock.birth_date = date.today()
    mock.height = None
    mock.weight = None
    mock.avatar_url = None
    mock.is_active = True
    mock.streak_weeks = 0
    mock.weekly_volume_tons = Decimal("0.0")
    # Вместо MagicMock используем реальный объект схемы
    mock.weekly_sessions_progress = WeeklySessionsProgress(completed=0, total=0)
    mock.created_at = datetime.now(timezone.utc)
    mock.updated_at = datetime.now(timezone.utc)
    return mock
