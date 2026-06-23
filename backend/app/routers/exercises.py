from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, File, Response, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.exercise import ExerciseCreateRequest, ExerciseResponse, ExerciseUpdateRequest
from app.services import exercise_service
from app.services.storage_service import storage_service

router = APIRouter(prefix="/exercises", tags=["Упражнения"])


@router.get("", response_model=list[ExerciseResponse], status_code=status.HTTP_200_OK)
async def list_exercises(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ExerciseResponse]:
    return await exercise_service.list_exercises(db=db, current_user=current_user)


@router.get("/system", response_model=list[ExerciseResponse], status_code=status.HTTP_200_OK)
async def list_system_exercises(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ExerciseResponse]:
    return await exercise_service.list_system_exercises(db=db, current_user=current_user)


@router.get("/{exercise_id}", response_model=ExerciseResponse, status_code=status.HTTP_200_OK)
async def get_exercise(
    exercise_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ExerciseResponse:
    return await exercise_service.get_exercise(db=db, current_user=current_user, exercise_id=exercise_id)


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


@router.patch("/{exercise_id}", response_model=ExerciseResponse, status_code=status.HTTP_200_OK)
async def update_exercise(
    exercise_id: UUID,
    payload: ExerciseUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ExerciseResponse:
    return await exercise_service.update_exercise(
        db=db,
        current_user=current_user,
        exercise_id=exercise_id,
        payload=payload,
    )


@router.delete("/{exercise_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exercise(
    exercise_id: UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    media_keys = await exercise_service.delete_exercise(db=db, current_user=current_user, exercise_id=exercise_id)
    # Файлы медиа чистим из bucket в фоне, чтобы не задерживать ответ.
    for media_key in media_keys:
        background_tasks.add_task(storage_service.delete_exercise_media, media_key, ignore_missing=True)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{exercise_id}/media", response_model=ExerciseResponse, status_code=status.HTTP_200_OK)
async def upload_exercise_media(
    exercise_id: UUID,
    media: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ExerciseResponse:
    return await exercise_service.upload_media(
        db=db, current_user=current_user, exercise_id=exercise_id, file=media
    )


@router.delete("/{exercise_id}/media/{media_id}", response_model=ExerciseResponse, status_code=status.HTTP_200_OK)
async def delete_exercise_media(
    exercise_id: UUID,
    media_id: UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ExerciseResponse:
    exercise_response, old_media_to_delete = await exercise_service.delete_media(
        db=db, current_user=current_user, exercise_id=exercise_id, media_id=media_id
    )
    background_tasks.add_task(storage_service.delete_exercise_media, old_media_to_delete, ignore_missing=True)
    return exercise_response


@router.post("/{exercise_id}/favorite", status_code=status.HTTP_204_NO_CONTENT)
async def add_exercise_favorite(
    exercise_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    await exercise_service.add_favorite(
        db=db,
        current_user=current_user,
        exercise_id=exercise_id,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/{exercise_id}/favorite", status_code=status.HTTP_204_NO_CONTENT)
async def remove_exercise_favorite(
    exercise_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    await exercise_service.remove_favorite(
        db=db,
        current_user=current_user,
        exercise_id=exercise_id,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
