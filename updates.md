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

## Next: Phase 2 — AI Gym Trainer (pose + rep counting + form) + Performance Score.
