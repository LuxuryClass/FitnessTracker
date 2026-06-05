from __future__ import annotations

import asyncio
from dataclasses import dataclass

from sqlalchemy import select

from app.core.database import AsyncSessionLocal, close_database_connection
from app.models.exercise import Exercise


@dataclass(frozen=True)
class SystemExerciseSeed:
    name: str
    description: str
    primary_muscle_groups: list[str]
    secondary_muscles: list[str]
    equipment: list[str]


SYSTEM_EXERCISES: tuple[SystemExerciseSeed, ...] = (
    SystemExerciseSeed(
        name="Приседания со штангой",
        description="Базовое упражнение на ноги и ягодицы.",
        primary_muscle_groups=["legs"],
        secondary_muscles=["quadriceps", "gluteal", "hamstring"],
        equipment=["Штанга"],
    ),
    SystemExerciseSeed(
        name="Жим штанги лежа",
        description="Базовое упражнение на грудные мышцы.",
        primary_muscle_groups=["chest"],
        secondary_muscles=["chest", "triceps", "deltoids"],
        equipment=["Штанга"],
    ),
    SystemExerciseSeed(
        name="Становая тяга",
        description="Базовое многосуставное упражнение на заднюю цепь.",
        primary_muscle_groups=["back", "legs"],
        secondary_muscles=["lower-back", "gluteal", "hamstring"],
        equipment=["Штанга"],
    ),
    SystemExerciseSeed(
        name="Тяга верхнего блока",
        description="Упражнение на широчайшие мышцы спины.",
        primary_muscle_groups=["back"],
        secondary_muscles=["upper-back", "biceps"],
        equipment=["Блочный тренажёр"],
    ),
    SystemExerciseSeed(
        name="Жим гантелей сидя",
        description="Упражнение на плечи в вертикальной плоскости.",
        primary_muscle_groups=["shoulders"],
        secondary_muscles=["deltoids", "triceps"],
        equipment=["Гантели"],
    ),
    SystemExerciseSeed(
        name="Выпады с гантелями",
        description="Упражнение на ноги и ягодицы с акцентом на стабильность.",
        primary_muscle_groups=["legs"],
        secondary_muscles=["quadriceps", "gluteal"],
        equipment=["Гантели"],
    ),
    SystemExerciseSeed(
        name="Планка",
        description="Статическое упражнение на мышцы кора.",
        primary_muscle_groups=["core"],
        secondary_muscles=["abs"],
        equipment=["Коврик"],
    ),
    SystemExerciseSeed(
        name="Подтягивания",
        description="Базовое упражнение на мышцы спины и рук.",
        primary_muscle_groups=["back"],
        secondary_muscles=["upper-back", "biceps"],
        equipment=["Турник"],
    ),
    SystemExerciseSeed(
        name="Скручивания",
        description="Упражнение на пресс и косые мышцы.",
        primary_muscle_groups=["core"],
        secondary_muscles=["abs", "obliques"],
        equipment=["Коврик"],
    ),
    SystemExerciseSeed(
        name="Подъём ног в висе",
        description="Упражнение на нижний пресс.",
        primary_muscle_groups=["core"],
        secondary_muscles=["abs"],
        equipment=["Турник"],
    ),
    SystemExerciseSeed(
        name="Подъём гантелей на бицепс",
        description="Изолированное упражнение на бицепс.",
        primary_muscle_groups=["arms"],
        secondary_muscles=["biceps", "forearm"],
        equipment=["Гантели"],
    ),
    SystemExerciseSeed(
        name="Французский жим",
        description="Изолированное упражнение на трицепс.",
        primary_muscle_groups=["arms"],
        secondary_muscles=["triceps"],
        equipment=["Штанга"],
    ),
    SystemExerciseSeed(
        name="Махи в стороны",
        description="Изолированное упражнение на средние дельты.",
        primary_muscle_groups=["shoulders"],
        secondary_muscles=["deltoids"],
        equipment=["Гантели"],
    ),
    SystemExerciseSeed(
        name="Подъём на носки стоя",
        description="Упражнение на икроножные мышцы.",
        primary_muscle_groups=["legs"],
        secondary_muscles=["calves"],
        equipment=["Тренажёр"],
    ),
    SystemExerciseSeed(
        name="Бег на дорожке",
        description="Кардио на беговой дорожке.",
        primary_muscle_groups=["cardio"],
        secondary_muscles=[],
        equipment=["Беговая дорожка"],
    ),
    SystemExerciseSeed(
        name="Велотренажер",
        description="Кардио на велотренажере.",
        primary_muscle_groups=["cardio"],
        secondary_muscles=[],
        equipment=["Велотренажёр"],
    ),
)


def _normalize_name(value: str) -> str:
    return value.strip().lower()


async def seed_system_exercises() -> tuple[int, int]:
    inserted = 0
    updated = 0

    async with AsyncSessionLocal() as db:
        statement = select(Exercise).where(Exercise.created_by_user_id.is_(None))
        result = await db.execute(statement)
        existing_system_exercises = list(result.scalars().all())
        existing_by_name = {_normalize_name(exercise.name): exercise for exercise in existing_system_exercises}

        for seed_item in SYSTEM_EXERCISES:
            normalized_name = _normalize_name(seed_item.name)
            existing_exercise = existing_by_name.get(normalized_name)

            if existing_exercise is None:
                db.add(
                    Exercise(
                        created_by_user_id=None,
                        name=seed_item.name,
                        description=seed_item.description,
                        primary_muscle_groups=seed_item.primary_muscle_groups,
                        secondary_muscles=seed_item.secondary_muscles,
                        equipment=seed_item.equipment,
                    )
                )
                inserted += 1
                continue

            changed = False
            if existing_exercise.description != seed_item.description:
                existing_exercise.description = seed_item.description
                changed = True
            if existing_exercise.primary_muscle_groups != seed_item.primary_muscle_groups:
                existing_exercise.primary_muscle_groups = seed_item.primary_muscle_groups
                changed = True
            if existing_exercise.secondary_muscles != seed_item.secondary_muscles:
                existing_exercise.secondary_muscles = seed_item.secondary_muscles
                changed = True
            if existing_exercise.equipment != seed_item.equipment:
                existing_exercise.equipment = seed_item.equipment
                changed = True

            if changed:
                updated += 1

        await db.commit()

    return inserted, updated


async def main() -> None:
    inserted, updated = await seed_system_exercises()
    print(f"System exercises seed completed. inserted={inserted}, updated={updated}")
    await close_database_connection()


if __name__ == "__main__":
    asyncio.run(main())
