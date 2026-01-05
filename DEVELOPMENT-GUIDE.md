# Development Guide - Sample Report Handler

## Quick Start (Windows)

The easiest way to start development without Docker:

### Start Everything
Simply double-click `start-dev.bat` or run from command prompt:
```batch
start-dev.bat
```

This will:
1. Set up Python virtual environment
2. Install all backend dependencies
3. Run database migrations
4. Seed test data
5. Install frontend dependencies
6. Start backend server (http://localhost:8000)
7. Start frontend server (http://localhost:5173)
8. Open the app in your browser

### Stop Everything
Double-click `stop-dev.bat` or run:
```batch
stop-dev.bat
```

---

## Manual Setup (if you prefer)

### Backend Setup

1. **Navigate to backend directory:**
   ```batch
   cd backend
   ```

2. **Create and activate virtual environment:**
   ```batch
   python -m venv .venv
   .venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```batch
   pip install -r requirements.txt
   ```

4. **Create `.env` file:**
   ```batch
   copy .env.example .env
   ```

   Default settings:
   ```
   CORS_ORIGINS=http://localhost:5173
   SQLALCHEMY_DATABASE_URI=sqlite:///./dev.db
   ```

5. **Run database migrations:**
   ```batch
   alembic upgrade head
   ```

6. **Seed test data (optional):**
   ```batch
   python seed_data.py
   ```

7. **Start backend server:**
   ```batch
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

### Frontend Setup

1. **Navigate to frontend directory:**
   ```batch
   cd frontend
   ```

2. **Install dependencies:**
   ```batch
   npm install
   ```

3. **Create `.env.development` file:**
   ```
   VITE_API_URL=http://localhost:8000
   VITE_FORCE_NO_CACHE=true
   ```

4. **Start frontend server:**
   ```batch
   npm run dev
   ```

---

## What Each Service Does

### Backend (Port 8000)
- **Technology:** FastAPI + Python
- **Features:**
  - RESTful API endpoints
  - PDF report processing
  - Excel report analysis
  - SQLite database
  - Auto-reload on code changes
- **Access Points:**
  - API: http://localhost:8000
  - Interactive Docs: http://localhost:8000/docs
  - OpenAPI Schema: http://localhost:8000/openapi.json

### Frontend (Port 5173)
- **Technology:** React + Vite + TypeScript
- **Features:**
  - Fast Hot Module Replacement (HMR)
  - Instant UI updates
  - TypeScript type checking
  - React 19 with compiler
- **Access:** http://localhost:5173

### Database
- **Technology:** SQLite (file-based)
- **Location:** `backend/dev.db`
- **No server needed** - embedded in the application
- **Migrations:** Managed by Alembic

---

## Why This is Better Than Docker for Development

| Aspect | Without Docker | With Docker |
|--------|---------------|-------------|
| **Startup Time** | ~10 seconds | ~2 minutes |
| **Hot Reload** | Instant | Delayed (volume sync) |
| **Memory Usage** | ~500MB | ~2GB |
| **File Changes** | Immediate | Cached/delayed |
| **Debugging** | Direct access | Through containers |
| **Dependencies** | Local control | Build step required |

---

## Common Commands

### Backend
```batch
cd backend
.venv\Scripts\activate

REM Start server
uvicorn app.main:app --reload

REM Run tests
pytest

REM Create migration
alembic revision -m "description"

REM Apply migrations
alembic upgrade head
```

### Frontend
```batch
cd frontend

REM Start dev server
npm run dev

REM Build for production
npm run build

REM Run tests
npm test

REM Lint code
npm run lint
```

---

## Troubleshooting

### Backend Issues

**`uvicorn: command not found`**
- Make sure virtual environment is activated: `.venv\Scripts\activate`
- Reinstall dependencies: `pip install -r requirements.txt`

**Port 8000 already in use:**
```batch
REM Stop Docker containers
docker-compose down

REM Or kill process using port
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

**Database migration errors:**
```batch
REM Reset database
del dev.db
alembic upgrade head
python seed_data.py
```

### Frontend Issues

**Port 5173 already in use:**
```batch
REM Kill all Node processes
taskkill /F /IM node.exe
```

**Changes not reflecting:**
- Check `.env.development` has `VITE_FORCE_NO_CACHE=true`
- Hard refresh browser (Ctrl+Shift+R)
- Restart Vite server

**Module not found errors:**
```batch
REM Reinstall dependencies
rmdir /s /q node_modules
npm install
```

---

## Project Structure

```
sample_report_handler/
├── backend/
│   ├── .venv/              # Python virtual environment
│   ├── app/
│   │   ├── main.py         # FastAPI app entry point
│   │   ├── api/            # API routes
│   │   ├── core/           # Core config
│   │   ├── db/             # Database models
│   │   ├── schema/         # Pydantic schemas
│   │   └── services/       # Business logic
│   ├── alembic/            # Database migrations
│   ├── uploads/            # Uploaded files
│   ├── dev.db              # SQLite database
│   ├── requirements.txt    # Python dependencies
│   └── .env                # Environment variables
│
├── frontend/
│   ├── node_modules/       # NPM packages
│   ├── src/
│   │   ├── App.tsx         # Main React component
│   │   ├── components/     # React components
│   │   └── index.css       # Global styles
│   ├── public/             # Static assets
│   ├── package.json        # NPM dependencies
│   ├── vite.config.ts      # Vite configuration
│   └── .env.development    # Dev environment variables
│
├── start-dev.bat           # Start all servers
├── stop-dev.bat            # Stop all servers
└── docker-compose.yml      # Docker config (for production)
```

---

## Environment Variables

### Backend (`backend/.env`)
```bash
# CORS settings - frontend URL
CORS_ORIGINS=http://localhost:5173

# Database connection
SQLALCHEMY_DATABASE_URI=sqlite:///./dev.db

# For PostgreSQL (production):
# SQLALCHEMY_DATABASE_URI=postgresql://user:password@localhost:5432/dbname
```

### Frontend (`frontend/.env.development`)
```bash
# Backend API URL
VITE_API_URL=http://localhost:8000

# Disable caching for development
VITE_FORCE_NO_CACHE=true
```

---

## Tips for Faster Development

1. **Keep servers running** - They auto-reload on file changes
2. **Use API docs** - http://localhost:8000/docs for testing endpoints
3. **Enable browser DevTools** - React DevTools extension is helpful
4. **Check console logs** - Both backend terminal and browser console
5. **Use format-on-save** - Configure your editor (VS Code, etc.)

---

## Returning to Docker

To go back to Docker when you're ready to deploy or test production:

```batch
docker-compose down
docker-compose up --build
```

Frontend will be on http://localhost:3000 (not 5173)
Backend will still be on http://localhost:8000
