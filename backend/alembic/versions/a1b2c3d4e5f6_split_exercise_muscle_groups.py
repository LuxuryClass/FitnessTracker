"""split exercise muscle_groups into primary_muscle_groups and secondary_muscles

Идентификатор ревизии: a1b2c3d4e5f6
Предыдущая ревизия: fdb5307c3980
Дата создания: 2026-05-28
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "fdb5307c3980"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


RU_TO_SECONDARY: dict[str, str] = {
    "грудь": "chest",
    "спина": "upper-back",
    "трицепс": "triceps",
    "бицепс": "biceps",
    "плечи": "deltoids",
    "передние дельты": "deltoids",
    "квадрицепсы": "quadriceps",
    "ягодицы": "gluteal",
    "бицепс бедра": "hamstring",
    "кор": "abs",
}


SECONDARY_TO_PRIMARY: dict[str, str] = {
    "chest": "chest",
    "upper-back": "back",
    "lower-back": "back",
    "trapezius": "back",
    "biceps": "arms",
    "triceps": "arms",
    "forearm": "arms",
    "deltoids": "shoulders",
    "quadriceps": "legs",
    "hamstring": "legs",
    "gluteal": "legs",
    "calves": "legs",
    "adductors": "legs",
    "abductors": "legs",
    "tibialis": "legs",
    "abs": "core",
    "obliques": "core",
}


def _dedup(values: list[str]) -> list[str]:
    seen: set[str] = set()
    deduped: list[str] = []
    for value in values:
        if value and value not in seen:
            seen.add(value)
            deduped.append(value)
    return deduped


def upgrade() -> None:
    op.add_column(
        "exercises",
        sa.Column(
            "primary_muscle_groups",
            postgresql.ARRAY(sa.String(length=50)),
            nullable=False,
            server_default="{}",
        ),
    )
    op.add_column(
        "exercises",
        sa.Column(
            "secondary_muscles",
            postgresql.ARRAY(sa.String(length=50)),
            nullable=False,
            server_default="{}",
        ),
    )

    conn = op.get_bind()
    rows = conn.execute(sa.text("SELECT id, muscle_groups FROM exercises")).fetchall()

    rows_with_empty_primary: list[str] = []

    for row in rows:
        old_groups: list[str] = list(row.muscle_groups or [])
        secondary: list[str] = []
        for raw in old_groups:
            normalized = (raw or "").strip().lower()
            if not normalized:
                continue
            mapped = RU_TO_SECONDARY.get(normalized, normalized)
            secondary.append(mapped)
        secondary = _dedup(secondary)

        primary: list[str] = []
        for sec in secondary:
            mapped_primary = SECONDARY_TO_PRIMARY.get(sec)
            if mapped_primary is not None:
                primary.append(mapped_primary)
        primary = _dedup(primary)

        if not primary:
            rows_with_empty_primary.append(str(row.id))
            continue

        conn.execute(
            sa.text(
                "UPDATE exercises "
                "SET primary_muscle_groups = :primary, secondary_muscles = :secondary "
                "WHERE id = :id"
            ),
            {"primary": primary, "secondary": secondary, "id": row.id},
        )

    if rows_with_empty_primary:
        raise RuntimeError(
            "Migration failed: cannot derive primary_muscle_groups for exercises: "
            f"{rows_with_empty_primary}. Inspect the data and add mappings."
        )

    op.alter_column("exercises", "primary_muscle_groups", server_default=None)
    op.alter_column("exercises", "secondary_muscles", server_default="{}")

    op.drop_constraint(
        "ck_exercises_muscle_groups_not_empty",
        "exercises",
        type_="check",
    )
    op.create_check_constraint(
        "ck_exercises_primary_muscle_groups_not_empty",
        "exercises",
        "cardinality(primary_muscle_groups) >= 1",
    )

    op.drop_column("exercises", "muscle_groups")


def downgrade() -> None:
    op.add_column(
        "exercises",
        sa.Column(
            "muscle_groups",
            postgresql.ARRAY(sa.String(length=100)),
            nullable=False,
            server_default="{}",
        ),
    )

    conn = op.get_bind()
    conn.execute(
        sa.text("UPDATE exercises SET muscle_groups = secondary_muscles")
    )

    op.alter_column("exercises", "muscle_groups", server_default=None)

    op.drop_constraint(
        "ck_exercises_primary_muscle_groups_not_empty",
        "exercises",
        type_="check",
    )
    op.create_check_constraint(
        "ck_exercises_muscle_groups_not_empty",
        "exercises",
        "cardinality(muscle_groups) > 0",
    )

    op.drop_column("exercises", "secondary_muscles")
    op.drop_column("exercises", "primary_muscle_groups")
