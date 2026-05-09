"""rename username to name in users

Идентификатор ревизии: 9a509fd4ada5
Предыдущая ревизия: 5109d6a0dd31
Дата создания: 2026-05-09 12:46:06.121356
"""
from typing import Sequence, Union

from alembic import op



revision: str = '9a509fd4ada5'
down_revision: Union[str, None] = '5109d6a0dd31'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("users", "username", new_column_name="name")
    op.execute("ALTER INDEX ix_users_username RENAME TO ix_users_name")


def downgrade() -> None:
    op.execute("ALTER INDEX ix_users_name RENAME TO ix_users_username")
    op.alter_column("users", "name", new_column_name="username")
