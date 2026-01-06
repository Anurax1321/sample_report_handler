"""add_processed_data_to_reports

Revision ID: 16f236539cc7
Revises: f6bdc4155bcd
Create Date: 2026-01-06 01:02:53.614023

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '16f236539cc7'
down_revision: Union[str, Sequence[str], None] = 'f6bdc4155bcd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('reports', schema=None) as batch_op:
        batch_op.add_column(sa.Column('processed_data', sa.Text(), nullable=False, server_default=''))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('reports', schema=None) as batch_op:
        batch_op.drop_column('processed_data')
