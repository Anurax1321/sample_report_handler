"""add_registered_date_to_samples

Revision ID: d9a1b2c3e4f5
Revises: c8f2a3b5d7e9
Create Date: 2026-03-12

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd9a1b2c3e4f5'
down_revision: Union[str, Sequence[str], None] = 'c8f2a3b5d7e9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('samples', sa.Column('registered_date', sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column('samples', 'registered_date')
