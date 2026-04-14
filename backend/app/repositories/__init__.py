"""Пакет репозиториев."""

from app.repositories.user_repository import user_repository
from app.repositories.workout_repository import workout_repository

__all__ = ["user_repository", "workout_repository"]
