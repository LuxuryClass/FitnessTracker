import asyncio
import json
import logging
from datetime import datetime, timedelta, timezone

from pywebpush import WebPushException, webpush
from sqlalchemy import select

from app.core.celery_app import celery_app
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.user_notification_settings import UserNotificationSettings
from app.models.workout import Workout
from app.repositories import (
    push_subscription_repository,
    workout_notification_log_repository,
    workout_session_repository,
)

logger = logging.getLogger(__name__)


async def _send_due_workout_reminders() -> None:
    if not settings.vapid_public_key or not settings.vapid_private_key:
        logger.warning("VAPID ключи не настроены, отправка уведомлений пропущена.")
        return

    now_utc = datetime.now(timezone.utc)
    window_end = now_utc + timedelta(minutes=1440)

    async with AsyncSessionLocal() as db:
        statement = (
            select(Workout, UserNotificationSettings)
            .join(UserNotificationSettings, UserNotificationSettings.user_id == Workout.user_id)
            .where(
                Workout.is_planned.is_(True),
                Workout.planned_for.is_not(None),
                Workout.planned_for >= now_utc,
                Workout.planned_for <= window_end,
                UserNotificationSettings.enabled.is_(True),
                UserNotificationSettings.reminders.is_(True),
                UserNotificationSettings.do_not_disturb.is_(False),
            )
        )
        result = await db.execute(statement)
        rows = result.all()
        if not rows:
            return

        workout_ids = [workout.id for workout, _ in rows]
        completed_workout_ids = await workout_session_repository.list_completed_workout_ids(db, workout_ids)

        for workout, notify_settings in rows:
            if workout.id in completed_workout_ids:
                continue

            planned_for = workout.planned_for
            if planned_for is None or planned_for < now_utc:
                continue

            remind_at = planned_for - timedelta(minutes=notify_settings.reminder_offset_minutes)
            if remind_at > now_utc:
                continue

            already_sent = await workout_notification_log_repository.exists_for_remind_at(
                db=db,
                user_id=workout.user_id,
                workout_id=workout.id,
                remind_at=remind_at,
            )
            if already_sent:
                continue

            subscriptions = await push_subscription_repository.list_by_user_id(db, workout.user_id)
            if not subscriptions:
                continue

            payload = json.dumps(
                {
                    "title": f"Тренировка скоро: {workout.title}",
                    "body": f"Запланировано на {planned_for.strftime('%H:%M')}",
                    "sound": notify_settings.sound,
                    "vibration": notify_settings.vibration,
                    "url": "/",
                }
            )

            sent_any = False
            deleted_any = False
            for subscription in subscriptions:
                try:
                    await asyncio.to_thread(
                        webpush,
                        {"endpoint": subscription.endpoint, "keys": {"p256dh": subscription.p256dh, "auth": subscription.auth}},
                        payload,
                        vapid_private_key=settings.vapid_private_key,
                        vapid_claims={"sub": settings.vapid_subject},
                    )
                    sent_any = True
                except WebPushException as exc:
                    status_code = getattr(exc.response, "status_code", None)
                    if status_code in (404, 410):
                        await push_subscription_repository.delete_by_endpoint(db=db, endpoint=subscription.endpoint)
                        deleted_any = True
                    else:
                        logger.warning("Не удалось отправить push: %s", exc)

            if sent_any:
                await workout_notification_log_repository.create(
                    db=db,
                    user_id=workout.user_id,
                    workout_id=workout.id,
                    remind_at=remind_at,
                    sent_at=now_utc,
                )
            if sent_any or deleted_any:
                await db.commit()


@celery_app.task(name="app.tasks.notifications.send_due_workout_reminders")
def send_due_workout_reminders() -> None:
    asyncio.run(_send_due_workout_reminders())
