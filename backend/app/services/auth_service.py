from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AlreadyExistsException, UnauthorizedException
from app.core.security import hash_password, verify_password
from app.repositories import user_repository
from app.schemas.auth import LoginRequest, RegisterRequest
from app.schemas.user import UserResponse


class AuthService:
    async def register(self, db: AsyncSession, payload: RegisterRequest) -> UserResponse:
        email = payload.email.strip().lower()
        username = payload.username.strip()

        existing_by_email = await user_repository.get_by_email(db, email)
        if existing_by_email:
            raise AlreadyExistsException("Пользователь с таким email уже существует.")

        existing_by_username = await user_repository.get_by_username(db, username)
        if existing_by_username:
            raise AlreadyExistsException("Пользователь с таким username уже существует.")

        password_hash = hash_password(payload.password)
        user = await user_repository.create(db=db, email=email, username=username, password_hash=password_hash)
        await db.commit()
        await db.refresh(user)
        return UserResponse.model_validate(user)

    async def login(self, db: AsyncSession, payload: LoginRequest) -> UserResponse:
        email = payload.email.strip().lower()

        user = await user_repository.get_by_email(db, email)
        if not user or not verify_password(payload.password, user.password_hash):
            raise UnauthorizedException("Неверный email или пароль.")

        if not user.is_active:
            raise UnauthorizedException("Пользователь деактивирован.")

        return UserResponse.model_validate(user)


auth_service = AuthService()
