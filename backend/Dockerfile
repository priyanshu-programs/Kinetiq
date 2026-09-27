FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install dependencies first for better layer caching. Test-only deps live in
# requirements-dev.txt and deliberately stay out of the image.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Migrations run over the direct (unpooled) database URL and take a PostgreSQL
# advisory lock in alembic/env.py, so two containers booting at once (a
# redeploy) serialize instead of racing.
#
# Seeding is opt-in: re-seeding a shared hosted database on every boot is noise,
# and it must never be mistaken for data persistence.
#
# `exec` makes uvicorn PID 1 so Render's SIGTERM reaches it and the lifespan
# shutdown cancels the IoT loop cleanly. --workers 1 is required, not merely
# preferred: the WebSocket simulator holds per-connection state in memory.
CMD alembic upgrade head && \
    if [ "${RUN_SEED:-false}" = "true" ]; then python -m app.seed; fi && \
    exec uvicorn app.main:app \
      --host 0.0.0.0 \
      --port "${PORT:-8000}" \
      --proxy-headers \
      --forwarded-allow-ips='*' \
      --workers 1
