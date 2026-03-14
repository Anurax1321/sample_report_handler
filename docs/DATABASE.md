# Database Guide

## Overview

The project uses **PostgreSQL 16** as its database, managed through SQLAlchemy ORM with Alembic migrations.

## Connection

Default connection string:
```
postgresql://sample_user:sample_pass@localhost:5434/sample_report_db
```

Set via the `SQLALCHEMY_DATABASE_URI` environment variable in `backend/.env` or Docker Compose.

## Quick Setup

### Docker (Recommended)

Docker Compose handles everything automatically — database creation, migrations, and seeding.

```bash
docker compose up --build
```

To start only the database:
```bash
docker compose up db -d
```

### Manual

```bash
cd backend
source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
python seed_admin.py         # Create admin user (admin/admin123)
python seed_data.py          # Optional: sample test data
```

## Migrations

Migrations are version-controlled schema changes in `backend/alembic/versions/`.

### Common Commands

```bash
cd backend && source .venv/bin/activate

# Apply all migrations
alembic upgrade head

# Check current migration version
alembic current

# View migration history
alembic history

# Create a new migration
alembic revision -m "description of changes"

# Rollback one migration
alembic downgrade -1
```

### Inside Docker

```bash
docker compose exec backend alembic upgrade head
docker compose exec backend alembic current
```

### After Git Pull

If new migrations were added:
```bash
cd backend
source .venv/bin/activate
alembic upgrade head
```

Or restart the Docker containers (migrations run automatically on startup).

## Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `users` | User accounts with auth and admin roles |
| `samples` | Patient sample records |
| `sample_pdfs` | PDF files linked to samples |
| `reports` | NBS report processing records |
| `report_files` | Raw uploaded files (AA, AC, AC_EXT) |
| `audit_logs` | Who did what and when |

### Key Relationships

- `reports` → `samples` (many-to-one via `sample_id`)
- `report_files` → `reports` (many-to-one via `report_id`)
- `sample_pdfs` → `samples` (many-to-one via `sample_id`, nullable for unlinked PDFs)
- `audit_logs` → `users` (many-to-one via `user_id`)
- `samples.created_by_id` / `updated_by_id` → `users.id`
- `reports.uploaded_by_id` → `users.id`

## Seeding

### Admin User

```bash
# Default: admin / admin123
python seed_admin.py

# Custom credentials
python seed_admin.py --username myadmin --password mypass
```

### Sample Data

```bash
python seed_data.py
```

### In Docker

```bash
docker exec sample-report-backend python seed_admin.py
docker exec sample-report-backend python seed_data.py
```

## Querying the Database

### Via Docker

```bash
# Connect to psql
docker exec -it sample-report-db psql -U sample_user -d sample_report_db

# Quick queries
docker exec sample-report-db psql -U sample_user -d sample_report_db \
  -c "SELECT * FROM users;"

docker exec sample-report-db psql -U sample_user -d sample_report_db \
  -c "SELECT id, action, entity_type, entity_id, timestamp FROM audit_logs ORDER BY id DESC LIMIT 10;"
```

### GUI Tools

- [DBeaver](https://dbeaver.io/) (free, cross-platform)
- [pgAdmin](https://www.pgadmin.org/)
- VS Code Extension: "PostgreSQL" by Chris Kolkman

## Troubleshooting

### "alembic: command not found"

Virtual environment not activated or dependencies not installed:
```bash
cd backend
source .venv/bin/activate
pip install -r requirements.txt
```

### "Target database is not up to date"

New migrations were added since your last pull:
```bash
alembic upgrade head
```

### Migration conflicts

If Alembic can't find the current revision:
```bash
# Safe — marks DB as current without running migrations
alembic stamp head

# Nuclear — drops everything and rebuilds
docker compose down -v
docker compose up --build
```

### Connection refused

Check that PostgreSQL is running:
```bash
docker compose ps db
docker compose logs db
```

Verify the port (default: 5434 on host, 5432 inside container).

## Related Docs

- [Development Guide](DEVELOPMENT.md) — Full local setup
- [Docker Guide](DOCKER.md) — Docker setup and modes
- [Auth & Security](AUTH.md) — Audit logging details
