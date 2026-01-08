"""add_excel_fields_to_sample

Revision ID: 381a58feed00
Revises: 16f236539cc7
Create Date: 2026-01-08 11:03:46.872756

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '381a58feed00'
down_revision: Union[str, Sequence[str], None] = '16f236539cc7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add new columns to samples table with default values for existing rows
    with op.batch_alter_table('samples', schema=None) as batch_op:
        batch_op.add_column(sa.Column('patient_id', sa.String(length=256), nullable=False, server_default=''))
        batch_op.add_column(sa.Column('age_gender', sa.String(length=64), nullable=False, server_default=''))
        batch_op.add_column(sa.Column('from_hospital', sa.String(length=256), nullable=False, server_default=''))
        batch_op.add_column(sa.Column('type_of_analysis', sa.String(length=64), nullable=False, server_default=''))
        batch_op.add_column(sa.Column('type_of_sample', sa.String(length=64), nullable=False, server_default=''))
        batch_op.add_column(sa.Column('collection_date', sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()))
        batch_op.add_column(sa.Column('reported_on', sa.DateTime(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # Drop new columns from samples table
    with op.batch_alter_table('samples', schema=None) as batch_op:
        batch_op.drop_column('reported_on')
        batch_op.drop_column('collection_date')
        batch_op.drop_column('type_of_sample')
        batch_op.drop_column('type_of_analysis')
        batch_op.drop_column('from_hospital')
        batch_op.drop_column('age_gender')
        batch_op.drop_column('patient_id')
