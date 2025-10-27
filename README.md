# Sample Report Handler

A full-stack application for managing diagnostic sample entries with React frontend and FastAPI backend.

## Tech Stack

**Frontend:**
- React 19 + TypeScript
- Vite
- Axios for API calls
- React Hook Form + Zod for form validation

**Backend:**
- FastAPI (Python)
- SQLAlchemy ORM
- Alembic for migrations
- SQLite (development) / PostgreSQL (production)

## Docker Setup

### Prerequisites
- Docker Desktop installed and running
- Docker Compose v3.8+

### Quick Start

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd sample_report_handler
```

2. **Set up environment variables**
```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env
```

3. **Build and run with Docker Compose**
```bash
docker-compose up --build
```

4. **Access the application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Docker Commands

**Start services:**
```bash
docker-compose up
```

**Start in detached mode:**
```bash
docker-compose up -d
```

**Stop services:**
```bash
docker-compose down
```

**Rebuild containers:**
```bash
docker-compose up --build
```

**View logs:**
```bash
docker-compose logs -f
```

**View specific service logs:**
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

**Remove all containers and volumes:**
```bash
docker-compose down -v
```

## Local Development (Without Docker)

### Backend Setup

1. **Navigate to backend directory**
```bash
cd backend
```

2. **Create virtual environment**
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Run migrations**
```bash
alembic upgrade head
```

5. **Start server**
```bash
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

1. **Navigate to frontend directory**
```bash
cd frontend
```

2. **Install dependencies**
```bash
npm install
```

3. **Start development server**
```bash
npm run dev
```

## API Endpoints

### Health Check
- `GET /health` - Check API status

### Samples Management
- `POST /samples` - Create new sample
- `GET /samples` - List all samples (optional filter by status)
- `PATCH /samples/{id}/status` - Update sample status
- `DELETE /samples/{id}` - Delete sample

## Project Structure

```
sample_report_handler/
├── backend/
│   ├── app/
│   │   ├── api/          # API routes
│   │   ├── core/         # Configuration
│   │   ├── db/           # Database models
│   │   ├── schema/       # Pydantic schemas
│   │   └── main.py       # FastAPI app
│   ├── alembic/          # Database migrations
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── lib/          # API client
│   │   ├── App.tsx       # Main component
│   │   └── main.tsx      # Entry point
│   ├── Dockerfile
│   ├── nginx.conf        # Production server config
│   └── package.json
└── docker-compose.yml
```

## Environment Variables

### Backend (.env)
```
CORS_ORIGINS=http://localhost:5173
SQLALCHEMY_DATABASE_URI=sqlite:///./dev.db
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:8000
```

## Testing

### Backend Tests
```bash
cd backend
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pytest -v
```

### Frontend Tests
```bash
cd frontend
npm test
```

### Run Tests with Coverage
```bash
# Backend
cd backend && pytest --cov=app

# Frontend
cd frontend && npm run test:coverage
```

For detailed testing instructions, see [TESTING.md](TESTING.md)

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

MIT