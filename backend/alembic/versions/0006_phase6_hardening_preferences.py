"""Phase 6 hardening: candidate profile preferences

Revision ID: 0006_phase6_hardening_preferences
Revises: 0005_phase8_job_openings
Create Date: 2026-10-13 18:43:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0006_phase6_hardening_preferences'
down_revision: Union[str, None] = '0005_phase8_job_openings'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('candidate_profiles', sa.Column('preferences', sa.JSON(), nullable=True, server_default='{}'))


def downgrade() -> None:
    op.drop_column('candidate_profiles', 'preferences')
