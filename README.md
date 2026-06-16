# AI Gym & Fitness Assistant

A unified web app that acts as an AI personal trainer, dietician, motivator, and
fitness data manager — combining computer-vision workout detection, LLM diet/chat
coaching, behavioral habit prediction, simulated smart-gym IoT, and a recommender.

Built solo, cost-free. See [plan.md](plan.md) for the full design and [updates.md](updates.md) for progress.

## Stack

- **Frontend:** React 18 + Vite 5 + TypeScript + Tailwind 3, React Router 6, Zustand, axios
- **Backend:** Python 3.12 + FastAPI, SQLAlchemy 2, Alembic, Pydantic v2, python-jose (JWT)
- **DB:** SQLite (dev/demo)
- **Infra (optional):** Docker Compose + Eclipse Mosquitto (used by the IoT module)

## Prerequisites

- Node.js 20+ and npm
- Python 3.12
- (Optional) Docker Desktop

## Setup

```bash
# 1. Copy env template and fill in secrets
cp .env.example .env          # then edit JWT_SECRET etc.
```

### Backend

```bash
cd backend
py -3.12 -m venv .venv
.venv\Scripts\activate         # Windows (PowerShell/cmd)
# source .venv/bin/activate    # macOS/Linux
pip install -r requirements.txt

# Create the database schema and seed demo data
alembic upgrade head
python -m app.seed

# Run the API
uvicorn app.main:app --reload  # http://localhost:8000  (docs at /docs)
```

`GET http://localhost:8000/health` → `{"status":"ok"}`

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
