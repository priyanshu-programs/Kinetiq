"""Column types that behave identically on SQLite (tests) and PostgreSQL (Neon)."""

import enum

from sqlalchemy import JSON, DateTime, Enum
from sqlalchemy.dialects.postgresql import JSONB

# Timezone-aware throughout: the app writes datetime.now(timezone.utc), and a
# naive PostgreSQL column would silently drop the offset.
TZDateTime = DateTime(timezone=True)

# JSONB on PostgreSQL (indexable, deduplicated keys), plain JSON on SQLite.
JSONColumn = JSON().with_variant(JSONB(), "postgresql")


def enum_column(py_enum: type[enum.Enum]) -> Enum:
    """Store enums as VARCHAR rather than a native PostgreSQL ENUM type.

    Native types are not dropped by ``Base.metadata.drop_all``, which breaks
    per-test schema teardown, and adding a member later needs a
    non-transactional ``ALTER TYPE``. Every member in ``enums.py`` has
    ``name == value``, so the stored strings are the same either way.
    """
    return Enum(py_enum, native_enum=False)
