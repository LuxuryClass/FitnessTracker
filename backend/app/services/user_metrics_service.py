from __future__ import annotations

from datetime import datetime, time, timedelta, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories import workout_repository, workout_session_repository
from app.schemas.user import UserResponse, WeeklySessionsProgress
from app.services.storage_service import storage_service


def _get_week_bounds(now_utc: datetime) -> tuple[datetime, datetime]:
    week_start_date = now_utc.date() - timedelta(days=now_utc.weekday())
    week_start = datetime.combine(week_start_date, time.min, tzinfo=timezone.utc)
    week_end = week_start + timedelta(days=7)
    return week_start, week_end


async def build_weekly_sessions_progress(db: AsyncSession, user_id: UUID) -> WeeklySessionsProgress:
    now_utc = datetime.now(timezone.utc)
    week_start, week_end = _get_week_bounds(now_utc)

    completed = await workout_session_repository.count_completed_in_range(
        db=db,
        user_id=user_id,
        range_start=week_start,
        range_end=week_end,
    )
    future_planned = await workout_repository.count_planned_in_range(
        db=db,
        user_id=user_id,
        range_start=now_utc,
        range_end=week_end,
    )

    return WeeklySessionsProgress(completed=completed, total=completed + future_planned)


async def build_user_response(db: AsyncSession, user: User) -> UserResponse:
    weekly_sessions_progress = await build_weekly_sessions_progress(db=db, user_id=user.id)
    avatar_url = await storage_service.build_avatar_access_url(user.avatar_url)
    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        gender=user.gender,
        birth_date=user.birth_date,
        height=user.height,
        weight=user.weight,
        avatar_url=avatar_url,
        is_active=user.is_active,
        streak_weeks=user.streak_weeks,
        weekly_volume_tons=user.weekly_volume_tons,
        weekly_sessions_progress=weekly_sessions_progress,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )
