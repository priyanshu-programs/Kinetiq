# Kinetiq

A unified web app that acts as an AI personal trainer, dietician, motivator, and
fitness data manager — combining computer-vision workout detection, LLM diet/chat
coaching, behavioral habit prediction, simulated smart-gym IoT, and a recommender.

Built solo, cost-free. See [plan.md](plan.md) for the full design and [updates.md](updates.md) for progress.

## Stack

- **Frontend:** React 18 + Vite 5 + TypeScript + Tailwind 3, React Router 6, Zustand, axios
- **Backend:** Python 3.12 + FastAPI, SQLAlchemy 2, Alembic, psycopg 3, Pydantic v2, python-jose (JWT)
- **DB:** Neon PostgreSQL (hosted and local dev). SQLite is used only by the fast unit suite.
- **LLM:** OpenRouter free models, with a labelled rule-based fallback
- **Infra (optional):** Docker Compose for a local PostgreSQL; Mosquitto is reserved for backlog MQTT work

## Prerequisites

- Node.js 20+ and npm
- Python 3.12
- (Optional) Docker Desktop

## Setup

```bash
# 1. Copy env template and fill in secrets
cp .env.example .env
```

Then edit `.env`. At minimum you need:

| Key | Where to get it |
|-----|-----------------|
| `DATABASE_URL` | Neon dashboard → the **pooled** connection string (host contains `-pooler`) |
| `DATABASE_URL_UNPOOLED` | Neon dashboard → the **direct** string (same host without `-pooler`); Alembic uses this |
| `JWT_SECRET` | `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `OPENROUTER_API_KEY` | [openrouter.ai](https://openrouter.ai) keys page. Optional — without it, chat serves labelled basic replies |

`.env.example` documents every key. For a local database instead of Neon:
`docker compose up -d postgres`.

### Backend

```bash
cd backend
py -3.12 -m venv .venv
.venv\Scripts\activate         # Windows (PowerShell/cmd)
# source .venv/bin/activate    # macOS/Linux
pip install -r requirements-dev.txt   # runtime deps + pytest

# Create the database schema and seed demo data
alembic upgrade head
python -m app.seed

# Run the API
uvicorn app.main:app --reload  # http://localhost:8000  (docs at /docs)
```

`GET http://localhost:8000/health` → `{"status":"ok","llm_enabled":false}`

`llm_enabled` tells you whether a real OpenRouter model will answer. It is
`false` when no key is set, or when the configured model ids are missing from
the live catalogue or are not zero-priced — the backend refuses to send a
completion request it cannot prove is free, and serves labelled basic replies
instead.

### Tests

```bash
cd backend
pytest                          # fast suite; PostgreSQL-only tests skip

# Full suite against PostgreSQL (migration, JSONB, timestamptz, aggregates)
docker compose up -d postgres
$env:TEST_DATABASE_URL="postgresql+psycopg://postgres:postgres@localhost:5432/kinetiq"
pytest
```

### Frontend

```bash
cd frontend
npm install
npm run dev                    # http://localhost:5173
```

The home page pings the backend and shows `backend: ok`.

### Docker (optional)

Runs the backend + a Mosquitto MQTT broker (the broker is used later by the IoT module):

```bash
docker compose up
```

The bare `uvicorn` + `vite` path above is the primary local workflow; Docker is optional.

## Demo credentials

After seeding, log in with:

- **email:** `demo@example.com`
- **password:** `demo1234`

## Project layout

```
backend/   FastAPI app (auth, models, modules), Alembic migrations
frontend/  Vite React SPA (auth flow, dashboard shell, module pages)
mosquitto/ MQTT broker config (IoT module)
```

> Not a medical device. Health and fitness output is informational only — not medical advice.
