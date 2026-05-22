from celery import Celery

from app.core.config import settings


celery_app = Celery(
    "flame_fitness",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["app.tasks.notifications"],
)

celery_app.conf.update(
    timezone="UTC",
    enable_utc=True,
    beat_schedule={
        "send-due-workout-reminders": {
            "task": "app.tasks.notifications.send_due_workout_reminders",
            "schedule": 60.0,
        }
    },
)
