"""
Тесты для конфигурации (core/config.py).
Проверяем загрузку значений по умолчанию, из переменных окружения и свойства.
"""

from app.core.config import Settings

def test_default_values():
    s = Settings()
    assert s.app_name == "API планировщика тренировок"
    assert s.api_prefix == "/api"
    assert s.jwt_algorithm == "HS256"
    assert s.access_token_expire_minutes == 15
    assert s.refresh_token_expire_days == 7
    assert s.backend_cors_origins == []

def test_async_database_url_replaces_scheme():
    s = Settings(database_url="postgresql://user:pass@localhost/db")
    assert s.async_database_url == "postgresql+asyncpg://user:pass@localhost/db"

def test_async_database_url_unchanged_if_already_async():
    s = Settings(database_url="postgresql+asyncpg://user:pass@localhost/db")
    assert s.async_database_url == "postgresql+asyncpg://user:pass@localhost/db"

def test_parsed_cors_origins_from_list():
    s = Settings(backend_cors_origins=["http://localhost:3000"])
    assert s.parsed_cors_origins == ["http://localhost:3000"]

def test_parsed_cors_origins_empty():
    s = Settings(backend_cors_origins=[])
    assert s.parsed_cors_origins == []