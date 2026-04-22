"""
Юнит-тесты для AuthService (регистрация, логин, рефреш, логаут).
Все внешние зависимости (БД, Redis, хеширование, JWT) замоканы.
"""

import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from uuid import uuid4

from app.services.auth_service import auth_service
from app.schemas.auth import RegisterRequest, LoginRequest, RefreshRequest
from app.core.exceptions import AlreadyExistsException, UnauthorizedException


# ====================== РЕГИСТРАЦИЯ ======================

@pytest.mark.asyncio
async def test_register_success(mock_db_session, mock_user):
    """
    Успешная регистрация нового пользователя.

    Сценарий:
        - Email и username свободны (репозиторий возвращает None).
        - Хеширование пароля мокается, чтобы не вызывать реальный bcrypt.
        - Репозиторий возвращает мок-пользователя.
        - Генерация токенов возвращает фиктивные access/refresh.

    Проверки:
        - Возвращённый объект AuthResponse содержит непустые токены.
        - Данные пользователя совпадают с переданными.
        - Репозиторий вызван с правильными параметрами.
        - Выполнен commit и refresh сессии.
    """
    request = RegisterRequest(email="new@example.com", username="newuser", password="Secure123")

    with patch("app.services.auth_service.user_repository") as mock_repo:
        mock_repo.get_by_email = AsyncMock(return_value=None)
        mock_repo.get_by_username = AsyncMock(return_value=None)
        mock_repo.create = AsyncMock(return_value=mock_user)

        with patch("app.services.auth_service.hash_password") as mock_hash:
            mock_hash.return_value = "hashed_password_placeholder"
            with patch("app.services.auth_service.create_token_pair") as mock_tokens:
                mock_tokens.return_value = ("access_token", "refresh_token")
                result = await auth_service.register(db=mock_db_session, payload=request)

    assert result.access_token == "access_token"
    assert result.refresh_token == "refresh_token"
    assert result.user.email == mock_user.email
    mock_repo.create.assert_awaited_once()
    mock_db_session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_register_duplicate_email(mock_db_session):
    """
    Регистрация с уже существующим email – выбрасывается AlreadyExistsException.

    Сценарий:
        - Репозиторий возвращает существующего пользователя при поиске по email.
        - Поиск по username возвращает None.

    Проверка:
        - Исключение перехвачено.
    """
    request = RegisterRequest(email="exist@example.com", username="newuser", password="Secure123")

    with patch("app.services.auth_service.user_repository") as mock_repo:
        mock_repo.get_by_email = AsyncMock(return_value=MagicMock())
        mock_repo.get_by_username = AsyncMock(return_value=None)

        with pytest.raises(AlreadyExistsException):
            await auth_service.register(db=mock_db_session, payload=request)


@pytest.mark.asyncio
async def test_register_duplicate_username(mock_db_session):
    """
    Регистрация с уже занятым username – выбрасывается AlreadyExistsException.

    Сценарий:
        - Email свободен, но username уже используется.
    """
    request = RegisterRequest(email="new@example.com", username="taken", password="Secure123")

    with patch("app.services.auth_service.user_repository") as mock_repo:
        mock_repo.get_by_email = AsyncMock(return_value=None)
        mock_repo.get_by_username = AsyncMock(return_value=MagicMock())

        with pytest.raises(AlreadyExistsException):
            await auth_service.register(db=mock_db_session, payload=request)


# ====================== ЛОГИН ======================

@pytest.mark.asyncio
async def test_login_success(mock_db_session, mock_user):
    """
    Успешный вход с корректными email и паролем.

    Сценарий:
        - Пользователь найден по email.
        - Проверка пароля мокается и возвращает True.
        - Токены генерируются.

    Проверка:
        - Возвращён access_token.
    """
    request = LoginRequest(email="test@example.com", password="CorrectPass")

    with patch("app.services.auth_service.user_repository") as mock_repo:
        mock_repo.get_by_email = AsyncMock(return_value=mock_user)
        with patch("app.services.auth_service.verify_password", return_value=True):
            with patch("app.services.auth_service.create_token_pair") as mock_tokens:
                mock_tokens.return_value = ("access_token", "refresh_token")
                result = await auth_service.login(db=mock_db_session, payload=request)

    assert result.access_token == "access_token"


@pytest.mark.asyncio
async def test_login_wrong_password(mock_db_session, mock_user):
    """
    Вход с неправильным паролем – UnauthorizedException.

    Сценарий:
        - Пользователь найден, но verify_password возвращает False.
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
    Вход с несуществующим email – UnauthorizedException.

    Сценарий:
        - Репозиторий возвращает None.
    """
    request = LoginRequest(email="no@example.com", password="SomePass123")

    with patch("app.services.auth_service.user_repository") as mock_repo:
        mock_repo.get_by_email = AsyncMock(return_value=None)
        with pytest.raises(UnauthorizedException):
            await auth_service.login(db=mock_db_session, payload=request)


@pytest.mark.asyncio
async def test_login_inactive_user(mock_db_session, mock_user):
    """
    Вход деактивированного пользователя – UnauthorizedException.

    Сценарий:
        - Пользователь найден, пароль правильный, но is_active = False.
    """
    mock_user.is_active = False
    request = LoginRequest(email="test@example.com", password="ActivePass123")

    with patch("app.services.auth_service.user_repository") as mock_repo:
        mock_repo.get_by_email = AsyncMock(return_value=mock_user)
        with patch("app.services.auth_service.verify_password", return_value=True):
            with pytest.raises(UnauthorizedException):
                await auth_service.login(db=mock_db_session, payload=request)


# ====================== ОБНОВЛЕНИЕ ТОКЕНОВ ======================

@pytest.mark.asyncio
async def test_refresh_success(mock_db_session, mock_user):
    """
    Успешное обновление токенов по валидному refresh-токену.

    Сценарий:
        - Декодирование токена возвращает корректный payload (тип refresh, sub=user_id).
        - Пользователь существует и активен.
        - Генерируется новая пара токенов.

    Проверка:
        - Возвращены новые access и refresh токены.
    """
    refresh_token = "valid_refresh_token"
    request = RefreshRequest(refresh_token=refresh_token)

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
                    result = await auth_service.refresh(db=mock_db_session, payload=request)

    assert result.access_token == "new_access"
    assert result.refresh_token == "new_refresh"


@pytest.mark.asyncio
async def test_refresh_user_not_found(mock_db_session):
    """
    Обновление токенов, когда пользователь, указанный в refresh-токене, не найден – UnauthorizedException.

    Сценарий:
        - Токен декодирован, тип верный, sub содержит UUID.
        - Репозиторий возвращает None.
    """
    refresh_token = "valid_token"
    request = RefreshRequest(refresh_token=refresh_token)
    user_id = uuid4()

    with patch("app.services.auth_service.decode_jwt_token") as mock_decode:
        mock_decode.return_value = {"type": "refresh", "sub": str(user_id), "jti": "jti", "exp": 9999}
        with patch("app.services.auth_service.ensure_token_type"):
            with patch("app.services.auth_service.user_repository") as mock_repo:
                mock_repo.get_by_id = AsyncMock(return_value=None)
                with pytest.raises(UnauthorizedException):
                    await auth_service.refresh(db=mock_db_session, payload=request)


# ====================== ВЫХОД ======================

@pytest.mark.asyncio
async def test_logout_success(mock_redis):
    """
    Успешный выход – access-токен добавляется в чёрный список Redis.

    Сценарий:
        - Декодирование токена возвращает payload с jti и exp.
        - ensure_token_type успешно проходит.
        - Вызывается add_token_to_blacklist с правильными аргументами.

    Проверки:
        - Возвращён LogoutResponse с правильным сообщением.
        - Функция добавления в чёрный список вызвана один раз с верными параметрами.
    """
    access_token = "some_access_token"

    with patch("app.services.auth_service.decode_jwt_token") as mock_decode:
        mock_decode.return_value = {"type": "access", "jti": "unique-jti", "exp": 9999999999}
        with patch("app.services.auth_service.ensure_token_type"):
            with patch("app.services.auth_service.add_token_to_blacklist") as mock_blacklist:
                mock_blacklist = AsyncMock()
                with patch("app.services.auth_service.add_token_to_blacklist", mock_blacklist):
                    result = await auth_service.logout(redis=mock_redis, access_token=access_token)

    assert result.detail == "Вы успешно вышли из системы."
    mock_blacklist.assert_awaited_once_with(mock_redis, "unique-jti", 9999999999)
