from logging.config import fileConfig

from sqlalchemy import create_engine, pool, text

from alembic import context

from app.config import settings
from app.db import Base
import app.models  # noqa: F401  (registers all tables on Base.metadata)

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Migrations use Neon's direct (unpooled) endpoint. The URL is passed straight
# to create_engine rather than through config.set_main_option, because that
# path runs values through configparser — which would treat a literal '%' in a
# password as interpolation syntax.
db_url = settings.migration_database_url

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Model metadata for 'autogenerate' support.
target_metadata = Base.metadata

# A 64-bit key for the PostgreSQL advisory lock guarding concurrent upgrades.
_MIGRATION_LOCK_KEY = 8442310155327104001


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    context.configure(
        url=db_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    connectable = create_engine(db_url, poolclass=pool.NullPool, future=True)
    is_sqlite = connectable.dialect.name == "sqlite"

    with connectable.connect() as connection:
        if not is_sqlite:
            # The container runs `alembic upgrade head` on every boot, so a
            # redeploy can start two at once against the same database. This
            # serializes them; the lock releases with the session.
            connection.execute(text("SELECT pg_advisory_lock(:k)"), {"k": _MIGRATION_LOCK_KEY})
            # The SELECT auto-begins a transaction. Alembic treats that as an
            # external transaction and would never commit it, silently
            # discarding the whole migration when the connection closes. The
            # lock is session-level, so it survives this commit.
            connection.commit()

        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            render_as_batch=is_sqlite,  # SQLite-safe ALTERs
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
