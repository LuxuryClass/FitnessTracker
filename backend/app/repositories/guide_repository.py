from uuid import UUID

from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import undefer

from app.models.guide_article import GuideArticle
from app.models.guide_category import GuideCategory
from app.models.user_guide_favorite import UserGuideFavorite


class GuideRepository:
    async def list_categories(self, db: AsyncSession) -> list[GuideCategory]:
        statement = select(GuideCategory).order_by(GuideCategory.position)
        result = await db.execute(statement)
        return list(result.scalars().all())

    async def get_category(self, db: AsyncSession, category_id: UUID) -> GuideCategory | None:
        statement = select(GuideCategory).where(GuideCategory.id == category_id)
        result = await db.execute(statement)
        return result.scalar_one_or_none()

    async def count_articles_by_category(
        self, db: AsyncSession, category_ids: list[UUID]
    ) -> dict[UUID, int]:
        if not category_ids:
            return {}
        statement = (
            select(GuideArticle.guide_category_id, func.count())
            .where(GuideArticle.guide_category_id.in_(category_ids))
            .group_by(GuideArticle.guide_category_id)
        )
        result = await db.execute(statement)
        return {category_id: count for category_id, count in result.all()}

    async def get_article(self, db: AsyncSession, article_id: UUID) -> GuideArticle | None:
        # undefer(content): deferred-колонку грузим сразу в запросе, иначе async-сессия
        # упадёт на ленивой подгрузке при обращении к article.content.
        statement = (
            select(GuideArticle)
            .where(GuideArticle.id == article_id)
            .options(undefer(GuideArticle.content))
        )
        result = await db.execute(statement)
        return result.scalar_one_or_none()

    async def article_exists(self, db: AsyncSession, article_id: UUID) -> bool:
        # Лёгкая проверка существования без загрузки deferred-колонки content.
        statement = select(GuideArticle.id).where(GuideArticle.id == article_id)
        result = await db.execute(statement)
        return result.scalar_one_or_none() is not None

    async def list_articles_by_category(
        self, db: AsyncSession, category_id: UUID
    ) -> list[GuideArticle]:
        statement = (
            select(GuideArticle)
            .where(GuideArticle.guide_category_id == category_id)
            .order_by(GuideArticle.position)
        )
        result = await db.execute(statement)
        return list(result.scalars().all())

    async def list_popular_by_category(
        self, db: AsyncSession, category_id: UUID, limit: int
    ) -> list[GuideArticle]:
        statement = (
            select(GuideArticle)
            .where(GuideArticle.guide_category_id == category_id)
            .order_by(GuideArticle.views_count.desc(), GuideArticle.position)
            .limit(limit)
        )
        result = await db.execute(statement)
        return list(result.scalars().all())

    async def increment_views(self, db: AsyncSession, article_id: UUID) -> None:
        # synchronize_session=False: не истекаем загруженный объект статьи в сессии,
        # иначе доступ к deferred-колонке content вызовет ленивую IO (MissingGreenlet).
        statement = (
            update(GuideArticle)
            .where(GuideArticle.id == article_id)
            .values(views_count=GuideArticle.views_count + 1)
            .execution_options(synchronize_session=False)
        )
        await db.execute(statement)

    async def list_favorite_articles(
        self, db: AsyncSession, user_id: UUID, category_id: UUID
    ) -> list[GuideArticle]:
        statement = (
            select(GuideArticle)
            .join(UserGuideFavorite, UserGuideFavorite.guide_article_id == GuideArticle.id)
            .where(
                UserGuideFavorite.user_id == user_id,
                GuideArticle.guide_category_id == category_id,
            )
            .order_by(GuideArticle.position)
        )
        result = await db.execute(statement)
        return list(result.scalars().all())

    async def get_favorite_article_ids(
        self, db: AsyncSession, user_id: UUID, article_ids: set[UUID]
    ) -> set[UUID]:
        if not article_ids:
            return set()
        statement = select(UserGuideFavorite.guide_article_id).where(
            UserGuideFavorite.user_id == user_id,
            UserGuideFavorite.guide_article_id.in_(article_ids),
        )
        result = await db.execute(statement)
        return set(result.scalars().all())

    async def get_favorite(
        self, db: AsyncSession, user_id: UUID, article_id: UUID
    ) -> UserGuideFavorite | None:
        statement = select(UserGuideFavorite).where(
            UserGuideFavorite.user_id == user_id,
            UserGuideFavorite.guide_article_id == article_id,
        )
        result = await db.execute(statement)
        return result.scalar_one_or_none()

    async def add_favorite(self, db: AsyncSession, user_id: UUID, article_id: UUID) -> None:
        favorite = UserGuideFavorite(user_id=user_id, guide_article_id=article_id)
        db.add(favorite)
        await db.flush()

    async def remove_favorite(self, db: AsyncSession, user_id: UUID, article_id: UUID) -> None:
        statement = delete(UserGuideFavorite).where(
            UserGuideFavorite.user_id == user_id,
            UserGuideFavorite.guide_article_id == article_id,
        )
        await db.execute(statement)
        await db.flush()


guide_repository = GuideRepository()