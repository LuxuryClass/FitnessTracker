from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.workout_template import (
    WorkoutTemplateCreateRequest,
    WorkoutTemplateResponse,
    WorkoutTemplateUpdateRequest,
)
from app.services import workout_template_service

router = APIRouter(prefix="/workout-templates", tags=["Шаблоны тренировок"])


@router.get("", response_model=list[WorkoutTemplateResponse], status_code=status.HTTP_200_OK)
async def list_templates(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[WorkoutTemplateResponse]:
    return await workout_template_service.list_templates(db=db, current_user=current_user)


@router.get("/{template_id}", response_model=WorkoutTemplateResponse, status_code=status.HTTP_200_OK)
async def get_template(
    template_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WorkoutTemplateResponse:
    return await workout_template_service.get_template(
        db=db,
        current_user=current_user,
        template_id=template_id,
    )


@router.post("", response_model=WorkoutTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    payload: WorkoutTemplateCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WorkoutTemplateResponse:
    return await workout_template_service.create_template(
        db=db,
        current_user=current_user,
        payload=payload,
    )


@router.patch("/{template_id}", response_model=WorkoutTemplateResponse, status_code=status.HTTP_200_OK)
async def update_template(
    template_id: UUID,
    payload: WorkoutTemplateUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WorkoutTemplateResponse:
    return await workout_template_service.update_template(
        db=db,
        current_user=current_user,
        template_id=template_id,
        payload=payload,
    )


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    await workout_template_service.delete_template(
        db=db,
        current_user=current_user,
        template_id=template_id,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{template_id}/favorite", status_code=status.HTTP_204_NO_CONTENT)
async def add_template_favorite(
    template_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    await workout_template_service.add_favorite(
        db=db,
        current_user=current_user,
        template_id=template_id,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/{template_id}/favorite", status_code=status.HTTP_204_NO_CONTENT)
async def remove_template_favorite(
    template_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    await workout_template_service.remove_favorite(
        db=db,
        current_user=current_user,
        template_id=template_id,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)