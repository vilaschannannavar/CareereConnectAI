"""Phase 5 messaging state machine, tracking, and character limits

Revision ID: 0004_phase5_messaging_state_machine
Revises: 0003_phase4_scoring_and_shortlists
Create Date: 2026-10-13 18:00:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0004_phase5_messaging_state_machine'
down_revision: Union[str, None] = '0003_phase4_scoring_and_shortlists'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Update message_drafts
    with op.batch_alter_table('message_drafts') as batch_op:
        batch_op.add_column(sa.Column('resume_id', sa.String(length=36), nullable=True))
        batch_op.add_column(sa.Column('status', sa.String(length=50), server_default='Draft', nullable=False))
        batch_op.add_column(sa.Column('template_code', sa.String(length=10), server_default='A', nullable=False))
        batch_op.add_column(sa.Column('character_count', sa.Integer(), server_default='0', nullable=False))
        batch_op.add_column(sa.Column('character_limit_warning', sa.Boolean(), server_default='0', nullable=False))
        batch_op.add_column(sa.Column('details_used', sa.JSON(), server_default='{}', nullable=False))
        batch_op.add_column(sa.Column('delivery_channel', sa.String(length=50), server_default='linkedin_manual', nullable=False))
        batch_op.add_column(sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column('follow_up_suggested_at', sa.DateTime(timezone=True), nullable=True))
        batch_op.create_index(batch_op.f('ix_message_drafts_status'), ['status'], unique=False)
        batch_op.create_index(batch_op.f('ix_message_drafts_resume_id'), ['resume_id'], unique=False)
        batch_op.create_foreign_key('fk_message_drafts_resume_id', 'resumes', ['resume_id'], ['id'], ondelete='SET NULL')

    # 2. Update outreach_events
    with op.batch_alter_table('outreach_events') as batch_op:
        batch_op.add_column(sa.Column('event_type', sa.String(length=50), server_default='status_changed', nullable=False))
        batch_op.add_column(sa.Column('metadata_json', sa.JSON(), server_default='{}', nullable=False))
        batch_op.create_index(batch_op.f('ix_outreach_events_event_type'), ['event_type'], unique=False)


def downgrade() -> None:
    with op.batch_alter_table('outreach_events') as batch_op:
        batch_op.drop_index(batch_op.f('ix_outreach_events_event_type'))
        batch_op.drop_column('metadata_json')
        batch_op.drop_column('event_type')

    with op.batch_alter_table('message_drafts') as batch_op:
        batch_op.drop_constraint('fk_message_drafts_resume_id', type_='foreignkey')
        batch_op.drop_index(batch_op.f('ix_message_drafts_resume_id'))
        batch_op.drop_index(batch_op.f('ix_message_drafts_status'))
        batch_op.drop_column('follow_up_suggested_at')
        batch_op.drop_column('sent_at')
        batch_op.drop_column('delivery_channel')
        batch_op.drop_column('details_used')
        batch_op.drop_column('character_limit_warning')
        batch_op.drop_column('character_count')
        batch_op.drop_column('template_code')
        batch_op.drop_column('status')
        batch_op.drop_column('resume_id')
