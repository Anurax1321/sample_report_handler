# Sample Report Handler

A full-stack application for managing diagnostic sample entries and processing NBS (Newborn Screening) laboratory reports with React frontend and FastAPI backend.

## Features

- **Sample Management**: Create, track, and manage diagnostic samples
- **Report Processing**: Upload and process NBS laboratory text files
  - Automated Excel report generation with color-coded highlighting
  - Support for Amino Acid (AA), Acylcarnitine (AC), and Extended Acylcarnitine (AC_EXT) data
  - Medical reference range validation
  - Individual patient reports with template-based formatting
- **ZIP Download**: Download all generated Excel reports in one ZIP file
- **Database Tracking**: Complete audit trail of all uploads and processing

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

## 🚀 Quick Start with Docker (Recommended)

### One Command Setup!

```bash
docker compose up --build
```

That's it! The system automatically:
- ✅ Installs all dependencies
- ✅ Runs database migrations
- ✅ Creates required directories
- ✅ Starts backend on http://localhost:8000
- ✅ Starts frontend on http://localhost:3000

**For detailed Docker instructions, troubleshooting, and production deployment, see [DOCKER_SETUP.md](docs/DOCKER_SETUP.md)**

### Access Points
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs (Interactive API testing)

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

4. **Set up database**

   **Quick method (recommended):**
   ```bash
   # Run from project root
   ./scripts/setup-database.sh  # Linux/macOS/WSL
   # OR
   scripts\setup-database.bat   # Windows
   ```

   **Manual method:**
   ```bash
   # Copy environment file
   cp .env.example .env  # Windows: copy .env.example .env

   # Run migrations to create database
   alembic upgrade head

   # Optional: Add sample data
   python seed_data.py
   ```

   **For detailed database setup instructions, see [DATABASE_SETUP.md](docs/DATABASE_SETUP.md)**

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

### Report Processing (NEW!)
- `POST /reports/upload` - Upload and process 3 NBS report files
- `GET /reports` - List all reports (optional filter by sample_id)
- `GET /reports/{id}` - Get specific report details
- `GET /reports/{id}/download` - Download ZIP of generated Excel files
- `DELETE /reports/{id}` - Delete report and associated files

**For detailed report handler documentation, see [REPORT_HANDLER_IMPLEMENTATION.md](docs/REPORT_HANDLER_IMPLEMENTATION.md)**

## Project Structure

```
sample_report_handler/
├── backend/
│   ├── app/
│   │   ├── api/                   # API routes
│   │   │   ├── routes_samples.py
│   │   │   └── routes_reports.py  # NEW: Report endpoints
│   │   ├── core/                  # Configuration
│   │   │   ├── config.py
│   │   │   └── reference_ranges.py  # NEW: Medical reference values
│   │   ├── db/                    # Database models
│   │   │   └── model.py           # Sample, Report, ReportFile models
│   │   ├── schema/                # Pydantic schemas
│   │   │   ├── sample.py
│   │   │   └── report.py          # NEW: Report schemas
│   │   ├── services/              # NEW: Report processing
│   │   │   ├── data_extraction.py
│   │   │   ├── structure.py
│   │   │   ├── excel_generation.py
│   │   │   ├── file_validator.py
│   │   │   └── report_processor.py
│   │   └── main.py                # FastAPI app
│   ├── alembic/                   # Database migrations
│   ├── templates/                 # NEW: Excel template
│   ├── uploads/                   # NEW: Uploaded report files
│   ├── entrypoint.sh              # NEW: Docker startup script
│   ├── Dockerfile
│   └── requirements.txt           # Updated with pandas, openpyxl, numpy
├── frontend/
│   ├── src/
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   └── reportApi.ts       # NEW: Report API client
│   │   ├── pages/
│   │   │   └── ReportHandling.tsx # NEW: Report upload UI
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── docker-compose.yml             # Updated with volumes
├── docs/                           # Documentation
│   ├── DATABASE_SETUP.md
│   ├── DEVELOPMENT-GUIDE.md
│   ├── DOCKER_SETUP.md
│   ├── DOCKER_MODES.md
│   ├── QUICK_START.md
│   ├── REPORT_HANDLER_IMPLEMENTATION.md
│   ├── TESTING.md
│   └── WINDOWS_SETUP.md
├── scripts/                        # Shell & batch scripts
│   ├── start-dev.sh / .bat
│   ├── stop-dev.sh / .bat
│   ├── setup-database.sh / .bat
│   ├── start-windows.bat
│   └── refresh-frontend.sh
└── README.md
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

For detailed testing instructions, see [TESTING.md](docs/TESTING.md)

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

MIT