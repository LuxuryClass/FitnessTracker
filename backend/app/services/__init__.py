"""Пакет сервисов."""

from app.services.auth_service import auth_service
from app.services.exercise_service import exercise_service
from app.services.guide_service import guide_service
from app.services.notification_service import notification_service
from app.services.user_service import user_service
from app.services.workout_service import workout_service
from app.services.workout_session_service import workout_session_service
from app.services.workout_template_service import workout_template_service

__all__ = [
    "auth_service",
    "workout_service",
    "exercise_service",
    "guide_service",
    "user_service",
    "workout_session_service",
    "workout_template_service",
    "notification_service",
]
