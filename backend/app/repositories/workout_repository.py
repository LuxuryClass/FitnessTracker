from datetime import datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.workout import Workout


class WorkoutRepository:
    async def create(
        self,
        db: AsyncSession,
        user_id: UUID,
        title: str,
        is_planned: bool,
        planned_for: datetime | None,
        description: str | None,
    ) -> Workout:
        workout = Workout(
            user_id=user_id,
            title=title,
            is_planned=is_planned,
            planned_for=planned_for,
            description=description,
        )
        db.add(workout)
        await db.flush()
        return workout


workout_repository = WorkoutRepository()
