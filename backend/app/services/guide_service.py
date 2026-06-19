from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.models.guide_article import GuideArticle
from app.models.guide_category import GuideCategory
from app.models.user import User
from app.repositories import guide_repository
from app.schemas.guide import (
    GuideArticleListItem,
    GuideArticleResponse,
    GuideCategoryLandingResponse,
    GuideCategoryListItem,
)
from app.services.storage_service import storage_service

POPULAR_ARTICLES_LIMIT = 5
# Префикс, по которому лежит inline-медиа статей. Публичный media-proxy отдаёт
# только эти объекты, чтобы нельзя было вытащить чужие файлы бакета (аватарки и пр.).
GUIDE_MEDIA_PREFIX = "guide-media/"


class GuideService:
    async def _article_to_card(
        self, article: GuideArticle, favorite_ids: set[UUID]
    ) -> GuideArticleListItem:
        return GuideArticleListItem(
            id=article.id,
            title=article.title,
            description=article.description,
            icon_url=await storage_service.build_guide_asset_access_url(article.icon_object_key),
            reading_time_minutes=article.reading_time_minutes,
            views_count=article.views_count,
            is_favorite=article.id in favorite_ids,
        )

    async def _article_to_response(
        self, article: GuideArticle, is_favorite: bool, views_count: int
    ) -> GuideArticleResponse:
        # views_count приходит параметром (не из article): ORM-объект не мутируем,
        # чтобы commit-инкремент не задвоился через autoflush грязного объекта.
        return GuideArticleResponse(
            id=article.id,
            guide_category_id=article.guide_category_id,
            title=article.title,
            description=article.description,
            icon_url=await storage_service.build_guide_asset_access_url(article.icon_object_key),
            reading_time_minutes=article.reading_time_minutes,
            views_count=views_count,
            is_favorite=is_favorite,
            content=article.content,
            created_at=article.created_at,
            updated_at=article.updated_at,
        )

    async def _category_to_list_item(
        self, category: GuideCategory, articles_count: int
    ) -> GuideCategoryListItem:
        return GuideCategoryListItem(
            id=category.id,
            name=category.name,
            description=category.description,
            icon_url=await storage_service.build_guide_asset_access_url(category.icon_object_key),
            articles_count=articles_count,
        )

    async def list_categories(self, db: AsyncSession) -> list[GuideCategoryListItem]:
        categories = await guide_repository.list_categories(db)
        counts = await guide_repository.count_articles_by_category(db, [category.id for category in categories])
        return [
            await self._category_to_list_item(category, counts.get(category.id, 0))
            for category in categories
        ]

    async def get_category_landing(
        self, db: AsyncSession, current_user: User, category_id: UUID
    ) -> GuideCategoryLandingResponse:
        category = await guide_repository.get_category(db, category_id)
        if category is None:
            raise NotFoundException("Категория справочника не найдена.")

        counts = await guide_repository.count_articles_by_category(db, [category.id])
        featured = await guide_repository.list_favorite_articles(db, current_user.id, category.id)
        popular = await guide_repository.list_popular_by_category(db, category.id, POPULAR_ARTICLES_LIMIT)

        # is_favorite считаем одним запросом по объединению обоих списков
        union_ids = {article.id for article in featured} | {article.id for article in popular}
        favorite_ids = await guide_repository.get_favorite_article_ids(db, current_user.id, union_ids)

        return GuideCategoryLandingResponse(
            id=category.id,
            name=category.name,
            description=category.description,
            icon_url=await storage_service.build_guide_asset_access_url(category.icon_object_key),
            articles_count=counts.get(category.id, 0),
            featured=[await self._article_to_card(article, favorite_ids) for article in featured],
            popular=[await self._article_to_card(article, favorite_ids) for article in popular],
        )

    async def list_category_articles(
        self, db: AsyncSession, current_user: User, category_id: UUID
    ) -> list[GuideArticleListItem]:
        category = await guide_repository.get_category(db, category_id)
        if category is None:
            raise NotFoundException("Категория справочника не найдена.")

        articles = await guide_repository.list_articles_by_category(db, category.id)
        favorite_ids = await guide_repository.get_favorite_article_ids(
            db, current_user.id, {article.id for article in articles}
        )
        return [await self._article_to_card(article, favorite_ids) for article in articles]

    async def get_article(
        self, db: AsyncSession, current_user: User, article_id: UUID
    ) -> GuideArticleResponse:
        article = await guide_repository.get_article(db, article_id)
        if article is None:
            raise NotFoundException("Статья не найдена.")

        favorite = await guide_repository.get_favorite(db, current_user.id, article.id)
        # Ответ собираем ДО commit, пока ORM-объект «живой»: commit истекает его
        # атрибуты, а доступ к ним в async-сессии вызовет MissingGreenlet.
        # ORM-объект НЕ мутируем — свежее значение просмотров передаём числом,
        # иначе autoflush грязного объекта задвоил бы инкремент (+2 вместо +1).
        response = await self._article_to_response(
            article, is_favorite=favorite is not None, views_count=article.views_count + 1
        )

        await guide_repository.increment_views(db, article_id)
        await db.commit()
        return response

    async def add_favorite(self, db: AsyncSession, current_user: User, article_id: UUID) -> None:
        if not await guide_repository.article_exists(db, article_id):
            raise NotFoundException("Статья не найдена.")

        # повторное добавление не создаёт дубль (UNIQUE user+article).
        existing = await guide_repository.get_favorite(db, current_user.id, article_id)
        if existing is not None:
            return

        await guide_repository.add_favorite(db, current_user.id, article_id)
        await db.commit()

    async def remove_favorite(self, db: AsyncSession, current_user: User, article_id: UUID) -> None:
        if not await guide_repository.article_exists(db, article_id):
            raise NotFoundException("Статья не найдена.")

        await guide_repository.remove_favorite(db, current_user.id, article_id)
        await db.commit()

    async def build_media_redirect_url(self, object_key: str) -> str:
        # Ключ обязан лежать в guide-media/, иначе 404 (защита от обхода к чужим объектам).
        if not object_key.startswith(GUIDE_MEDIA_PREFIX):
            raise NotFoundException("Медиа не найдено.")

        url = await storage_service.build_guide_asset_access_url(object_key)
        if url is None:
            raise NotFoundException("Медиа не найдено.")
        return url


guide_service = GuideService()