@echo off
REM Database Setup Script for Sample Report Handler (Windows)
REM This script sets up the database from scratch for first-time setup or after git pull

echo ================================================
echo Sample Report Handler - Database Setup
echo ================================================
echo.

REM Navigate to backend directory
cd /d "%~dp0..\backend"
echo Working directory: %CD%
echo.

REM Check if virtual environment exists
if not exist ".venv\" (
    echo Virtual environment not found!
    echo Creating virtual environment...
    python -m venv .venv
    echo Virtual environment created
    echo.
)

REM Activate virtual environment
echo Activating virtual environment...
call .venv\Scripts\activate.bat
echo Virtual environment activated
echo.

REM Check if dependencies are installed
python -c "import alembic" 2>nul
if errorlevel 1 (
    echo Installing dependencies...
    pip install -r requirements.txt
    echo Dependencies installed
    echo.
) else (
    echo Dependencies already installed
    echo.
)

REM Check if .env exists
if not exist ".env" (
    echo .env file not found!
    if exist ".env.example" (
        echo Copying .env.example to .env...
        copy .env.example .env
        echo .env file created
    ) else (
        echo Error: .env.example not found. Please create .env manually.
        pause
        exit /b 1
    )
    echo.
) else (
    echo .env file exists
    echo.
)

REM Run migrations
echo Running database migrations...
alembic upgrade head
echo Migrations applied successfully!
echo.

REM Check if seed_data.py exists
if exist "seed_data.py" (
    set /p SEED="Do you want to populate the database with sample data? (Y/n): "
    if /i not "%SEED%"=="n" (
        echo Seeding database with sample data...
        python seed_data.py
        echo Sample data added
    ) else (
        echo Skipping sample data
    )
    echo.
)

echo ================================================
echo Database Setup Complete!
echo ================================================
echo.
echo Database: PostgreSQL on localhost:5434
echo.
echo Next steps:
echo   1. Start the backend server:
echo      cd backend
echo      .venv\Scripts\activate
echo      uvicorn app.main:app --reload --port 8002
echo.
echo   2. Or use the development script:
echo      scripts\start-dev.bat
echo.
pause
