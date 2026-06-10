from __future__ import annotations

import asyncio
import mimetypes
import re
from dataclasses import dataclass, field
from pathlib import Path

from sqlalchemy import select

from app.core.config import settings
from app.core.database import AsyncSessionLocal, close_database_connection
from app.models.guide_article import GuideArticle
from app.models.guide_category import GuideCategory
from app.services.storage_service import storage_service

# Папка с локальными ассетами справочника (иконки категорий/статей и inline-медиа).
ASSETS_DIR = Path(__file__).resolve().parent / "assets" / "guide"
# Плейсхолдер inline-медиа в content: {{media:filename.png}} → /api/guide/media/{object_key}.
MEDIA_PLACEHOLDER_RE = re.compile(r"\{\{media:(?P<filename>[^}]+)\}\}")


@dataclass(frozen=True)
class GuideArticleSeed:
    title: str
    description: str
    reading_time_minutes: int
    content: str
    position: int
    icon_filename: str | None = None
    media_filenames: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class GuideCategorySeed:
    name: str
    description: str
    position: int
    icon_filename: str | None = None
    articles: list[GuideArticleSeed] = field(default_factory=list)


# Стартовый контент справочника. ассеты кладутся в ASSETS_DIR.
SYSTEM_GUIDE: tuple[GuideCategorySeed, ...] = ()


def _guess_content_type(filename: str) -> str:
    content_type, _ = mimetypes.guess_type(filename)
    return content_type or "application/octet-stream"


async def _upload_asset(prefix: str, filename: str | None) -> str | None:
    # Возвращает object_key загруженного файла либо None, если файла нет в ASSETS_DIR.
    if not filename:
        return None

    file_path = ASSETS_DIR / filename
    if not file_path.is_file():
        print(f"[warn] asset not found, skip upload: {file_path}")
        return None

    object_key = await storage_service.upload_guide_asset(
        prefix=prefix,
        content=file_path.read_bytes(),
        content_type=_guess_content_type(filename),
        filename=filename,
    )
    return object_key


async def _build_article_content(article_seed: GuideArticleSeed) -> str:
    # Грузит inline-медиа статьи и заменяет плейсхолдеры {{media:...}} на стабильные
    # внутренние URL /api/guide/media/{object_key}, не зависящие от срока presigned.
    uploaded: dict[str, str] = {}
    for media_filename in article_seed.media_filenames:
        object_key = await _upload_asset("guide-media", media_filename)
        if object_key is not None:
            uploaded[media_filename] = f"{settings.api_prefix}/guide/media/{object_key}"

    def _replace(match: re.Match[str]) -> str:
        filename = match.group("filename").strip()
        replacement = uploaded.get(filename)
        if replacement is None:
            print(f"[warn] media placeholder without asset, left as-is: {filename}")
            return match.group(0)
        return replacement

    return MEDIA_PLACEHOLDER_RE.sub(_replace, article_seed.content)


async def seed_system_guide() -> tuple[int, int]:
    inserted = 0
    updated = 0

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(GuideCategory))
        existing_categories = {category.name: category for category in result.scalars().all()}

        for category_seed in SYSTEM_GUIDE:
            category = existing_categories.get(category_seed.name)

            if category is None:
                icon_object_key = await _upload_asset("guide-icons/categories", category_seed.icon_filename)
                category = GuideCategory(
                    name=category_seed.name,
                    description=category_seed.description,
                    icon_object_key=icon_object_key,
                    position=category_seed.position,
                )
                db.add(category)
                await db.flush()
                inserted += 1
            else:
                changed = False
                if category.description != category_seed.description:
                    category.description = category_seed.description
                    changed = True
                if category.position != category_seed.position:
                    category.position = category_seed.position
                    changed = True
                if changed:
                    updated += 1

            article_result = await db.execute(
                select(GuideArticle).where(GuideArticle.guide_category_id == category.id)
            )
            existing_articles = {article.title: article for article in article_result.scalars().all()}

            for article_seed in category_seed.articles:
                article = existing_articles.get(article_seed.title)

                if article is None:
                    icon_object_key = await _upload_asset("guide-icons/articles", article_seed.icon_filename)
                    content = await _build_article_content(article_seed)
                    db.add(
                        GuideArticle(
                            guide_category_id=category.id,
                            title=article_seed.title,
                            description=article_seed.description,
                            icon_object_key=icon_object_key,
                            reading_time_minutes=article_seed.reading_time_minutes,
                            content=content,
                            position=article_seed.position,
                        )
                    )
                    inserted += 1
                    continue

                changed = False
                if article.description != article_seed.description:
                    article.description = article_seed.description
                    changed = True
                if article.reading_time_minutes != article_seed.reading_time_minutes:
                    article.reading_time_minutes = article_seed.reading_time_minutes
                    changed = True
                if article.position != article_seed.position:
                    article.position = article_seed.position
                    changed = True
                if changed:
                    updated += 1

        await db.commit()

    return inserted, updated


async def main() -> None:
    inserted, updated = await seed_system_guide()
    print(f"System guide seed completed. inserted={inserted}, updated={updated}")
    await close_database_connection()


if __name__ == "__main__":
    asyncio.run(main())