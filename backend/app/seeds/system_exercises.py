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
    muscle_groups: list[str]
    equipment: str


SYSTEM_EXERCISES: tuple[SystemExerciseSeed, ...] = (
    SystemExerciseSeed(
        name="Приседания со штангой",
        description="Базовое упражнение на ноги и ягодицы.",
        muscle_groups=["квадрицепсы", "ягодицы", "бицепс бедра"],
        equipment="штанга",
    ),
    SystemExerciseSeed(
        name="Жим штанги лежа",
        description="Базовое упражнение на грудные мышцы.",
        muscle_groups=["грудь", "трицепс", "передние дельты"],
        equipment="штанга",
    ),
    SystemExerciseSeed(
        name="Становая тяга",
        description="Базовое многосуставное упражнение на заднюю цепь.",
        muscle_groups=["спина", "ягодицы", "бицепс бедра"],
        equipment="штанга",
    ),
    SystemExerciseSeed(
        name="Тяга верхнего блока",
        description="Упражнение на широчайшие мышцы спины.",
        muscle_groups=["спина", "бицепс"],
        equipment="блочный тренажер",
    ),
    SystemExerciseSeed(
        name="Жим гантелей сидя",
        description="Упражнение на плечи в вертикальной плоскости.",
        muscle_groups=["плечи", "трицепс"],
        equipment="гантели",
    ),
    SystemExerciseSeed(
        name="Выпады с гантелями",
        description="Упражнение на ноги и ягодицы с акцентом на стабильность.",
        muscle_groups=["квадрицепсы", "ягодицы"],
        equipment="гантели",
    ),
    SystemExerciseSeed(
        name="Планка",
        description="Статическое упражнение на мышцы кора.",
        muscle_groups=["кор"],
        equipment="коврик",
    ),
    SystemExerciseSeed(
        name="Подтягивания",
        description="Базовое упражнение на мышцы спины и рук.",
        muscle_groups=["спина", "бицепс"],
        equipment="турник",
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
                        muscle_groups=seed_item.muscle_groups,
                        equipment=seed_item.equipment,
                    )
                )
                inserted += 1
                continue

            changed = False
            if existing_exercise.description != seed_item.description:
                existing_exercise.description = seed_item.description
                changed = True
            if existing_exercise.muscle_groups != seed_item.muscle_groups:
                existing_exercise.muscle_groups = seed_item.muscle_groups
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
