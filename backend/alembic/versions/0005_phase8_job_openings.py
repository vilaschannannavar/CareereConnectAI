"""Phase 8 job openings tracking and official career pages

Revision ID: 0005_phase8_job_openings
Revises: 0004_phase5_messaging_state_machine
Create Date: 2026-10-13 18:30:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0005_phase8_job_openings'
down_revision: Union[str, None] = '0004_phase5_messaging_state_machine'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create job_openings table
    op.create_table(
        'job_openings',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('company', sa.String(length=255), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('url', sa.String(length=500), nullable=True),
        sa.Column('career_page_url', sa.String(length=500), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=50), server_default='active', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('job_openings') as batch_op:
        batch_op.create_index(batch_op.f('ix_job_openings_user_id'), ['user_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_job_openings_company'), ['company'], unique=False)

    # Enable RLS on PostgreSQL
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("ALTER TABLE job_openings ENABLE ROW LEVEL SECURITY;")
        op.execute("""
            CREATE POLICY job_openings_isolation_policy ON job_openings
            USING (user_id = current_setting('app.current_user_id', true)::uuid);
        """)


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("DROP POLICY IF EXISTS job_openings_isolation_policy ON job_openings;")
    op.drop_table('job_openings')
