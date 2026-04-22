"""Фикстуры тестов будут добавлены позже."""
import pytest
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4
import pytest
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

@pytest.fixture
def mock_db_session():
    """Мок асинхронной сессии SQLAlchemy"""
    session = AsyncMock()
    session.commit = AsyncMock()
    session.refresh = AsyncMock()
    return session

@pytest.fixture
def mock_redis():
    """Мок Redis клиента"""
    redis = AsyncMock()
    redis.set = AsyncMock(return_value=True)
    return redis

@pytest.fixture
def mock_user():
    """Стандартный мок пользователя"""
    user = MagicMock()
    user.id = uuid4()
    user.email = "test@example.com"
    user.username = "testuser"
    user.password_hash = "hashed_password"
    user.is_active = True
    return user
