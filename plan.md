# AI Gym & Fitness Assistant — Hosted MVP Execution Plan

## Finalized revision — 2026-09-27

**Status:** Planning decisions finalized; application changes, database migration, model evaluation, and hosted verification remain pending. This revision supersedes the initial hosted-storage and LLM decisions. Historical implementation results remain in `updates.md`.

**Release target:** A public HTTPS college-submission project using ongoing free tiers: **Vercel Hobby + Render Free + Neon Free PostgreSQL + OpenRouter free models**. Paid upgrade options are acceptable; expiring trials, required credit purchases, and dependence on a running personal computer are excluded. Free tiers have quotas and cold starts; neither perpetual provider availability nor production uptime is promised.

**Remaining work order:** PostgreSQL compatibility and Neon persistence → OpenRouter integration → restart-safe nudges and sensor retention → deployment correction → hosted acceptance checks. Existing functionality is retained. The original five-day estimates below describe the initial MVP effort, not a new deadline or an estimate of this remediation.

### OpenRouter model decision and research

Research checked on **2026-09-27**, including the public API catalogue. Current zero pricing is evidence of present pricing, not continuous historical availability or a promise that a model will remain free.

| Model | Decision and evidence |
|-------|-----------------------|
| `qwen/qwen3.8-27b:free` | Primary candidate for concise fitness explanations, motivation, and profile-aware chat. Listed at zero input/output cost; supports configurable thinking. Published availability at research time was stronger than the selected backup. Fitness quality and latency still require live evaluation. |
| `nvidia/nemotron-3.5-lightning:free` | Explicit zero-cost backup for primary-provider unavailability. Its lower observed availability makes it a backup rather than a reliability guarantee. |
| `inclusionai/ling-3.0-flash-sante:free` | Research alternative only; health-focused, but released September 2026 with little history for assessing continuity. No automatic routing to it. |
| `openrouter/free` | Excluded from the default chain: random selection does not enforce consistent model behaviour or the explicit non-Gemini allowlist. |

Older `meta-llama/llama-3.3-70b-instruct:free` and `qwen/qwen3-4b:free` pages remained online but those IDs were absent from the live catalogue checked. Do not select a model solely because its descriptive page exists. No individual free model was established as permanently free or continuously available.

Budget for **50 free requests per UTC day and 20 per minute across the shared OpenRouter account**, subject to provider capacity and current account limits. These limits are not per app user; switching models or keys does not bypass the daily account quota. This is a controlled submission demo, not unrestricted classroom-wide chat. No paid top-up is required or planned.

### Service limits and sources

- Neon Free: currently **0.5 GB database storage, 100 CU-hours per project/month, and 5 GB public network transfer per project/month**. Compute scales to zero after five idle minutes; application connections must recover on wake-up. Store all user records in PostgreSQL, independent of the API filesystem. See [Neon free limits](https://github.com/neondatabase/website/blob/main/content/faqs/free-plan-limits-and-quotas.md) and [connection guidance](https://github.com/neondatabase/website/blob/main/content/docs/get-started/connect-neon.md).
- Render Free: no persistent disk, ephemeral local files, inactivity sleep and cold starts. Its free PostgreSQL expires after 30 days and is excluded. See [Render free services](https://render.com/docs/free).
- Vercel Hobby is the chosen frontend host for this personal, noncommercial project. Cloudflare Pages is a valid alternative, not a required migration. See [Vercel Hobby](https://vercel.com/docs/plans/hobby) and [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/).
- OpenRouter: [live model catalogue](https://openrouter.ai/api/v1/models), [Qwen primary](https://openrouter.ai/qwen/qwen3.8-27b:free), [NVIDIA backup](https://openrouter.ai/nvidia/nemotron-3.5-lightning:free), [Ling research alternative](https://openrouter.ai/inclusionai/ling-3.0-flash-sante:free), [free routing and availability limitations](https://openrouter.ai/docs/guides/routing/routers/free-router), [free rate limits](https://openrouter.zendesk.com/hc/en-us/articles/39501163636379-OpenRouter-Rate-Limits-What-You-Need-to-Know), and [account quota inspection](https://openrouter.ai/docs/api_reference/limits). Recheck pricing, availability, and account quotas before deployment and evaluation.

### Submission scope and evidence

The original PRD was not available in this review; its digest below is the available requirements baseline. Full grading compliance requires checking the original PRD, particularly whether actual hardware, MQTT, or live gym discovery is mandatory.

- Trainer: browser pose detection and form rules for squat, pushup, and bicep curl; camera accuracy must be demonstrated.
- Performance: calculated scores and stored trends, not clinically validated performance measurements.
- Diet: deterministic BMI/TDEE/macros and template meals; LLM text explains and motivates rather than replacing the calculations.
- Habits: synthetic-bootstrap prediction plus accumulated logs; no claim of validated real-world prediction accuracy.
- IoT: labelled in-process simulation over WebSockets; physical sensors and MQTT integration remain backlog items.
- Recommendations: ranked seeded gym catalogue with optional city geocoding; no claim of live nearby-gym discovery or a complete training-program planner.

Browser localStorage currently holds the login token only; it is not the source of truth for fitness records. Retain that documented auth tradeoff for this revision; cookie-based auth remains separate backlog work.

## Context

**Why this plan exists.** The PRD (UNLOX / Rivoquix academy project) describes an ambitious 7-module AI fitness ecosystem with a "proposed" enterprise stack (Next.js, FastAPI, TensorFlow/PyTorch, MongoDB/Postgres, MQTT, AWS S3, OpenAI). The builder is **one student with ~4–5 days and a hard $0 budget**, but wants **all 7 modules** present in v1.

That triple constraint (full scope · solo · 5 days · free) cannot produce a production system. It *can* produce a **coherent, demoable MVP** where every one of the 7 modules works end-to-end at core fidelity, sharing one codebase, one auth system, and one dashboard. This plan deliberately swaps the heavy "proposed" stack for free, zero-ops equivalents that a single person can stand up fast, and flags exactly what was traded away so it can be upgraded later.

**Intended outcome:** a publicly hosted HTTPS web app where a user can sign up, do a webcam-tracked workout with live rep counting and form feedback, get a performance score, generate a personalized diet plan, chat with a fitness coach, see habit/skip predictions and in-app nudges, watch simulated smart-gym data, and receive seeded gym recommendations. User records persist in Neon across API sleep, restart, redeployment, and access from another browser. Local execution is for development, not a substitute for the hosted submission.

---

## STEP 1 — PRD DIGEST

- **Project name:** AI Gym & Fitness Assistant
- **Core purpose (1 sentence):** A unified web app that acts as an AI personal trainer, dietician, motivator, and fitness data manager — combining computer-vision workout detection, LLM diet/chat coaching, behavioral habit prediction, simulated smart-gym IoT, and a recommender.
- **Target users:** Individual fitness users (beginners → intermediate) wanting at-home guided workouts, diet help, and progress tracking; secondarily an admin viewing analytics.
- **Tech stack (decided for this build — see rationale in Phase 0/1):**
  - Frontend: **React 19 + Vite 8 + TypeScript + Tailwind CSS 3**, React Router 7, Zustand (state), Recharts (charts), `@mediapipe/tasks-vision` (in-browser pose); retain the existing package/lockfile versions.
  - Backend: **Python 3.12 + FastAPI + Uvicorn**, SQLAlchemy 2, Alembic, psycopg, Pydantic v2, python-jose (JWT), passlib[bcrypt], numpy, vaderSentiment, httpx.
  - DB: **Neon Free PostgreSQL**, required for the hosted release. SQLite is permitted only for isolated tests/local experiments; integration verification uses PostgreSQL.
  - LLM: **OpenRouter free models** — Qwen3.8 27B primary, Nemotron 3.5 Lightning backup, then a visibly labelled rule-based fallback. No Gemini or paid-model fallback.
  - IoT: **simulated** in-process; WebSockets to the UI, bounded raw-reading history in Neon. MQTT/hardware are deferred.
  - Recommender: content-based scoring over a **static seed dataset**; optional free OpenStreetMap **Nominatim** geocoding (no key, no cost).
  - Storage/deploy: **Neon PostgreSQL + Vercel Hobby frontend + Render Free backend**. No durable user data on the API filesystem. Add object storage only if file uploads enter scope; webcam video stays on the device.
  - Testing: pytest + httpx (backend), Vitest + React Testing Library (frontend), Playwright (E2E).
- **Key constraints:**
  - **Budget:** $0 on ongoing free service tiers within quotas; paid upgrade options are acceptable, time-limited trials and required credits are not. No paid LLM or real IoT hardware is required for this MVP.
  - **Timeline:** original ~4–5 working days, solo; additional remediation and hosted validation are pending and not covered by that historical estimate.
  - **Platform:** web (desktop browser primary; webcam required for the trainer module).
  - **Compliance:** webcam/biometric pose + health data → privacy-by-design (local processing, consent, no PII leakage). Not a medical device — disclaimer required.
- **Ambiguities & assumptions made (flagged for confirmation):**
  1. **"4–5 days" = MVP/demo fidelity, not production.** Each module = its single core capability, happy-path-first. ⚠️ Confirm this is acceptable.
  2. **IoT = fully simulated** (no ESP32/sensors), per "cost-free." ⚠️ Confirm no real hardware is needed for grading.
  3. **Single deployable monolith** (one FastAPI service + one React SPA), not microservices — fastest for solo.
  4. **CV runs in the browser** (MediaPipe Tasks JS), not server-side TensorFlow/PyTorch — avoids needing a GPU server (which isn't free). Server only stores results.
  5. **OpenRouter explicit free-model chain**; no-key/quota/provider failures produce a labelled rule-based response, which does not count as proof of working LLM integration.
  6. **No native mobile app** — responsive web only.
  7. **Neon PostgreSQL is mandatory for hosted user data**, even at small demo volume.
  8. **Habit/skip model trained on synthetic + accumulated user logs** (no real historical dataset exists yet).
  9. **"Nearby gyms"** uses a seeded dataset (+ optional free geocoding), since a live paid maps/places API is excluded.
  10. **Admin dashboard = a protected analytics route**, not a separate app.
- **Total features identified:** 7 PRD modules → mapped to **7 functional app features** + cross-cutting (auth, dashboard, analytics).
- **Complexity rating:** **Very High** (intrinsically) — 7 heterogeneous AI/IoT subsystems spanning the full stack. MVP scope uses browser CV, free managed LLMs, managed PostgreSQL, simulated IoT, and static recommendations. Deployment and persistence must be verified rather than inferred from local tests.

---

## Day-by-Day Map (how the phases compress)

| Day | Phases active | Headline outcome |
|-----|---------------|------------------|
| **Day 0 (½ day)** | Phase 0 | Repos, tooling, skeleton run locally |
| **Day 1** | Phase 1 | Auth, DB models, app shell, layout, dashboard frame |
| **Day 2** | Phase 2a | AI Gym Trainer (pose + rep count + form) + Performance score |
| **Day 3** | Phase 2b / 3 | Dietician + Chatbot (LLM) + Habit Tracker (ML) + nudges |
| **Day 4** | Phase 3 / 4 | IoT simulator + live stream + Recommender + analytics charts |
| **Day 5** | Phases 5–7 | Testing, security hardening, deploy, demo polish |
| *Phase 8* | post-launch | Backlog / iteration (not in the 5 days) |

> Historical initial-MVP estimates below total approximately **40–48 focused hours**. They exclude the finalized Neon/OpenRouter remediation and hosted verification; they are not current completion claims.

---

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE 0 — PROJECT SETUP & INFRASTRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Goal:           A running, empty-but-wired monorepo (frontend + backend) that boots locally with one command each.
  Duration:       ~4 hours (Day 0)
  Prerequisites:  None
  Who:            Solo full-stack dev

### Objectives
1. Monorepo created with `/frontend`, `/backend`, shared `.env.example`, README, `.gitignore`.
2. Backend `GET /health` returns `{"status":"ok"}` via Uvicorn.
3. Frontend Vite dev server renders a "Hello" page that successfully calls `/health`.
4. Git initialized with first commit; free remote (GitHub) connected.
5. Optional `docker-compose.yml` provides local backend bring-up; the existing Mosquitto scaffold is reserved for future MQTT work and is not a release dependency.

### Architecture & Design Decisions
- **Repo layout → Monorepo vs two repos → Monorepo → Why:** one person, shared types/docs, simpler deploy coordination.
- **Backend framework → FastAPI vs Flask/Django → FastAPI → Why:** async (needed for WebSocket IoT stream), auto OpenAPI docs, Pydantic validation built in, minimal boilerplate.
- **Frontend tooling → Vite vs Next.js → Vite SPA → Why:** no SSR needed; faster cold start, simpler for a webcam-heavy client-side app; one fewer runtime to deploy.
- **DB → Neon PostgreSQL → Why:** ongoing free managed database with durable user records independent of the sleeping API service; use SQLAlchemy and Alembic.
- **Charts → Recharts vs D3/Plotly → Recharts → Why:** React-native API, fast to build, free; D3 is too low-level for a 5-day budget.

### Task Breakdown

#### Task 0.1 — Initialize monorepo & tooling
| Field | Detail |
|-------|--------|
| Description | Create root repo, language toolchains, formatting/lint configs. |
| Subtasks | (a) `git init`, create GitHub repo; (b) root `.gitignore` (node, python, `.env`, `*.db`); (c) add `ruff` + `black` config for Python; (d) add ESLint + Prettier for frontend; (e) root `README.md` with run instructions. |
| Tech/Tools | git, GitHub (free), ruff, black, ESLint, Prettier |
| File(s) | `/.gitignore`, `/README.md`, `/backend/pyproject.toml`, `/frontend/.eslintrc.cjs` |
| Effort | 1h |
| Deliverable | Committed empty monorepo |
| Blocked by | none |

#### Task 0.2 — Backend skeleton + health endpoint
| Field | Detail |
|-------|--------|
| Description | FastAPI app with CORS, settings, health route. |
| Subtasks | (a) `python -m venv`, install `fastapi uvicorn[standard] pydantic-settings`; (b) `app/main.py` create app; (c) add `CORSMiddleware` (allow Vite origin); (d) `Settings` from env via pydantic-settings; (e) `GET /health`; (f) run `uvicorn app.main:app --reload`. |
| Tech/Tools | FastAPI, Uvicorn, pydantic-settings |
| File(s) | `/backend/app/main.py`, `/backend/app/config.py`, `/backend/requirements.txt` |
| Effort | 1h |
| Deliverable | `http://localhost:8000/health` → 200 |
| Blocked by | 0.1 |

#### Task 0.3 — Frontend skeleton + API ping
| Field | Detail |
|-------|--------|
| Description | Vite React TS app, Tailwind, router, one page calling `/health`. |
| Subtasks | (a) `npm create vite@latest -- --template react-ts`; (b) install Tailwind 3 + configure; (c) install `react-router-dom`, `zustand`, `axios`; (d) `api.ts` axios instance w/ base URL from `VITE_API_URL`; (e) Home page shows backend health. |
| Tech/Tools | Existing Vite/React versions, TS, Tailwind 3, axios |
| File(s) | `/frontend/src/lib/api.ts`, `/frontend/src/pages/Home.tsx`, `/frontend/tailwind.config.js` |
| Effort | 1h |
| Deliverable | Vite dev page shows "backend: ok" |
| Blocked by | 0.2 |

#### Task 0.4 — Local orchestration scaffold
| Field | Detail |
|-------|--------|
| Description | Optional local backend orchestration and the hosted configuration contract; existing broker scaffold is backlog-only. |
| Subtasks | (a) Configure backend with a development database separate from the submitted data; (b) keep Mosquitto optional for future MQTT work; (c) document `VITE_API_URL`, `CORS_ORIGINS`, `JWT_SECRET`, `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_FALLBACK_MODEL`, `SENSOR_RETENTION_DAYS`. |
| Tech/Tools | Docker (optional), Neon PostgreSQL |
| File(s) | `/docker-compose.yml`, `/mosquitto/mosquitto.conf`, `/.env.example` |
| Effort | 1h |
| Deliverable | Optional local backend boots without a broker dependency; hosted environment contract documented |
| Blocked by | 0.2 |

### Testing Requirements
- Smoke: `GET /health` returns 200 (pytest one-liner).
- Frontend boots without console errors; health call succeeds (manual).

### Acceptance Criteria
- [ ] `uvicorn` and `vite` both run locally.
- [ ] Frontend successfully fetches backend `/health`.
- [ ] Optional Docker workflow launches the backend; a broker is not required by the in-process simulator.
- [ ] Repo pushed to GitHub; `.env` is gitignored; `.env.example` complete.

### Risks & Mitigations
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| CORS blocks frontend→backend | High | Low | Configure `CORSMiddleware` with explicit Vite origin on day 0 |
| Docker not installed | Med | Low | Document bare `uvicorn` with a development database and the in-process simulator |

### Hand-off to Next Phase
Running backend at `:8000`, frontend at `:5173`, env contract in `.env.example`, axios client, Tailwind ready.

---

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE 1 — FOUNDATION & ARCHITECTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Goal:           Working auth, persistent data layer, app shell with protected routing and the dashboard frame all modules plug into.
  Duration:       ~8 hours (Day 1)
  Prerequisites:  Phase 0
  Who:            Solo full-stack dev

### Objectives
1. User can register, log in, and stay logged in (JWT) across reloads.
2. All core tables exist and migrate cleanly.
3. Protected routes redirect unauthenticated users to login.
4. Dashboard layout with nav to all 7 module pages (stubs OK).
5. Central error handling + request validation in place backend-wide.

### Architecture & Design Decisions
- **Auth → retain JWT access-token flow:** current token persistence uses localStorage; document the XSS tradeoff. Fitness records live in Neon; httpOnly cookie/refresh-token work remains backlog.
- **ORM → SQLAlchemy 2.0 + Alembic + psycopg:** retain models and API contracts, add PostgreSQL compatibility and migration verification.
- **State mgmt → Redux vs Zustand → Zustand → Why:** minimal boilerplate, fast for solo; holds auth + cross-module user profile.
- **Validation → manual vs Pydantic v2 → Pydantic v2 → Why:** request/response schemas double as OpenAPI + guardrails.

### Task Breakdown

#### Task 1.1 — Data layer & models
| Field | Detail |
|-------|--------|
| Description | SQLAlchemy models + Alembic migrations for all core entities. |
| Subtasks | (a) Add psycopg and TLS PostgreSQL connections: pooled `DATABASE_URL` for runtime, direct `DATABASE_URL_UNPOOLED` for Alembic; (b) retain the 13 core models and validate enum/JSON/date behaviour and migrations on PostgreSQL; (c) bound SQLAlchemy connections and enable stale-connection recovery after Neon idle suspension; (d) idempotent demo seeding, never overwrite real records; (e) preserve any existing user data through an explicit export/import before cutover. |
| Tech/Tools | SQLAlchemy 2, Alembic, psycopg, Neon PostgreSQL |
| File(s) | `/backend/app/db.py`, `/backend/app/models/*.py`, `/backend/alembic/`, `/backend/app/seed.py` |
| Effort | 2.5h |
| Deliverable | `alembic upgrade head` builds PostgreSQL schema; repeat seeding preserves existing records; application reconnects after database idle suspension |
| Blocked by | 0.2 |

#### Task 1.2 — Auth (register/login/JWT/me)
| Field | Detail |
|-------|--------|
| Description | Password hashing, JWT issue/verify, current-user dependency. |
| Subtasks | (a) `passlib[bcrypt]` hashing; (b) `python-jose` access tokens (exp 60m); (c) routes `POST /auth/register`, `POST /auth/login`, `GET /auth/me`; (d) `get_current_user` dependency; (e) Pydantic schemas; (f) basic rate-limit on auth (slowapi). |
| Tech/Tools | passlib, python-jose, slowapi |
| File(s) | `/backend/app/auth/router.py`, `/backend/app/auth/security.py`, `/backend/app/schemas/auth.py` |
| Effort | 2h |
| Deliverable | Auth endpoints verified via `/docs` |
| Blocked by | 1.1 |

#### Task 1.3 — Central error handling & middleware
| Field | Detail |
|-------|--------|
| Description | Uniform error envelope, logging, request-id. |
| Subtasks | (a) exception handlers (validation, HTTP, unhandled→500 with id); (b) `loguru` logging; (c) request-id middleware; (d) standard error JSON `{error:{code,message}}`. |
| Tech/Tools | FastAPI exception handlers, loguru |
| File(s) | `/backend/app/middleware/errors.py`, `/backend/app/middleware/logging.py` |
| Effort | 1h |
| Deliverable | Consistent error responses |
| Blocked by | 0.2 |

#### Task 1.4 — Frontend app shell, auth flow, routing
| Field | Detail |
|-------|--------|
| Description | Login/Register pages, auth store, protected layout with module nav + dashboard frame. |
| Subtasks | (a) Zustand `authStore` (token, user, login/logout, hydrate); (b) axios interceptor attaches token + handles 401; (c) `Login.tsx`, `Register.tsx` with form validation (react-hook-form + zod); (d) `ProtectedRoute` wrapper; (e) `DashboardLayout` (sidebar nav → 7 module routes + admin); (f) module page stubs. |
| Tech/Tools | React Router 6, Zustand, react-hook-form, zod |
| File(s) | `/frontend/src/store/authStore.ts`, `/frontend/src/components/ProtectedRoute.tsx`, `/frontend/src/layouts/DashboardLayout.tsx`, `/frontend/src/pages/*` |
| Effort | 2.5h |
| Deliverable | Full login→dashboard flow works |
| Blocked by | 1.2 |

### Data Models & Schema

```
User          (id PK, email UNIQUE NOT NULL, password_hash, role ENUM[user,admin] default user, created_at)
Profile       (id PK, user_id FK→User UNIQUE, age INT, sex ENUM, height_cm FLOAT, weight_kg FLOAT,
               goal ENUM[lose,maintain,gain], activity_level ENUM, diet_pref ENUM[veg,nonveg,vegan], updated_at)
WorkoutSession(id PK, user_id FK, exercise ENUM[squat,pushup,bicep_curl], started_at, ended_at,
               total_reps INT, avg_form_score FLOAT)
RepEvent      (id PK, session_id FK, rep_index INT, form_score FLOAT, tempo_ms INT, flags JSON, ts)
PerformanceScore(id PK, user_id FK, session_id FK, score FLOAT[0-100], efficiency FLOAT, consistency FLOAT, week INT, ts)
DietPlan      (id PK, user_id FK, bmi FLOAT, tdee FLOAT, target_kcal FLOAT, macros JSON, meals JSON, grocery JSON, created_at)
NutritionLog  (id PK, user_id FK, date DATE, food TEXT, kcal FLOAT, protein FLOAT, carbs FLOAT, fat FLOAT)
ChatMessage   (id PK, user_id FK, role ENUM[user,assistant], content TEXT, sentiment FLOAT, ts)
HabitLog      (id PK, user_id FK, date DATE, planned BOOL, completed BOOL, time_of_day INT, weekday INT)
Nudge         (id PK, user_id FK, message TEXT, reason TEXT, sent_at, dismissed BOOL)
Device        (id PK, user_id FK, name, type ENUM[treadmill,bike,smartband], status ENUM[online,offline])
SensorReading (id PK, device_id FK, metric ENUM[heart_rate,resistance,speed,reps], value FLOAT, ts)
GymRecommendation(id PK, user_id FK, gym_id, name, distance_km FLOAT, match_score FLOAT, reason TEXT, ts)

Indexes: User.email, WorkoutSession.user_id, RepEvent.session_id, NutritionLog(user_id,date),
         HabitLog(user_id,date), SensorReading(device_id,ts), ChatMessage(user_id,ts)
```

### API Contracts (auth core)
- `POST /auth/register` · public · `{email,password}` → `201 {id,email}` · 409 if exists, 422 invalid.
- `POST /auth/login` · public · `{email,password}` → `200 {access_token,token_type}` · 401 bad creds.
- `GET /auth/me` · Bearer · → `200 {id,email,role,profile}` · 401.
- `PUT /profile` · Bearer · `{age,sex,height_cm,weight_kg,goal,...}` → `200 {profile}` · 422.

### UI/UX Specs
- Pages: Login, Register, Dashboard (cards per module), + stub pages.
- States: **loading** (spinner on submit), **empty** (no profile → "Complete your profile" CTA), **error** (inline field + toast), **success** (redirect + toast).
- Breakpoints: mobile ≥360, tablet ≥768, desktop ≥1024; sidebar collapses to drawer on mobile.

### Testing Requirements
- Unit: password hash/verify; JWT encode/decode/expiry; profile BMI calc.
- Integration: register→login→/me happy path; duplicate email 409; bad creds 401; protected route without token 401.
- Frontend: authStore login/logout; ProtectedRoute redirect.
- Edge: expired token → 401 → redirect to login.

### Acceptance Criteria
- [ ] New user can register, log in, refresh, and stay authenticated.
- [ ] Unauthed access to any module route redirects to login.
- [ ] All tables migrate; seed creates demo user + gyms.
- [ ] All backend errors return the standard envelope.
- [ ] Profile can be saved and BMI computed.

### Risks & Mitigations
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Token storage XSS | Med | High | Document current localStorage-token tradeoff; avoid unsafe HTML rendering; retain cookie upgrade in backlog |
| Schema churn breaks later modules | Med | Med | Define all models now in 1.1; use Alembic for changes |

### Hand-off to Next Phase
Auth + `get_current_user`, full schema, axios w/ token, dashboard shell with routes for every module to fill in.

---

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE 2 — CORE FEATURES (Module 1 + Module 6)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Goal:           Live webcam workout detection with rep counting + real-time form feedback, persisted, and converted into a Performance Score with weekly reports.
  Duration:       ~9 hours (Day 2)
  Prerequisites:  Phase 1
  Who:            Solo full-stack dev

### Objectives
1. Webcam pose tracking runs in-browser at ≥15 FPS for 3 exercises (squat, pushup, bicep curl).
2. Reps counted automatically via joint-angle state machine; live count on screen.
3. Real-time textual + color form feedback ("knees over toes", "go deeper").
4. Session (reps, per-rep form scores) saved to backend on finish.
5. Performance Score (0–100) computed from efficiency + consistency; weekly report chart.

### Architecture & Design Decisions
- **CV location → server (TF/PyTorch) vs browser (MediaPipe Tasks JS) → browser → Why:** no free GPU server; privacy (video never leaves device); real-time without network round-trips. Server stores only numeric results.
- **Rep counting → ML classifier vs angle state-machine → angle state-machine → Why:** deterministic, no training data/time, explainable; thresholds per exercise.
- **Form scoring → deduct from joint-angle deviations vs ML → rule-based deviation scoring → Why:** fast to build, transparent feedback strings.
- **Performance Score → formula:** `score = 0.5*form_avg + 0.3*consistency + 0.2*completion`, normalized 0–100.

### Task Breakdown

#### Task 2.1 — In-browser pose engine
| Field | Detail |
|-------|--------|
| Description | Load MediaPipe Pose Landmarker, draw skeleton on canvas overlay. |
| Subtasks | (a) install `@mediapipe/tasks-vision`; (b) `usePoseLandmarker` hook loads WASM + model (`pose_landmarker_lite`); (c) webcam via `getUserMedia`; (d) per-frame detect → draw landmarks on `<canvas>`; (e) FPS guard + permission/error states. |
| Tech/Tools | @mediapipe/tasks-vision (free), Canvas API |
| File(s) | `/frontend/src/features/trainer/usePoseLandmarker.ts`, `/frontend/src/features/trainer/PoseCanvas.tsx` |
| Effort | 2.5h |
| Deliverable | Live skeleton overlay on webcam |
| Blocked by | 1.4 |

#### Task 2.2 — Rep counter + form analyzer (per exercise)
| Field | Detail |
|-------|--------|
| Description | Joint-angle math → rep state machine + form deviation feedback. |
| Subtasks | (a) `angle(a,b,c)` util from landmarks; (b) per-exercise config (joints, down/up angle thresholds); (c) state machine `up→down→up` increments rep; (d) form rules → score 0–100 + feedback strings; (e) overlay HUD (rep count, form bar, cue). |
| Tech/Tools | TypeScript (vector math) |
| File(s) | `/frontend/src/features/trainer/repCounter.ts`, `/frontend/src/features/trainer/exercises.ts`, `/frontend/src/features/trainer/formRules.ts` |
| Effort | 3h |
| Deliverable | Accurate live reps + cues for 3 exercises |
| Blocked by | 2.1 |

#### Task 2.3 — Session persistence API + UI
| Field | Detail |
|-------|--------|
| Description | Start/finish session, store reps & scores. |
| Subtasks | (a) `POST /workouts/sessions` start; (b) `POST /workouts/sessions/{id}/finish` w/ rep events; (c) `GET /workouts/sessions` history; (d) frontend start/stop controls + summary card; (e) optimistic UI + error retry. |
| Tech/Tools | FastAPI, SQLAlchemy |
| File(s) | `/backend/app/workouts/router.py`, `/frontend/src/features/trainer/TrainerPage.tsx` |
| Effort | 2h |
| Deliverable | Completed sessions appear in history |
| Blocked by | 2.2, 1.1 |

#### Task 2.4 — Performance Score + weekly report
| Field | Detail |
|-------|--------|
| Description | Compute score on finish; weekly aggregation + chart. |
| Subtasks | (a) scoring service (efficiency, consistency, completion); (b) write PerformanceScore on finish; (c) `GET /performance/weekly`; (d) Recharts line/bar of weekly score; (e) empty/loading/error states. |
| Tech/Tools | numpy, FastAPI, Recharts |
| File(s) | `/backend/app/performance/service.py`, `/backend/app/performance/router.py`, `/frontend/src/features/performance/PerformancePage.tsx` |
| Effort | 1.5h |
| Deliverable | Score per session + weekly trend chart |
| Blocked by | 2.3 |

### API Contracts
- `POST /workouts/sessions` · Bearer · `{exercise}` → `201 {session_id,started_at}`.
- `POST /workouts/sessions/{id}/finish` · Bearer · `{total_reps, rep_events:[{rep_index,form_score,tempo_ms,flags}]}` → `200 {session, performance_score}` · 404/403.
- `GET /workouts/sessions?limit=` · Bearer → `200 [session]`.
- `GET /performance/weekly` · Bearer → `200 [{week, score, efficiency, consistency}]`.

### UI/UX Specs
- Trainer page: exercise selector, webcam panel + skeleton overlay, HUD (rep count, form bar, live cue), Start/Stop, post-session summary modal.
- States: **loading** (model downloading — progress), **empty** (camera off / no session), **error** (camera denied → instructions; model load fail → retry), **success** (rep ticks, green form, summary).
- Breakpoints: webcam panel scales; HUD repositions on mobile.

### Testing Requirements
- Unit: `angle()` correctness on known vectors; rep state machine with synthetic landmark sequences; scoring formula bounds [0,100].
- Integration: finish-session persists reps + score; weekly aggregation groups correctly.
- E2E (Playwright + mocked landmark stream): start→reps increment→finish→summary→history.
- Edge: no person in frame (no false reps); partial occlusion; camera permission denied; 0-rep session.

### Acceptance Criteria
- [ ] Skeleton overlay renders live at ≥15 FPS.
- [ ] Reps counted within ±1 over 10 controlled reps for all 3 exercises.
- [ ] Wrong form triggers a visible cue.
- [ ] Finished session persists and shows a Performance Score.
- [ ] Weekly report chart renders (with empty state when no data).

### Risks & Mitigations
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Pose model load slow/large | Med | Med | Use `lite` model; show progress; cache; lazy-load route |
| Rep miscounts (lighting/angle) | High | Med | Tunable thresholds; debounce; on-screen "stand fully in frame" guidance |
| Webcam blocked by browser | Med | High | Clear permission UI; HTTPS for deploy (required for getUserMedia) |
| Low-end device lag | Med | Med | Throttle to every Nth frame; `lite` model |

### Hand-off to Next Phase
Workout/session + performance APIs and data feeding the dashboard and habit/recommender modules.

---

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE 3 — AI MODULES: Dietician+Chat, Habit Tracker, IoT, Recommender (Modules 2,5,4,3,7)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Goal:           Stand up the remaining five PRD modules at MVP fidelity, all wired into the dashboard.
  Duration:       ~14 hours (Day 3 + Day 4)
  Prerequisites:  Phases 1–2
  Who:            Solo full-stack dev

### Objectives
1. AI Dietician computes BMI/TDEE → diet plan + macros + grocery list; nutrition logging.
2. Chatbot (Virtual Gym Buddy) answers via free LLM with sentiment-aware motivation; offline fallback.
3. Habit Tracker predicts skip-risk (NumPy logistic regression) and creates daily in-app nudges on user visits, including after API sleep/restart.
4. Smart Gym IoT: simulated devices stream live sensor data to the UI via WebSocket.
5. Recommender ranks the seeded gym catalogue against the user's goal/location; live discovery and a complete program planner are outside this MVP.

### Architecture & Design Decisions
- **Diet engine → pure LLM vs deterministic calc + LLM narration → calc (Mifflin-St Jeor TDEE) + LLM/templated meals → Why:** correctness for numbers, free-tier safe, works offline.
- **LLM provider → OpenRouter explicit free models:** `qwen/qwen3.8-27b:free` primary, `nvidia/nemotron-3.5-lightning:free` backup, then labelled rule-based fallback. Use backend httpx; no paid models, paid plugins, random free router, or Gemini. Model choices are current candidates subject to the live evaluation gate below.
- **Sentiment → cloud API vs local VADER → VADER (`vaderSentiment`) → Why:** free, offline, instant; good enough for tone-adaptive replies.
- **Skip prediction → NumPy logistic regression** on weekday, time_of_day, recent_completion_rate, and streak; retain synthetic bootstrap and explainable factors, without claiming validated predictive accuracy.
- **Nudges → daily catch-up on dashboard/habits visits:** evaluate the current user's risk and write at most one daily nudge, with a database-backed idempotency guard that survives restarts and dismissal. Do not require the API process to run uninterrupted for 24 hours. Guaranteed notifications while a user is absent are backlog work.
- **IoT → in-process simulator + WebSockets:** simulate only for connected users; persist sampled readings in Neon, with configurable seven-day raw-reading retention. No MQTT claim for this implementation.
- **Recommender → live places API vs seed dataset + content scoring → seed JSON + cosine/weighted match (+ optional free Nominatim geocode) → Why:** no paid maps; deterministic, demoable.

### Task Breakdown

#### Task 3.1 — Dietician: BMI/TDEE + plan + grocery
| Field | Detail |
|-------|--------|
| Description | Compute metrics, generate plan, persist, render. |
| Subtasks | (a) `nutrition.py`: BMI, Mifflin-St Jeor BMR, TDEE by activity, target kcal by goal, macro split; (b) meal generator (templated by diet_pref/kcal) + grocery aggregation; (c) `POST /diet/plan`, `GET /diet/plan`; (d) `POST /nutrition/logs`, `GET /nutrition/logs?date=`; (e) Diet page: plan cards, macro donut, log form. |
| Tech/Tools | Python, FastAPI, Recharts |
| File(s) | `/backend/app/diet/service.py`, `/backend/app/diet/router.py`, `/frontend/src/features/diet/DietPage.tsx` |
| Effort | 3h |
| Deliverable | Personalized plan + grocery + nutrition log |
| Blocked by | 1.1 |

#### Task 3.2 — Chatbot (Virtual Gym Buddy) + sentiment
| Field | Detail |
|-------|--------|
| Description | LLM chat with user context + sentiment-adapted tone; graceful offline fallback. |
| Subtasks | (a) Backend httpx call to `https://openrouter.ai/api/v1/chat/completions` with server-held key, system prompt, and necessary profile context; (b) explicit primary/backup free-model allowlist with bounded timeouts and no paid fallback; (c) quota-aware fallback for missing key, account exhaustion, unavailable models, invalid/empty responses, and timeouts; (d) retain VADER tone, stored ChatMessage history, `POST /chat`, `GET /chat/history`, and existing response contract; (e) visible basic-reply badge when `source` is `fallback`; (f) deployment pricing check and live model evaluation. |
| Tech/Tools | OpenRouter free API via httpx, vaderSentiment, FastAPI |
| File(s) | `/backend/app/chat/llm.py`, `/backend/app/chat/router.py`, `/frontend/src/features/chat/ChatPage.tsx` |
| Effort | 3h |
| Deliverable | Working motivational chatbot (online + offline) |
| Blocked by | 1.2 |

**LLM integration contract:** `OPENROUTER_API_KEY` stays in backend secrets; `OPENROUTER_MODEL=qwen/qwen3.8-27b:free`; `OPENROUTER_FALLBACK_MODEL=nvidia/nemotron-3.5-lightning:free`. Preserve `POST /chat` output `{reply, sentiment, source}` with `source: "llm" | "fallback"`. Include a bounded recent history from the authenticated user's stored messages for follow-up context. Send only necessary fitness context, excluding email, account identifiers, credentials, and webcam images; disclose external processing and review selected provider data policies before live use. Keep diet calculations in deterministic application code.

**Free-only operation:** validate selected IDs and zero prompt/completion pricing against the live catalogue before deployment; fail closed to basic replies when configuration cannot satisfy free-only operation. Keep provider price caps at zero where supported and never substitute an unsuffixed paid ID. Disable paid plugins. Record returned model, latency, and usage/cost metadata without logging secrets or full private prompts. Treat account-wide quota exhaustion as a fallback condition, not a reason to cycle through models. Provider-specific failures may try the named backup within the total request timeout. Do not retry indefinitely or require a credit top-up.

**Model evaluation gate (pending):** run the same six prompts against each named model: motivation after missing workouts, a beginner routine, vegetarian diet preferences, a follow-up using conversation context, an injury-related request, and an extreme weight-loss request. Verify concise relevant answers, preference/context adherence, no diagnosis or unsafe instructions, zero reported cost, and completion within the configured timeout. Record observed latency and fallback frequency. This small evaluation is a demo fitness check, not medical validation or evidence of long-term model availability; a failed candidate blocks LLM sign-off until the plan's candidate selection is revised.

#### Task 3.3 — Habit Tracker (skip prediction + nudges)
| Field | Detail |
|-------|--------|
| Description | Log habits, predict skip-risk, schedule nudges. |
| Subtasks | (a) `POST /habits/logs`, `GET /habits` calendar; (b) retain NumPy logistic regression with synthetic bootstrap then user data; (c) `GET /habits/risk`; (d) dashboard/habits visit triggers current-user daily risk evaluation, database-backed idempotency and nudge creation above threshold; (e) retain nudges/dismiss APIs; (f) test duplicate visits, dismissal, concurrent requests, and backend restarts. |
| Tech/Tools | NumPy, FastAPI, PostgreSQL |
| File(s) | `/backend/app/habits/model.py`, `/backend/app/habits/router.py`, `/backend/app/habits/scheduler.py`, `/frontend/src/features/habits/HabitsPage.tsx` |
| Effort | 3h |
| Deliverable | Skip-risk score + automated nudges |
| Blocked by | 1.1 |

#### Task 3.4 — Smart Gym IoT (simulated stream)
| Field | Detail |
|-------|--------|
| Description | In-process simulated readings streamed over WebSockets, with sampled database history and adaptive suggestions. |
| Subtasks | (a) Generate readings only for connected users; (b) store sampled SensorReading rows in Neon and stream live values; (c) retain authenticated `WS /ws/iot` and reconnect UI; (d) rule-based rest/intensity suggestions; (e) `SENSOR_RETENTION_DAYS=7`, prune expired raw readings on simulator activation and periodically while active so cleanup does not require an always-on server; (f) label all sensor data as simulated. |
| Tech/Tools | Python asyncio, FastAPI WebSocket, Neon PostgreSQL, Recharts |
| File(s) | `/backend/app/iot/simulator.py`, `/backend/app/iot/ws.py`, `/frontend/src/features/iot/IotPage.tsx` |
| Effort | 3h |
| Deliverable | Live (simulated) sensor dashboard + suggestions |
| Blocked by | 0.4, 1.1 |

#### Task 3.5 — Seeded Gym Recommender
| Field | Detail |
|-------|--------|
| Description | Score the seeded gym catalogue against user goal + (optional) location. |
| Subtasks | (a) `gyms.json` seed (name, lat/lng, tags, price=free/paid flag); (b) optional Nominatim geocode of user city (free, rate-limited, cached); (c) content scoring (goal/tags match + distance); (d) `GET /recommendations`; (e) UI: ranked cards w/ match % + reason, map-less list (or free Leaflet/OSM tiles). |
| Tech/Tools | Python, httpx (Nominatim), optional Leaflet + OSM tiles (free) |
| File(s) | `/backend/app/reco/service.py`, `/backend/app/reco/router.py`, `/frontend/src/features/reco/RecoPage.tsx` |
| Effort | 2h |
| Deliverable | Ranked seeded gym recommendations, clearly distinguished from live gym discovery |
| Blocked by | 1.1 |

### API Contracts (selected)
- `POST /diet/plan` · Bearer · `{}` (uses profile) → `200 {bmi,tdee,target_kcal,macros,meals,grocery}` · 400 if no profile.
- `POST /nutrition/logs` · Bearer · `{date,food,kcal,protein,carbs,fat}` → `201`.
- `POST /chat` · Bearer · `{message}` → `200 {reply, sentiment, source:"llm|fallback"}` · 429 if rate-limited.
- `GET /habits/risk` · Bearer → `200 {skip_probability, factors[]}`.
- `GET /nudges` · Bearer → `200 [{id,message,reason,sent_at,dismissed}]`.
- `WS /ws/iot` · Bearer(query token) → stream `{device_id,metric,value,ts}`.
- `GET /recommendations?city=` · Bearer → `200 [{name,distance_km,match_score,reason}]`.

### UI/UX Specs
- Pages: Diet, Chat, Habits, IoT, Recommendations — each a dashboard route.
- States per page: **loading** (skeletons/spinners), **empty** ("Generate plan", "No logs yet", "No devices streaming"), **error** (retry + fallback notice, e.g. "AI offline — showing basic reply"), **success** (data rendered).
- Chat: typing indicator, disabled send while pending, autoscroll.
- IoT: connection indicator (live/reconnecting), animated charts.

### Testing Requirements
- Unit: BMI/TDEE/macro math vs known values; VADER tone mapping; skip-model output ∈[0,1]; reco scoring monotonic with match.
- Integration: diet plan persists in PostgreSQL; OpenRouter primary/backup and basic fallback paths work; visits create idempotent daily nudges after restart; simulated readings persist with retention; reco endpoint returns sorted catalogue results.
- E2E: generate diet plan; send chat + get reply; log habit → see streak; open IoT → see live values; view recommendations.
- Edge: LLM timeout/quota → fallback; no profile → diet 400 with friendly UI; WS disconnect → auto-reconnect; empty habit history → cold-start prediction.

### Acceptance Criteria
- [ ] Diet plan with correct BMI/TDEE, macros, grocery list generated and saved.
- [ ] Chatbot returns a verified zero-cost OpenRouter reply; both selected models pass the evaluation gate; quota/no-key/provider failure produces a labelled basic reply.
- [ ] Skip-risk score shown; a qualifying user's visit creates one daily nudge even after server restart, without duplicates after dismissal/revisit.
- [ ] IoT page shows live updating (simulated) sensor charts + a suggestion.
- [ ] Recommendations ranked with match % and reason.

### Risks & Mitigations
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| OpenRouter quota/latency/model withdrawal | High | Med | Shared-account quota accounting, explicit free primary/backup, bounded timeouts, short prompts, and labelled basic fallback; no permanence claim |
| Tiny/no training data for skip model | High | Med | Bootstrap with synthetic data; show "learning…" until enough logs |
| Sensor history consumes Neon allowance | Med | Med | Generate only during active use, sample persistence, seven-day raw-reading retention, monitor storage |
| Nominatim rate limits / offline | Med | Low | Cache results; default to seed distances if geocode fails |
| Giving unsafe health advice | Med | High | System-prompt guardrails + visible "not medical advice" disclaimer |

### Hand-off to Next Phase
All 7 modules functional behind auth, emitting data → ready for analytics aggregation, testing, hardening, deploy.

---

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE 4 — INTEGRATIONS, DASHBOARD & ANALYTICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Goal:           Unify module outputs into a main user dashboard + a protected admin analytics view.
  Duration:       ~3 hours (within Day 4)
  Prerequisites:  Phases 2–3
  Who:            Solo full-stack dev

### Objectives
1. Dashboard home aggregates: latest performance score, today's nutrition vs target, skip-risk, active nudges, streak.
2. Admin route shows app-wide analytics (users, sessions, avg scores) — role-gated.
3. One `GET /dashboard/summary` endpoint powers the home cards.

### Task Breakdown
#### Task 4.1 — Dashboard summary aggregation
| Field | Detail |
|-------|--------|
| Description | Single endpoint composing each module's headline metric. |
| Subtasks | (a) `GET /dashboard/summary` joins latest perf/nutrition/habit/nudges; (b) frontend cards w/ deep links; (c) empty/loading/error states per card. |
| Tech/Tools | FastAPI, Recharts |
| File(s) | `/backend/app/dashboard/router.py`, `/frontend/src/pages/Dashboard.tsx` |
| Effort | 2h |
| Deliverable | Populated dashboard home |
| Blocked by | 2.4, 3.1, 3.3 |

#### Task 4.2 — Admin analytics (role-gated)
| Field | Detail |
|-------|--------|
| Description | Admin-only aggregate stats. |
| Subtasks | (a) `require_role("admin")` dependency; (b) `GET /admin/analytics` (counts, averages, trends); (c) admin page charts; (d) 403 UI for non-admins. |
| Tech/Tools | FastAPI, Recharts |
| File(s) | `/backend/app/admin/router.py`, `/frontend/src/pages/Admin.tsx` |
| Effort | 1h |
| Deliverable | Admin analytics dashboard |
| Blocked by | 1.2 |

### Testing Requirements
- Integration: summary returns correct latest values; admin endpoint 403 for normal user, 200 for admin.
- E2E: dashboard cards link to each module.

### Acceptance Criteria
- [ ] Dashboard shows live headline metric from each module (or empty state).
- [ ] Admin analytics visible only to admin role.

### Risks & Mitigations
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| N+1 queries slow summary | Low | Low | Eager-load / limit to latest rows; it's small data |
| Privilege escalation | Med | High | Server-side role check on every admin route (never trust client) |

### Hand-off to Next Phase
Complete feature set behind one dashboard → ready for full test + hardening pass.

---

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE 5 — TESTING & QA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Goal:           Automated test coverage on critical paths + one full manual QA sweep.
  Duration:       ~3 hours (Day 5)
  Prerequisites:  Phases 1–4
  Who:            Solo full-stack dev

### Objectives
1. Backend unit + integration suite green (pytest).
2. Frontend component tests for auth + key features (Vitest).
3. One Playwright E2E covering the golden path across modules.
4. Manual QA checklist completed; bugs triaged/fixed.

### Task Breakdown
#### Task 5.1 — Backend test suite
| Field | Detail |
|-------|--------|
| Description | pytest unit tests plus PostgreSQL migration/API integration tests, with httpx clients over the APIs built in 1–4. SQLite may remain for isolated tests only. |
| Subtasks | (a) Separate test database and auth fixtures, never the submitted user database; (b) PostgreSQL migration, enums/JSON/dates, auth/diet/workout/habit/reco tests; (c) mocked OpenRouter primary/backup, quota, timeout, malformed reply and free-only rejection tests; (d) nudge idempotency/restart and sensor retention tests; (e) coverage report. |
| Tech/Tools | pytest, httpx, coverage |
| File(s) | `/backend/tests/*` |
| Effort | 1.5h |
| Deliverable | `pytest` green, coverage on core services |
| Blocked by | Phases 1–4 |

#### Task 5.2 — Frontend + E2E tests
| Field | Detail |
|-------|--------|
| Description | Vitest component tests + Playwright golden-path. |
| Subtasks | (a) authStore + ProtectedRoute + a feature component test; (b) Playwright: register→login→diet plan→chat→dashboard; (c) mock webcam/landmarks for trainer E2E. |
| Tech/Tools | Vitest, React Testing Library, Playwright |
| File(s) | `/frontend/src/**/*.test.tsx`, `/frontend/e2e/golden.spec.ts` |
| Effort | 1.5h |
| Deliverable | Frontend tests + 1 E2E green |
| Blocked by | Phases 1–4 |

### Testing Requirements (cross-cutting edge cases)
- Expired/invalid token; SQL/JSON validation failures; LLM offline; WS disconnect; camera denied; empty datasets; non-admin hitting admin; rate-limit triggers.

### Acceptance Criteria
- [ ] `pytest` and `vitest` pass; Playwright golden path passes.
- [ ] PostgreSQL integration and fresh-schema migration checks pass on a separate test database; no test deletes or resets submitted user records.
- [ ] Live evaluation of both selected OpenRouter models is recorded separately from mocked CI tests and historical test counts.
- [ ] Manual QA checklist (per module: loading/empty/error/success) signed off.

### Risks & Mitigations
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Flaky webcam/WS E2E | High | Low | Mock media + WS in tests; keep E2E to deterministic paths |
| Time crunch skips tests | High | Med | Prioritize auth + money-path API tests first |

### Hand-off to Next Phase
Green test suite + known-issues list → hardening.

---

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE 6 — PERFORMANCE & SECURITY HARDENING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Goal:           Close the obvious security and performance gaps before deploy.
  Duration:       ~2 hours (Day 5)
  Prerequisites:  Phase 5
  Who:            Solo full-stack dev

### Objectives
1. AuthN/Z, input validation, rate limiting, secrets, CORS verified across all routes.
2. Basic performance: lazy-load CV route, paginate lists, index hot queries.
3. Privacy: video stays client-side; health disclaimer; no secrets in client bundle.

### Architecture & Design Decisions
- **Secrets → in repo vs env → env only (`.env`, platform secrets) → Why:** never ship keys; `.env` gitignored; client gets none.
- **Rate limiting → none vs slowapi → slowapi on auth, chat, LLM routes → Why:** protect free-tier quota + brute force.

### Task Breakdown
#### Task 6.1 — Security pass
| Field | Detail |
|-------|--------|
| Description | Audit every route for auth + validation; add headers + limits. |
| Subtasks | (a) confirm `get_current_user`/role on all protected routes; (b) Pydantic validation on all bodies; (c) `slowapi` limits (auth 5/min, chat 20/min); (d) security headers (CSP-ish, `X-Content-Type-Options`, etc.); (e) verify CORS allowlist; (f) ensure no API keys reach client bundle; (g) add "not medical advice" disclaimer UI. |
| Tech/Tools | slowapi, FastAPI middleware |
| File(s) | `/backend/app/middleware/*`, route files |
| Effort | 1.5h |
| Deliverable | Hardened, audited API |
| Blocked by | Phase 5 |

#### Task 6.2 — Performance pass
| Field | Detail |
|-------|--------|
| Description | Frontend code-split + backend query tuning. |
| Subtasks | (a) `React.lazy` the trainer/IoT routes (heavy); (b) paginate history/log endpoints; (c) confirm indexes from 1.1; (d) gzip + cache static. |
| Tech/Tools | Vite code-split, SQLAlchemy |
| File(s) | router/index modules |
| Effort | 0.5h |
| Deliverable | Faster load + bounded queries |
| Blocked by | Phase 5 |

### Acceptance Criteria
- [ ] Every protected route enforces auth (and admin where needed) server-side.
- [ ] All inputs validated; rate limits active on auth/chat.
- [ ] No secret/API key present in the built frontend.
- [ ] Heavy routes lazy-loaded; list endpoints paginated; disclaimer visible.

### Risks & Mitigations
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Forgotten unprotected route | Med | High | Grep routes for missing `Depends(get_current_user)`; checklist |
| Key leaked to client | Med | High | Keep all LLM/IoT calls server-side only |

### Hand-off to Next Phase
Secure, validated, indexed app → deploy.

---

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE 7 — DEPLOYMENT & DEVOPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Goal:           Public HTTPS frontend and API, durable Neon user data, and verified end-to-end submission on ongoing free tiers.
  Duration:       Original estimate ~2 hours; remediation and hosted verification must be completed separately.
  Prerequisites:  Phase 6
  Who:            Solo full-stack dev

### Architecture & Design Decisions
- **Hosting → Vercel Hobby + Render Free + Neon Free PostgreSQL:** public HTTPS is mandatory; backend disk is ephemeral and holds no durable user data. No Render persistent disk or expiring Render free database.
- **CI → none vs GitHub Actions → GitHub Actions (free minutes) → Why:** run tests on push; auto-deploy hook.
- **Status:** deployment correction and hosted verification are pending. Existing manifests and local test results do not prove the release is live or durable.

### Task Breakdown
#### Task 7.1 — Backend deploy
| Field | Detail |
|-------|--------|
| Description | Containerize + deploy FastAPI to free host with env secrets. |
| Subtasks | (a) Remove Render disk/SQLite configuration; (b) set JWT secret, actual CORS origins, pooled/direct Neon URLs and backend OpenRouter configuration; (c) apply Alembic via the direct URL before serving, with idempotent optional demo seeding; (d) use one API process for the in-process simulator and verify WebSocket reconnect after restart; (e) fail hosted startup on missing database settings or placeholder JWT secret; (f) verify nudge catch-up, sensor retention, database wake-up, and preservation of user records. |
| Tech/Tools | Docker, Render Free, Neon Free PostgreSQL, OpenRouter free API |
| File(s) | `/backend/Dockerfile`, `/render.yaml` |
| Effort | 1h |
| Deliverable | Verified HTTPS API with Neon persistence, free-only OpenRouter responses, and no persistent-disk requirement |
| Blocked by | Phase 6 |

#### Task 7.2 — Frontend deploy + CI
| Field | Detail |
|-------|--------|
| Description | Deploy SPA, point at API; CI runs tests. |
| Subtasks | (a) Vercel Hobby project, set actual HTTPS `VITE_API_URL` and matching backend CORS origin; (b) SPA rewrite and cold-start loading/retry UI; (c) GitHub Actions: unit tests, PostgreSQL integration/migrations, frontend tests and build; (d) run hosted E2E/manual acceptance separately, including actual webcam and WebSocket use. |
| Tech/Tools | Vercel (free), GitHub Actions |
| File(s) | `/.github/workflows/ci.yml`, `/frontend/vercel.json` |
| Effort | 1h |
| Deliverable | Public app + green CI |
| Blocked by | 7.1 |

### Acceptance Criteria
- [ ] App loads over HTTPS; webcam works (HTTPS requirement met).
- [ ] Frontend talks to deployed backend (CORS correct).
- [ ] CI runs tests on push.
- [ ] Secrets only in host env, never in repo/bundle.
- [ ] From a fresh browser, register, complete profile, save workout/diet/nutrition/chat/habit records, then sign in from another browser and retrieve the same data.
- [ ] Restart and redeploy the backend and repeat reads; no record loss, database reseeding substitution, or local-machine dependency.
- [ ] After backend sleep and Neon idle suspension, the UI handles wake-up and the API reconnects; IoT WebSocket reconnects and nudges catch up without duplicate daily rows.
- [ ] Both selected OpenRouter models pass the live evaluation gate; confirm zero reported cost, account quota handling, and basic fallback without paid requests.
- [ ] Sensor retention removes expired raw readings without deleting profiles, workouts, or other permanent user records.
- [ ] Record working public frontend/API URLs and dated verification evidence; configuration creation alone is not completion.
- [ ] Document a PostgreSQL export/restore procedure using the direct connection; verify a backup restores into a separate test database before submission, without overwriting the live database.

### Risks & Mitigations
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Backend and database cold starts | High | Med | Loading/retry UI, bounded connection recovery, warm manually before presenting; no always-on uptime claim |
| API ephemeral filesystem | High | High | All durable records in Neon; restart/redeploy persistence checks; reseeding is not recovery |
| OpenRouter account quota or model disappearance | High | Med | Explicit free-model chain and labelled basic fallback; recheck catalogue and available quota before evaluation |
| Free database storage/compute allowance exhausted | Med | High | Sample/expire simulated readings, avoid idle database polling, monitor usage and keep verified exports |
| In-process daily scheduler never fires on sleeping host | High | Med | Current-user daily catch-up on visits; off-session scheduled notifications deferred |

### Hand-off to Next Phase
Live URLs + CI → iteration backlog.

---

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE 8 — POST-LAUNCH & ITERATION (backlog, not in 5 days)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Goal:           Prioritized upgrades from MVP → production.
  Duration:       Ongoing

### Backlog (ranked)
1. Independent scheduling and notification delivery while users are absent; Neon persistence and in-app catch-up are required before launch, not backlog items.
2. More exercises + ML-based form scoring (collect labeled data first).
3. MQTT integration using the optional Mosquitto scaffold, then real IoT hardware replacing the simulator when grading scope/budget requires it.
4. Refresh tokens + httpOnly cookie auth; email verification; password reset.
5. Real "nearby gyms" via a free/keyed places provider + map.
6. Mobile responsiveness polish / PWA install.
7. Expanded observability/error tracking; monitor availability without making artificial keep-alive traffic a free-host dependency.
8. Accessibility (a11y) audit + i18n.

### Acceptance Criteria
- [ ] Backlog tracked as GitHub issues with labels/priority.

---

## STEP 3 — MASTER SUMMARY

### Project Execution Summary

The day/hour figures below are historical initial-build estimates. Required remediation remains in Phases 1, 3, 5, 6, and 7; these figures do not estimate that work or indicate completion.
| Phase | Name | Duration | Key Deliverables | Effort (hrs) |
|-------|------|----------|------------------|--------------|
| 0 | Setup & Infrastructure | ½ day | Monorepo, health endpoints, docker-compose | 4 |
| 1 | Foundation & Architecture | Day 1 | Auth, schema, app shell, dashboard frame | 8 |
| 2 | Core: Trainer + Performance | Day 2 | Pose rep-count + form + perf score/report | 9 |
| 3 | AI Modules (Diet, Chat, Habit, IoT, Reco) | Day 3–4 | 5 modules at MVP | 14 |
| 4 | Integrations & Analytics | Day 4 | Dashboard summary + admin analytics | 3 |
| 5 | Testing & QA | Day 5 | pytest/vitest/Playwright green | 3 |
| 6 | Performance & Security | Day 5 | Auth/validation/rate-limit/perf pass | 2 |
| 7 | Deployment & DevOps | Original Day 5; reopened | Verified HTTPS app + Neon persistence + free-only LLM + CI | 2 (historical) |
| 8 | Post-Launch | ongoing | Upgrade backlog | — |
| | **Total (Phases 0–7)** | **~5 days** | | **~45 hrs** |

### Dependency Graph
```
Phase 0 (setup)
  └─> Phase 1 (auth + schema + shell)
        ├─> Phase 2 (Trainer 2.1→2.2→2.3→2.4 ; Performance)
        ├─> Phase 3
        │     ├─ 3.1 Diet      (needs 1.1)
        │     ├─ 3.2 Chat      (needs 1.2)
        │     ├─ 3.3 Habits    (needs 1.1)
        │     ├─ 3.4 IoT       (needs 0.4 + 1.1)
        │     └─ 3.5 Reco      (needs 1.1)
        └─> Phase 4 (dashboard needs 2.4 + 3.1 + 3.3 ; admin needs 1.2)
              └─> Phase 5 (tests, needs 1–4)
                    └─> Phase 6 (hardening)
                          └─> Phase 7 (deploy)
                                └─> Phase 8 (iterate)
```

### Top 5 Project Risks (likelihood × impact)
1. **Scope vs time** — 7 modules in 5 days solo. *Mitigation:* strict MVP-per-module, happy-path first, cut polish before cutting a module's core.
2. **LLM free-tier limits/latency and model withdrawal.** *Mitigation:* explicit zero-cost primary/backup, account-wide quotas, bounded requests, and labelled basic fallback; deterministic diet calculations remain independent.
3. **Pose rep-count accuracy** across lighting/cameras. *Mitigation:* tunable thresholds, on-screen framing guidance, ±1 tolerance acceptance.
4. **Free-host ephemerality / cold starts.** *Mitigation:* Neon persistence, database reconnects, restart/redeploy tests, catch-up nudges, visible loading state, and verified database export; manual warm-up before demo.
5. **Security gaps from speed** (unprotected route, leaked key). *Mitigation:* Phase 6 route-by-route audit; all secrets server-side; grep for missing auth deps.

### Final Tech Stack (complete)
- **Frontend:** React 19, Vite 8, TypeScript, Tailwind CSS 3, React Router 7, Zustand, axios, react-hook-form + zod, Recharts, `@mediapipe/tasks-vision`; existing manifest/lockfile governs exact versions.
- **Backend:** Python 3.12, FastAPI, Uvicorn, SQLAlchemy 2, Alembic, psycopg, Pydantic v2, pydantic-settings, passlib[bcrypt], python-jose, slowapi, loguru, vaderSentiment, numpy, httpx. In-process simulated IoT and visit-triggered nudge catch-up; no always-on scheduler dependency.
- **Data/Infra:** Neon Free PostgreSQL (required), optional Docker development workflow; SQLite only for isolated tests/local experiments. Mosquitto scaffold is future MQTT work.
- **Testing:** pytest, httpx, coverage, Vitest, React Testing Library, Playwright.
- **DevOps/Hosting:** GitHub + GitHub Actions within included allowances, Vercel Hobby frontend, Render Free backend, Neon Free database. OpenStreetMap Nominatim for optional geocoding.
- **LLM:** OpenRouter via backend httpx; `qwen/qwen3.8-27b:free` primary → `nvidia/nemotron-3.5-lightning:free` backup → labelled basic fallback. API keys remain server-side.
- **Cost:** $0 within ongoing free-tier quotas; no paid fallback or credit purchase. Provider limits and model availability must be rechecked before submission.

### Suggested Project File/Folder Structure
```
ai-gym-assistant/
├─ README.md  .gitignore  .env.example  docker-compose.yml
├─ .github/workflows/ci.yml
├─ mosquitto/mosquitto.conf
├─ backend/
│  ├─ Dockerfile  requirements.txt  pyproject.toml  render.yaml
│  ├─ alembic/  app/
│  │  ├─ main.py  config.py  db.py  seed.py
│  │  ├─ middleware/ (errors.py, logging.py, ratelimit.py)
│  │  ├─ models/  schemas/
│  │  ├─ auth/   (router.py, security.py)
│  │  ├─ workouts/ performance/
│  │  ├─ diet/   chat/ (llm.py)  habits/ (model.py, scheduler.py)
│  │  ├─ iot/    (simulator.py, bridge.py, ws.py)
│  │  ├─ reco/ (service.py, gyms.json)
│  │  ├─ dashboard/  admin/
│  └─ tests/
└─ frontend/
   ├─ vercel.json  tailwind.config.js  vite.config.ts
   └─ src/
      ├─ lib/api.ts  store/authStore.ts
      ├─ components/ (ProtectedRoute.tsx, ...)
      ├─ layouts/DashboardLayout.tsx
      ├─ pages/ (Home, Login, Register, Dashboard, Admin)
      ├─ features/
      │  ├─ trainer/ (usePoseLandmarker.ts, PoseCanvas.tsx, repCounter.ts, exercises.ts, formRules.ts, TrainerPage.tsx)
      │  ├─ performance/  diet/  chat/  habits/  iot/  reco/
      └─ e2e/golden.spec.ts
```

---

## Verification (end-to-end, how to prove it works)
1. **Local boot:** `docker compose up` (or `uvicorn` + `vite`); open `/health` → ok; frontend home shows backend ok.
2. **Auth:** register → login → reload stays logged in; unauthed route redirects.
3. **Trainer:** allow webcam, pick squat, do reps → count increments, form cue shows, finish → score saved, appears in history + weekly chart.
4. **Diet:** complete profile → generate plan → BMI/TDEE/macros/grocery render; log a meal.
5. **Chat:** verify an actual zero-cost OpenRouter reply and returned model; evaluate primary and backup separately; exercise no-key/quota/timeout basic-reply badge; tone adapts to negative sentiment. Fallback alone is not LLM sign-off.
6. **Habits:** log a few days → streak + skip-risk gauge; a qualifying visit creates today's nudge after backend restart; repeated visits/dismissal do not create duplicates.
7. **IoT:** open IoT page → live charts update; suggestion banner reacts to HR.
8. **Reco:** enter city → ranked gym list with match % + reason.
9. **Dashboard/Admin:** home cards aggregate all modules; admin route 403s for normal user, loads for admin.
10. **Automated:** `pytest`, `vitest`, and the Playwright golden path all pass; CI green on push.
11. **Security spot-check:** built frontend bundle contains no API keys; every protected route rejects no-token requests with 401.
12. **Hosted persistence:** register/save data over public HTTPS, restart/redeploy API, and retrieve records from a second browser; laptop servers remain off.
13. **Database:** PostgreSQL migration/integration tests, idle wake-up recovery, raw sensor retention, and export/restore into a separate test database pass.
14. **Hosted resilience:** frontend cold-start UX, camera permissions over HTTPS, IoT reconnect, OpenRouter quota/basic fallback, and dated live model evaluation recorded. Keep mocked tests and real-provider evidence distinct.

## Open Confirmations (flagged assumptions)
- MVP/demo fidelity per module is acceptable for grading (not production).
- IoT fully simulated (no hardware) is acceptable.
- OpenRouter account/key and Neon project credentials must be configured at implementation time; fallback-only chat does not meet the LLM demonstration acceptance criterion.
- Web-only (no native mobile) is fine.

---

## Amendment — Frontend design system + landing page (2026-09-27)

This amendment records scope added outside the Phase 0–8 structure, on explicit user request, while Phase 7 (Deployment, reopened) remains the current phase. It is recorded here so the phase log stays accurate; it is **not** a new phase and does not change the Phase 7 remaining-work order (PostgreSQL/Neon persistence → OpenRouter integration → restart-safe nudges and sensor retention → deployment correction → hosted acceptance checks).

**What changed.** A design system derived from https://fitova.framer.ai/ now governs the whole frontend: semantic dark tokens and an Anton/Manrope type scale in `tailwind.config.js`, shared primitives in `src/components/ui/`, centralized chart colors in `src/lib/chartTheme.ts`, a one-page marketing landing at `/` in `src/features/landing/`, and a dark migration of auth, the app shell, and all nine module/dashboard pages. `src/pages/Home.tsx` was deleted and its `/health` probe folded into the landing footer. `framer-motion` and `lucide-react` were added and code-split.

**Effect on existing plan items.**
- The Phase 1 UI/UX spec (line ~294) still holds: the sidebar still collapses to a drawer below 768 px, and the loading/empty/error/success states are unchanged — they are now rendered through the shared `States`/`Disclaimer` primitives instead of inline markup.
- The Phase 3 UI/UX spec (line ~525) still holds: chat typing indicator, disabled send while pending, autoscroll, and the IoT live/reconnecting indicator are all preserved.
- Phase 6's requirement that the medical disclaimer appear on every module page is preserved, and a pre-existing gap on the Dietician page (disclaimer hidden in the empty state) was closed.
- Backlog items #6 (mobile responsiveness polish) and #8 (a11y audit) are **partially** addressed — layouts were verified at 360/810/1360 px with no horizontal scroll, and icons carry `aria-hidden` with labelled controls — but no formal a11y audit, contrast audit, or PWA work was done. Both remain open.

**Not addressed.** Nothing in the Phase 7 deployment sequence. No backend, API contract, `lib/api.ts`, `store/authStore.ts`, or `lib/types.ts` changes. No light-mode toggle and no additional marketing routes (`/about`, `/pricing`, `/blog`, `/team`).

**Release-check impact.** Verification item 10 (`pytest`, `vitest`, Playwright golden path) was re-run for the frontend and passes. Item 14's "frontend cold-start UX" should be re-checked against the new landing page before release, since `/` is no longer a minimal health-check page and now loads two webfonts from Google Fonts.
