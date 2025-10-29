"""add reports and report_files tables

Revision ID: a1b2c3d4e5f6
Revises: 254ada664af2
Create Date: 2025-10-29 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '254ada664af2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create ReportStatus enum
    op.execute("CREATE TYPE reportstatus AS ENUM ('pending', 'processing', 'completed', 'failed')")

    # Create ReportFileType enum
    op.execute("CREATE TYPE reportfiletype AS ENUM ('AA', 'AC', 'AC_EXT')")

    # Create reports table
    op.create_table('reports',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('sample_id', sa.Integer(), nullable=False),
        sa.Column('upload_date', sa.DateTime(), nullable=False),
        sa.Column('uploaded_by', sa.String(length=128), nullable=False),
        sa.Column('num_patients', sa.Integer(), nullable=False),
        sa.Column('processing_status', sa.Enum('pending', 'processing', 'completed', 'failed', name='reportstatus'), nullable=False),
        sa.Column('error_message', sa.String(length=2048), nullable=False),
        sa.Column('output_directory', sa.String(length=512), nullable=False),
        sa.Column('date_code', sa.String(length=16), nullable=False),
        sa.ForeignKeyConstraint(['sample_id'], ['samples.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_reports_sample_id'), 'reports', ['sample_id'], unique=False)

    # Create report_files table
    op.create_table('report_files',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('report_id', sa.Integer(), nullable=False),
        sa.Column('filename', sa.String(length=256), nullable=False),
        sa.Column('file_type', sa.Enum('AA', 'AC', 'AC_EXT', name='reportfiletype'), nullable=False),
        sa.Column('file_path', sa.String(length=512), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['report_id'], ['reports.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_report_files_report_id'), 'report_files', ['report_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Drop tables
    op.drop_index(op.f('ix_report_files_report_id'), table_name='report_files')
    op.drop_table('report_files')

    op.drop_index(op.f('ix_reports_sample_id'), table_name='reports')
    op.drop_table('reports')

    # Drop enums
    op.execute("DROP TYPE reportfiletype")
    op.execute("DROP TYPE reportstatus")
