"""make_sample_id_and_num_patients_nullable

Revision ID: f6bdc4155bcd
Revises: a1b2c3d4e5f6
Create Date: 2026-01-05 13:30:44.945321

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f6bdc4155bcd'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Make sample_id nullable
    with op.batch_alter_table('reports', schema=None) as batch_op:
        batch_op.alter_column('sample_id',
                              existing_type=sa.INTEGER(),
                              nullable=True)
        batch_op.alter_column('num_patients',
                              existing_type=sa.INTEGER(),
                              nullable=True)


def downgrade() -> None:
    """Downgrade schema."""
    # Make sample_id and num_patients non-nullable again
    with op.batch_alter_table('reports', schema=None) as batch_op:
        batch_op.alter_column('num_patients',
                              existing_type=sa.INTEGER(),
                              nullable=False)
        batch_op.alter_column('sample_id',
                              existing_type=sa.INTEGER(),
                              nullable=False)
