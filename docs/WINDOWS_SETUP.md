# Windows Setup Guide

Windows-specific instructions for running the Sample Report Handler without Docker.

For Docker setup (recommended), see [DOCKER.md](DOCKER.md).

## Prerequisites

1. **Python 3.10+** — [python.org/downloads](https://www.python.org/downloads/). Check "Add Python to PATH" during install.
2. **Node.js 20+ LTS** — [nodejs.org](https://nodejs.org/)
3. **Git** — [git-scm.com](https://git-scm.com/download/win) (optional but recommended)
4. **PostgreSQL 16** — Or use Docker for just the DB: `docker compose up db -d`

## Quick Start

### Using Start Script

```cmd
scripts\start-dev.bat
```

This creates the venv, installs dependencies, runs migrations, seeds data, and starts both servers.

### Manual Setup

#### 1. Database

Start PostgreSQL via Docker (easiest):
```cmd
docker compose up db -d
```

This exposes PostgreSQL on port **5434**.

#### 2. Backend

```cmd
cd backend
python -m venv .venv
.venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
alembic upgrade head
python seed_admin.py
uvicorn app.main:app --reload --port 8002
```

If you get pandas/numpy build errors:
```cmd
pip install --only-binary :all: pandas numpy
pip install -r requirements.txt
```

#### 3. Frontend

Open a **new** Command Prompt:
```cmd
cd frontend
npm install
npm run dev
```

## Access Points

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5175 |
| Backend API | http://localhost:8002 |
| API Docs | http://localhost:8002/docs |

Default login: `admin` / `admin123`

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

## Troubleshooting

### "Python was not found"

Reinstall Python and check "Add Python to PATH". Restart your computer. Verify: `python --version`

### Virtual environment activation fails in PowerShell

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.venv\Scripts\Activate.ps1
```

In Command Prompt, use `.venv\Scripts\activate.bat` instead.

### "npm" command not found

Ensure Node.js is installed, then restart your terminal. Verify: `node --version`

### Port already in use

```cmd
netstat -ano | findstr :8002
taskkill /PID <PID> /F
```

### pandas/numpy build errors

```cmd
pip install --only-binary :all: pandas numpy
pip install -r requirements.txt
```

Or install [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/downloads/) ("Desktop development with C++").

## Related Docs

- [Development Guide](DEVELOPMENT.md) — General local setup (Linux/macOS/WSL)
- [Docker Guide](DOCKER.md) — Docker setup (works on Windows too)
- [Database Guide](DATABASE.md) — Migration details
