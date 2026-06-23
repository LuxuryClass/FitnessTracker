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
SYSTEM_GUIDE: tuple[GuideCategorySeed, ...] = (
    GuideCategorySeed(
        name="Правильное питание",
        description="Основы здорового рациона для тренировок",
        position=1,
        icon_filename="category_nutrition.png",
        articles=[
            GuideArticleSeed(
                title="Основы здорового рациона",
                description="С чего начать построение питания под тренировки",
                reading_time_minutes=6,
                position=1,
                content=(
                    "# Основы здорового рациона\n\n"
                    "Питание — фундамент прогресса. Без сбалансированного рациона даже "
                    "идеальная программа тренировок не даст результата.\n\n"
                    "## Главные принципы\n\n"
                    "- **Регулярность.** Ешьте 3–5 раз в день примерно в одно и то же время.\n"
                    "- **Баланс.** В каждом приёме пищи должны быть белки, жиры и углеводы.\n"
                    "- **Вода.** Пейте 30 мл на килограмм веса тела в сутки.\n\n"
                    "## Что убрать в первую очередь\n\n"
                    "1. Сладкие газированные напитки.\n"
                    "2. Избыток фастфуда и трансжиров.\n"
                    "3. Алкоголь — он замедляет восстановление.\n\n"
                    "> Начните с малого: замените один вредный приём пищи на полезный, "
                    "и закрепите привычку на 2 недели."
                ),
            ),
            GuideArticleSeed(
                title="Белки, жиры и углеводы",
                description="Зачем нужен каждый макронутриент",
                reading_time_minutes=5,
                position=2,
                content=(
                    "# Белки, жиры и углеводы\n\n"
                    "Три макронутриента выполняют разные задачи в организме.\n\n"
                    "## Белки\n\n"
                    "Строительный материал для мышц. Норма — **1.6–2.2 г на кг** веса "
                    "для тех, кто тренируется с отягощениями.\n\n"
                    "Источники: курица, рыба, яйца, творог, бобовые.\n\n"
                    "## Жиры\n\n"
                    "Нужны для гормонов и усвоения витаминов. Не опускайтесь ниже "
                    "**0.8 г на кг** веса. Выбирайте ненасыщенные жиры: орехи, "
                    "оливковое масло, авокадо.\n\n"
                    "## Углеводы\n\n"
                    "Главный источник энергии для тренировок. Делайте упор на "
                    "сложные углеводы: крупы, овощи, цельнозерновой хлеб."
                ),
            ),
        ],
    ),
    GuideCategorySeed(
        name="КБЖУ",
        description="Калории, белки, жиры, углеводы",
        position=2,
        icon_filename="category_kcal.png",
        articles=[
            GuideArticleSeed(
                title="Как считать калории",
                description="Простой способ оценить суточную норму",
                reading_time_minutes=7,
                position=1,
                content=(
                    "# Как считать калории\n\n"
                    "Калорийность определяет, набираете вы вес, худеете или держите форму.\n\n"
                    "## Шаг 1. Базовый обмен\n\n"
                    "Используйте формулу Миффлина — Сан Жеора:\n\n"
                    "- Мужчины: `10 × вес + 6.25 × рост − 5 × возраст + 5`\n"
                    "- Женщины: `10 × вес + 6.25 × рост − 5 × возраст − 161`\n\n"
                    "## Шаг 2. Уровень активности\n\n"
                    "Умножьте результат на коэффициент:\n\n"
                    "1. Малоподвижный образ жизни — **1.2**\n"
                    "2. Тренировки 3–5 раз в неделю — **1.55**\n"
                    "3. Ежедневные тяжёлые нагрузки — **1.725**\n\n"
                    "## Шаг 3. Цель\n\n"
                    "- Похудение: минус 10–20% от нормы.\n"
                    "- Набор массы: плюс 10–15%.\n\n"
                    "> Корректируйте калораж раз в 2 недели по динамике веса."
                ),
            ),
            GuideArticleSeed(
                title="Норма белка в день",
                description="Сколько белка нужно именно вам",
                reading_time_minutes=4,
                position=2,
                content=(
                    "# Норма белка в день\n\n"
                    "Белок — самый важный макронутриент при силовых тренировках.\n\n"
                    "## Ориентиры\n\n"
                    "- Поддержание формы: **1.4–1.6 г/кг**.\n"
                    "- Набор мышечной массы: **1.6–2.2 г/кг**.\n"
                    "- Сушка (дефицит калорий): до **2.4 г/кг**, чтобы сохранить мышцы.\n\n"
                    "## Как распределить\n\n"
                    "Разбейте суточную норму на 3–4 приёма по **25–40 г** белка — "
                    "так он усваивается эффективнее."
                ),
            ),
        ],
    ),
    GuideCategorySeed(
        name="Техника безопасности",
        description="Как тренироваться без травм",
        position=3,
        icon_filename="category_safety.png",
        articles=[
            GuideArticleSeed(
                title="Разминка перед тренировкой",
                description="Почему нельзя её пропускать",
                reading_time_minutes=4,
                position=1,
                content=(
                    "# Разминка перед тренировкой\n\n"
                    "Разминка готовит мышцы, суставы и сердце к нагрузке и снижает риск травм.\n\n"
                    "## Структура разминки\n\n"
                    "1. **Кардио 5 минут** — лёгкий бег или велотренажёр.\n"
                    "2. **Суставная гимнастика** — вращения в суставах сверху вниз.\n"
                    "3. **Разминочные подходы** — 1–2 лёгких подхода в первом упражнении.\n\n"
                    "> Никогда не начинайте с рабочих весов без подготовки."
                ),
            ),
            GuideArticleSeed(
                title="Правильная техника",
                description="Базовые правила безопасного выполнения",
                reading_time_minutes=5,
                position=2,
                content=(
                    "# Правильная техника\n\n"
                    "Техника важнее веса. Ошибки под нагрузкой ведут к травмам.\n\n"
                    "## Общие правила\n\n"
                    "- Держите **спину нейтральной**, не округляйте поясницу.\n"
                    "- Двигайтесь **подконтрольно**, без рывков.\n"
                    "- Дышите: выдох на усилии, вдох на расслаблении.\n\n"
                    "## Когда остановиться\n\n"
                    "Если чувствуете острую боль в суставе — прекратите подход. "
                    "Боль в мышцах допустима, боль в суставах — нет."
                ),
            ),
        ],
    ),
    GuideCategorySeed(
        name="FAQ",
        description="Часто задаваемые вопросы",
        position=4,
        icon_filename="category_faq.png",
        articles=[
            GuideArticleSeed(
                title="Сколько раз в неделю тренироваться",
                description="Оптимальная частота для новичка",
                reading_time_minutes=3,
                position=1,
                content=(
                    "# Сколько раз в неделю тренироваться\n\n"
                    "Для новичка оптимально **3 тренировки в неделю** с днём отдыха между ними.\n\n"
                    "## Почему именно так\n\n"
                    "- Мышцы растут во время отдыха, а не на тренировке.\n"
                    "- 3 раза в неделю достаточно для прогресса первые месяцы.\n"
                    "- Так проще закрепить привычку и не перегореть.\n\n"
                    "Опытные атлеты могут переходить на 4–5 тренировок со сплитом по группам мышц."
                ),
            ),
            GuideArticleSeed(
                title="Когда ждать результат",
                description="Реалистичные сроки прогресса",
                reading_time_minutes=3,
                position=2,
                content=(
                    "# Когда ждать результат\n\n"
                    "Прогресс приходит постепенно — это нормально.\n\n"
                    "## Примерные сроки\n\n"
                    "1. **2–4 недели** — растёт выносливость, тренировки даются легче.\n"
                    "2. **1.5–2 месяца** — первые заметные изменения в зеркале.\n"
                    "3. **3–6 месяцев** — ощутимый рост силы и мышц.\n\n"
                    "> Главное — регулярность. Стабильность важнее интенсивности отдельной тренировки."
                ),
            ),
        ],
    ),
)


def _guess_content_type(filename: str) -> str:
    content_type, _ = mimetypes.guess_type(filename)
    return content_type or "application/octet-stream"


async def _upload_asset(prefix: str, filename: str | None) -> str | None:
    # Возвращает object_key загруженного файла либо None, если файла нет в ASSETS_DIR.
    if not filename:
        return None

    if not storage_service._is_configured():
        print(f"[warn] storage not configured, skip upload: {filename}")
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
                if category.icon_object_key is None and category_seed.icon_filename:
                    icon_object_key = await _upload_asset(
                        "guide-icons/categories", category_seed.icon_filename
                    )
                    if icon_object_key is not None:
                        category.icon_object_key = icon_object_key
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