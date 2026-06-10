"""Пакет репозиториев."""

from app.repositories.exercise_repository import exercise_repository
from app.repositories.guide_repository import guide_repository
from app.repositories.notification_settings_repository import notification_settings_repository
from app.repositories.push_subscription_repository import push_subscription_repository
from app.repositories.user_repository import user_repository
from app.repositories.workout_exercise_repository import workout_exercise_repository
from app.repositories.workout_exercise_target_set_repository import workout_exercise_target_set_repository
from app.repositories.workout_notification_log_repository import workout_notification_log_repository
from app.repositories.workout_repository import workout_repository
from app.repositories.workout_session_repository import workout_session_repository
from app.repositories.workout_session_set_repository import workout_session_set_repository

__all__ = [
    "user_repository",
    "notification_settings_repository",
    "push_subscription_repository",
    "workout_notification_log_repository",
    "workout_repository",
    "exercise_repository",
    "guide_repository",
    "workout_exercise_repository",
    "workout_exercise_target_set_repository",
    "workout_session_repository",
    "workout_session_set_repository",
]
