from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.workout_session import (
    WorkoutSessionResponse,
    WorkoutSessionSetResponse,
    WorkoutSessionSetUpsertRequest,
    WorkoutSessionStartRequest,
)
from app.services import workout_session_service

router = APIRouter(prefix="/workout-sessions", tags=["Тренировочные сессии"])


@router.post("/start", response_model=WorkoutSessionResponse, status_code=status.HTTP_200_OK)
async def start_workout_session(
    payload: WorkoutSessionStartRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WorkoutSessionResponse:
    return await workout_session_service.start_session(
        db=db,
        current_user=current_user,
        payload=payload,
    )


@router.get("/active", response_model=WorkoutSessionResponse | None, status_code=status.HTTP_200_OK)
async def get_active_workout_session(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WorkoutSessionResponse | None:
    return await workout_session_service.get_active_session(db=db, current_user=current_user)


@router.get("/{session_id}", response_model=WorkoutSessionResponse, status_code=status.HTTP_200_OK)
async def get_workout_session(
    session_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WorkoutSessionResponse:
    return await workout_session_service.get_session(db=db, current_user=current_user, session_id=session_id)


@router.post("/{session_id}/sets", response_model=WorkoutSessionSetResponse, status_code=status.HTTP_200_OK)
async def upsert_workout_session_set(
    session_id: UUID,
    payload: WorkoutSessionSetUpsertRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WorkoutSessionSetResponse:
    return await workout_session_service.upsert_session_set(
        db=db,
        current_user=current_user,
        session_id=session_id,
        payload=payload,
    )


@router.delete("/{session_id}/sets/{set_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workout_session_set(
    session_id: UUID,
    set_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    await workout_session_service.delete_session_set(
        db=db,
        current_user=current_user,
        session_id=session_id,
        set_id=set_id,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{session_id}/complete", response_model=WorkoutSessionResponse, status_code=status.HTTP_200_OK)
async def complete_workout_session(
    session_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WorkoutSessionResponse:
    return await workout_session_service.complete_session(
        db=db,
        current_user=current_user,
        session_id=session_id,
    )
