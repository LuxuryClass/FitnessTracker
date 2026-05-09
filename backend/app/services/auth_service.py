from uuid import UUID

from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AlreadyExistsException, UnauthorizedException
from app.core.redis import add_token_to_blacklist
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
from app.repositories import user_repository
from app.schemas.auth import AuthResponse, LoginRequest, LogoutResponse, RefreshRequest, RegisterRequest, TokenPairResponse
from app.services.user_metrics_service import build_user_response


class AuthService:
    async def _build_auth_response(self, db: AsyncSession, user: User) -> AuthResponse:
        access_token, refresh_token = create_token_pair(user.id)
        return AuthResponse(
            user=await build_user_response(db=db, user=user),
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
        )

    async def register(self, db: AsyncSession, payload: RegisterRequest) -> AuthResponse:
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
        await db.commit()
        await db.refresh(user)
        return await self._build_auth_response(db=db, user=user)

    async def login(self, db: AsyncSession, payload: LoginRequest) -> AuthResponse:
        email = payload.email.strip().lower()

        user = await user_repository.get_by_email(db, email)
        if not user or not verify_password(payload.password, user.password_hash):
            raise UnauthorizedException("Неверный email или пароль.")

        if not user.is_active:
            raise UnauthorizedException("Пользователь деактивирован.")

        return await self._build_auth_response(db=db, user=user)

    async def refresh(self, db: AsyncSession, payload: RefreshRequest) -> TokenPairResponse:
        token_payload = decode_jwt_token(payload.refresh_token)
        ensure_token_type(token_payload, REFRESH_TOKEN_TYPE)

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

        access_token, refresh_token = create_token_pair(user.id)
        return TokenPairResponse(access_token=access_token, refresh_token=refresh_token, token_type="bearer")

    async def logout(self, redis: Redis, access_token: str) -> LogoutResponse:
        token_payload = decode_jwt_token(access_token)
        ensure_token_type(token_payload, ACCESS_TOKEN_TYPE)

        token_jti = get_token_jti(token_payload)
        token_exp = get_token_exp(token_payload)
        await add_token_to_blacklist(redis, token_jti, token_exp)

        return LogoutResponse(detail="Вы успешно вышли из системы.")


auth_service = AuthService()
