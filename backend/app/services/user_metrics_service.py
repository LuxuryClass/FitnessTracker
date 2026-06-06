from __future__ import annotations

from datetime import datetime, time, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories import (
    workout_repository,
    workout_session_repository,
    workout_session_set_repository,
)
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
    planned_this_week = await workout_repository.count_planned_in_range(
        db=db,
        user_id=user_id,
        range_start=week_start,
        range_end=week_end,
    )

    return WeeklySessionsProgress(completed=completed, total=planned_this_week)


async def build_weekly_volume_tons(db: AsyncSession, user_id: UUID) -> Decimal:
    now_utc = datetime.now(timezone.utc)
    week_start, week_end = _get_week_bounds(now_utc)

    weekly_volume_tons = await workout_session_set_repository.calculate_weekly_volume_tons(
        db=db,
        user_id=user_id,
        week_start=week_start,
        week_end=week_end,
    )
    return weekly_volume_tons.quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)


async def build_streak_weeks(db: AsyncSession, user_id: UUID) -> int:
    now_utc = datetime.now(timezone.utc)
    current_week_start_date = now_utc.date() - timedelta(days=now_utc.weekday())

    completed_week_starts = await workout_session_repository.list_completed_week_starts(db, user_id)
    completed_week_start_dates = {week_start.date() for week_start in completed_week_starts}

    if current_week_start_date in completed_week_start_dates:
        check_week = current_week_start_date
    else:
        check_week = current_week_start_date - timedelta(days=7)

    streak_weeks = 0
    while check_week in completed_week_start_dates:
        streak_weeks += 1
        check_week -= timedelta(days=7)

    return streak_weeks


async def build_user_response(db: AsyncSession, user: User) -> UserResponse:
    weekly_sessions_progress = await build_weekly_sessions_progress(db=db, user_id=user.id)
    streak_weeks = await build_streak_weeks(db=db, user_id=user.id)
    weekly_volume_tons = await build_weekly_volume_tons(db=db, user_id=user.id)
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
        streak_weeks=streak_weeks,
        weekly_volume_tons=weekly_volume_tons,
        weekly_sessions_progress=weekly_sessions_progress,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )
