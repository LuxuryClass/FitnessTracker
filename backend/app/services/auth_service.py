from uuid import UUID

from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AlreadyExistsException, UnauthorizedException
from app.core.redis import (
    add_refresh_session,
    add_token_to_blacklist,
    is_refresh_session_active,
    revoke_refresh_session,
)
from app.core.security import (
    ACCESS_TOKEN_TYPE,
    REFRESH_TOKEN_TYPE,
    create_token_pair,
    decode_jwt_token,
    ensure_token_type,
    get_token_exp,
    get_token_jti,
    get_token_subject,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.repositories import notification_settings_repository, user_repository
from app.schemas.auth import AccessTokenResponse, AuthResponse, LoginRequest, LogoutResponse, RegisterRequest
from app.services.user_metrics_service import build_user_response


class AuthService:
    async def _store_refresh_session(self, redis: Redis, user_id: UUID, refresh_token: str) -> None:
        refresh_payload = decode_jwt_token(refresh_token)
        ensure_token_type(refresh_payload, REFRESH_TOKEN_TYPE)
        refresh_jti = get_token_jti(refresh_payload)
        refresh_exp = get_token_exp(refresh_payload)
        await add_refresh_session(redis=redis, token_jti=refresh_jti, user_id=user_id, token_exp=refresh_exp)

    async def _build_auth_response(self, db: AsyncSession, redis: Redis, user: User) -> tuple[AuthResponse, str]:
        access_token, refresh_token = create_token_pair(user.id)
        await self._store_refresh_session(redis=redis, user_id=user.id, refresh_token=refresh_token)
        response = AuthResponse(user=await build_user_response(db=db, user=user), access_token=access_token, token_type="bearer")
        return response, refresh_token

    async def register(self, db: AsyncSession, redis: Redis, payload: RegisterRequest) -> tuple[AuthResponse, str]:
        email = payload.email.strip().lower()
        name = payload.name.strip()

        existing_by_email = await user_repository.get_by_email(db, email)
        if existing_by_email:
            raise AlreadyExistsException("Пользователь с таким email уже существует.")

        existing_by_name = await user_repository.get_by_name(db, name)
        if existing_by_name:
            raise AlreadyExistsException("Пользователь с таким name уже существует.")

        password_hash = hash_password(payload.password)
        user = await user_repository.create(db=db, email=email, name=name, password_hash=password_hash)
        await notification_settings_repository.create(
            db=db,
            user_id=user.id,
            enabled=True,
            sound=True,
            vibration=False,
            do_not_disturb=False,
            reminders=True,
            reminder_offset_minutes=0,
        )
        await db.commit()
        await db.refresh(user)
        return await self._build_auth_response(db=db, redis=redis, user=user)

    async def login(self, db: AsyncSession, redis: Redis, payload: LoginRequest) -> tuple[AuthResponse, str]:
        email = payload.email.strip().lower()

        user = await user_repository.get_by_email(db, email)
        if not user or not verify_password(payload.password, user.password_hash):
            raise UnauthorizedException("Неверный email или пароль.")

        if not user.is_active:
            raise UnauthorizedException("Пользователь деактивирован.")

        return await self._build_auth_response(db=db, redis=redis, user=user)

    async def refresh(self, db: AsyncSession, redis: Redis, refresh_token: str) -> tuple[AccessTokenResponse, str]:
        token_payload = decode_jwt_token(refresh_token)
        ensure_token_type(token_payload, REFRESH_TOKEN_TYPE)
        refresh_jti = get_token_jti(token_payload)
        if not await is_refresh_session_active(redis, refresh_jti):
            raise UnauthorizedException("Refresh токен отозван. Выполните вход заново.")

        subject = get_token_subject(token_payload)
        try:
            user_id = UUID(subject)
        except ValueError as exc:
            raise UnauthorizedException("Некорректный payload refresh токена: sub должен быть UUID.") from exc

        user = await user_repository.get_by_id(db, user_id)
        if user is None:
            raise UnauthorizedException("Пользователь по refresh токену не найден.")

        if not user.is_active:
            raise UnauthorizedException("Пользователь деактивирован.")

        access_token, new_refresh_token = create_token_pair(user.id)
        await revoke_refresh_session(redis=redis, token_jti=refresh_jti)
        await self._store_refresh_session(redis=redis, user_id=user.id, refresh_token=new_refresh_token)
        response = AccessTokenResponse(access_token=access_token, token_type="bearer")
        return response, new_refresh_token

    async def logout(self, redis: Redis, access_token: str, refresh_token: str | None = None) -> LogoutResponse:
        token_payload = decode_jwt_token(access_token)
        ensure_token_type(token_payload, ACCESS_TOKEN_TYPE)

        token_jti = get_token_jti(token_payload)
        token_exp = get_token_exp(token_payload)
        await add_token_to_blacklist(redis, token_jti, token_exp)
        if refresh_token:
            refresh_payload = decode_jwt_token(refresh_token)
            ensure_token_type(refresh_payload, REFRESH_TOKEN_TYPE)
            refresh_jti = get_token_jti(refresh_payload)
            await revoke_refresh_session(redis=redis, token_jti=refresh_jti)

        return LogoutResponse(detail="Вы успешно вышли из системы.")


auth_service = AuthService()
