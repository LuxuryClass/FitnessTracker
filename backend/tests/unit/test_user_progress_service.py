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
async def test_get_recent_progress_fallback_first_weight(mock_db_session, mock_user):
    """
    Сценарий: Нет данных за 30-37 дней назад.
    Сравниваем текущий максимум (80 кг) с первым зафиксированным весом (70 кг).
    Упражнение выполнялось больше одного раза.

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
        set_repo.get_first_weight_for_exercise = AsyncMock(return_value=Decimal("70.0"))
        set_repo.count_exercise_executions = AsyncMock(return_value=3)

        result = await user_progress_service.get_recent_progress(
            db=mock_db_session, current_user=mock_user
        )

    assert result[0].difference_kg == Decimal("10.0")
    assert result[0].previous_max_weight_kg == Decimal("70.0")


@pytest.mark.asyncio
async def test_get_recent_progress_single_execution_skipped(mock_db_session, mock_user):
    """
    Сценарий: Упражнение выполнено всего один раз.
    Сервис не должен включать его в прогресс, даже если оба периода показывают одинаковый вес.

    Ожидается: Пустой список.
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

        # recent_max = 50, old_max = None – переходим к первому весу
        set_repo.get_max_weight_in_period = AsyncMock()
        set_repo.get_max_weight_in_period.side_effect = [Decimal("50.0"), None]
        set_repo.get_first_weight_for_exercise = AsyncMock(return_value=Decimal("50.0"))
        # Всего одно выполнение – должно быть пропущено
        set_repo.count_exercise_executions = AsyncMock(return_value=1)

        result = await user_progress_service.get_recent_progress(
            db=mock_db_session, current_user=mock_user
        )

    assert len(result) == 0