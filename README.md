# Sample Report Handler

A full-stack laboratory information management system for **Vijayrekha Life Sciences** — handling neonatal blood screening (NBS) sample registration, report processing, PDF generation, and report analysis.

## Features

- **Sample Management** — Register, track, and manage patient samples with status tracking
- **Report Processing** — Upload NBS lab files (AA, AC, AC_EXT or Excel), process with validated reference ranges, generate color-coded Excel reports
- **PDF Generation** — Generate individual patient PDF reports, link to samples
- **Report Analyser** — Analyse neonatal screening PDFs (single or batch via ZIP), flag abnormalities
- **Authentication & Authorization** — JWT-based auth, admin roles, profile management
- **Rate Limiting** — Brute-force protection on login (10/min), global default (60/min)
- **Audit Logging** — Tracks who created/updated/deleted samples and reports

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI, SQLAlchemy, Alembic, PostgreSQL |
| Frontend | React 19, TypeScript, Vite |
| Infrastructure | Docker, Nginx, WSL2 |
| Auth | JWT (python-jose), bcrypt, slowapi |

## Quick Start

### Docker (Recommended)

```bash
git clone <repo-url>
cd sample_report_handler
docker compose up --build
```

This automatically runs migrations, seeds test data, and starts everything:

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3002 |
| Backend API | http://localhost:8002 |
| API Docs | http://localhost:8002/docs |

Default admin login: `admin` / `admin123`

### Manual Setup

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for non-Docker setup.

## Project Structure

```
sample_report_handler/
├── backend/
│   ├── app/
│   │   ├── api/            # Route handlers
│   │   ├── core/           # Config, auth, rate limiting, audit
│   │   ├── db/             # SQLAlchemy models, session
│   │   ├── schema/         # Pydantic schemas
│   │   └── services/       # Business logic (processing, PDF gen, analysis)
│   ├── alembic/            # Database migrations
│   ├── templates/          # Excel template for report generation
│   ├── uploads/            # Uploaded files (not in git)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/     # Shared components (Header, etc.)
│   │   ├── context/        # React context (AuthContext)
│   │   ├── lib/            # API clients (api.ts, auth.ts, reportApi.ts)
│   │   └── pages/          # Page components
│   └── package.json
├── nginx/                  # Production nginx config
├── docker-compose.yml      # Default Docker setup
├── docker-compose.dev.yml  # Dev mode (hot reload)
├── docker-compose.prod.yml # Production mode
└── docs/                   # Documentation
```

## API Endpoints

### Auth
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/auth/login` | Login, get JWT token | Public |
| POST | `/auth/register` | Create new user | Admin |
| GET | `/auth/me` | Current user info | Authenticated |
| GET | `/auth/users` | List all users | Admin |
| PATCH | `/auth/profile` | Update username | Authenticated |
| POST | `/auth/change-password` | Change password | Authenticated |
| PATCH | `/auth/users/{id}/toggle-active` | Enable/disable user | Admin |

### Samples
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/samples/` | Create sample |
| GET | `/samples/` | List samples |
| GET | `/samples/search?q=` | Search by patient ID |
| PATCH | `/samples/{id}` | Update sample |
| DELETE | `/samples/{id}` | Delete sample |
| POST | `/samples/upload-pdf` | Upload PDF |
| POST | `/samples/{id}/link-pdf/{pdf_id}` | Link PDF to sample |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/reports/upload` | Upload 3 NBS files |
| POST | `/reports/upload-excel` | Upload Excel file |
| GET | `/reports/` | List reports |
| POST | `/reports/{id}/approve` | Approve & generate PDFs |
| GET | `/reports/{id}/download` | Download Excel ZIP |
| GET | `/reports/{id}/download-pdf` | Download PDF ZIP |

### Analyser
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/analyzer/analyze-pdf` | Analyse single PDF |
| POST | `/api/analyzer/analyze-batch` | Analyse ZIP of PDFs |
| POST | `/api/analyzer/export/excel` | Export analysis to Excel |
| POST | `/api/analyzer/export/html` | Export analysis to HTML |

## Documentation

| Document | Description |
|----------|-------------|
| [Development Guide](docs/DEVELOPMENT.md) | Local setup, manual start, project structure |
| [Docker Guide](docs/DOCKER.md) | Docker setup, dev/prod modes, troubleshooting |
| [Database Guide](docs/DATABASE.md) | PostgreSQL setup, migrations, seeding |
| [Auth & Security](docs/AUTH.md) | Admin roles, rate limiting, audit logging |
| [Report Processing](docs/REPORT_HANDLER_IMPLEMENTATION.md) | NBS report pipeline details |
| [PDF Flow](docs/PDF_FLOW.md) | How PDFs move through the system |
| [Testing](docs/TESTING.md) | Running backend/frontend tests |
| [Windows Setup](docs/WINDOWS_SETUP.md) | Windows-specific instructions |

## Ports

| Service | Dev (manual) | Docker (default) | Docker (dev) | Docker (prod) |
|---------|-------------|-----------------|-------------|--------------|
| PostgreSQL | 5434 | 5434 | 5434 | internal only |
| Backend | 8002 | 8002 | 8002 | 127.0.0.1:8002 |
| Frontend | 5175 | 3002 | 5175 | 127.0.0.1:3002 |

## Deployment

Production deployment uses `docker-compose.prod.yml` with Nginx reverse proxy. See [nginx/vijayrekha.conf](nginx/vijayrekha.conf) for the server config.

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

## License

Private — Vijayrekha Life Sciences
