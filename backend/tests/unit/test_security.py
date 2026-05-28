"""
Юнит-тесты для core/security.py.
Проверяем:
- хеширование/проверку паролей;
- генерацию и декодирование JWT;
- извлечение полей из payload;
- get_bearer_token и get_current_user (с мок-зависимостями).
"""

import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from uuid import uuid4
from datetime import timedelta
from jose import jwt
from fastapi.security import HTTPAuthorizationCredentials

from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    create_token_pair,
    decode_jwt_token,
    get_token_subject,
    get_token_type,
    get_token_jti,
    get_token_exp,
    ensure_token_type,
    get_bearer_token,
    get_current_user,
    ACCESS_TOKEN_TYPE,
    REFRESH_TOKEN_TYPE,
)
from app.core.exceptions import UnauthorizedException

# ---------- Хеширование паролей ----------

def test_hash_password_returns_string():
    result = hash_password("TestPassword123")
    assert isinstance(result, str)
    assert result.startswith("$2b$")  # bcrypt

def test_verify_password_correct():
    hashed = hash_password("MySecret")
    assert verify_password("MySecret", hashed) is True

def test_verify_password_incorrect():
    hashed = hash_password("MySecret")
    assert verify_password("Wrong", hashed) is False

def test_hash_password_empty_raises():
    with pytest.raises(ValueError, match="Пароль"):
        hash_password("")

def test_verify_password_empty_raises():
    with pytest.raises(ValueError, match="Пароль"):
        verify_password("", "hash")

def test_verify_password_empty_hash_raises():
    with pytest.raises(ValueError, match="Хеш пароля"):
        verify_password("pass", "")

# ---------- Генерация токенов ----------

def test_create_access_token_contains_expected_payload():
    user_id = uuid4()
    token = create_access_token(user_id)
    payload = jwt.decode(token, "change-this-secret-key-in-env", algorithms=["HS256"])
    assert payload["sub"] == str(user_id)
    assert payload["type"] == ACCESS_TOKEN_TYPE
    assert "jti" in payload
    assert "iat" in payload
    assert "exp" in payload
    assert payload["exp"] - payload["iat"] == 15 * 60  # access_token_expire_minutes = 15

def test_create_refresh_token_has_longer_expiry():
    user_id = uuid4()
    token = create_refresh_token(user_id)
    payload = jwt.decode(token, "change-this-secret-key-in-env", algorithms=["HS256"])
    assert payload["type"] == REFRESH_TOKEN_TYPE
    assert payload["exp"] - payload["iat"] == 7 * 24 * 60 * 60  # refresh_token_expire_days = 7

def test_create_token_pair_returns_both_tokens():
    user_id = uuid4()
    access, refresh = create_token_pair(user_id)
    access_payload = jwt.decode(access, "change-this-secret-key-in-env", algorithms=["HS256"])
    refresh_payload = jwt.decode(refresh, "change-this-secret-key-in-env", algorithms=["HS256"])
    assert access_payload["type"] == ACCESS_TOKEN_TYPE
    assert refresh_payload["type"] == REFRESH_TOKEN_TYPE

# ---------- decode_jwt_token ----------

def test_decode_valid_token():
    user_id = uuid4()
    token = create_access_token(user_id)
    payload = decode_jwt_token(token)
    assert payload["sub"] == str(user_id)

def test_decode_invalid_token_raises():
    with pytest.raises(UnauthorizedException):
        decode_jwt_token("invalid.token.here")

def test_decode_token_missing_sub_raises():
    # создаём токен с отсутствующим sub напрямую
    token = jwt.encode({"type": ACCESS_TOKEN_TYPE, "jti": "123", "exp": 9999999999}, "change-this-secret-key-in-env", algorithm="HS256")
    with pytest.raises(UnauthorizedException, match="отсутствует sub"):
        decode_jwt_token(token)

def test_decode_token_missing_type_raises():
    token = jwt.encode({"sub": str(uuid4()), "jti": "123", "exp": 9999999999}, "change-this-secret-key-in-env", algorithm="HS256")
    with pytest.raises(UnauthorizedException):
        decode_jwt_token(token)

# ---------- Извлечение полей ----------

def test_get_token_subject():
    payload = {"sub": "user-uuid", "type": ACCESS_TOKEN_TYPE, "jti": "jti", "exp": 9999}
    assert get_token_subject(payload) == "user-uuid"

def test_get_token_type():
    payload = {"sub": "uuid", "type": ACCESS_TOKEN_TYPE, "jti": "jti", "exp": 9999}
    assert get_token_type(payload) == ACCESS_TOKEN_TYPE

def test_ensure_token_type_ok():
    payload = {"sub": "uuid", "type": ACCESS_TOKEN_TYPE, "jti": "jti", "exp": 9999}
    ensure_token_type(payload, ACCESS_TOKEN_TYPE)  # не бросает исключения

def test_ensure_token_type_wrong_raises():
    payload = {"sub": "uuid", "type": REFRESH_TOKEN_TYPE, "jti": "jti", "exp": 9999}
    with pytest.raises(UnauthorizedException):
        ensure_token_type(payload, ACCESS_TOKEN_TYPE)

# ---------- get_bearer_token ----------

@pytest.mark.asyncio
async def test_get_bearer_token_success():
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials="token123")
    token = await get_bearer_token(credentials=creds)
    assert token == "token123"

@pytest.mark.asyncio
async def test_get_bearer_token_no_credentials():
    with pytest.raises(UnauthorizedException):
        await get_bearer_token(credentials=None)

@pytest.mark.asyncio
async def test_get_bearer_token_wrong_scheme():
    creds = HTTPAuthorizationCredentials(scheme="Basic", credentials="token123")
    with pytest.raises(UnauthorizedException):
        await get_bearer_token(credentials=creds)

# ---------- get_current_user (с моками) ----------

@pytest.mark.asyncio
async def test_get_current_user_success(mock_db_session, mock_redis, mock_user):
    token = create_access_token(mock_user.id)
    with patch("app.core.security.is_token_blacklisted", AsyncMock(return_value=False)):
        with patch("app.core.security.user_repository") as repo:
            repo.get_by_id = AsyncMock(return_value=mock_user)
            user = await get_current_user(token=token, db=mock_db_session, redis=mock_redis)
    assert user.id == mock_user.id

@pytest.mark.asyncio
async def test_get_current_user_blacklisted_token(mock_db_session, mock_redis, mock_user):
    token = create_access_token(mock_user.id)
    with patch("app.core.security.is_token_blacklisted", AsyncMock(return_value=True)):
        with pytest.raises(UnauthorizedException, match="отозван"):
            await get_current_user(token=token, db=mock_db_session, redis=mock_redis)

@pytest.mark.asyncio
async def test_get_current_user_not_found(mock_db_session, mock_redis, mock_user):
    token = create_access_token(mock_user.id)
    with patch("app.core.security.is_token_blacklisted", AsyncMock(return_value=False)):
        with patch("app.core.security.user_repository") as repo:
            repo.get_by_id = AsyncMock(return_value=None)
            with pytest.raises(UnauthorizedException, match="не найден"):
                await get_current_user(token=token, db=mock_db_session, redis=mock_redis)

@pytest.mark.asyncio
async def test_get_current_user_inactive(mock_db_session, mock_redis, mock_user):
    mock_user.is_active = False
    token = create_access_token(mock_user.id)
    with patch("app.core.security.is_token_blacklisted", AsyncMock(return_value=False)):
        with patch("app.core.security.user_repository") as repo:
            repo.get_by_id = AsyncMock(return_value=mock_user)
            with pytest.raises(UnauthorizedException, match="деактивирован"):
                await get_current_user(token=token, db=mock_db_session, redis=mock_redis)