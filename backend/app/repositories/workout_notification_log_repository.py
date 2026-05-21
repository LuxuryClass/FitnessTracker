from datetime import datetime
from uuid import UUID

from sqlalchemy import exists, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.workout_notification_log import WorkoutNotificationLog


class WorkoutNotificationLogRepository:
    async def exists_for_remind_at(
        self,
        db: AsyncSession,
        *,
        user_id: UUID,
        workout_id: UUID,
        remind_at: datetime,
    ) -> bool:
        statement = select(
            exists().where(
                WorkoutNotificationLog.user_id == user_id,
                WorkoutNotificationLog.workout_id == workout_id,
                WorkoutNotificationLog.remind_at == remind_at,
            )
        )
        result = await db.execute(statement)
        return bool(result.scalar())

    async def create(
        self,
        db: AsyncSession,
        *,
        user_id: UUID,
        workout_id: UUID,
        remind_at: datetime,
        sent_at: datetime,
    ) -> WorkoutNotificationLog:
        log = WorkoutNotificationLog(
            user_id=user_id,
            workout_id=workout_id,
            remind_at=remind_at,
            sent_at=sent_at,
        )
        db.add(log)
        await db.flush()
        return log


workout_notification_log_repository = WorkoutNotificationLogRepository()
