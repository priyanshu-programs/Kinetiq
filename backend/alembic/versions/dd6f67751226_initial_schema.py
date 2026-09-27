"""initial schema

Revision ID: dd6f67751226
Revises:
Create Date: 2026-09-27 01:50:03.116711

Replaces the original SQLite-era initial migration. Written to be correct on
both PostgreSQL (the hosted target) and SQLite (the fast unit suite):

* enums are VARCHAR (``native_enum=False``), so there are no native PostgreSQL
  types left behind by ``drop_all`` or by ``downgrade``;
* JSON columns become JSONB on PostgreSQL via a dialect variant;
* every timestamp is ``TIMESTAMP WITH TIME ZONE``, matching the tz-aware values
  the application writes;
* ``server_default`` uses ``func.now()``, which renders per dialect, so
  autogenerate does not report drift.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'dd6f67751226'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _json() -> sa.types.TypeEngine:
    return sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), "postgresql")


def upgrade() -> None:
    op.create_table(
        'llm_usage',
        sa.Column('day', sa.Date(), nullable=False),
        sa.Column('count', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('day'),
    )
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('role', sa.Enum('user', 'admin', name='role', native_enum=False), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

    op.create_table(
        'profiles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('age', sa.Integer(), nullable=True),
        sa.Column('sex', sa.Enum('male', 'female', 'other', name='sex', native_enum=False), nullable=True),
        sa.Column('height_cm', sa.Float(), nullable=True),
        sa.Column('weight_kg', sa.Float(), nullable=True),
        sa.Column('goal', sa.Enum('lose', 'maintain', 'gain', name='goal', native_enum=False), nullable=True),
        sa.Column('activity_level', sa.Enum('sedentary', 'light', 'moderate', 'active', 'very_active', name='activitylevel', native_enum=False), nullable=True),
        sa.Column('diet_pref', sa.Enum('veg', 'nonveg', 'vegan', name='dietpref', native_enum=False), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_profiles_user_id', 'profiles', ['user_id'], unique=True)

    op.create_table(
        'chat_messages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('role', sa.Enum('user', 'assistant', name='chatrole', native_enum=False), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('sentiment', sa.Float(), nullable=True),
        sa.Column('ts', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_chat_user_ts', 'chat_messages', ['user_id', 'ts'], unique=False)

    op.create_table(
        'devices',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('type', sa.Enum('treadmill', 'bike', 'smartband', name='devicetype', native_enum=False), nullable=False),
        sa.Column('status', sa.Enum('online', 'offline', name='devicestatus', native_enum=False), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_devices_user_id', 'devices', ['user_id'], unique=False)

    op.create_table(
        'sensor_readings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('device_id', sa.Integer(), nullable=False),
        sa.Column('metric', sa.Enum('heart_rate', 'resistance', 'speed', 'reps', name='sensormetric', native_enum=False), nullable=False),
        sa.Column('value', sa.Float(), nullable=False),
        sa.Column('ts', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['device_id'], ['devices.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_sensor_device_ts', 'sensor_readings', ['device_id', 'ts'], unique=False)
    # Retention prunes by age alone, which cannot use the composite index above.
    op.create_index('ix_sensor_ts', 'sensor_readings', ['ts'], unique=False)

    op.create_table(
        'diet_plans',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('bmi', sa.Float(), nullable=True),
        sa.Column('tdee', sa.Float(), nullable=True),
        sa.Column('target_kcal', sa.Float(), nullable=True),
        sa.Column('macros', _json(), nullable=True),
        sa.Column('meals', _json(), nullable=True),
        sa.Column('grocery', _json(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_diet_plans_user_id', 'diet_plans', ['user_id'], unique=False)

    op.create_table(
        'nutrition_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('food', sa.Text(), nullable=False),
        sa.Column('kcal', sa.Float(), nullable=True),
        sa.Column('protein', sa.Float(), nullable=True),
        sa.Column('carbs', sa.Float(), nullable=True),
        sa.Column('fat', sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_nutrition_user_date', 'nutrition_logs', ['user_id', 'date'], unique=False)

    op.create_table(
        'habit_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('planned', sa.Boolean(), nullable=False),
        sa.Column('completed', sa.Boolean(), nullable=False),
        sa.Column('time_of_day', sa.Integer(), nullable=True),
        sa.Column('weekday', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_habit_user_date', 'habit_logs', ['user_id', 'date'], unique=False)

    op.create_table(
        'nudges',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('nudge_date', sa.Date(), nullable=False),
        sa.Column('sent_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('dismissed', sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        # One nudge per user per day, independent of dismissal, so a repeat
        # visit or a process restart cannot create a duplicate.
        sa.UniqueConstraint('user_id', 'nudge_date', name='uq_nudge_user_date'),
    )
    op.create_index('ix_nudges_user_id', 'nudges', ['user_id'], unique=False)

    op.create_table(
        'workout_sessions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('exercise', sa.Enum('squat', 'pushup', 'bicep_curl', name='exercise', native_enum=False), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('ended_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('total_reps', sa.Integer(), nullable=False),
        sa.Column('avg_form_score', sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_workout_sessions_user_id', 'workout_sessions', ['user_id'], unique=False)

    op.create_table(
        'rep_events',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('session_id', sa.Integer(), nullable=False),
        sa.Column('rep_index', sa.Integer(), nullable=False),
        sa.Column('form_score', sa.Float(), nullable=False),
        sa.Column('tempo_ms', sa.Integer(), nullable=True),
        sa.Column('flags', _json(), nullable=True),
        sa.Column('ts', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['session_id'], ['workout_sessions.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_rep_events_session_id', 'rep_events', ['session_id'], unique=False)

    op.create_table(
        'performance_scores',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('session_id', sa.Integer(), nullable=False),
        sa.Column('score', sa.Float(), nullable=False),
        sa.Column('efficiency', sa.Float(), nullable=True),
        sa.Column('consistency', sa.Float(), nullable=True),
        sa.Column('week', sa.Integer(), nullable=True),
        sa.Column('ts', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['session_id'], ['workout_sessions.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_performance_scores_user_id', 'performance_scores', ['user_id'], unique=False)

    op.create_table(
        'gym_recommendations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('gym_id', sa.String(length=64), nullable=True),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('distance_km', sa.Float(), nullable=True),
        sa.Column('match_score', sa.Float(), nullable=True),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('ts', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_gym_recommendations_user_id', 'gym_recommendations', ['user_id'], unique=False)


def downgrade() -> None:
    # Reverse dependency order. No DROP TYPE is needed because no native enum
    # types are created, which is what makes this round trip repeatable.
    op.drop_index('ix_gym_recommendations_user_id', table_name='gym_recommendations')
    op.drop_table('gym_recommendations')
    op.drop_index('ix_performance_scores_user_id', table_name='performance_scores')
    op.drop_table('performance_scores')
    op.drop_index('ix_rep_events_session_id', table_name='rep_events')
    op.drop_table('rep_events')
    op.drop_index('ix_workout_sessions_user_id', table_name='workout_sessions')
    op.drop_table('workout_sessions')
    op.drop_index('ix_nudges_user_id', table_name='nudges')
    op.drop_table('nudges')
    op.drop_index('ix_habit_user_date', table_name='habit_logs')
    op.drop_table('habit_logs')
    op.drop_index('ix_nutrition_user_date', table_name='nutrition_logs')
    op.drop_table('nutrition_logs')
    op.drop_index('ix_diet_plans_user_id', table_name='diet_plans')
    op.drop_table('diet_plans')
    op.drop_index('ix_sensor_ts', table_name='sensor_readings')
    op.drop_index('ix_sensor_device_ts', table_name='sensor_readings')
    op.drop_table('sensor_readings')
    op.drop_index('ix_devices_user_id', table_name='devices')
    op.drop_table('devices')
    op.drop_index('ix_chat_user_ts', table_name='chat_messages')
    op.drop_table('chat_messages')
    op.drop_index('ix_profiles_user_id', table_name='profiles')
    op.drop_table('profiles')
    op.drop_index('ix_users_email', table_name='users')
    op.drop_table('users')
    op.drop_table('llm_usage')
