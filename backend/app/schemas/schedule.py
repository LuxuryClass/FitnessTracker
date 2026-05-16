from datetime import date
from uuid import UUID

from pydantic import BaseModel


class ScheduleWorkoutItem(BaseModel):
    id: UUID
    title: str
    date: date
    time: str | None
    status: str
    exercises_count: int
    muscle_groups: list[str]