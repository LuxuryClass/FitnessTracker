from uuid import UUID
from datetime import date
from decimal import Decimal

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

    async def get_by_name(self, db: AsyncSession, name: str) -> User | None:
        statement = select(User).where(User.name == name)
        result = await db.execute(statement)
        return result.scalar_one_or_none()

    async def create(self, db: AsyncSession, email: str, name: str, password_hash: str) -> User:
        user = User(email=email, name=name, password_hash=password_hash)
        db.add(user)
        await db.flush()
        return user

    async def update(
        self,
        db: AsyncSession,
        user: User,
        *,
        email: str | None = None,
        name: str | None = None,
        gender: str | None = None,
        birth_date: date | None = None,
        height: Decimal | None = None,
        weight: Decimal | None = None,
    ) -> User:
        if email is not None:
            user.email = email
        if name is not None:
            user.name = name
        if gender is not None:
            user.gender = gender
        if birth_date is not None:
            user.birth_date = birth_date
        if height is not None:
            user.height = height
        if weight is not None:
            user.weight = weight
        await db.flush()
        return user

    async def update_metrics(
        self,
        db: AsyncSession,
        user: User,
        streak_weeks: int,
        weekly_volume_tons: Decimal,
    ) -> User:
        user.streak_weeks = streak_weeks
        user.weekly_volume_tons = weekly_volume_tons
        await db.flush()
        return user

    async def update_avatar_url(
        self,
        db: AsyncSession,
        user: User,
        avatar_url: str | None,
    ) -> User:
        user.avatar_url = avatar_url
        await db.flush()
        return user


user_repository = UserRepository()
