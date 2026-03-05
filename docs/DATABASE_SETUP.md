# Database Setup Guide

This guide explains how to set up the database for the Sample Report Handler project, especially important after cloning the repository or running `git pull` on a new machine.

## Table of Contents

- [Quick Setup (Recommended)](#quick-setup-recommended)
- [Understanding the Database](#understanding-the-database)
- [Manual Setup](#manual-setup)
- [Database Migrations](#database-migrations)
- [Troubleshooting](#troubleshooting)
- [Advanced Topics](#advanced-topics)

---

## Quick Setup (Recommended)

### Option 1: Automated Script

We provide scripts that handle everything automatically:

**Linux/macOS/WSL:**
```bash
./setup-database.sh
```

**Windows (CMD/PowerShell):**
```batch
setup-database.bat
```

The script will:
1. ✅ Create Python virtual environment (if needed)
2. ✅ Install dependencies
3. ✅ Create `.env` file from example
4. ✅ Run database migrations
5. ✅ Optionally seed with sample data

### Option 2: Using Start Scripts

The development start scripts include database setup:

**Linux/macOS/WSL:**
```bash
./start-dev.sh
```

**Windows:**
```batch
start-dev.bat
```

These scripts run migrations automatically before starting the servers.

---

## Understanding the Database

### Why isn't the database in Git?

The database file (`backend/dev.db`) is **intentionally excluded** from Git because:
- ❌ Database files can become large
- ❌ Contains local development data
- ❌ Each developer should have their own fresh database
- ✅ Schema is tracked through **migrations** instead

### What IS tracked in Git?

- ✅ **Database schema**: Defined in `backend/app/db/model.py`
- ✅ **Migration files**: In `backend/alembic/versions/`
- ✅ **Alembic config**: `backend/alembic.ini` and `backend/alembic/env.py`

When you run migrations, Alembic reads these files and creates a fresh database with the correct structure.

---

## Manual Setup

If you prefer to set up the database manually:

### Step 1: Navigate to Backend Directory

```bash
cd backend
```

### Step 2: Create Virtual Environment

**Linux/macOS/WSL:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

**Windows:**
```batch
python -m venv .venv
.venv\Scripts\activate
```

### Step 3: Install Dependencies

```bash
pip install -r requirements.txt
```

This installs:
- SQLAlchemy (database ORM)
- Alembic (migrations)
- FastAPI and all other backend dependencies

### Step 4: Create Environment File

**Linux/macOS/WSL:**
```bash
cp .env.example .env
```

**Windows:**
```batch
copy .env.example .env
```

Default `.env` contents:
```env
CORS_ORIGINS=http://localhost:5173
SQLALCHEMY_DATABASE_URI=sqlite:///./dev.db
```

### Step 5: Run Migrations

This creates the database file and all tables:

```bash
alembic upgrade head
```

You should see output like:
```
INFO  [alembic.runtime.migration] Context impl SQLiteImpl.
INFO  [alembic.runtime.migration] Will assume non-transactional DDL.
INFO  [alembic.runtime.migration] Running upgrade  -> 254ada664af2, initial schema with samples table
INFO  [alembic.runtime.migration] Running upgrade 254ada664af2 -> a1b2c3d4e5f6, add reports and report files tables
...
```

### Step 6: Seed Sample Data (Optional)

If you want to start with some test data:

```bash
python seed_data.py
```

### Step 7: Verify Setup

Check that the database was created:

**Linux/macOS/WSL:**
```bash
ls -lh dev.db
```

**Windows:**
```batch
dir dev.db
```

You should see the `dev.db` file!

---

## Database Migrations

### What are migrations?

Migrations are version-controlled database schema changes. Instead of manually creating tables, migrations define:
- What tables to create
- What columns each table has
- Relationships between tables
- Indexes and constraints

### Migration Files

Located in: `backend/alembic/versions/`

Example migrations in this project:
```
254ada664af2_initial_schema_with_samples_table.py
a1b2c3d4e5f6_add_reports_and_report_files_tables.py
16f236539cc7_add_processed_data_to_reports.py
f6bdc4155bcd_make_sample_id_and_num_patients_nullable.py
```

### Common Migration Commands

**Apply all migrations (create/update database):**
```bash
cd backend
source .venv/bin/activate  # Windows: .venv\Scripts\activate
alembic upgrade head
```

**Check current migration version:**
```bash
alembic current
```

**View migration history:**
```bash
alembic history
```

**Create a new migration (for developers):**
```bash
alembic revision -m "description of changes"
```

**Rollback to previous migration:**
```bash
alembic downgrade -1
```

---

## Troubleshooting

### Error: "alembic: command not found"

**Cause:** Virtual environment not activated or dependencies not installed

**Solution:**
```bash
cd backend
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### Error: "Target database is not up to date"

**Cause:** Someone added new migrations after you last pulled

**Solution:**
```bash
cd backend
source .venv/bin/activate
alembic upgrade head
```

### Error: "Can't locate revision identified by 'head'"

**Cause:** Alembic versions table is out of sync

**Solution 1 (Safe - preserves data):**
```bash
alembic stamp head
```

**Solution 2 (Nuclear - deletes everything):**
```bash
# Backup your data first if needed!
rm dev.db
alembic upgrade head
```

### Database file exists but tables are missing

**Cause:** Database created but migrations not run

**Solution:**
```bash
cd backend
source .venv/bin/activate
alembic upgrade head
```

### Want to start fresh

**Solution:**

**Linux/macOS/WSL:**
```bash
cd backend
rm dev.db
alembic upgrade head
python seed_data.py  # Optional: add sample data
```

**Windows:**
```batch
cd backend
del dev.db
alembic upgrade head
python seed_data.py  # Optional: add sample data
```

### Corrupted database

If you see SQLite errors like "database disk image is malformed":

```bash
# Delete and recreate
rm dev.db  # Windows: del dev.db
alembic upgrade head
```

---

## Advanced Topics

### Using PostgreSQL Instead of SQLite

For production or if you prefer PostgreSQL:

1. **Install PostgreSQL** on your machine

2. **Create database:**
   ```sql
   CREATE DATABASE sample_reports;
   ```

3. **Update `.env`:**
   ```env
   SQLALCHEMY_DATABASE_URI=postgresql://username:password@localhost:5432/sample_reports
   ```

4. **Install PostgreSQL driver:**
   ```bash
   pip install psycopg2-binary
   ```

5. **Run migrations:**
   ```bash
   alembic upgrade head
   ```

### Viewing Database Contents

**Option 1: SQLite CLI**
```bash
cd backend
sqlite3 dev.db

# Inside sqlite3:
.tables                    # List all tables
.schema samples            # View table structure
SELECT * FROM samples;     # Query data
.quit                      # Exit
```

**Option 2: GUI Tools**
- [DB Browser for SQLite](https://sqlitebrowser.org/) (Free, cross-platform)
- [DBeaver](https://dbeaver.io/) (Free, supports many databases)
- VS Code Extension: "SQLite Viewer"

### Migration Workflow (For Developers)

When you change database models:

1. **Edit model** in `backend/app/db/model.py`

2. **Create migration:**
   ```bash
   alembic revision -m "add user email field"
   ```

3. **Edit the generated migration file** in `backend/alembic/versions/`

4. **Test migration:**
   ```bash
   alembic upgrade head
   ```

5. **Test rollback:**
   ```bash
   alembic downgrade -1
   alembic upgrade head
   ```

6. **Commit both** the model changes and migration file to Git

### Database Seeding for Different Environments

You can create different seed scripts:

```bash
backend/
├── seed_data.py              # Development data
├── seed_production.py        # Production initial data
└── seed_test.py              # Test data
```

---

## Summary

### First Time Setup (After Git Clone)
```bash
cd backend
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # Windows: copy .env.example .env
alembic upgrade head
python seed_data.py        # Optional
```

### After Git Pull (New Migrations)
```bash
cd backend
source .venv/bin/activate  # Windows: .venv\Scripts\activate
alembic upgrade head
```

### Complete Reset
```bash
cd backend
rm dev.db                  # Windows: del dev.db
alembic upgrade head
python seed_data.py        # Optional
```

---

## Questions?

- **Where is the database?** → `backend/dev.db` (not in Git)
- **Where are the migrations?** → `backend/alembic/versions/` (in Git)
- **How do I update the database?** → `alembic upgrade head`
- **How do I reset everything?** → Delete `dev.db` and run `alembic upgrade head`

For more help, see:
- [README.md](README.md) - General project setup
- [DEVELOPMENT-GUIDE.md](DEVELOPMENT-GUIDE.md) - Development workflow
- [Alembic Documentation](https://alembic.sqlalchemy.org/)
