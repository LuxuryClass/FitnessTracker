"""
Юнит-тесты для AuthService (регистрация, логин, рефреш, логаут).
Все внешние зависимости (БД, Redis, хеширование, JWT) замоканы.
"""

import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from uuid import uuid4

from app.services.auth_service import auth_service
from app.schemas.auth import RegisterRequest, LoginRequest
from app.core.exceptions import AlreadyExistsException, UnauthorizedException
from tests.conftest import create_mock_user_response


# ---------------------- РЕГИСТРАЦИЯ ----------------------

@pytest.mark.asyncio
async def test_register_success(mock_db_session, mock_user):
    """
    Успешная регистрация нового пользователя.

    Сценарий:
        - Email и name свободны (репозиторий возвращает None).
        - Хеширование пароля возвращает фиктивный хеш.
        - Репозиторий создаёт пользователя и возвращает его.
        - build_user_response мокается, чтобы не обращаться к БД/Redis/S3.
        - Генерируется пара токенов.

    Проверки:
        - Возвращены access и refresh токены с типом bearer.
        - Email пользователя в ответе совпадает с переданным.
        - Репозиторий create вызван с правильными параметрами.
        - Выполнен commit сессии.
    """
    request = RegisterRequest(email="new@example.com", name="newuser", password="Secure123")

    with patch("app.services.auth_service.user_repository") as mock_repo:
        mock_repo.get_by_email = AsyncMock(return_value=None)
        mock_repo.get_by_name = AsyncMock(return_value=None)
        mock_repo.create = AsyncMock(return_value=mock_user)

        with patch("app.services.auth_service.hash_password") as mock_hash:
            mock_hash.return_value = "hashed_password_placeholder"

            with patch("app.services.auth_service.build_user_response") as mock_build:
                # Возвращаем валидный для UserResponse мок
                mock_build.return_value = create_mock_user_response()

                with patch("app.services.auth_service.create_token_pair") as mock_tokens:
                    mock_tokens.return_value = ("access_token", "refresh_token")
                    auth_response, refresh_token = await auth_service.register(db=mock_db_session, payload=request)

    assert auth_response.access_token == "access_token"
    assert refresh_token == "refresh_token"
    assert auth_response.user.email == mock_user.email
    mock_repo.create.assert_awaited_once_with(
        db=mock_db_session,
        email="new@example.com",
        name="newuser",
        password_hash="hashed_password_placeholder"
    )
    mock_db_session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_register_duplicate_email(mock_db_session):
    """
    Регистрация с уже существующим email → AlreadyExistsException.

    Сценарий:
        - get_by_email возвращает существующего пользователя.
        - get_by_name возвращает None (имя свободно).
    """
    request = RegisterRequest(email="exist@example.com", name="newuser", password="Secure123")
    with patch("app.services.auth_service.user_repository") as mock_repo:
        mock_repo.get_by_email = AsyncMock(return_value=MagicMock())
        mock_repo.get_by_name = AsyncMock(return_value=None)
        with pytest.raises(AlreadyExistsException):
            await auth_service.register(db=mock_db_session, payload=request)


@pytest.mark.asyncio
async def test_register_duplicate_username(mock_db_session):
    """
    Регистрация с уже занятым name → AlreadyExistsException.

    Сценарий:
        - email свободен, но name уже используется.
    """
    request = RegisterRequest(email="new@example.com", name="taken", password="Secure123")
    with patch("app.services.auth_service.user_repository") as mock_repo:
        mock_repo.get_by_email = AsyncMock(return_value=None)
        mock_repo.get_by_name = AsyncMock(return_value=MagicMock())
        with pytest.raises(AlreadyExistsException):
            await auth_service.register(db=mock_db_session, payload=request)


# ---------------------- ЛОГИН ----------------------

@pytest.mark.asyncio
async def test_login_success(mock_db_session, mock_user):
    """
    Успешный вход – возвращается пара токенов и данные пользователя.

    Сценарий:
        - Пользователь найден по email, пароль корректен.
        - build_user_response мокается (чтобы избежать лишних зависимостей).
    """
    request = LoginRequest(email="test@example.com", password="CorrectPass")

    with patch("app.services.auth_service.user_repository") as mock_repo:
        mock_repo.get_by_email = AsyncMock(return_value=mock_user)
        with patch("app.services.auth_service.verify_password", return_value=True):
            with patch("app.services.auth_service.create_token_pair") as mock_tokens:
                mock_tokens.return_value = ("access_token", "refresh_token")
                with patch("app.services.auth_service.build_user_response") as mock_build:
                    mock_build.return_value = create_mock_user_response()
                    auth_response, refresh_token = await auth_service.login(db=mock_db_session, payload=request)

    assert auth_response.access_token == "access_token"
    assert refresh_token == "refresh_token"


@pytest.mark.asyncio
async def test_login_wrong_password(mock_db_session, mock_user):
    """
    Вход с неправильным паролем → UnauthorizedException.
    """
    request = LoginRequest(email="test@example.com", password="WrongPass")
    with patch("app.services.auth_service.user_repository") as mock_repo:
        mock_repo.get_by_email = AsyncMock(return_value=mock_user)
        with patch("app.services.auth_service.verify_password", return_value=False):
            with pytest.raises(UnauthorizedException):
                await auth_service.login(db=mock_db_session, payload=request)


@pytest.mark.asyncio
async def test_login_user_not_found(mock_db_session):
    """
    Вход с несуществующим email → UnauthorizedException.
    """
    request = LoginRequest(email="no@example.com", password="SomePass123")
    with patch("app.services.auth_service.user_repository") as mock_repo:
        mock_repo.get_by_email = AsyncMock(return_value=None)
        with pytest.raises(UnauthorizedException):
            await auth_service.login(db=mock_db_session, payload=request)


@pytest.mark.asyncio
async def test_login_inactive_user(mock_db_session, mock_user):
    """
    Вход деактивированного пользователя → UnauthorizedException.
    """
    mock_user.is_active = False
    request = LoginRequest(email="test@example.com", password="ActivePass123")
    with patch("app.services.auth_service.user_repository") as mock_repo:
        mock_repo.get_by_email = AsyncMock(return_value=mock_user)
        with patch("app.services.auth_service.verify_password", return_value=True):
            with pytest.raises(UnauthorizedException):
                await auth_service.login(db=mock_db_session, payload=request)


# ---------------------- ОБНОВЛЕНИЕ ТОКЕНОВ ----------------------

@pytest.mark.asyncio
async def test_refresh_success(mock_db_session, mock_user):
    """
    Успешное обновление токенов по валидному refresh-токену.

    Сценарий:
        - Декодирование возвращает payload с типом refresh и корректным sub.
        - Пользователь существует и активен.
        - Генерируется новая пара токенов.
    """
    refresh_token = "valid_refresh_token"
    with patch("app.services.auth_service.decode_jwt_token") as mock_decode:
        mock_decode.return_value = {
            "type": "refresh",
            "sub": str(mock_user.id),
            "jti": "jti",
            "exp": 9999999999
        }
        with patch("app.services.auth_service.ensure_token_type"):
            with patch("app.services.auth_service.user_repository") as mock_repo:
                mock_repo.get_by_id = AsyncMock(return_value=mock_user)
                with patch("app.services.auth_service.create_token_pair") as mock_tokens:
                    mock_tokens.return_value = ("new_access", "new_refresh")
                    token_response, new_refresh_token = await auth_service.refresh(
                        db=mock_db_session,
                        refresh_token=refresh_token,
                    )

    assert token_response.access_token == "new_access"
    assert new_refresh_token == "new_refresh"


@pytest.mark.asyncio
async def test_refresh_user_not_found(mock_db_session):
    """
    Обновление токенов, если пользователь не найден → UnauthorizedException.
    """
    refresh_token = "valid_token"
    user_id = uuid4()

    with patch("app.services.auth_service.decode_jwt_token") as mock_decode:
        mock_decode.return_value = {"type": "refresh", "sub": str(user_id), "jti": "jti", "exp": 9999}
        with patch("app.services.auth_service.ensure_token_type"):
            with patch("app.services.auth_service.user_repository") as mock_repo:
                mock_repo.get_by_id = AsyncMock(return_value=None)
                with pytest.raises(UnauthorizedException):
                    await auth_service.refresh(db=mock_db_session, refresh_token=refresh_token)


# ---------------------- ВЫХОД ----------------------

@pytest.mark.asyncio
async def test_logout_success(mock_redis):
    """
    Успешный выход – access-токен добавляется в чёрный список.

    Сценарий:
        - Токен декодируется, извлекаются jti и exp.
        - add_token_to_blacklist вызывается с правильными параметрами.
    """
    access_token = "some_access_token"

    with patch("app.services.auth_service.decode_jwt_token") as mock_decode:
        mock_decode.return_value = {"type": "access", "jti": "unique-jti", "exp": 9999999999}
        with patch("app.services.auth_service.ensure_token_type"):
            with patch("app.services.auth_service.add_token_to_blacklist") as mock_blacklist:
                mock_blacklist.return_value = None   # AsyncMock
                result = await auth_service.logout(redis=mock_redis, access_token=access_token)

    assert result.detail == "Вы успешно вышли из системы."
    mock_blacklist.assert_awaited_once_with(mock_redis, "unique-jti", 9999999999)
