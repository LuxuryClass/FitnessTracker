"""
Юнит-тесты для UserProgressService.
Проверка расчёта прогресса по упражнениям при разных наборах данных.
"""

import pytest
from unittest.mock import patch, AsyncMock
from uuid import uuid4
from decimal import Decimal

from app.services.user_progress_service import user_progress_service
from tests.conftest import create_mock_exercise


@pytest.mark.asyncio
async def test_get_recent_progress_with_old_data(mock_db_session, mock_user):
    """
    Сценарий: Есть данные за последние 7 дней и 30-37 дней назад.
    Максимумы: 100 кг сейчас, 95 кг месяц назад → прогресс 5 кг.

    Ожидается: Один элемент с разницей 5 кг и правильными весами.
    """
    exercise_id = uuid4()
    exercise = create_mock_exercise({
        "id": exercise_id,
        "name": "Приседания",
        "primary_muscle_groups": ["legs"],
        "secondary_muscles": ["quadriceps"],
    })

    with patch("app.services.user_progress_service.workout_session_set_repository") as set_repo, \
         patch("app.services.user_progress_service.exercise_repository") as ex_repo:
        set_repo.get_exercise_frequency_stats = AsyncMock(
            return_value=[{"exercise_id": exercise_id, "total_sets": 10}]
        )
        ex_repo.get_by_ids = AsyncMock(return_value=[exercise])

        # Первый вызов – recent_max (100), второй – old_max (95)
        set_repo.get_max_weight_in_period = AsyncMock()
        set_repo.get_max_weight_in_period.side_effect = [Decimal("100.0"), Decimal("95.0")]

        result = await user_progress_service.get_recent_progress(
            db=mock_db_session, current_user=mock_user
        )

    assert len(result) == 1
    assert result[0].difference_kg == Decimal("5.0")
    assert result[0].recent_max_weight_kg == Decimal("100.0")
    assert result[0].previous_max_weight_kg == Decimal("95.0")


@pytest.mark.asyncio
async def test_get_recent_progress_fallback_history_before_recent(mock_db_session, mock_user):
    """
    Сценарий: Нет данных за 30-37 дней назад, но есть история ДО последних 7 дней.
    Сравниваем текущий максимум (80 кг) с лучшим результатом до недавнего окна (70 кг).

    Ожидается: Прогресс = 10 кг, previous_max = 70 кг.
    """
    exercise_id = uuid4()
    exercise = create_mock_exercise({
        "id": exercise_id,
        "name": "Жим",
        "primary_muscle_groups": ["chest"],
        "secondary_muscles": ["chest"],
    })

    with patch("app.services.user_progress_service.workout_session_set_repository") as set_repo, \
         patch("app.services.user_progress_service.exercise_repository") as ex_repo:
        set_repo.get_exercise_frequency_stats = AsyncMock(
            return_value=[{"exercise_id": exercise_id, "total_sets": 8}]
        )
        ex_repo.get_by_ids = AsyncMock(return_value=[exercise])

        # recent_max = 80, old_max = None
        set_repo.get_max_weight_in_period = AsyncMock()
        set_repo.get_max_weight_in_period.side_effect = [Decimal("80.0"), None]
        set_repo.get_max_weight_before = AsyncMock(return_value=Decimal("70.0"))

        result = await user_progress_service.get_recent_progress(
            db=mock_db_session, current_user=mock_user
        )

    assert result[0].difference_kg == Decimal("10.0")
    assert result[0].previous_max_weight_kg == Decimal("70.0")


@pytest.mark.asyncio
async def test_get_recent_progress_new_exercise_full_weight(mock_db_session, mock_user):
    """
    Сценарий: Новое упражнение — впервые выполнено в последние 7 дней.
    Нет данных за 30-37 дней и нет истории до недавнего окна (база = 0).

    Ожидается: Прогресс = весь поднятый максимум (12 кг), previous_max = 0.
    """
    exercise_id = uuid4()
    exercise = create_mock_exercise({
        "id": exercise_id,
        "name": "Планка",
        "primary_muscle_groups": ["core"],
        "secondary_muscles": ["abs"],
    })

    with patch("app.services.user_progress_service.workout_session_set_repository") as set_repo, \
         patch("app.services.user_progress_service.exercise_repository") as ex_repo:
        set_repo.get_exercise_frequency_stats = AsyncMock(
            return_value=[{"exercise_id": exercise_id, "total_sets": 3}]
        )
        ex_repo.get_by_ids = AsyncMock(return_value=[exercise])

        # recent_max = 12, old_max = None, истории до недавнего окна нет - база 0
        set_repo.get_max_weight_in_period = AsyncMock()
        set_repo.get_max_weight_in_period.side_effect = [Decimal("12.0"), None]
        set_repo.get_max_weight_before = AsyncMock(return_value=None)

        result = await user_progress_service.get_recent_progress(
            db=mock_db_session, current_user=mock_user
        )

    assert result[0].difference_kg == Decimal("12.0")
    assert result[0].previous_max_weight_kg == Decimal("0")