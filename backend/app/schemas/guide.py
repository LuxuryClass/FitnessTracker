from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class GuideArticleListItem(BaseModel):
    id: UUID
    title: str
    description: str | None
    icon_url: str | None
    reading_time_minutes: int
    views_count: int
    is_favorite: bool

    model_config = ConfigDict(from_attributes=True)


class GuideArticleResponse(BaseModel):
    id: UUID
    guide_category_id: UUID
    title: str
    description: str | None
    icon_url: str | None
    reading_time_minutes: int
    views_count: int
    is_favorite: bool
    content: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GuideCategoryListItem(BaseModel):
    id: UUID
    name: str
    description: str | None
    icon_url: str | None
    articles_count: int

    model_config = ConfigDict(from_attributes=True)


class GuideCategoryLandingResponse(BaseModel):
    id: UUID
    name: str
    description: str | None
    icon_url: str | None
    articles_count: int
    featured: list[GuideArticleListItem] = Field(default_factory=list)
    popular: list[GuideArticleListItem] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)