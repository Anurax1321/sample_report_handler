# Quick Start Guide

**Just cloned the repo? Start here!**

## 1. Database Setup (REQUIRED on first run)

Choose one method:

### Method A: Automated Script (Easiest)
```bash
./setup-database.sh       # Linux/macOS/WSL
setup-database.bat        # Windows
```

### Method B: Manual Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # Windows: copy .env.example .env
alembic upgrade head
python seed_data.py                # Optional: sample data
```

## 2. Start Development Servers

### Option 1: Start Script (Recommended)
```bash
./start-dev.sh       # Linux/macOS/WSL
start-dev.bat        # Windows
```

### Option 2: Docker
```bash
docker compose up --build
```

### Option 3: Manual Start

**Terminal 1 - Backend:**
```bash
cd backend
source .venv/bin/activate    # Windows: .venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## 3. Access Application

- **Frontend:** http://localhost:5173 (or :3000 if using Docker)
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs

## After Git Pull (Database Updates)

If someone added new migrations:
```bash
cd backend
source .venv/bin/activate    # Windows: .venv\Scripts\activate
alembic upgrade head
```

## Need Help?

- **Database issues?** → [DATABASE_SETUP.md](DATABASE_SETUP.md)
- **Development workflow?** → [DEVELOPMENT-GUIDE.md](DEVELOPMENT-GUIDE.md)
- **Docker problems?** → [DOCKER_SETUP.md](DOCKER_SETUP.md)
- **General info?** → [README.md](README.md)
