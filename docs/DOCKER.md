# Docker Guide

## Quick Start

```bash
docker compose up --build
```

This automatically:
1. Starts PostgreSQL on port 5434
2. Runs database migrations
3. Seeds test data
4. Starts backend on http://localhost:8002
5. Starts frontend on http://localhost:3002

## Docker Modes

### Default Mode (docker-compose.yml)

Production-style frontend (Nginx), hot-reload backend.

```bash
docker compose up --build
```

| Service | Port |
|---------|------|
| Frontend | http://localhost:3002 |
| Backend | http://localhost:8002 |
| API Docs | http://localhost:8002/docs |

### Development Mode (docker-compose.dev.yml)

Hot reload on both frontend and backend — use when actively developing.

```bash
docker compose -f docker-compose.dev.yml up --build
```

| Service | Port |
|---------|------|
| Frontend (Vite HMR) | http://localhost:5175 |
| Backend | http://localhost:8002 |

### Production Mode (docker-compose.prod.yml)

Bound to 127.0.0.1 (expects Nginx reverse proxy in front).

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

| Feature | Default | Dev | Prod |
|---------|---------|-----|------|
| Frontend hot reload | No | Yes | No |
| Backend hot reload | Yes | Yes | Yes |
| Frontend port | 3002 | 5175 | 127.0.0.1:3002 |
| Backend port | 8002 | 8002 | 127.0.0.1:8002 |
| DB exposed | 5434 | 5434 | No |

## Common Commands

```bash
# Start
docker compose up -d

# Stop
docker compose down

# Rebuild after code changes
docker compose up --build

# View logs
docker compose logs -f
docker compose logs -f backend

# Shell into container
docker compose exec backend bash

# Run migrations manually
docker compose exec backend alembic upgrade head

# Check DB
docker exec sample-report-db psql -U sample_user -d sample_report_db -c "SELECT * FROM users;"

# Clean slate (WARNING: deletes all data)
docker compose down -v
docker compose up --build
```

## Persistent Data

Docker volumes preserve data across restarts:

- `postgres-data` — Database
- `backend-uploads` — Uploaded files

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Docker Host                       │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │  Frontend (Nginx or Vite)                    │   │
│  │  Port: 3002 / 5175                           │   │
│  └──────────────────┬───────────────────────────┘   │
│                     │                                │
│  ┌──────────────────▼───────────────────────────┐   │
│  │  Backend (FastAPI + uvicorn)                  │   │
│  │  Port: 8002 (host) → 8000 (container)        │   │
│  │  - Runs migrations on startup                 │   │
│  │  - Auto-reload enabled                        │   │
│  └──────────────────┬───────────────────────────┘   │
│                     │                                │
│  ┌──────────────────▼───────────────────────────┐   │
│  │  PostgreSQL 16                                │   │
│  │  Port: 5434 (host) → 5432 (container)        │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  Network: app-network (bridge)                       │
└─────────────────────────────────────────────────────┘
```

## Troubleshooting

### Container won't start

```bash
docker compose logs backend
docker compose logs frontend
```

### Port already in use

```bash
# Check what's using the port
lsof -i :8002    # Linux/Mac
netstat -ano | findstr :8002   # Windows
```

### Database issues

```bash
# Check migration status
docker compose exec backend alembic current

# Reset database
docker compose down -v
docker compose up --build
```

### Frontend can't connect to backend

Check CORS settings in backend logs. The docker-compose files set `CORS_ORIGINS` to match the frontend URL.

### Changes not showing

- **Backend**: Changes auto-reload (volume mounted)
- **Frontend (default mode)**: Requires rebuild: `docker compose up --build`
- **Frontend (dev mode)**: Auto-reloads via Vite HMR

## Related Docs

- [Development Guide](DEVELOPMENT.md) — Non-Docker setup
- [Database Guide](DATABASE.md) — Migration details
