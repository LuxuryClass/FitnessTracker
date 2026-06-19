from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.guide import (
    GuideArticleListItem,
    GuideArticleResponse,
    GuideCategoryLandingResponse,
    GuideCategoryListItem,
)
from app.services import guide_service

router = APIRouter(prefix="/guide", tags=["Справочник"])


@router.get("/categories", response_model=list[GuideCategoryListItem], status_code=status.HTTP_200_OK)
async def list_categories(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[GuideCategoryListItem]:
    return await guide_service.list_categories(db=db)


@router.get("/categories/{category_id}", response_model=GuideCategoryLandingResponse, status_code=status.HTTP_200_OK)
async def get_category_landing(
    category_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> GuideCategoryLandingResponse:
    return await guide_service.get_category_landing(db=db, current_user=current_user, category_id=category_id)


@router.get("/categories/{category_id}/articles", response_model=list[GuideArticleListItem], status_code=status.HTTP_200_OK)
async def list_category_articles(
    category_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[GuideArticleListItem]:
    return await guide_service.list_category_articles(db=db, current_user=current_user, category_id=category_id)


@router.get("/articles/{article_id}", response_model=GuideArticleResponse, status_code=status.HTTP_200_OK)
async def get_article(
    article_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> GuideArticleResponse:
    return await guide_service.get_article(db=db, current_user=current_user, article_id=article_id)


@router.post("/articles/{article_id}/favorite", status_code=status.HTTP_204_NO_CONTENT)
async def add_article_to_favorites(
    article_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    await guide_service.add_favorite(db=db, current_user=current_user, article_id=article_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/articles/{article_id}/favorite", status_code=status.HTTP_204_NO_CONTENT)
async def remove_article_from_favorites(
    article_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    await guide_service.remove_favorite(db=db, current_user=current_user, article_id=article_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# Публичный эндпоинт (без get_current_user): браузер грузит <img>/<video> из markdown
# без Authorization-заголовка. Отдаём 307-редирект на свежий presigned URL, поэтому
# ссылки в тексте статьи не протухают, а бакет остаётся приватным.
@router.get("/media/{object_key:path}", status_code=status.HTTP_307_TEMPORARY_REDIRECT)
async def get_guide_media(object_key: str) -> RedirectResponse:
    url = await guide_service.build_media_redirect_url(object_key)
    return RedirectResponse(url=url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)