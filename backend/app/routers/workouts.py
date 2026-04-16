from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.workout import WorkoutCreateRequest, WorkoutResponse
from app.services import workout_service

router = APIRouter(prefix="/workouts", tags=["Тренировки"])


@router.post("", response_model=WorkoutResponse, status_code=status.HTTP_201_CREATED)
async def create_workout(
    payload: WorkoutCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WorkoutResponse:
    return await workout_service.create_workout(
        db=db,
        current_user=current_user,
        payload=payload,
    )
