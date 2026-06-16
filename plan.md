# AI Gym & Fitness Assistant — 5-Day Solo, Cost-Free Execution Plan

## Context

**Why this plan exists.** The PRD (UNLOX / Rivoquix academy project) describes an ambitious 7-module AI fitness ecosystem with a "proposed" enterprise stack (Next.js, FastAPI, TensorFlow/PyTorch, MongoDB/Postgres, MQTT, AWS S3, OpenAI). The builder is **one student with ~4–5 days and a hard $0 budget**, but wants **all 7 modules** present in v1.

That triple constraint (full scope · solo · 5 days · free) cannot produce a production system. It *can* produce a **coherent, demoable MVP** where every one of the 7 modules works end-to-end at core fidelity, sharing one codebase, one auth system, and one dashboard. This plan deliberately swaps the heavy "proposed" stack for free, zero-ops equivalents that a single person can stand up fast, and flags exactly what was traded away so it can be upgraded later.

**Intended outcome:** a running web app where a user can sign up, do a webcam-tracked workout with live rep counting and form feedback, get a performance score, chat with an AI dietician for a BMI-based plan, see habit/skip predictions and nudges, watch live (simulated) smart-gym sensor data, and receive gym/program recommendations — all on free infrastructure, deployable to free tiers or run locally for the demo.

---

## STEP 1 — PRD DIGEST

- **Project name:** AI Gym & Fitness Assistant
- **Core purpose (1 sentence):** A unified web app that acts as an AI personal trainer, dietician, motivator, and fitness data manager — combining computer-vision workout detection, LLM diet/chat coaching, behavioral habit prediction, simulated smart-gym IoT, and a recommender.
- **Target users:** Individual fitness users (beginners → intermediate) wanting at-home guided workouts, diet help, and progress tracking; secondarily an admin viewing analytics.
- **Tech stack (decided for this build — see rationale in Phase 0/1):**
  - Frontend: **React 18 + Vite 5 + TypeScript + Tailwind CSS 3**, React Router 6, Zustand (state), Recharts (charts), `@mediapipe/tasks-vision` (in-browser pose).
  - Backend: **Python 3.11 + FastAPI + Uvicorn**, SQLAlchemy 2, Pydantic v2, python-jose (JWT), passlib[bcrypt], APScheduler, paho-mqtt, scikit-learn, numpy, pandas.
  - DB: **SQLite** (dev/demo) via SQLAlchemy — zero-config, free. (Upgrade path: Supabase/Postgres free tier.)
  - LLM: **Google Gemini API free tier** (`gemini-flash` family) with a **rule-based offline fallback** so the app works with no key.
  - IoT: **simulated** — a Python MQTT publisher + Eclipse Mosquitto (free, open-source) or an in-process simulator; streamed to UI via WebSocket.
  - Recommender: content-based scoring over a **static seed dataset**; optional free OpenStreetMap **Nominatim** geocoding (no key, no cost).
  - Storage: local filesystem (free). Deploy: Vercel (frontend, free) + Render/HF Spaces (backend, free) or local `docker-compose`.
  - Testing: pytest + httpx (backend), Vitest + React Testing Library (frontend), Playwright (E2E).
- **Key constraints:**
  - **Budget:** $0 — every tool must have a free tier or be open-source. No AWS S3, no Google Maps API, no paid LLM, no real IoT hardware.
  - **Timeline:** ~4–5 working days, solo.
  - **Platform:** web (desktop browser primary; webcam required for the trainer module).
  - **Compliance:** webcam/biometric pose + health data → privacy-by-design (local processing, consent, no PII leakage). Not a medical device — disclaimer required.
- **Ambiguities & assumptions made (flagged for confirmation):**
  1. **"4–5 days" = MVP/demo fidelity, not production.** Each module = its single core capability, happy-path-first. ⚠️ Confirm this is acceptable.
  2. **IoT = fully simulated** (no ESP32/sensors), per "cost-free." ⚠️ Confirm no real hardware is needed for grading.
  3. **Single deployable monolith** (one FastAPI service + one React SPA), not microservices — fastest for solo.
  4. **CV runs in the browser** (MediaPipe Tasks JS), not server-side TensorFlow/PyTorch — avoids needing a GPU server (which isn't free). Server only stores results.
  5. **Free LLM (Gemini) instead of OpenAI**; app degrades gracefully to rule-based responses if no API key.
  6. **No native mobile app** — responsive web only.
  7. **SQLite over MongoDB/Postgres** for the demo; data volume is tiny.
  8. **Habit/skip model trained on synthetic + accumulated user logs** (no real historical dataset exists yet).
  9. **"Nearby gyms"** uses a seeded dataset (+ optional free geocoding), since a live paid maps/places API is excluded.
  10. **Admin dashboard = a protected analytics route**, not a separate app.
- **Total features identified:** 7 PRD modules → mapped to **7 functional app features** + cross-cutting (auth, dashboard, analytics).
- **Complexity rating:** **Very High** (intrinsically) — 7 heterogeneous AI/IoT subsystems (CV, LLM, ML classification, real-time IoT, recommender) spanning the full stack. **Tamed to High-but-feasible** for a 5-day solo build only by: in-browser CV, free managed LLM, SQLite, simulated IoT, static recommender data, and MVP scoping per module.

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

> Durations below are stated in **hours** within these days. Total ≈ **40–48 focused hours**.

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
5. `docker-compose.yml` exists to run backend + Mosquitto (used later) for one-command local bring-up.

### Architecture & Design Decisions
- **Repo layout → Monorepo vs two repos → Monorepo → Why:** one person, shared types/docs, simpler deploy coordination.
- **Backend framework → FastAPI vs Flask/Django → FastAPI → Why:** async (needed for WebSocket IoT stream), auto OpenAPI docs, Pydantic validation built in, minimal boilerplate.
- **Frontend tooling → Vite vs Next.js → Vite SPA → Why:** no SSR needed; faster cold start, simpler for a webcam-heavy client-side app; one fewer runtime to deploy.
- **DB → SQLite vs Mongo/Postgres → SQLite → Why:** zero install/ops, file-based, free, ample for demo; SQLAlchemy keeps a clean swap path to Postgres.
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
| Tech/Tools | Vite 5, React 18, TS, Tailwind 3, axios |
| File(s) | `/frontend/src/lib/api.ts`, `/frontend/src/pages/Home.tsx`, `/frontend/tailwind.config.js` |
| Effort | 1h |
| Deliverable | Vite dev page shows "backend: ok" |
| Blocked by | 0.2 |

#### Task 0.4 — Local orchestration scaffold
| Field | Detail |
|-------|--------|
| Description | docker-compose for backend + Mosquitto broker (used by IoT phase); `.env.example`. |
| Subtasks | (a) `docker-compose.yml` with `backend` + `mosquitto` services; (b) `mosquitto.conf` (anonymous local listener); (c) `.env.example` listing every var (`VITE_API_URL`, `JWT_SECRET`, `GEMINI_API_KEY`, `MQTT_HOST`...). |
| Tech/Tools | Docker, Eclipse Mosquitto (free) |
| File(s) | `/docker-compose.yml`, `/mosquitto/mosquitto.conf`, `/.env.example` |
| Effort | 1h |
| Deliverable | `docker compose up` starts backend + broker |
| Blocked by | 0.2 |

### Testing Requirements
- Smoke: `GET /health` returns 200 (pytest one-liner).
- Frontend boots without console errors; health call succeeds (manual).

### Acceptance Criteria
- [ ] `uvicorn` and `vite` both run locally.
- [ ] Frontend successfully fetches backend `/health`.
- [ ] `docker compose up` launches backend + Mosquitto.
- [ ] Repo pushed to GitHub; `.env` is gitignored; `.env.example` complete.

### Risks & Mitigations
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| CORS blocks frontend→backend | High | Low | Configure `CORSMiddleware` with explicit Vite origin on day 0 |
| Docker not installed | Med | Low | Make Docker optional; document bare `uvicorn` + local Mosquitto/in-process sim fallback |

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
- **Auth → session cookies vs JWT → JWT (access token, short-lived) → Why:** stateless, simple for SPA + single backend; store in memory + refresh on load (avoid localStorage XSS where feasible; document tradeoff).
- **ORM → raw SQL vs SQLAlchemy → SQLAlchemy 2.0 (typed) → Why:** clean models, easy Postgres swap, migrations via Alembic.
- **State mgmt → Redux vs Zustand → Zustand → Why:** minimal boilerplate, fast for solo; holds auth + cross-module user profile.
- **Validation → manual vs Pydantic v2 → Pydantic v2 → Why:** request/response schemas double as OpenAPI + guardrails.

### Task Breakdown

#### Task 1.1 — Data layer & models
| Field | Detail |
|-------|--------|
| Description | SQLAlchemy models + Alembic migrations for all core entities. |
| Subtasks | (a) DB session/engine (`db.py`); (b) models: User, Profile, WorkoutSession, RepEvent, PerformanceScore, DietPlan, NutritionLog, ChatMessage, HabitLog, Nudge, Device, SensorReading, GymRecommendation; (c) Alembic init + first migration; (d) seed script for demo user + gyms dataset. |
| Tech/Tools | SQLAlchemy 2, Alembic, SQLite |
| File(s) | `/backend/app/db.py`, `/backend/app/models/*.py`, `/backend/alembic/`, `/backend/app/seed.py` |
| Effort | 2.5h |
| Deliverable | `alembic upgrade head` builds schema; seed runs |
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
| Token storage XSS | Med | High | In-memory token + re-auth on load; sanitize inputs; document cookie upgrade |
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
3. Habit Tracker predicts skip-risk (scikit-learn) and issues scheduled nudges.
4. Smart Gym IoT: simulated devices stream live sensor data to the UI via WebSocket.
5. Recommender suggests gyms/programs from seed data scored against the user's goal/location.

### Architecture & Design Decisions
- **Diet engine → pure LLM vs deterministic calc + LLM narration → calc (Mifflin-St Jeor TDEE) + LLM/templated meals → Why:** correctness for numbers, free-tier safe, works offline.
- **LLM provider → OpenAI vs Gemini free vs local Ollama → Gemini free tier (primary) + rule-based fallback → Why:** $0, no local GPU; fallback guarantees the demo never hard-fails.
- **Sentiment → cloud API vs local VADER → VADER (`vaderSentiment`) → Why:** free, offline, instant; good enough for tone-adaptive replies.
- **Skip prediction → deep model vs LogisticRegression → LogisticRegression on (weekday, time_of_day, recent_completion_rate, streak) → Why:** tiny data, explainable, trains in ms; retrains on user logs.
- **Nudges → realtime vs APScheduler cron → APScheduler in-process → Why:** free, no external queue; evaluates risk daily and writes Nudge rows.
- **IoT → real MQTT broker + simulated publisher vs in-process sim → MQTT (Mosquitto) + Python simulator, WebSocket to UI; in-process fallback → Why:** demonstrates real MQTT pattern from PRD while staying free; fallback if no broker.
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
| Subtasks | (a) `llm.py` wrapper: Gemini call w/ system prompt (fitness coach, safety disclaimer, user profile context); (b) try/except → rule-based fallback (intents: motivation, diet Q, workout Q); (c) VADER sentiment per user msg → tone modifier + stored; (d) `POST /chat` (persist ChatMessage), `GET /chat/history`; (e) Chat UI (bubbles, typing indicator, send). |
| Tech/Tools | google-generativeai (free tier), vaderSentiment, FastAPI |
| File(s) | `/backend/app/chat/llm.py`, `/backend/app/chat/router.py`, `/frontend/src/features/chat/ChatPage.tsx` |
| Effort | 3h |
| Deliverable | Working motivational chatbot (online + offline) |
| Blocked by | 1.2 |

#### Task 3.3 — Habit Tracker (skip prediction + nudges)
| Field | Detail |
|-------|--------|
| Description | Log habits, predict skip-risk, schedule nudges. |
| Subtasks | (a) `POST /habits/logs`, `GET /habits` calendar; (b) feature builder + LogisticRegression (sklearn) with synthetic-bootstrap then user data; (c) `GET /habits/risk` → today's skip probability; (d) APScheduler daily job writes Nudge when risk>threshold; (e) `GET /nudges`, `POST /nudges/{id}/dismiss`; (f) UI: streak calendar, risk gauge, nudge banner. |
| Tech/Tools | scikit-learn, pandas, APScheduler |
| File(s) | `/backend/app/habits/model.py`, `/backend/app/habits/router.py`, `/backend/app/habits/scheduler.py`, `/frontend/src/features/habits/HabitsPage.tsx` |
| Effort | 3h |
| Deliverable | Skip-risk score + automated nudges |
| Blocked by | 1.1 |

#### Task 3.4 — Smart Gym IoT (simulated stream)
| Field | Detail |
|-------|--------|
| Description | Simulated devices publish sensor data over MQTT; backend bridges to WebSocket; UI live dashboard + adaptive suggestions. |
| Subtasks | (a) `simulator.py` publishes heart_rate/speed/resistance/reps to MQTT topics on interval; (b) backend MQTT subscriber (paho) → store SensorReading + push to WS; (c) `WS /ws/iot` broadcasts readings; (d) rule engine: suggest rest/intensity from HR zones; (e) in-process fallback if no broker; (f) UI: device cards, live line charts, suggestion banner. |
| Tech/Tools | paho-mqtt, Mosquitto, FastAPI WebSocket, Recharts |
| File(s) | `/backend/app/iot/simulator.py`, `/backend/app/iot/bridge.py`, `/backend/app/iot/ws.py`, `/frontend/src/features/iot/IotPage.tsx` |
| Effort | 3h |
| Deliverable | Live (simulated) sensor dashboard + suggestions |
| Blocked by | 0.4, 1.1 |

#### Task 3.5 — Gym Recommender & Planner
| Field | Detail |
|-------|--------|
| Description | Score seed gyms/programs against user goal + (optional) location. |
| Subtasks | (a) `gyms.json` seed (name, lat/lng, tags, price=free/paid flag); (b) optional Nominatim geocode of user city (free, rate-limited, cached); (c) content scoring (goal/tags match + distance); (d) `GET /recommendations`; (e) UI: ranked cards w/ match % + reason, map-less list (or free Leaflet/OSM tiles). |
| Tech/Tools | Python, httpx (Nominatim), optional Leaflet + OSM tiles (free) |
| File(s) | `/backend/app/reco/service.py`, `/backend/app/reco/router.py`, `/frontend/src/features/reco/RecoPage.tsx` |
| Effort | 2h |
| Deliverable | Ranked gym/program recommendations |
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
- Integration: diet plan persists; chat fallback path triggers when LLM key absent; nudge job creates rows; MQTT message → SensorReading; reco endpoint returns sorted list.
- E2E: generate diet plan; send chat + get reply; log habit → see streak; open IoT → see live values; view recommendations.
- Edge: LLM timeout/quota → fallback; no profile → diet 400 with friendly UI; WS disconnect → auto-reconnect; empty habit history → cold-start prediction.

### Acceptance Criteria
- [ ] Diet plan with correct BMI/TDEE, macros, grocery list generated and saved.
- [ ] Chatbot replies online (Gemini) and offline (fallback), tone shifts with sentiment.
- [ ] Skip-risk score shown; at least one nudge auto-generated.
- [ ] IoT page shows live updating (simulated) sensor charts + a suggestion.
- [ ] Recommendations ranked with match % and reason.

### Risks & Mitigations
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| LLM free-tier quota/latency | High | Med | Cache, rate-limit, robust rule-based fallback, short prompts |
| Tiny/no training data for skip model | High | Med | Bootstrap with synthetic data; show "learning…" until enough logs |
| MQTT broker not running in demo | Med | Med | In-process simulator fallback; health check |
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
| Description | pytest with test SQLite + httpx client over the APIs built in 1–4. |
| Subtasks | (a) fixtures (test DB, auth token); (b) auth/diet/workout/habit/reco tests; (c) LLM fallback test (no key); (d) coverage report. |
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

  Goal:           App reachable on the public internet (HTTPS) via free tiers, or one-command local for the demo.
  Duration:       ~2 hours (Day 5)
  Prerequisites:  Phase 6
  Who:            Solo full-stack dev

### Architecture & Design Decisions
- **Hosting → paid vs free tiers → Vercel (frontend) + Render free / HF Spaces (backend) + SQLite file (or Supabase free) → Why:** $0; HTTPS out of the box (required for `getUserMedia`).
- **CI → none vs GitHub Actions → GitHub Actions (free minutes) → Why:** run tests on push; auto-deploy hook.

### Task Breakdown
#### Task 7.1 — Backend deploy
| Field | Detail |
|-------|--------|
| Description | Containerize + deploy FastAPI to free host with env secrets. |
| Subtasks | (a) `Dockerfile` (uvicorn/gunicorn); (b) Render/HF service + env vars (JWT_SECRET, GEMINI_API_KEY, MQTT_HOST); (c) run Alembic on boot + seed; (d) note: IoT simulator runs as a background task/thread. |
| Tech/Tools | Docker, Render/HF Spaces (free) |
| File(s) | `/backend/Dockerfile`, `/render.yaml` |
| Effort | 1h |
| Deliverable | Live HTTPS API |
| Blocked by | Phase 6 |

#### Task 7.2 — Frontend deploy + CI
| Field | Detail |
|-------|--------|
| Description | Deploy SPA, point at API; CI runs tests. |
| Subtasks | (a) Vercel project, set `VITE_API_URL`; (b) SPA rewrite for client routing; (c) GitHub Actions: install→test→build on push. |
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

### Risks & Mitigations
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Free backend cold starts/sleeps | High | Med | Accept for demo; warm before presenting; document |
| SQLite ephemeral FS on host wipes data | High | Med | Persist disk if available, or use Supabase free Postgres; reseed on boot |
| MQTT broker unavailable in cloud | Med | Med | Default to in-process simulator in prod |

### Hand-off to Next Phase
Live URLs + CI → iteration backlog.

---

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE 8 — POST-LAUNCH & ITERATION (backlog, not in 5 days)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Goal:           Prioritized upgrades from MVP → production.
  Duration:       Ongoing

### Backlog (ranked)
1. Swap SQLite → Supabase/Postgres (free tier) for durable data.
2. More exercises + ML-based form scoring (collect labeled data first).
3. Real IoT: ESP32 + heart-rate sensor (when budget allows) replacing simulator.
4. Refresh tokens + httpOnly cookie auth; email verification; password reset.
5. Real "nearby gyms" via a free/keyed places provider + map.
6. Mobile responsiveness polish / PWA install.
7. Observability: error tracking (Sentry free), uptime ping.
8. Accessibility (a11y) audit + i18n.

### Acceptance Criteria
- [ ] Backlog tracked as GitHub issues with labels/priority.

---

## STEP 3 — MASTER SUMMARY

### Project Execution Summary
| Phase | Name | Duration | Key Deliverables | Effort (hrs) |
|-------|------|----------|------------------|--------------|
| 0 | Setup & Infrastructure | ½ day | Monorepo, health endpoints, docker-compose | 4 |
| 1 | Foundation & Architecture | Day 1 | Auth, schema, app shell, dashboard frame | 8 |
| 2 | Core: Trainer + Performance | Day 2 | Pose rep-count + form + perf score/report | 9 |
| 3 | AI Modules (Diet, Chat, Habit, IoT, Reco) | Day 3–4 | 5 modules at MVP | 14 |
| 4 | Integrations & Analytics | Day 4 | Dashboard summary + admin analytics | 3 |
| 5 | Testing & QA | Day 5 | pytest/vitest/Playwright green | 3 |
| 6 | Performance & Security | Day 5 | Auth/validation/rate-limit/perf pass | 2 |
| 7 | Deployment & DevOps | Day 5 | Live HTTPS app + CI on free tiers | 2 |
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
2. **LLM free-tier limits/latency** (chat + diet narration). *Mitigation:* rule-based fallback guarantees function offline; cache; rate-limit.
3. **Pose rep-count accuracy** across lighting/cameras. *Mitigation:* tunable thresholds, on-screen framing guidance, ±1 tolerance acceptance.
4. **Free-host ephemerality / cold starts** (data loss, slow demo). *Mitigation:* reseed on boot or Supabase free Postgres; warm before demo.
5. **Security gaps from speed** (unprotected route, leaked key). *Mitigation:* Phase 6 route-by-route audit; all secrets server-side; grep for missing auth deps.

### Final Tech Stack (complete)
- **Frontend:** React 18, Vite 5, TypeScript, Tailwind CSS 3, React Router 6, Zustand, axios, react-hook-form + zod, Recharts, `@mediapipe/tasks-vision`, (optional Leaflet + OSM tiles).
- **Backend:** Python 3.11, FastAPI, Uvicorn/Gunicorn, SQLAlchemy 2, Alembic, Pydantic v2, pydantic-settings, passlib[bcrypt], python-jose, slowapi, loguru, APScheduler, paho-mqtt, google-generativeai, vaderSentiment, scikit-learn, numpy, pandas, httpx.
- **Data/Infra:** SQLite (dev/demo; Supabase free Postgres upgrade), Eclipse Mosquitto (MQTT), Docker + docker-compose.
- **Testing:** pytest, httpx, coverage, Vitest, React Testing Library, Playwright.
- **DevOps/Hosting (all free):** GitHub + GitHub Actions, Vercel (frontend), Render/HF Spaces (backend). OpenStreetMap Nominatim (free geocoding).
- **Cost:** $0 across the board.

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
5. **Chat:** send a message → reply (online Gemini or offline fallback badge); tone adapts to negative sentiment.
6. **Habits:** log a few days → streak + skip-risk gauge; a nudge appears.
7. **IoT:** open IoT page → live charts update; suggestion banner reacts to HR.
8. **Reco:** enter city → ranked gym list with match % + reason.
9. **Dashboard/Admin:** home cards aggregate all modules; admin route 403s for normal user, loads for admin.
10. **Automated:** `pytest`, `vitest`, and the Playwright golden path all pass; CI green on push.
11. **Security spot-check:** built frontend bundle contains no API keys; every protected route rejects no-token requests with 401.

## Open Confirmations (flagged assumptions)
- MVP/demo fidelity per module is acceptable for grading (not production).
- IoT fully simulated (no hardware) is acceptable.
- Free Gemini key will be obtained (else app runs in fallback mode only).
- Web-only (no native mobile) is fine.
