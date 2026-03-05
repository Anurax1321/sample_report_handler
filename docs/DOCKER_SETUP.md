# Docker Setup Guide

## Quick Start (One Command Setup!)

Just run:

```bash
docker compose up --build
```

That's it! The system will:
1. ✅ Build backend and frontend Docker images
2. ✅ Install all dependencies automatically
3. ✅ Create required directories (`uploads`, `templates`)
4. ✅ Run database migrations
5. ✅ Start backend server on `http://localhost:8000`
6. ✅ Start frontend on `http://localhost:3000`
7. ✅ Wait for backend to be healthy before starting frontend

## What Happens Automatically

### Backend Container
1. **Installs dependencies** from `requirements.txt` (including openpyxl, pandas, numpy)
2. **Creates directories**:
   - `/app/uploads` - For uploaded report files
   - `/app/templates` - For Excel template
3. **Runs migrations** - `alembic upgrade head` (creates all tables)
4. **Starts server** - FastAPI with auto-reload

### Frontend Container
1. **Installs npm packages**
2. **Builds React app** (production build)
3. **Serves with Nginx** on port 80 (mapped to 3000)
4. **Waits for backend** to be healthy before starting

## Access Points

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## Persistent Data

Docker volumes are configured to persist data across container restarts:

- **backend-uploads**: Stores all uploaded report files
- **backend-db**: Stores SQLite database

This means your data is safe even if you stop/restart containers!

## Common Commands

### Start Everything
```bash
docker compose up
```

### Start in Background (Detached Mode)
```bash
docker compose up -d
```

### Rebuild and Start (After Code Changes)
```bash
docker compose up --build
```

### Stop Everything
```bash
docker compose down
```

### Stop and Remove Volumes (Clean Slate)
```bash
docker compose down -v
```

### View Logs
```bash
# All logs
docker compose logs

# Follow logs (real-time)
docker compose logs -f

# Backend logs only
docker compose logs backend

# Frontend logs only
docker compose logs frontend
```

### Restart Services
```bash
# Restart everything
docker compose restart

# Restart backend only
docker compose restart backend

# Restart frontend only
docker compose restart frontend
```

### Execute Commands in Containers
```bash
# Backend shell
docker compose exec backend bash

# Run migrations manually
docker compose exec backend alembic upgrade head

# Check Python packages
docker compose exec backend pip list

# Frontend shell
docker compose exec frontend sh
```

## First Time Setup

### 1. Start the System
```bash
docker compose up --build
```

Wait for the startup banner:
```
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║         🚀 Sample Report Handler - READY TO USE 🚀        ║
║                                                            ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  📍 Backend API:       http://localhost:8000              ║
║  📚 API Docs:          http://localhost:8000/docs         ║
║  ❤️  Health Check:     http://localhost:8000/health       ║
║                                                            ║
║  🎨 Frontend:          http://localhost:3000              ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

### 2. Create a Test Sample (Optional)

Open a new terminal and run:

```bash
docker compose exec backend python -c "
import requests
response = requests.post('http://localhost:8000/samples', json={
    'sample_code': 'TEST001',
    'test_type': 'NBS',
    'collected_by': 'Lab Tech',
    'priority': 'normal'
})
print('Sample created:', response.json())
"
```

Or use curl:
```bash
curl -X POST http://localhost:8000/samples \
  -H "Content-Type: application/json" \
  -d '{
    "sample_code": "TEST001",
    "test_type": "NBS",
    "collected_by": "Lab Tech",
    "priority": "normal"
  }'
```

### 3. Access the Frontend
Open http://localhost:3000 in your browser and start using the app!

## Troubleshooting

### Container Won't Start

**Check logs:**
```bash
docker compose logs backend
docker compose logs frontend
```

**Check if ports are in use:**
```bash
# On Windows
netstat -ano | findstr "8000"
netstat -ano | findstr "3000"

# On Linux/Mac
lsof -i :8000
lsof -i :3000
```

### Database Issues

**Reset database (WARNING: Deletes all data):**
```bash
docker compose down -v
docker compose up --build
```

**Check database tables:**
```bash
docker compose exec backend python -c "
from app.db.session import SessionLocal
from app.db import model
db = SessionLocal()
print('Samples:', db.query(model.Sample).count())
print('Reports:', db.query(model.Report).count())
"
```

### Migration Issues

**Check migration status:**
```bash
docker compose exec backend alembic current
```

**View migration history:**
```bash
docker compose exec backend alembic history
```

**Run migrations manually:**
```bash
docker compose exec backend alembic upgrade head
```

### File Upload Issues

**Check uploads directory:**
```bash
docker compose exec backend ls -la /app/uploads
```

**Check permissions:**
```bash
docker compose exec backend ls -la /app
```

**Check template exists:**
```bash
docker compose exec backend ls -la /app/templates
```

### Backend Not Responding

**Check if backend is healthy:**
```bash
curl http://localhost:8000/health
```

**Restart backend:**
```bash
docker compose restart backend
```

**Check backend logs:**
```bash
docker compose logs -f backend
```

### Frontend Can't Connect to Backend

**Check environment variables:**
```bash
docker compose exec frontend cat /etc/nginx/conf.d/default.conf
```

**Check CORS settings** in backend logs - should allow `http://localhost:3000`

## Development Workflow

### Making Code Changes

#### Backend Changes
The backend uses volume mounting (`./backend:/app`), so changes are reflected immediately with auto-reload.

1. Edit backend code
2. Save file
3. Backend automatically reloads (watch logs: `docker compose logs -f backend`)

#### Frontend Changes (Requires Rebuild)
Frontend uses a production build, so you need to rebuild:

```bash
# Stop containers
docker compose down

# Rebuild and start
docker compose up --build
```

### Testing Changes

**Run backend tests:**
```bash
docker compose exec backend pytest
```

**Check API docs:**
Open http://localhost:8000/docs to test endpoints interactively

## Production Deployment

For production, consider:

1. **Use PostgreSQL instead of SQLite**:
   ```yaml
   # In docker-compose.yml
   services:
     postgres:
       image: postgres:16
       environment:
         POSTGRES_DB: sample_reports
         POSTGRES_USER: admin
         POSTGRES_PASSWORD: secure_password
       volumes:
         - postgres-data:/var/lib/postgresql/data

     backend:
       environment:
         - SQLALCHEMY_DATABASE_URI=postgresql://admin:secure_password@postgres:5432/sample_reports
       depends_on:
         - postgres
   ```

2. **Use environment variables file**:
   ```bash
   # Create .env file
   CORS_ORIGINS=https://yourdomain.com
   SQLALCHEMY_DATABASE_URI=postgresql://...
   ```

   Update docker-compose.yml:
   ```yaml
   services:
     backend:
       env_file:
         - .env
   ```

3. **Enable HTTPS** with reverse proxy (nginx, traefik, caddy)

4. **Set up backups** for volumes:
   ```bash
   docker run --rm -v backend-uploads:/data -v $(pwd):/backup \
     alpine tar czf /backup/uploads-backup.tar.gz -C /data .
   ```

5. **Use Docker secrets** for sensitive data

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Docker Host                        │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │  Frontend Container (Nginx)                       │ │
│  │  Port: 3000 → 80                                  │ │
│  │  - Serves React production build                  │ │
│  │  - Proxies API requests to backend                │ │
│  └──────────────────┬────────────────────────────────┘ │
│                     │ HTTP                              │
│  ┌──────────────────▼──────────────────────────────┐   │
│  │  Backend Container (FastAPI)                    │   │
│  │  Port: 8000                                     │   │
│  │  - Runs migrations on startup                   │   │
│  │  - Creates uploads/templates directories        │   │
│  │  - Auto-reload enabled                          │   │
│  │  Volumes:                                        │   │
│  │  - backend-uploads (persistent)                 │   │
│  │  - backend-db (persistent)                      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Network: app-network (bridge)                  │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## File Structure in Containers

### Backend Container
```
/app/
├── alembic/                # Migration files
├── app/                    # Application code
├── templates/              # Excel template (created on startup)
├── uploads/                # Uploaded files (persistent volume)
├── dev.db                  # SQLite database
├── entrypoint.sh          # Startup script
└── requirements.txt       # Python dependencies
```

### Frontend Container
```
/usr/share/nginx/html/      # Built React app
/etc/nginx/conf.d/          # Nginx configuration
```

## Clean Slate Reset

To completely reset everything:

```bash
# Stop and remove everything
docker compose down -v

# Remove images (optional)
docker compose down --rmi all

# Rebuild from scratch
docker compose up --build
```

## Summary

With Docker, you can:
- ✅ **One command setup**: `docker compose up --build`
- ✅ **Automatic migrations**: Run on every startup
- ✅ **Persistent data**: Uploads and database survive restarts
- ✅ **Isolated environment**: No conflicts with local Python/Node
- ✅ **Easy cleanup**: `docker compose down -v`
- ✅ **Production ready**: Just add PostgreSQL and HTTPS

---

**Need help?** Check logs with `docker compose logs -f` or visit http://localhost:8000/docs
