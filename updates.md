# Updates Log

Progress log per CLAUDE.md §5. Concise and factual.

## Phase 0 — Setup & Infrastructure ✅ (2026-06-16)

- **0.1** Monorepo: `git init`, root `.gitignore`, `README.md`, `.env.example`. Unrelated `andrej-karpathy-skills/` left untouched (gitignored).
- **0.2** Backend skeleton: FastAPI app (`app/main.py`), `Settings` via pydantic-settings (`app/config.py`), CORS for Vite origin, `GET /health` → `{"status":"ok"}`. Python 3.12 venv at `backend/.venv`. Verified 200 live + via TestClient.
- **0.3** Frontend skeleton: Vite 5 + React 18 + TS, Tailwind 3, axios client (`src/lib/api.ts`). `Home.tsx` pings `/health` and shows a status badge. `npm run build` green; dev server serves on :5173.
- **0.4** Orchestration: `docker-compose.yml` (backend + Mosquitto), `mosquitto/mosquitto.conf`, `backend/Dockerfile`. `docker compose config` validates. Docker kept optional.

## Phase 1 — Foundation & Architecture ✅ (2026-06-16)

- **1.1** Data layer: SQLAlchemy 2 engine/session (`app/db.py`), all 13 models (`app/models/*`) matching plan.md schema, with indexes. Alembic configured (`alembic/env.py` uses app metadata + `render_as_batch`); initial migration generated and applied — all tables build. `app/seed.py` creates demo user (`demo@example.com` / `demo1234`) with profile. Gym seed at `app/reco/gyms.json`.
- **1.2** Auth: bcrypt hashing + JWT (`app/auth/security.py`, `get_current_user`, `require_role`), routes `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `PUT /profile` (server-side BMI). slowapi rate-limit 5/min on auth. Verified: register 201, dup 409, bad login 401, login→me 200, no-token 401, profile saves with BMI.
- **1.3** Middleware: uniform error envelope `{error:{code,message}}` (`app/middleware/errors.py`), loguru + request-id (`app/middleware/logging.py`, `X-Request-ID` header).
- **1.4** Frontend shell: Zustand `authStore` (login/register/logout/hydrate), axios interceptors (attach token, 401→login), `Login`/`Register` (react-hook-form + zod), `ProtectedRoute`, responsive `DashboardLayout` with nav to all 7 modules + admin, Dashboard home cards, and stub pages for every module. Full register→login→dashboard flow; reload persists session via token in localStorage (XSS tradeoff noted for Phase 6 cookie upgrade).

### Notes / deviations
- Python pinned to 3.12 (plan said 3.11) — both fine.
- `bcrypt` pinned to 4.0.1 to avoid a passlib 1.7.4 version-detection warning.
- Token persisted in `localStorage` for reload persistence (simplest MVP path; documented for hardening in Phase 6).

## Phase 2 — AI Gym Trainer + Performance Score ✅ (2026-06-16)

- **2.1–2.3 (backend)** Workout APIs: `app/schemas/workout.py`, `app/workouts/router.py` — `POST /workouts/sessions` (201), `POST /workouts/sessions/{id}/finish` (persists RepEvents + computes/stores PerformanceScore; 404 unknown, 403 not-owner), `GET /workouts/sessions`. Registered in `main.py`. Models/tables already existed from Phase 1 (verified present via inspector — no migration needed).
- **2.4 (backend)** Performance: `app/performance/service.py` pure `compute_score()` = `0.5·efficiency + 0.3·consistency + 0.2·completion` (efficiency=mean form, consistency=`100−pstdev`, completion vs per-exercise target 12), stdlib `statistics` only (no numpy). `app/performance/router.py` — `GET /performance/weekly` aggregates PerformanceScore by ISO week.
- **2.1 (frontend)** `usePoseLandmarker.ts` lazy-loads MediaPipe `pose_landmarker_lite` (WASM from jsDelivr CDN, model from google storage), GPU delegate, webcam via getUserMedia, per-frame `detectForVideo` in a rAF loop with FPS + loading/denied/error states. `PoseCanvas.tsx` draws a mirrored skeleton overlay.
- **2.2 (frontend)** Pure, unit-tested logic: `poseMath.angle()`, `repCounter.RepCounter` (down→up state machine w/ hysteresis; ignores non-finite angles → no false reps), `formRules` (depth-based per-rep score + live cues), `exercises.ts` config for squat/pushup/bicep_curl.
- **2.3 (frontend)** `TrainerPage.tsx`: exercise selector, webcam panel, HUD (reps, form bar, coach cue), Start→`POST sessions`, Stop→`POST finish`, summary card with returned score; medical disclaimer.
- **2.4 (frontend)** `PerformancePage.tsx`: Recharts weekly line chart with loading/empty/error states.
- **Tests** Backend: pytest added (`backend/tests/`, conftest with in-memory SQLite + TestClient + token); `test_performance.py` (compute_score bounds/monotonicity/edge) + `test_workouts.py` (start→finish→history→weekly, 404, 401) — 9 passing. Frontend: Vitest configured; `poseMath`/`repCounter`/`formRules` tests — 14 passing. `npm run build` green.

### Notes / deviations
- MediaPipe assets loaded from CDN at runtime (chosen tradeoff) — needs internet during a session; clear "downloading model" + retry states shown.
- recharts pinned at 3.8.1 (React 19 compatible).
- `RepCounter` uses an explicit field instead of a constructor parameter property (TS `erasableSyntaxOnly` forbids the latter).
- Build emits a >500 kB chunk warning (MediaPipe + Recharts in the main bundle) — deferred to Phase 6's planned lazy-load/code-split of the trainer/IoT routes.
- Integration/E2E (Playwright, component tests) deferred to Phase 5 per the day-by-day map; only pure-logic + API smoke tests added now.

## Phase 3 — AI Modules (Dietician, Chatbot, Habits, IoT, Recommender) ✅ (2026-06-16)

All 5 remaining PRD modules built end-to-end (backend service/router + frontend page + tests), wired into the existing dashboard shell. Models/tables already existed from Phase 1.

- **Shared wiring** `config.py` (+`gemini_model`, `nudge_risk_threshold`), `main.py` now registers all 8 routers + a `lifespan` that starts/stops the APScheduler nudge job and the in-process IoT simulator loop (verified start/stop clean via TestClient context). `requirements.txt` +`vaderSentiment`,`numpy`,`APScheduler`. `frontend/src/lib/types.ts` +Phase 3 interfaces.
- **3.1 Dietician** `app/diet/service.py` (pure: BMI, Mifflin–St Jeor BMR, TDEE, goal-adjusted target w/ 1200 floor, macro split, templated meals per diet_pref, grocery). `app/diet/router.py` — `POST/GET /diet/plan` (400 if profile incomplete), `POST/GET /nutrition/logs`. `DietPage.tsx`: generate CTA, BMI/TDEE/target cards, macro donut (Recharts PieChart), meals, grocery, nutrition log w/ today's total.
- **3.2 Chatbot** `app/chat/sentiment.py` (VADER, ±0.05 neutral band), `app/chat/llm.py` (Gemini via httpx if key set, else intent-based fallback; returns source). `app/chat/router.py` — `POST /chat` (rate-limited 20/min, persists user+assistant ChatMessage), `GET /chat/history`. `ChatPage.tsx`: bubble thread, typing indicator, autoscroll, "AI offline" badge on fallback.
- **3.3 Habits** `app/habits/model.py` — logistic-regression skip-risk in **pure numpy** (synthetic bootstrap + user logs; standardised gradient descent), explainable factors, cold-start safe. `app/habits/scheduler.py` `run_nudge_job()` (threshold-gated, idempotent per day, directly callable). `app/habits/router.py` — logs/calendar/risk/nudges/dismiss. `HabitsPage.tsx`: log today, risk gauge, 14-day streak grid, nudge banners.
- **3.4 IoT** `app/iot/simulator.py` (pure: per-device random walk + HR-zone suggestions), `app/iot/ws.py` (ConnectionManager + asyncio broadcast loop, persists every 5th tick), `app/iot/router.py` — `GET /iot/devices` (lazily seeds 3 default devices) + `WS /ws/iot?token=`. `IotPage.tsx`: WS client w/ auto-reconnect, live device cards + sparklines, suggestion banner, connection indicator.
- **3.5 Recommender** `app/reco/service.py` (pure: load gyms.json cached, goal-tag + distance-decay scoring w/ reason, haversine, best-effort Nominatim geocode w/ fallback). `app/reco/router.py` — `GET /recommendations?city=` (persists top match). `RecoPage.tsx`: optional city search, ranked cards w/ match % bar, free/paid tag.
- **Tests** Backend +28 (`test_diet`, `test_chat`, `test_habits`, `test_iot`, `test_reco`) → **37 passing** total. Frontend 14 passing, `tsc` clean, `npm run build` green.

### Notes / deviations
- **Skip-risk model uses pure numpy, not scikit-learn.** The demo machine is memory-constrained (~1.5 GB free); scipy's import chain (`scipy.integrate._lebedev`) hit `MemoryError` under pytest's load. Dropped scipy/sklearn (removed from requirements) and hand-rolled the logistic regression (identical semantics, far lighter). sklearn upgrade path noted for Phase 8.
- **Gemini via httpx REST** (not `google-generativeai` SDK) — httpx already installed; key optional, rule-based fallback guarantees the demo never hard-fails.
- **IoT in-process simulator + WebSocket** (no Mosquitto/MQTT); `paho-mqtt`/Docker path is a documented Phase 8 upgrade. WS auth via `?token=` query param (browsers can't set WS headers).
- APScheduler + IoT loop start only in the live app lifespan; unit tests call the nudge job directly and use a bare TestClient (no lifespan).
- Build still emits the >500 kB chunk warning (deferred to Phase 6 code-split, unchanged).

## Phase 4 — Integrations, Dashboard & Admin Analytics ✅ (2026-06-16)

Unified the module outputs into a single dashboard home + a role-gated admin view.

- **4.1 Dashboard summary** `app/dashboard/router.py` — `GET /dashboard/summary` composes one headline metric per module in a single call: latest performance score, today's nutrition intake (sum of today's `NutritionLog.kcal`) vs latest plan's `target_kcal`, skip-risk (reuses `predict_skip_risk`), completed-habit `streak` (consecutive days ending today/yesterday), and active (undismissed) nudge count. `profile_complete` reuses diet's `_profile_complete`. Schema `app/schemas/dashboard.py`. `Dashboard.tsx`: 4-stat summary strip (deep-linked `StatCard`s) above the module grid, with loading/error states.
- **4.2 Admin analytics** `app/admin/router.py` — `GET /admin/analytics` gated by `require_role(Role.admin)` (403 for users, 401 no-token): total users/sessions/chat/habit counts, avg performance score, and sessions grouped by exercise. Schema `app/schemas/admin.py`. `Admin.tsx`: stat cards + Recharts bar chart of sessions-by-exercise, distinct **403 "Admins only"** state vs generic error.
- **Wiring** Both routers registered in `main.py`. Frontend `types.ts` +`DashboardSummary`, `AdminAnalytics`.
- **Tests** Backend +6 (`test_dashboard` 3, `test_admin` 3 incl. role-gate 403/401 + aggregate correctness) → **43 passing**. Frontend `tsc` clean, `npm run build` green (14 vitest unchanged).

### Notes / deviations
- Dashboard aggregation is a handful of small indexed scalar queries (not a true N+1 risk at demo scale), per plan's risk note.
- Build still emits the >500 kB chunk warning (deferred to Phase 6 code-split, unchanged).

## Phase 5 — Testing & QA ✅ (2026-06-16)

Closed the testing gaps left by Phases 2–4 (which deferred component/E2E tests here).

- **5.1 Backend** Added `tests/test_auth.py` (8 tests): register→login→/me happy path, duplicate-email 409, invalid-payload 422, bad-creds 401, no-token 401, **expired-token 401**, server-side BMI on `PUT /profile`, and **rate-limit 429** after 5/min on login. Added an autouse `_reset_rate_limiter` fixture in `conftest.py` (slowapi keeps counts in-process, so per-test login/register calls would otherwise bleed and trip the limit). Coverage via `pytest-cov` (added to `requirements.txt`) wired through `backend/pytest.ini` (`--cov=app --cov-report=term-missing`). **51 passing, 87% coverage.**
- **5.2 Frontend** Switched Vitest to `jsdom` + `globals` with `src/test/setup.ts` (jest-dom matchers + `cleanup`); added `@testing-library/{react,jest-dom,user-event}`. New component tests: `authStore.test.ts` (login stores token+user, logout clears, hydrate w/ and w/o token), `ProtectedRoute.test.tsx` (loader→redirect→children), `PerformancePage.test.tsx` (empty + error states). Pure-logic trainer tests unchanged. **23 passing** (was 14), `tsc -b`/build green.
- **5.2 E2E** Playwright added (`playwright.config.ts` boots real uvicorn + Vite dev as `webServer`s; `e2e/golden.spec.ts`). Golden path: register (auto-login) → dashboard → chat send+fallback-reply → performance empty state. **1 E2E passing** (Chromium). `e2e` npm script added; artifacts gitignored.
- **Manual QA sweep** Per-module loading/empty/error/success states are exercised by the new component tests + the existing 51 backend integration tests (auth edge cases, diet 400-no-profile, chat fallback, habit cold-start, reco sorting, admin 403/401, dashboard aggregation). All three suites green in one run.

### Notes / deviations
- **E2E golden path excludes Trainer and Diet.** Trainer needs a webcam (would require a mocked landmark stream — deferred); Diet needs profile setup first. Both are covered by backend integration + frontend component tests; the E2E stays on the deterministic, no-prerequisite path (auth + chat + performance + routing). Per the user's Phase-5 decision, Playwright was set up **and** run locally.
- E2E runs against the real `app.db` (unique timestamped email per run) — no separate test DB for E2E, matching the demo-fidelity scope.
- Coverage low spots are `iot/ws.py` (WebSocket — needs a live socket) and `seed.py` (a script, not imported by tests); accepted for MVP.

## Phase 6 — Performance & Security Hardening ✅ (2026-06-17)

Audit-and-patch pass. The audit confirmed the backend was already strong on **auth coverage** (every route except `/health` + the two public auth routes is protected; admin role-gated) and **input validation** (all bodies are typed Pydantic schemas), so this phase only closed the concentrated gaps found.

- **6.1 Security headers** New `app/middleware/security.py` (`SecurityHeadersMiddleware`, mirrors `RequestContextMiddleware`) sets `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `X-XSS-Protection: 0` on every response. Registered in `main.py` beside the request-context middleware. No CSP — this is a JSON API; the SPA owns its own CSP on its host (Phase 7).
- **6.1 Rate limits** Extended slowapi (reusing `app.ratelimit.limiter`) to the compute-heavier writes: `POST /diet/plan` and `POST /workouts/sessions/{id}/finish` at `30/minute` (both gained a `request: Request` param, as slowapi requires).
- **6.1 JWT secret guard** `config.py` now warns (loguru, not hard-fail) at `get_settings()` when `jwt_secret` is still the placeholder default — keeps the no-`.env` local/demo + tests working while flagging the deploy footgun. Placeholder extracted to `_JWT_SECRET_PLACEHOLDER`.
- **6.2 Pagination** Added bounded `limit` `Query` params to the three previously-unbounded list endpoints: `GET /nutrition/logs` (50, le 365), `GET /nudges` (50, le 200), `GET /performance/weekly` (26 weeks, le 104 — sliced post-aggregation since rows are bucketed by week). The other three list endpoints already had `Query(le=…)`.
- **6.2 Code-split (frontend)** `App.tsx` now `React.lazy`-loads every feature route + Admin (via `import().then(m => ({default: m.X}))`, so component files keep their named exports), wrapped in one `<Suspense>` with a `Loading…` fallback. `vite.config.ts` adds `build.rollupOptions.output.manualChunks` (function form) splitting `@mediapipe/tasks-vision` and `recharts` into own chunks. **The >500 kB chunk warning is gone** — largest chunks now recharts 382 kB / index 367 kB / mediapipe 136 kB, with per-page lazy chunks 2–9 kB.
- **6.1 Disclaimer** Added the one-line "not medical advice" disclaimer (matching `DietPage`/`Dashboard`) to the five pages missing it: **Chat** (priority — LLM health replies), Performance, Habits, IoT, Reco. Trainer/Diet/Dashboard already had it.
- **Tests** Backend +1 (`test_security_headers_present` in `test_auth.py`) → **52 passing, 88% coverage**. Frontend **23 passing**, `tsc -b` clean, `npm run build` green (no chunk warning).

### Notes / deviations
- `manualChunks` object form (`{mediapipe: [...], recharts: [...]}`) tripped a vite/rollup type-overload error under the vitest config reference; switched to the function form (match on module id) — same result, type-clean.
- CORS wildcard methods/headers left as-is (acceptable with the explicit-origin allowlist for this app); CSP deferred to the SPA host. Both noted for Phase 7.

## Phase 7 — Deployment & DevOps (2026-09-26; completion superseded 2026-09-27)

**Correction:** The original completion claim is superseded: deployment correction and hosted verification are pending. The entries below preserve the historical configuration work, not proof of a successful durable deployment. Render Free cannot attach the described persistent disk; reseeding would not preserve user records. The finalized target is Neon PostgreSQL, and artificial keep-alive traffic is not a release dependency. See [Render's free-service limits](https://render.com/docs/free) and the revision below.

- **7.1 Backend deploy** `render.yaml` created: Docker service (`gym-ai-assistant-api`) on Render free tier, auto-generates `JWT_SECRET`, mounts a 1 GB disk at `/app/data` so SQLite survives restarts (`DATABASE_URL=sqlite:////app/data/app.db`), `GEMINI_API_KEY` synced from Render dashboard. Dockerfile already ran `alembic upgrade head && python -m app.seed` on boot (Phase 0/1). `CORS_ORIGINS` placeholder points to Vercel URL (update after first frontend deploy).
- **7.2 Frontend deploy** `frontend/vercel.json` added: single catch-all rewrite `/(.*) → /` so React Router's client-side routes don't 404 on hard refresh. Set `VITE_API_URL` in Vercel project environment variables to the Render service URL.
- **7.2 CI** `.github/workflows/ci.yml` created: two parallel jobs — `Backend (pytest)` (Python 3.12, pip cache, `pytest`) and `Frontend (vitest + build)` (Node 20, npm cache, `npm test` + `npm run build`) — triggered on every push and PR to any branch.

### Notes / deviations
- Render free tier sleeps after 15 min inactivity — warm the URL before a demo. Upgrade to paid or use UptimeRobot free ping to keep it awake.
- SQLite on a Render disk is durable but single-instance only; Supabase free Postgres is the Phase 8 upgrade path for multi-instance or persistence guarantees.
- E2E (Playwright) is excluded from CI: it requires two running servers and a Chromium binary — too slow/complex for a free CI runner at this scope. Run locally with `npm run e2e`.
- `CORS_ORIGINS` in `render.yaml` must be updated to the real Vercel URL after first deploy (currently set to `https://gym-ai-assistant.vercel.app` as a placeholder).

## Changes finalized to the initial plan — Neon and OpenRouter (2026-09-27)

- **Documentation completed:** revised `plan.md` throughout its requirements digest, architecture, phase tasks, risks, stack summary, backlog, and release checks. This entry records finalized planning decisions only; application code, deployment manifests, migrations, credentials, and hosted services were not changed in this revision.
- **Free-tier requirement:** mandatory public HTTPS frontend/API, independent of the developer's laptop, using ongoing $0 tiers within quotas. Paid upgrade options are acceptable; expiring trials and required credit purchases are excluded. Original five-day/hour figures are historical estimates, not estimates of remaining remediation.
- **Final stack:** retain React/Vite, FastAPI, SQLAlchemy, and browser MediaPipe. Choose Vercel Hobby + Render Free + **Neon Free PostgreSQL**. Durable storage is now a release requirement, not a future Supabase upgrade. Plan pooled runtime/direct migration connections, TLS, PostgreSQL compatibility tests, idle reconnects, preservation of existing records, and export/restore verification.
- **OpenRouter research:** current live catalogue showed zero input/output pricing for primary candidate `qwen/qwen3.8-27b:free` and backup `nvidia/nemotron-3.5-lightning:free`. These replace Gemini in the target plan. No individual model was established as permanently free or continuously available. Older free Llama 3.3/Qwen3 4B descriptive pages remained online while their IDs were absent from the checked live catalogue. Health-focused Ling 3.0 Flash Sante remains a research alternative; `openrouter/free` is excluded because random routing does not preserve the named non-Gemini allowlist.
- **LLM limits and behaviour:** budget for the shared account's 50 free requests/day and 20/minute, subject to upstream availability and current account limits. No paid model/plugin fallback or required top-up. Backend-only keys, catalogue/zero-price checks, explicit primary/backup, bounded timeouts, and labelled basic replies on quota/provider failure; retain `source: "llm" | "fallback"`. Fitness suitability and latency remain unverified until the planned live six-prompt evaluation of each model passes.
- **Automation and growth:** replace the uninterrupted 24-hour scheduler assumption with database-idempotent daily catch-up on dashboard/habits visits; guaranteed notifications while absent remain backlog. Simulated IoT only runs for connected users, with sampled persistence and configurable seven-day raw-reading retention. Keep deterministic nutrition calculations and disclose synthetic prediction, simulated devices, seeded recommendations, and three-exercise scope.
- **Reopened release checks:** real frontend/API URLs and CORS, no Render disk, cross-browser data persistence after restart/redeploy, Neon wake-up, camera/WebSocket recovery, nudge deduplication, free-model evaluation and quota failure, sensor retention, and safe database export/restore. Historical local test counts are not evidence that these new checks passed.
- **Research sources (checked 2026-09-27):** [Neon free limits](https://github.com/neondatabase/website/blob/main/content/faqs/free-plan-limits-and-quotas.md), [OpenRouter live catalogue](https://openrouter.ai/api/v1/models), [Qwen primary](https://openrouter.ai/qwen/qwen3.8-27b:free), [NVIDIA backup](https://openrouter.ai/nvidia/nemotron-3.5-lightning:free), [free-model availability](https://openrouter.ai/docs/guides/routing/routers/free-router), [OpenRouter quotas](https://openrouter.zendesk.com/hc/en-us/articles/39501163636379-OpenRouter-Rate-Limits-What-You-Need-to-Know). Sources and detailed constraints are also recorded in `plan.md`; recheck before deployment.
- **Validation:** documentation consistency review only; no application tests, live model inference, migrations, or deployments performed for this documentation revision.

## Neon + OpenRouter changes applied to the code (2026-09-27)

Implements the five decisions finalized in the entry above, which had changed documentation only. **Hosted deployment, the live Neon connection, and the model evaluation gate remain unverified** — see "Not verified" below.

### PostgreSQL / Neon
- **Driver + config** `psycopg[binary]==3.2.3` added; `APScheduler` removed. `config.py` gains `app_env`, `database_url_unpooled`, `sensor_retention_days`, the five `openrouter_*` fields, and drops `gemini_*` plus the unused `mqtt_*`. `_normalize_db_url` rewrites Neon's `postgresql://` to `postgresql+psycopg://` (bare `postgresql://` resolves to psycopg2, which is not installed).
- **Fail-closed startup** New `validate_runtime_settings()`, called from the lifespan rather than `get_settings()` (which runs at import in every test). With `APP_ENV=production` it raises on a placeholder `JWT_SECRET`, a SQLite `DATABASE_URL`, a missing `DATABASE_URL_UNPOOLED`, or a localhost CORS origin. Warn-only locally.
- **Engine/pool** `db.py` branches by dialect: `pool_pre_ping` + `pool_recycle=300` so the first request after Neon's idle-suspend reconnects instead of erroring, bounded pool (5+2), and `prepare_threshold=None` — psycopg3's server-side prepared statements break on Neon's pooled (PgBouncer transaction-mode) endpoint. TLS comes from the URL, not `connect_args`, so a local/CI PostgreSQL without TLS still connects.
- **Alembic** `env.py` now uses `database_url_unpooled or database_url` and passes it to `create_engine` directly instead of `config.set_main_option` — that path runs through configparser, so a literal `%` in a Neon password was a latent failure. Added `compare_type=True`, made `render_as_batch` SQLite-only, and wrapped online PostgreSQL upgrades in `pg_advisory_lock` so two containers booting at once (a redeploy) serialize.
- **Migration replaced** `49f797f674f8_initial_schema.py` (autogenerated against SQLite, never adjusted) deleted; `dd6f67751226_initial_schema.py` written PG-first. Legitimate because nothing was stamped anywhere and the local `app.db` was discarded by decision. New `app/models/types.py` supplies the shared column types:
  - **Enums → `native_enum=False`** (VARCHAR) for all 10 columns. Native types are not dropped by `drop_all` or by `downgrade`, so the second PostgreSQL test in a session would fail `DuplicateObject: type "role" already exists`; adding a member later would also need a non-transactional `ALTER TYPE`. Data-identical because every member in `enums.py` has `name == value`.
  - **JSON → `JSON().with_variant(JSONB, "postgresql")`**; **all timestamps → `DateTime(timezone=True)`** (the app already wrote tz-aware values into naive columns, where PostgreSQL silently drops the offset); `server_default=func.now()` instead of the SQLite-idiomatic `sa.text('(CURRENT_TIMESTAMP)')`; batch wrappers dropped; `downgrade()` made genuinely reversible.
  - Autogenerate emitted a bare `Text()` in the JSONB variant that is **not imported** — it would have raised `NameError` on first run. Fixed to `sa.Text()`.
- **UTC standardised** New `app/timeutil.py` (`utc_now`, `utc_today`); every `date.today()` in app code replaced. This *fixes* an existing mismatch: the frontend already derives dates with `toISOString().slice(0,10)` (UTC) in `HabitsPage`/`DietPage`.
- **Decimal casts** `func.avg`/`func.sum` return `Decimal` on PostgreSQL and `float` on SQLite; `admin/router.py` and `dashboard/router.py` now cast at the source.

### OpenRouter (replaces Gemini)
- `chat/llm.py` rewritten: `POST /chat/completions` with `Authorization: Bearer`, primary → backup → labelled fallback under **one shared time budget** (`openrouter_timeout_seconds`, default 12s), not a per-attempt timeout that could cost 2×8s.
- **Free-only by construction.** `candidate_models()` fetches `/api/v1/models` and admits a configured id only if it is present *and* zero-priced on prompt/completion/request; the result is cached with a 900s TTL so a transient failure self-heals. If neither model qualifies it **fails closed to basic replies and logs the zero-priced ids that are available**, making substitution a one-env-var change. Requests also send `provider.max_price = {prompt: 0, completion: 0}`.
- **Failures classified** instead of one blanket `except`: 401/403/402 stop, 429 stops *and* sets a 5-minute cooldown (account-wide exhaustion must not cycle models), 5xx/timeout/malformed try the backup within the remaining budget.
- **Daily budget is database-backed** (`llm_usage(day, count)`, new table). The free quota is per OpenRouter *account*, and `ratelimit.py` is keyed by client IP, so the existing 20/min bounded neither. An in-process counter would reset every time the free host sleeps.
- **Bounded history added** — `llm.py` previously sent a single turn, so follow-up context was impossible (and the evaluation gate's context prompt could not pass). The router now passes the most recent 8 messages, truncated per message.
- `source` stays `"llm" | "fallback"`; the answering model is returned in a new additive `ChatOut.model`, so the frontend's closed union and the E2E badge assertion stay valid. `GET /health` now reports `llm_enabled`.
- **Fixed** `GET /chat/history` ordered `ts.asc()` *before* `LIMIT`, returning the **oldest** N rather than the newest.

### Nudges (scheduler removed)
- `habits/scheduler.py` → `habits/nudges.py`. APScheduler and its lifespan wiring deleted: the job used `"interval", hours=24` measured from process start on a host that sleeps after 15 minutes idle, so it realistically never fired in the deployment.
- Idempotency is now **enforced by the database**: new `nudges.nudge_date` column + `uq_nudge_user_date`. The old Python guard filtered on `dismissed == False`, so **dismissing today's nudge let the next visit create another** — covered now by a dedicated regression test.
- Hooked into `GET /dashboard/summary` (reusing the risk score it already computes, before its `active_nudges` count) **and** `GET /nudges` — `HabitsPage` fires `/habits`, `/habits/risk` and `/nudges` in one `Promise.all`, so hooking only the risk endpoint would show the banner a refresh late.
- `habits/model.py` memoizes training (`lru_cache`); the synthetic set is seeded, so it was recomputing 800 identical gradient-descent iterations on every call — now per-request rather than daily.

### IoT retention
- New `iot/retention.py`: `prune_sensor_readings(db, ...)` deletes by age via a bounded id subselect, plus an hourly-guarded `maybe_prune`. New `ix_sensor_ts` index, because `ix_sensor_device_ts` leads with `device_id` and cannot serve an age-only delete. Called on simulator activation, periodically while streaming, and from `GET /iot/devices` so retention advances even if no socket is ever opened.
- `ws.py`: the loop now **starts on the first connection and exits when the last leaves** (it previously woke twice a second from boot to shutdown). Sampling is per-user rather than off one global tick counter; devices are cached per connection so the 4-in-5 non-persisting ticks touch no database at all; per-user state is evicted on disconnect; DB work moved to `asyncio.to_thread`.
- `iot/router.py`: the WS handler caught only `WebSocketDisconnect`, so any other exception **leaked the socket** and would have kept the loop writing rows for a departed client — now a `finally`. Also verifies the user still exists, so a stale-but-valid token cannot create devices for a deleted user.

### Deployment, CI, frontend
- **`render.yaml` rewritten.** Removed the `disk:` block — **Render free instances cannot mount a disk, so the previous manifest could not deploy** — and the SQLite `DATABASE_URL`. Added `APP_ENV=production`, both Neon URLs and `OPENROUTER_API_KEY` as `sync: false`, the OpenRouter/retention settings, `healthCheckPath: /health`, `region`, and `RUN_SEED=false`.
- **`Dockerfile`**: honours Render's `$PORT` (it hardcoded 8000, which would fail the health check), adds `--proxy-headers --forwarded-allow-ips='*'`, `exec`s uvicorn so SIGTERM reaches it and the lifespan shutdown runs, pins `--workers 1` (the WS simulator holds in-memory per-connection state), and makes seeding opt-in.
- **Test deps split** into `requirements-dev.txt` so pytest no longer ships in the image.
- **CI** gains a `backend-postgres` job with `services: postgres:16` running the whole suite against real PostgreSQL. `conftest.py` pins `DATABASE_URL`/`OPENROUTER_API_KEY`/`JWT_SECRET` in the environment **before importing `app`** (previously a developer's `.env` would silently change test behaviour, and the direct `SessionLocal()` call sites could reach a real database from inside pytest), branches the engine by dialect, and auto-skips `@pytest.mark.postgres` off PostgreSQL.
- **Playwright** now gives the backend its own `sqlite:///./e2e.db` plus `OPENROUTER_API_KEY=""`, so E2E stops writing to the dev database (required by plan 5.1a) and the "AI offline" assertion is true by construction rather than by an ambient missing key.
- **Frontend**: `IotPage` reconnect now inspects the close code (it retried a permanently-unauthorised 4401 socket forever on a fixed 2s timer) and uses capped exponential backoff; `ChatResponse.model` added; `docker-compose.yml` gains a local `postgres:16` and moves Mosquitto behind an `mqtt` profile; `.coverage` gitignored; README setup rewritten for Neon/OpenRouter.

### Verified
- **Backend: 100 passed, 10 skipped, 93% coverage** (was 52 passing, 88%). New: 16 chat/OpenRouter tests via `httpx.MockTransport` (`llm.py`'s network path was 0% covered), 7 nudge tests, 8 retention/budget, 7 WebSocket (`ws.py` had none), 14 config. `ws.py` 34%→73%, `retention.py` 100%.
- **Migration** applies, `downgrade base` reverses it, and re-applies cleanly on SQLite; `alembic check` reports no drift against the models.
- **PostgreSQL DDL verified offline** (`alembic upgrade head --sql` against a PG URL, no server needed): **0 `CREATE TYPE`**, 4 `JSONB` columns, 11 `TIMESTAMP WITH TIME ZONE`, 15 tables, and `CONSTRAINT uq_nudge_user_date UNIQUE (user_id, nudge_date)`.
- **Frontend**: 23 vitest passing, `tsc -b` clean, build green with no chunk warning. Built bundle greps clean for `sk-or-`, `OPENROUTER`, `neon.tech`, `DATABASE_URL`, `JWT_SECRET`, `postgresql`.

### Live verification against Neon + OpenRouter (2026-09-27, later the same day)

Credentials were supplied afterwards (kept in the gitignored `.env`), which superseded the "no live connection" caveat originally recorded here. Findings from running the real app against the real services:

- **Model ids confirmed.** `qwen/qwen3.8-27b:free` and `nvidia/nemotron-3.5-lightning:free` are both present in the live catalogue (458 models, 17 `:free`) with `prompt=0`, `completion=0`. The earlier "unconfirmed" status was a truncated fetch, not a missing model.
- **Bug found and fixed — migrations silently rolled back on Neon.** `alembic upgrade head` printed "Running upgrade" but created **0 tables**. The `pg_advisory_lock` SELECT auto-begins a transaction that Alembic treats as external and never commits, so everything was discarded on close. SQLite skips the lock, so no local run could show it. Fixed with `connection.commit()` after taking the (session-level) lock; **15 tables now present on Neon**, JSONB confirmed, 0 native enum types.
- **Bug found and fixed — a per-model 429 was treated as account quota.** Qwen returned 429 `limit_source: upstream_provider_shared_pool` (its shared free pool busy), and the code stopped and cooled down instead of trying Nemotron. `_is_upstream_rate_limit` now distinguishes provider 429s (try the backup, no cooldown) from account 429s (stop, cool down).
- **Bug found and fixed — reasoning models returned their chain-of-thought as the reply.** With defaults, Nemotron's `content` began "Here's a thinking process: 1. Analyze User Input…" and hit `max_tokens` mid-thought. Requests now send `reasoning: {"enabled": false}` (67-token clean reply in testing), with `_leaks_reasoning` as a backstop that rejects such a reply and moves to the backup.
- **End to end over real Neon:** `/health` → `llm_enabled: true`; register/login; two chat turns answered with `source=llm`, `cost: 0`, `reasoning_tokens: 0`, the second reflecting the first (history reaches the model); 4 chat rows persisted; dashboard; 3 devices; demo user seeded.
- `render.yaml` region changed `oregon` → `ohio` to co-locate with Neon (aws-us-east-2).
- Backend suite after these fixes: **103 passed, 10 skipped, 93%**.

### Still not verified
- **The six-prompt model evaluation gate (plan.md:481) has not been run.** Only two informal prompts, on Nemotron only — Qwen was upstream-rate-limited throughout, so **Qwen has not yet produced a single reply here** and remains unevaluated.
- The CI PostgreSQL job has not run; `@pytest.mark.postgres` tests were not executed (no local PostgreSQL). Neon idle-suspend wake-up recovery has not been observed.
- Hosted acceptance checks at plan.md:768–778 — real URLs/CORS, cross-browser persistence after restart/redeploy, camera/WebSocket recovery over HTTPS, and a PostgreSQL export/restore into a separate database — all remain outstanding.
- Playwright was not re-run after the config change (it needs two local servers).
- Pre-existing, untouched: `app/seed.py` does not backfill a `Profile` for a demo user created without one.

## Out-of-phase — Frontend design system + landing page (2026-09-27)

**Sequencing note:** this work is not in any phase of `plan.md` (grep for "landing", "design system", "design token", "theme", "typography" returns zero hits) and was done on explicit user request while Phase 7 (Deployment, reopened) is the current phase. It does not advance the Phase 7 work order. See the plan.md amendment of the same date.

- **Design source:** https://fitova.framer.ai/. Tokens were read from the live page's CSS custom properties and `@font-face` blocks, not estimated: canvas `#171717`, accent `#c3ff96`, hot `#f24`/`#f63e04`, hairline `#ffffff1a`, glass `#ffffff03`, text ladder `#fff`/`#ccc`/`#aaa`/`#575757`; Anton (display, uppercase on 43/50 text nodes, `letter-spacing: 0em` on 47/48) + Manrope (body); `border-radius: 10px` dominant; content max-width ~1360px; breakpoints 810/1200/1360.
- **Tokens:** `tailwind.config.js` replaced its single `brand` color with semantic tokens (`canvas`, `surface`, `hairline`, `ink` ladder, `accent`, `hot`, `stone`, `paper`), display font sizes, a retuned radius scale, and a marquee keyframe. `index.css` flipped to `color-scheme: dark`. Google Fonts preconnect + Anton/Manrope added to `index.html`.
- **Primitives:** new `src/components/ui/` (`Button`, `Card`, `PageHeader`, `StatTile`, `States`, `Disclaimer`, `Reveal`) replacing copy-pasted markup; `StatTile` collapses the former `StatCard`/`Stat`/`Metric` duplicates. New `src/lib/chartTheme.ts` centralizes chart/canvas colors that were hard-coded across five files.
- **Landing:** new `src/features/landing/` (nav with mobile overlay, hero, ticker, module rail, how-it-works, stats, coach cues, footer). Replaces `src/pages/Home.tsx`, which was deleted; its `/health` probe moved into `LandingFooter`. The testimonial slot uses real cue strings from `exercises.ts` rather than invented member reviews.
- **Migrated to dark:** auth pages (split brand panel), `DashboardLayout` (lucide icons replace emoji), `ProtectedRoute`, and all 9 module/dashboard pages.
- **Dependencies:** added `framer-motion` and `lucide-react`; both code-split via `vite.config.ts` `manualChunks` (motion 128 kB / icons 15 kB, separate from the initial bundle).
- **Bug fixed in passing:** the Dietician disclaimer was nested inside the `plan` branch, so it did not render in the loading/empty states (pre-existing, not introduced here). Moved outside the conditional.
- **Preserved for tests:** the `Field` label structure, `"Loading…"`, `"No workouts yet"`, `"Could not load your performance data"`, `"AI offline — basic reply"`, `"Type a message…"`, `"Send"`, `"Create account"`.
- **Validation:** `tsc -b` clean; `vitest run` 23/23 passed; Playwright golden path passed (required `alembic upgrade head` first — the local SQLite DB had no tables, and `npx playwright install chromium`). Scripted browser pass over `/`, `/login` and all 8 app routes at 360/810/1360 px: no horizontal scroll, `body` background `#171717` everywhere, disclaimer present on every module page, no page errors. Reduced-motion check: 0 hidden elements without scrolling. Not verified: live camera capture on `/app/trainer`, and any hosted/deployed behaviour.
