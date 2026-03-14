# CLAUDE.md

## Project Context

- **Stack:** FastAPI, SQLAlchemy, Alembic, PostgreSQL 16, React 19, TypeScript, Vite
- **Auth:** JWT (python-jose), bcrypt, slowapi rate limiting
- **Infrastructure:** Docker, Nginx, WSL2
- **Database:** PostgreSQL 16 (port 5434)
- **Key Directories:**
  - `/backend/app/api/` — Route handlers (auth, samples, reports, analyzer)
  - `/backend/app/core/` — Config, dependencies, security, rate_limit, audit
  - `/backend/app/db/` — SQLAlchemy models, session
  - `/backend/app/services/` — Business logic (processing, PDF gen, analysis)
  - `/frontend/src/` — React frontend

## Ports

| Service    | Dev (manual) | Docker (default) | Docker (dev) |
|------------|-------------|-----------------|-------------|
| PostgreSQL | 5434        | 5434            | 5434        |
| Backend    | 8002        | 8002            | 8002        |
| Frontend   | 5175        | 3002            | 5175        |

## Rules

- Use TypeScript for all new frontend code.
- Use plain CSS for styling (no Tailwind).
- Use `npm` for package management (not pnpm/yarn).
- Use PostgreSQL only (no SQLite). Connection string via `SQLALCHEMY_DATABASE_URI` env var.
- Always create Alembic migrations for schema changes. Use `server_default` when adding non-nullable columns to existing tables.
- All endpoints except `/auth/login` and `/health` require JWT. Admin-only endpoints use `Depends(require_admin)`.
- All mutating operations on samples/reports must call `log_audit()` and set tracking fields (`created_by_id`, `updated_by_id`, `uploaded_by_id`).
- Reference ranges and multiplication factors in `reference_ranges.py` are medically validated — do not modify without explicit approval.
- Use the shared axios instance from `lib/api.ts` for frontend API calls (handles auth headers). The analyzer uses `services/analyzerApi.ts`.
- When editing `backend/app/core/security.py` or auth-related code, run a security review agent before finishing.
- Test commands: `pytest -v` (backend), `npm test` (frontend).

## Common Commands

### Backend

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8002    # Start server
pytest -v                                     # Run tests
alembic upgrade head                          # Apply migrations
alembic revision -m "description"             # Create migration
```

### Frontend

```bash
cd frontend
npm run dev          # Start dev server (port 5175)
npm run build        # Production build (tsc -b && vite build)
npm test             # Run tests (vitest)
npm run lint         # Lint (eslint)
```

### Docker

```bash
docker compose up --build                              # Default mode
docker compose -f docker-compose.dev.yml up --build    # Dev mode (HMR)
docker compose -f docker-compose.prod.yml up -d --build # Production
docker compose exec backend alembic upgrade head       # Run migrations
```

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app, middleware, rate limiter
│   ├── api/                 # Route handlers (auth, samples, reports, analyzer)
│   ├── core/                # Config, dependencies, security, rate_limit, audit
│   ├── db/                  # SQLAlchemy models, session, base
│   ├── schema/              # Pydantic request/response models
│   └── services/            # Business logic (processing, PDF gen, analysis)
├── alembic/                 # Database migrations
├── uploads/                 # File storage (gitignored)
└── templates/               # Excel template

frontend/src/
├── components/              # Header, shared UI
├── context/                 # AuthContext (user state)
├── lib/                     # API clients (api.ts, auth.ts, reportApi.ts)
├── services/                # analyzerApi.ts
├── pages/                   # Route pages
└── types/                   # TypeScript type definitions
```

## Environment Variables

### Backend (`backend/.env`)
```
CORS_ORIGINS=http://localhost:5175
SQLALCHEMY_DATABASE_URI=postgresql://sample_user:sample_pass@localhost:5434/sample_report_db
JWT_SECRET_KEY=your-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=480
```

### Frontend (`frontend/.env.development`)
```
VITE_API_URL=http://localhost:8002
```

## Default Credentials

- Admin login: `admin` / `admin123` (created by `seed_admin.py`)

## Skills

Available skills for this project:

- `/simplify` — Review recently changed code for reuse, quality, and efficiency
- `/loop <interval> <prompt>` — Run a prompt on a recurring interval (e.g., `/loop 5m check deploy status`)
- `/claude-api` — Load Claude API reference (auto-triggers on anthropic imports)

## Agents

Custom agents are defined in `.claude/agents/`. Use them for domain-specific work:

| Agent | Model | Purpose |
|-------|-------|---------|
| `frontend` | Sonnet | React/TypeScript components, pages, styling, frontend API clients |
| `backend` | Sonnet | FastAPI routes, services, schemas, middleware, business logic |
| `database` | Sonnet | Alembic migrations, SQLAlchemy models, schema design, seeding |
| `security-reviewer` | Sonnet | OWASP top 10 review after auth/API/data changes (read-only) |
| `test-runner` | Haiku | Run pytest + vitest + tsc type-check, report pass/fail |
| `api-tester` | Sonnet | Test API endpoints with curl against running backend |
| `deployer` | Haiku | Docker build verification, container health checks, compose validation |

### Built-in agents

- **Explore** — Fast codebase search and file discovery (read-only, Haiku)
- **Plan** — Research and design implementation strategy before coding

### When to use agents

- Always delegate to the appropriate domain agent (frontend/backend/database) for focused work
- Always run `security-reviewer` after auth, API, or data-handling changes
- Always run `test-runner` after implementations to verify nothing breaks
- Launch multiple agents in parallel when tasks are independent (e.g., security review + tests simultaneously)
- Use `api-tester` to validate endpoints against a running server
- Use `deployer` to verify Docker setup before/after deployment
