from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


class UserRepository:
    async def get_by_id(self, db: AsyncSession, user_id: UUID) -> User | None:
        statement = select(User).where(User.id == user_id)
        result = await db.execute(statement)
        return result.scalar_one_or_none()

    async def get_by_email(self, db: AsyncSession, email: str) -> User | None:
        statement = select(User).where(User.email == email)
        result = await db.execute(statement)
        return result.scalar_one_or_none()

    async def get_by_username(self, db: AsyncSession, username: str) -> User | None:
        statement = select(User).where(User.username == username)
        result = await db.execute(statement)
        return result.scalar_one_or_none()

    async def create(self, db: AsyncSession, email: str, username: str, password_hash: str) -> User:
        user = User(email=email, username=username, password_hash=password_hash)
        db.add(user)
        await db.flush()
        return user

    async def update(
        self,
        db: AsyncSession,
        user: User,
        *,
        email: str | None = None,
        username: str | None = None,
    ) -> User:
        if email is not None:
            user.email = email
        if username is not None:
            user.username = username
        await db.flush()
        return user


user_repository = UserRepository()
