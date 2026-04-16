"""Пакет репозиториев."""

from app.repositories.exercise_repository import exercise_repository
from app.repositories.user_repository import user_repository
from app.repositories.workout_exercise_repository import workout_exercise_repository
from app.repositories.workout_repository import workout_repository

__all__ = [
    "user_repository",
    "workout_repository",
    "exercise_repository",
    "workout_exercise_repository",
]
