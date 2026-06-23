from __future__ import annotations

import asyncio
from dataclasses import dataclass, field

from sqlalchemy import select

from app.core.database import AsyncSessionLocal, close_database_connection
from app.models.exercise import Exercise
from app.models.workout_template import WorkoutTemplate
from app.models.workout_template_exercise import WorkoutTemplateExercise


@dataclass(frozen=True)
class SystemTemplateSeed:
    title: str
    description: str
    exercise_names: list[str] = field(default_factory=list)


SYSTEM_TEMPLATES: tuple[SystemTemplateSeed, ...] = (
    SystemTemplateSeed(
        title="День груди",
        description="Базовые упражнения на грудь. Работаем на силу и объём грудных мышц.",
        exercise_names=[
            "Жим штанги лёжа",
            "Жим гантелей на наклонной скамье",
            "Разведение гантелей лёжа",
            "Сведение рук в кроссовере",
        ],
    ),
    SystemTemplateSeed(
        title="День ног",
        description="Тяжёлая тренировка ног. Приседания в первую очередь.",
        exercise_names=[
            "Приседания со штангой",
            "Жим ногами в тренажёре",
            "Румынская тяга",
            "Подъём на носки стоя",
        ],
    ),
    SystemTemplateSeed(
        title="День спины",
        description="Подтягивания и тяги. Фокус на ширину и толщину спины.",
        exercise_names=[
            "Подтягивания",
            "Тяга штанги в наклоне",
            "Тяга верхнего блока к груди",
            "Тяга гантели одной рукой",
        ],
    ),
    SystemTemplateSeed(
        title="День плеч",
        description="Дельты и трапеции. Жим и махи на все пучки дельт.",
        exercise_names=[
            "Жим штанги стоя",
            "Махи гантелями в стороны",
            "Махи гантелями в наклоне",
            "Тяга штанги к подбородку",
        ],
    ),
    SystemTemplateSeed(
        title="Full Body",
        description="Тренировка на всё тело. Фулбади для общего тонуса.",
        exercise_names=[
            "Приседания со штангой",
            "Жим штанги лёжа",
            "Тяга штанги в наклоне",
            "Жим штанги стоя",
        ],
    ),
)


def _normalize_name(value: str) -> str:
    return value.strip().lower()


def _validate_seed() -> None:
    titles = [_normalize_name(item.title) for item in SYSTEM_TEMPLATES]
    if len(titles) != len(set(titles)):
        raise ValueError("В SYSTEM_TEMPLATES есть дублирующиеся названия шаблонов.")


async def seed_system_workout_templates() -> tuple[int, int, int]:
    _validate_seed()

    inserted = 0
    updated = 0
    skipped_exercises = 0

    async with AsyncSessionLocal() as db:
        system_exercises = (
            await db.execute(select(Exercise).where(Exercise.created_by_user_id.is_(None)))
        ).scalars().all()
        exercise_by_name = {_normalize_name(ex.name): ex for ex in system_exercises}

        existing_templates = (
            await db.execute(select(WorkoutTemplate).where(WorkoutTemplate.created_by_user_id.is_(None)))
        ).scalars().all()
        existing_by_title = {_normalize_name(t.title): t for t in existing_templates}

        for seed_item in SYSTEM_TEMPLATES:
            resolved_exercise_ids: list = []
            for exercise_name in seed_item.exercise_names:
                exercise = exercise_by_name.get(_normalize_name(exercise_name))
                if exercise is None:
                    print(f"упражнение не найдено, пропуск: {seed_item.title} → {exercise_name}")
                    skipped_exercises += 1
                    continue
                resolved_exercise_ids.append(exercise.id)

            normalized_title = _normalize_name(seed_item.title)
            existing_template = existing_by_title.get(normalized_title)

            if existing_template is None:
                template = WorkoutTemplate(
                    created_by_user_id=None,
                    title=seed_item.title,
                    description=seed_item.description,
                )
                db.add(template)
                await db.flush()
                for index, exercise_id in enumerate(resolved_exercise_ids, start=1):
                    db.add(
                        WorkoutTemplateExercise(
                            template_id=template.id,
                            exercise_id=exercise_id,
                            order_index=index,
                        )
                    )
                inserted += 1
                continue

            changed = False
            if existing_template.title != seed_item.title:
                existing_template.title = seed_item.title
                changed = True
            if existing_template.description != seed_item.description:
                existing_template.description = seed_item.description
                changed = True

            current_exercises = (
                await db.execute(
                    select(WorkoutTemplateExercise).where(
                        WorkoutTemplateExercise.template_id == existing_template.id
                    ).order_by(WorkoutTemplateExercise.order_index)
                )
            ).scalars().all()
            current_ids = [te.exercise_id for te in current_exercises]

            if current_ids != resolved_exercise_ids:
                for te in current_exercises:
                    await db.delete(te)
                await db.flush()
                for index, exercise_id in enumerate(resolved_exercise_ids, start=1):
                    db.add(
                        WorkoutTemplateExercise(
                            template_id=existing_template.id,
                            exercise_id=exercise_id,
                            order_index=index,
                        )
                    )
                changed = True

            if changed:
                updated += 1

        await db.commit()

    return inserted, updated, skipped_exercises


async def main() -> None:
    inserted, updated, skipped_exercises = await seed_system_workout_templates()
    print(
        "System workout templates seed completed. "
        f"inserted={inserted}, updated={updated}, skipped_exercises={skipped_exercises}"
    )
    await close_database_connection()


if __name__ == "__main__":
    asyncio.run(main())