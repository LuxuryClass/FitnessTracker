from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.workout_template_exercise import WorkoutTemplateExercise


class WorkoutTemplateExerciseRepository:
    async def list_by_template_id(self, db: AsyncSession, template_id: UUID) -> list[WorkoutTemplateExercise]:
        statement = (
            select(WorkoutTemplateExercise)
            .where(WorkoutTemplateExercise.template_id == template_id)
            .order_by(WorkoutTemplateExercise.order_index)
        )
        result = await db.execute(statement)
        return list(result.scalars().all())

    async def list_by_template_ids(
        self, db: AsyncSession, template_ids: list[UUID]
    ) -> list[WorkoutTemplateExercise]:
        if not template_ids:
            return []
        statement = (
            select(WorkoutTemplateExercise)
            .where(WorkoutTemplateExercise.template_id.in_(template_ids))
            .order_by(WorkoutTemplateExercise.template_id, WorkoutTemplateExercise.order_index)
        )
        result = await db.execute(statement)
        return list(result.scalars().all())

    async def create_many(
        self,
        db: AsyncSession,
        template_id: UUID,
        exercise_ids: list[UUID],
    ) -> list[WorkoutTemplateExercise]:
        template_exercises = [
            WorkoutTemplateExercise(
                template_id=template_id,
                exercise_id=exercise_id,
                order_index=index,
            )
            for index, exercise_id in enumerate(exercise_ids, start=1)
        ]
        db.add_all(template_exercises)
        await db.flush()
        return template_exercises

    async def delete_by_template_id(self, db: AsyncSession, template_id: UUID) -> None:
        statement = delete(WorkoutTemplateExercise).where(WorkoutTemplateExercise.template_id == template_id)
        await db.execute(statement)
        await db.flush()


workout_template_exercise_repository = WorkoutTemplateExerciseRepository()