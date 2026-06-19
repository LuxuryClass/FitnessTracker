from __future__ import annotations

from collections import Counter
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.exercise import Exercise
from app.models.user import User
from app.repositories import exercise_repository, workout_session_set_repository
from app.schemas.exercise import KNOWN_MUSCLE_SLUGS, PRIMARY_GROUP_TO_MUSCLE_SLUGS
from app.schemas.user import RecentProgressResponse, WeeklyMuscleFocusItem
from app.services.user_metrics_service import _get_week_bounds


def _resolve_exercise_muscle_slugs(exercise: Exercise) -> set[str]:
    secondary = {slug.strip().lower() for slug in exercise.secondary_muscles}
    candidates: set[str] = set()
    claimed: set[str] = set()

    for group in exercise.primary_muscle_groups:
        group_slugs = set(PRIMARY_GROUP_TO_MUSCLE_SLUGS.get(group, ()))
        group_secondary = secondary & group_slugs
        if group_secondary:
            candidates |= group_secondary
            claimed |= group_secondary
        else:
            candidates |= group_slugs

    # Вторичные, не попавшие ни в одну группу, добавляем как есть.
    candidates |= secondary - claimed

    return candidates & KNOWN_MUSCLE_SLUGS


class UserProgressService:
    async def get_recent_progress(
        self,
        db: AsyncSession,
        current_user: User,
        limit: int = 3,
    ) -> list[RecentProgressResponse]:
        """
        Возвращает топ-N упражнений по частоте выполнения за последние 30 дней с расчётом прогресса.

        Логика расчёта прогресса:
        - Если есть данные за 30-37 дней назад: сравниваем максимум последних 7 дней с максимумом 30-37 дней назад
        - Если данных за 30-37 дней нет: сравниваем максимум последних 7 дней с лучшим результатом
          по всей истории СТРОГО ДО последних 7 дней. Если такой истории нет (упражнение новое —
          впервые выполнено в последние 7 дней), база сравнения = 0, и весь поднятый вес = прирост.
        """
        now_utc = datetime.now(timezone.utc)

        # Временные границы
        last_7_days_start = now_utc - timedelta(days=7)
        last_30_days_start = now_utc - timedelta(days=30)
        old_period_start = now_utc - timedelta(days=37)
        old_period_end = now_utc - timedelta(days=30)

        # Получаем статистику по упражнениям за последние 30 дней
        exercise_stats = await workout_session_set_repository.get_exercise_frequency_stats(
            db=db,
            user_id=current_user.id,
            period_start=last_30_days_start,
            period_end=now_utc,
        )

        if not exercise_stats:
            return []

        # Сортируем по частоте выполнения (количество подходов) и берём топ-N
        sorted_exercises = sorted(exercise_stats, key=lambda x: x["total_sets"], reverse=True)[:limit]
        exercise_ids = [item["exercise_id"] for item in sorted_exercises]

        # Получаем данные упражнений
        exercises = await exercise_repository.get_by_ids(db, exercise_ids)
        exercise_map = {exercise.id: exercise for exercise in exercises}

        result: list[RecentProgressResponse] = []

        for exercise_stat in sorted_exercises:
            exercise_id = exercise_stat["exercise_id"]
            exercise = exercise_map.get(exercise_id)
            if exercise is None:
                continue

            # Получаем максимальный вес за последние 7 дней
            recent_max = await workout_session_set_repository.get_max_weight_in_period(
                db=db,
                user_id=current_user.id,
                exercise_id=exercise_id,
                period_start=last_7_days_start,
                period_end=now_utc,
            )

            if recent_max is None:
                continue

            # Пытаемся получить максимальный вес за период 30-37 дней назад
            old_max = await workout_session_set_repository.get_max_weight_in_period(
                db=db,
                user_id=current_user.id,
                exercise_id=exercise_id,
                period_start=old_period_start,
                period_end=old_period_end,
            )

            if old_max is not None:
                # Есть данные за месяц назад — сравниваем с ними
                previous_max = old_max
                difference = recent_max - old_max
            else:
                # Нет данных за месяц назад — база = лучший результат СТРОГО ДО последних 7 дней.
                # Если истории до недавнего окна нет (упражнение новое), база = 0,
                # и весь поднятый вес считается приростом.
                previous_max = await workout_session_set_repository.get_max_weight_before(
                    db=db,
                    user_id=current_user.id,
                    exercise_id=exercise_id,
                    before=last_7_days_start,
                ) or Decimal(0)
                difference = recent_max - previous_max

            # Берём первую primary-группу мышц для отображения; если групп нет — None
            muscle_group = exercise.primary_muscle_groups[0] if exercise.primary_muscle_groups else None

            result.append(
                RecentProgressResponse(
                    exercise_id=exercise_id,
                    exercise_name=exercise.name,
                    muscle_group=muscle_group,
                    difference_kg=difference,
                    recent_max_weight_kg=recent_max,
                    previous_max_weight_kg=previous_max,
                )
            )

        return result

    async def get_weekly_muscle_focus(
        self,
        db: AsyncSession,
        current_user: User,
    ) -> list[WeeklyMuscleFocusItem]:
        now_utc = datetime.now(timezone.utc)
        week_start, week_end = _get_week_bounds(now_utc)

        pairs = await workout_session_set_repository.list_session_exercise_pairs_in_range(
            db=db,
            user_id=current_user.id,
            period_start=week_start,
            period_end=week_end,
        )

        if not pairs:
            return []

        exercise_ids = list({exercise_id for _, exercise_id in pairs})
        exercises = await exercise_repository.get_by_ids(db, exercise_ids)
        exercise_map = {exercise.id: exercise for exercise in exercises}

        slugs_by_session: dict[UUID, set[str]] = {}
        for session_id, exercise_id in pairs:
            exercise = exercise_map.get(exercise_id)
            if exercise is None:
                continue
            slugs_by_session.setdefault(session_id, set()).update(
                _resolve_exercise_muscle_slugs(exercise)
            )

        intensity_counter: Counter[str] = Counter()
        for slugs in slugs_by_session.values():
            intensity_counter.update(slugs)

        return [
            WeeklyMuscleFocusItem(muscle=muscle, intensity=intensity)
            for muscle, intensity in intensity_counter.most_common()
        ]


user_progress_service = UserProgressService()
