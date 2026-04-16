from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.exercise import ExerciseCreateRequest, ExerciseResponse
from app.services import exercise_service

router = APIRouter(prefix="/exercises", tags=["Упражнения"])


@router.post("", response_model=ExerciseResponse, status_code=status.HTTP_201_CREATED)
async def create_exercise(
    payload: ExerciseCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ExerciseResponse:
    return await exercise_service.create_exercise(
        db=db,
        current_user=current_user,
        payload=payload,
    )
