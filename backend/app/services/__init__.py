"""Пакет сервисов."""

from app.services.auth_service import auth_service
from app.services.workout_service import workout_service

__all__ = ["auth_service", "workout_service"]
