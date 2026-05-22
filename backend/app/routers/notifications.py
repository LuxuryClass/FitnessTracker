from fastapi import APIRouter, Depends, status

from app.core.config import settings
from app.core.exceptions import BadRequestException
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.notifications import VapidPublicKeyResponse

router = APIRouter(prefix="/notifications", tags=["Уведомления"])


@router.get("/vapid-public-key", response_model=VapidPublicKeyResponse, status_code=status.HTTP_200_OK)
async def get_vapid_public_key(
    _: User = Depends(get_current_user),
) -> VapidPublicKeyResponse:
    if not settings.vapid_public_key:
        raise BadRequestException("VAPID public key не настроен.")
    return VapidPublicKeyResponse(public_key=settings.vapid_public_key)
