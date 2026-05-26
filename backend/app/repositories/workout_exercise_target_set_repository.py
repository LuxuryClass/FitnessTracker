from decimal import Decimal
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.workout_exercise_target_set import WorkoutExerciseTargetSet


class WorkoutExerciseTargetSetRepository:
    """
    Хранение запланированных подходов (target sets) для упражнений тренировки.

    Один кортеж (workout_id, exercise_id, set_index) — один подход.
    `target_reps` и `target_weight_kg` могут быть NULL, если пользователь
    не указал точные значения и хочет заполнить их в тренировочной сессии.
    """

    async def list_by_workout_id(
        self,
        db: AsyncSession,
        workout_id: UUID,
    ) -> list[WorkoutExerciseTargetSet]:
        statement = (
            select(WorkoutExerciseTargetSet)
            .where(WorkoutExerciseTargetSet.workout_id == workout_id)
            .order_by(
                WorkoutExerciseTargetSet.exercise_id,
                WorkoutExerciseTargetSet.set_index,
            )
        )
        result = await db.execute(statement)
        return list(result.scalars().all())

    async def list_by_workout_ids(
        self,
        db: AsyncSession,
        workout_ids: list[UUID],
    ) -> list[WorkoutExerciseTargetSet]:
        if not workout_ids:
            return []
        statement = (
            select(WorkoutExerciseTargetSet)
            .where(WorkoutExerciseTargetSet.workout_id.in_(workout_ids))
            .order_by(
                WorkoutExerciseTargetSet.workout_id,
                WorkoutExerciseTargetSet.exercise_id,
                WorkoutExerciseTargetSet.set_index,
            )
        )
        result = await db.execute(statement)
        return list(result.scalars().all())

    async def replace_for_workout(
        self,
        db: AsyncSession,
        workout_id: UUID,
        items: list[tuple[UUID, int, int | None, Decimal | None]],
    ) -> list[WorkoutExerciseTargetSet]:
        """
        Атомарно перезаписывает все target_sets тренировки.

        items: список кортежей (exercise_id, set_index, target_reps, target_weight_kg).
        Сначала удаляются все существующие записи тренировки, затем вставляются новые.
        Используется и при create_workout, и при update_workout.
        """
        await self.delete_by_workout_id(db=db, workout_id=workout_id)
        if not items:
            return []
        target_sets = [
            WorkoutExerciseTargetSet(
                workout_id=workout_id,
                exercise_id=exercise_id,
                set_index=set_index,
                target_reps=target_reps,
                target_weight_kg=target_weight_kg,
            )
            for (exercise_id, set_index, target_reps, target_weight_kg) in items
        ]
        db.add_all(target_sets)
        await db.flush()
        return target_sets

    async def delete_by_workout_id(self, db: AsyncSession, workout_id: UUID) -> None:
        statement = delete(WorkoutExerciseTargetSet).where(
            WorkoutExerciseTargetSet.workout_id == workout_id
        )
        await db.execute(statement)
        await db.flush()


workout_exercise_target_set_repository = WorkoutExerciseTargetSetRepository()
