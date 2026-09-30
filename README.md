<p align="center">
  <img src="frontend/public/kinetiq_mark_vector.svg" alt="Kinetiq logo" width="96" />
</p>

<h1 align="center">Kinetiq</h1>

<p align="center">
  <b>An AI personal trainer, dietician, motivator and fitness data manager in one web app.</b>
</p>

<p align="center">
  <a href="https://kinetiq.runs-on.dev">Live App</a> |
  <a href="https://kinetiq-api-ys16.onrender.com/docs">API Docs</a> |
  <a href="#run-it-locally">Run Locally</a>
</p>

<p align="center">
  <img alt="CI" src="https://github.com/priyanshu-programs/Kinetiq/actions/workflows/ci.yml/badge.svg" />
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB" />
  <img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-Python%203.12-009688" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/DB-Neon%20PostgreSQL-4169E1" />
  <img alt="Cost" src="https://img.shields.io/badge/running%20cost-%240-brightgreen" />
</p>

---

## Overview

Kinetiq combines seven fitness modules behind one login and one dashboard. It
watches your form through the webcam and counts reps, scores your workouts,
builds a diet plan from your body metrics, answers questions through an AI
coach, predicts when you are likely to skip the gym and nudges you, streams
live data from a simulated smart gym, and recommends gyms that fit you.

The whole system is built by one developer and runs on free tiers only:
Vercel, Render, Neon and OpenRouter. Your webcam video never leaves your
device. Pose detection runs entirely in the browser.

## Live Demo

| | URL |
|---|---|
| Web app | https://kinetiq.runs-on.dev |
| Web app (Vercel mirror) | https://frontend-alpha-wheat-qq5ex7zkhk.vercel.app |
| API health | https://kinetiq-api-ys16.onrender.com/health |
| Interactive API docs | https://kinetiq-api-ys16.onrender.com/docs |

> The API runs on Render's free tier and sleeps after 15 minutes idle. The
> first request after that can take 30 to 60 seconds. All data lives in Neon
> PostgreSQL, so nothing is lost when it sleeps or redeploys.

Create an account from the landing page, or run locally with the seeded demo
user (`demo@example.com` / `demo1234`).

## The Problem

Fitness help is scattered. People use one app to log workouts, another for
diet, a chatbot for questions and nothing at all for form correction or
motivation. Personal trainers and dieticians are expensive. Kinetiq puts these
roles in one place, with the data from each module feeding the others through
a shared profile and dashboard.

## Features

| Module | What it does | How |
|---|---|---|
| **AI Trainer** | Live webcam workout with rep counting and form feedback for squats, push ups and bicep curls | MediaPipe Pose Landmarker in the browser, joint angle math, a rep state machine and form rules |
| **Performance** | Per session scores and weekly trends | Scores computed from reps and form quality, stored per session, charted with Recharts |
| **Diet Planner** | Personalised calorie and macro targets with a meal plan, plus food logging | Deterministic BMI, BMR and TDEE formulas and macro splits, template meals |
| **AI Coach Chat** | Profile aware fitness and nutrition Q and A | OpenRouter free LLMs (Qwen primary, Nemotron backup) with a labelled rule based fallback and VADER sentiment |
| **Habits and Nudges** | Predicts your chance of skipping a session and creates in app nudges | Logistic model bootstrapped on synthetic data and refined with your logs |
| **Smart Gym (IoT)** | Live heart rate and equipment telemetry | In process sensor simulator streamed over WebSockets, bounded history in PostgreSQL |
| **Recommendations** | Ranked gyms that match your goals, budget and location | Content based scoring over a seeded catalogue with optional OpenStreetMap geocoding |

Also included: JWT authentication, onboarding, profile editing, a unified
dashboard, and an admin analytics page.

## Screenshots

| Landing | Dashboard |
|---|---|
| ![Landing](docs/screenshots/landing.png) | ![Dashboard](docs/screenshots/dashboard.png) |

| AI Trainer | Diet Planner |
|---|---|
| ![Trainer](docs/screenshots/trainer.png) | ![Diet](docs/screenshots/diet.png) |

| AI Coach | Smart Gym |
|---|---|
| ![Chat](docs/screenshots/chat.png) | ![IoT](docs/screenshots/iot.png) |

## Architecture

```mermaid
flowchart LR
    U[User browser] -->|HTTPS| FE[React SPA on Vercel]
    FE -->|webcam frames stay local| MP[MediaPipe Pose in browser]
    FE -->|REST + JWT| API[FastAPI on Render]
    FE <-->|WebSocket /ws/iot| API
    API -->|SQLAlchemy| DB[(Neon PostgreSQL)]
    API -->|chat completions| OR[OpenRouter free models]
    API -->|optional geocoding| OSM[OpenStreetMap Nominatim]
```

- **Frontend:** a single page React app. Pose detection, rep counting and form
  checks run on the device. Only the results (reps, form score) are sent to
  the API.
- **Backend:** one FastAPI service organised by module (`auth`, `workouts`,
  `performance`, `diet`, `chat`, `habits`, `iot`, `reco`, `dashboard`,
  `admin`), with shared middleware for security headers, error handling,
  request logging and rate limiting.
- **Database:** Neon PostgreSQL, schema managed with Alembic migrations. The
  API filesystem holds nothing durable.

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, React Router 7, Zustand, React Hook Form, Zod, Recharts, Framer Motion, GSAP, Lenis |
| Computer vision | MediaPipe Tasks Vision (Pose Landmarker) |
| Backend | Python 3.12, FastAPI, Uvicorn, SQLAlchemy 2, Alembic, Pydantic v2, psycopg 3 |
| Auth and security | JWT (python-jose), bcrypt (passlib), SlowAPI rate limiting, security headers middleware |
| AI and ML | OpenRouter (Qwen3.8 27B, Nemotron 3.5 Lightning), VADER sentiment, NumPy logistic model |
| Database | Neon PostgreSQL (SQLite only for the fast unit test suite) |
| Testing | pytest, Vitest, React Testing Library, Playwright |
| DevOps | GitHub Actions CI, Docker, Render, Vercel, Docker Compose |

## How the AI Works

**Pose tracking.** MediaPipe returns 33 body landmarks per frame. Kinetiq
computes joint angles (knee, hip, elbow) and feeds them into a per exercise
state machine that counts a rep only after a full down and up cycle. Form rules
score how close each rep gets to the ideal depth and show live cues.

**Diet.** Numbers come from standard formulas (Mifflin St Jeor BMR, activity
multiplier TDEE, goal based calorie adjustment and macro split), never from
the LLM. This keeps targets deterministic and explainable.

**Coach chat.** The backend sends the user's profile and question to a free
OpenRouter model. If the primary model fails or is rate limited, it tries the
backup inside one wall clock deadline. If both fail, or the daily budget is
used up, it returns a rule based reply that is clearly labelled as such. On
startup the backend checks that the configured models exist and are priced at
zero, and refuses to call any model it cannot prove is free.

**Skip prediction.** A logistic model starts from synthetic data and updates
with each user's own logs. When the predicted skip risk passes a threshold,
the next visit creates a nudge.

## Project Structure

```
Kinetiq/
├── backend/
│   ├── app/
│   │   ├── auth/          register, login, JWT, profile
│   │   ├── workouts/      workout sessions and rep results
│   │   ├── performance/   scoring and weekly trends
│   │   ├── diet/          BMI, TDEE, macros, meal plans, food logs
│   │   ├── chat/          OpenRouter client, budget, sentiment
│   │   ├── habits/        skip risk model and nudges
│   │   ├── iot/           sensor simulator, WebSocket, retention
│   │   ├── reco/          gym recommender and seed catalogue
│   │   ├── dashboard/     combined summary
│   │   ├── admin/         analytics
│   │   ├── middleware/    security headers, errors, logging
│   │   └── models/        SQLAlchemy models
│   ├── alembic/           database migrations
│   └── tests/             pytest suite
├── frontend/
│   ├── src/
│   │   ├── features/      one folder per module
│   │   ├── pages/         login, register, onboarding, dashboard, admin
│   │   ├── components/    shared UI
│   │   ├── store/         Zustand auth store
│   │   └── lib/           API client and types
│   └── e2e/               Playwright tests
├── .github/workflows/     CI pipeline
├── docker-compose.yml     optional local PostgreSQL
└── render.yaml            Render deployment blueprint
```

## API Overview

Full interactive docs are at `/docs` (Swagger UI).

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `PUT /profile` |
| Workouts | `POST /workouts/sessions`, `POST /workouts/sessions/{id}/finish`, `GET /workouts/sessions` |
| Performance | `GET /performance/weekly` |
| Diet | `POST /diet/plan`, `GET /diet/plan`, `POST /nutrition/logs`, `GET /nutrition/logs` |
| Chat | `POST /chat`, `GET /chat/history` |
| Habits | `POST /habits/logs`, `GET /habits`, `GET /habits/risk`, `GET /nudges`, `POST /nudges/{id}/dismiss` |
| IoT | `GET /iot/devices`, `WS /ws/iot` |
| Recommendations | `GET /recommendations` |
| Dashboard | `GET /dashboard/summary` |
| Admin | `GET /admin/analytics` |
| Health | `GET /health` |

## Run It Locally

**Prerequisites:** Node.js 20+, Python 3.12, and optionally Docker.

```bash
git clone https://github.com/priyanshu-programs/Kinetiq.git
cd Kinetiq
cp .env.example .env        # then fill in the values below
```

**Backend**

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS / Linux
pip install -r requirements-dev.txt
alembic upgrade head
python -m app.seed              # demo user and sample data
uvicorn app.main:app --reload   # http://localhost:8000
```

**Frontend**

```bash
cd frontend
npm install
npm run dev                     # http://localhost:5173
```

**No Neon account?** Start a local PostgreSQL with
`docker compose up -d postgres` and point both database URLs at
`postgresql://postgres:postgres@localhost:5432/kinetiq`.

### Environment Variables

| Key | Purpose |
|---|---|
| `DATABASE_URL` | Neon pooled connection string (host contains `-pooler`) |
| `DATABASE_URL_UNPOOLED` | Neon direct connection string, used by Alembic |
| `JWT_SECRET` | Long random secret: `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `OPENROUTER_API_KEY` | Optional. Without it, chat uses labelled rule based replies |
| `VITE_API_URL` | Backend URL for the frontend (defaults to `http://localhost:8000`) |

Every key is documented in [`.env.example`](.env.example).

## Testing and CI

```bash
cd backend && pytest            # backend suite
cd frontend && npm test         # unit tests (Vitest)
cd frontend && npm run e2e      # end to end golden path (Playwright)
```

GitHub Actions runs three required checks on every push and pull request:

1. Backend tests on SQLite
2. The full backend suite against a real PostgreSQL 16 service
3. Frontend unit tests and production build

The PostgreSQL job exists because some bugs only appear on the real database
dialect. It caught a date comparison bug before it reached production.

## Deployment

| Part | Host | Notes |
|---|---|---|
| Frontend | Vercel Hobby | Static build, `VITE_API_URL` points at the API |
| Backend | Render Free (Docker) | Defined in `render.yaml`, runs `alembic upgrade head` on boot |
| Database | Neon Free PostgreSQL | Pooled connection for the app, direct connection for migrations |
| LLM | OpenRouter free models | Daily call budget enforced in the backend |

In production the backend fails fast on unsafe configuration: a placeholder
JWT secret, a SQLite database, a missing direct database URL, or a localhost
CORS origin all stop startup.

## Design Decisions and Limitations

- **Pose detection in the browser, not on a server.** No GPU server is needed,
  it costs nothing, and video never leaves the user's device.
- **Diet numbers from formulas, not the LLM.** Targets stay consistent and
  explainable. The LLM only explains and motivates.
- **Simulated IoT.** There is no physical hardware. Sensor data is generated in
  process and clearly labelled. MQTT support is prepared in Docker Compose but
  not active.
- **Seeded gym catalogue.** Recommendations rank a fixed dataset. They are not
  live nearby search results.
- **Skip prediction starts from synthetic data.** It improves with real logs
  but is not a validated predictor.
- **Free tier trade offs.** Cold starts on Render, and a shared daily LLM quota
  across all users.

## Roadmap

- Real sensor integration over MQTT
- Live nearby gym discovery
- More exercises in the AI Trainer
- Cookie based authentication instead of a token in local storage
- Full workout program planner

## Disclaimer

Kinetiq is not a medical device. All health and fitness output is for
information only and is not medical advice. Consult a qualified professional
before starting a new diet or exercise programme.

## Author

**Priyanshu Roy**
GitHub: [@priyanshu-programs](https://github.com/priyanshu-programs)
