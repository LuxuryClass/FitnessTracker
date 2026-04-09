from fastapi import APIRouter

from app.core.config import settings


api_router = APIRouter(prefix=settings.api_prefix)
