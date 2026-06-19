from datetime import date
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.schedule import ScheduleWorkoutItem
from app.schemas.workout import (
    NextWorkoutResponse,
    WorkoutBatchCreateRequest,
    WorkoutCreateRequest,
    WorkoutResponse,
    WorkoutUpdateRequest,
)
from app.services import workout_service

router = APIRouter(prefix="/workouts", tags=["Тренировки"])


@router.get("/schedule", response_model=list[ScheduleWorkoutItem], status_code=status.HTTP_200_OK)
async def get_schedule(
    date_from: date,
    date_to: date,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ScheduleWorkoutItem]:
    return await workout_service.get_schedule(
        db=db,
        current_user=current_user,
        date_from=date_from,
        date_to=date_to,
    )


@router.get("/next", response_model=NextWorkoutResponse | None, status_code=status.HTTP_200_OK)
async def get_next_workout(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NextWorkoutResponse | None:
    return await workout_service.get_next_workout(db=db, current_user=current_user)


@router.get("", response_model=list[WorkoutResponse], status_code=status.HTTP_200_OK)
async def list_workouts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[WorkoutResponse]:
    return await workout_service.list_workouts(db=db, current_user=current_user)


@router.get("/{workout_id}", response_model=WorkoutResponse, status_code=status.HTTP_200_OK)
async def get_workout(
    workout_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WorkoutResponse:
    return await workout_service.get_workout(db=db, current_user=current_user, workout_id=workout_id)


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


@router.post("/batch", response_model=list[WorkoutResponse], status_code=status.HTTP_201_CREATED)
async def create_workouts_batch(
    payload: WorkoutBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[WorkoutResponse]:
    return await workout_service.create_workouts_batch(
        db=db,
        current_user=current_user,
        payload=payload,
    )


@router.patch("/{workout_id}", response_model=WorkoutResponse, status_code=status.HTTP_200_OK)
async def update_workout(
    workout_id: UUID,
    payload: WorkoutUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WorkoutResponse:
    return await workout_service.update_workout(
        db=db,
        current_user=current_user,
        workout_id=workout_id,
        payload=payload,
    )


@router.delete("/{workout_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workout(
    workout_id: UUID,
    scope: Literal["this", "following", "all"] = "this",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    await workout_service.delete_workout(
        db=db,
        current_user=current_user,
        workout_id=workout_id,
        scope=scope,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
