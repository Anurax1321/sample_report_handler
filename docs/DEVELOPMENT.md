# Development Guide

Local development setup without Docker. For Docker setup, see [DOCKER.md](DOCKER.md).

## Prerequisites

- Python 3.10+
- Node.js 20+ (LTS)
- PostgreSQL 16 (or use Docker for just the DB: `docker compose up db`)

## Quick Start

### Using Start Scripts

```bash
# Linux/macOS/WSL
./scripts/start-dev.sh

# Windows
scripts\start-dev.bat
```

The scripts handle venv creation, dependency installation, migrations, seeding, and starting both servers.

### Manual Setup

#### 1. Database

Start PostgreSQL (if not using Docker for DB):
```bash
# The default connection string expects:
# postgresql://sample_user:sample_pass@localhost:5434/sample_report_db
```

Or just start the Docker DB:
```bash
docker compose up db -d
```

#### 2. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
python seed_admin.py         # Create admin user (admin/admin123)
python seed_data.py          # Optional: sample test data
uvicorn app.main:app --reload --port 8002
```

#### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

## Access Points

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5175 |
| Backend API | http://localhost:8002 |
| API Docs (Swagger) | http://localhost:8002/docs |

## Common Commands

### Backend

```bash
cd backend && source .venv/bin/activate

uvicorn app.main:app --reload --port 8002    # Start server
pytest -v                                     # Run tests
alembic upgrade head                          # Apply migrations
alembic revision -m "description"             # Create migration
alembic current                               # Check migration status
python seed_admin.py                          # Seed admin user
```

### Frontend

```bash
cd frontend

npm run dev          # Start dev server
npm run build        # Production build
npm test             # Run tests
npm run lint         # Lint code
npx tsc --noEmit     # Type check
```

## After Git Pull

If migrations were added:
```bash
cd backend
source .venv/bin/activate
alembic upgrade head
```

## Environment Variables

### Backend (`backend/.env`)
```env
CORS_ORIGINS=http://localhost:5175
SQLALCHEMY_DATABASE_URI=postgresql://sample_user:sample_pass@localhost:5434/sample_report_db
JWT_SECRET_KEY=your-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=480
```

### Frontend (`frontend/.env.development`)
```env
VITE_API_URL=http://localhost:8002
```

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app + middleware + rate limiter
│   ├── api/                 # Route handlers
│   │   ├── routes_auth.py   # Login, register, profile, user management
│   │   ├── routes_samples.py
│   │   ├── routes_reports.py
│   │   └── routes_analyzer.py
│   ├── core/
│   │   ├── config.py        # Settings (env vars)
│   │   ├── dependencies.py  # get_current_user, require_admin
│   │   ├── security.py      # JWT + password hashing
│   │   ├── rate_limit.py    # slowapi limiter instance
│   │   ├── audit.py         # log_audit utility
│   │   └── reference_ranges.py
│   ├── db/
│   │   ├── model.py         # SQLAlchemy models
│   │   ├── base.py          # Declarative base
│   │   └── session.py       # SessionLocal
│   ├── schema/              # Pydantic request/response models
│   └── services/            # Business logic
├── alembic/                 # Migrations
├── uploads/                 # File storage (gitignored)
└── templates/               # Excel template

frontend/src/
├── components/              # Header, shared UI
├── context/                 # AuthContext (user state)
├── lib/                     # API clients
│   ├── api.ts               # Axios instance + interceptors
│   ├── auth.ts              # Auth API + localStorage
│   └── reportApi.ts         # Report API
└── pages/                   # Route pages
```

## Troubleshooting

### Port already in use

```bash
# Linux/WSL
lsof -ti:8002 | xargs kill -9

# Windows
netstat -ano | findstr :8002
taskkill /PID <PID> /F
```

### Migration errors

```bash
# Check current state
alembic current

# Reset (WARNING: deletes data)
# Drop and recreate DB, then:
alembic upgrade head
```

### Frontend changes not showing

- Hard refresh: Ctrl+Shift+R
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`

## Related Docs

- [Docker Guide](DOCKER.md) — Docker setup and modes
- [Database Guide](DATABASE.md) — Migrations and PostgreSQL details
- [Auth & Security](AUTH.md) — Admin roles, rate limiting, audit logging
- [Windows Setup](WINDOWS_SETUP.md) — Windows-specific instructions
