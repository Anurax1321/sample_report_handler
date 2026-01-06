@echo off
REM ===================================================================
REM Sample Report Handler - Development Startup Script
REM This script starts both backend and frontend servers without Docker
REM ===================================================================

echo ========================================
echo Starting Sample Report Handler (Development Mode)
echo ========================================
echo.

REM Change to project directory
cd /d "%~dp0"

REM ===================================================================
REM STEP 1: Setup Backend
REM ===================================================================
echo [1/5] Setting up Backend...
echo.

cd backend

REM Check if virtual environment exists
if not exist ".venv\" (
    echo Creating Python virtual environment...
    python -m venv .venv
    if errorlevel 1 (
        echo ERROR: Failed to create virtual environment
        echo Make sure Python 3.10+ is installed and in PATH
        pause
        exit /b 1
    )
)

REM Activate virtual environment
echo Activating virtual environment...
call .venv\Scripts\activate.bat
if errorlevel 1 (
    echo ERROR: Failed to activate virtual environment
    pause
    exit /b 1
)

REM Install dependencies
echo Installing backend dependencies...
pip install -q -r requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install backend dependencies
    pause
    exit /b 1
)

REM Check if .env exists
if not exist ".env" (
    echo Creating .env file...
    copy .env.example .env
)

REM Run database migrations
echo Running database migrations...
alembic upgrade head
if errorlevel 1 (
    echo WARNING: Database migrations failed - continuing anyway
)

REM Seed database if needed
echo Seeding database...
python seed_data.py
if errorlevel 1 (
    echo WARNING: Database seeding failed - continuing anyway
)

echo Backend setup complete!
echo.

cd ..

REM ===================================================================
REM STEP 2: Setup Frontend
REM ===================================================================
echo [2/5] Setting up Frontend...
echo.

cd frontend

REM Check if node_modules exists
if not exist "node_modules\" (
    echo Installing frontend dependencies...
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install frontend dependencies
        echo Make sure Node.js and npm are installed
        pause
        exit /b 1
    )
) else (
    echo Frontend dependencies already installed
)

REM Check if .env.development exists
if not exist ".env.development" (
    echo Creating .env.development file...
    (
        echo VITE_API_URL=http://localhost:8000
        echo.
        echo # Disable Vite caching in development
        echo VITE_FORCE_NO_CACHE=true
    ) > .env.development
)

echo Frontend setup complete!
echo.

cd ..

REM ===================================================================
REM STEP 3: Start Backend Server
REM ===================================================================
echo [3/5] Starting Backend Server...
echo.

REM Start backend in new window
start "Backend - Sample Report Handler" cmd /k "cd /d "%~dp0backend" && call .venv\Scripts\activate.bat && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo Backend server starting on http://localhost:8000
echo.

REM Wait for backend to start
echo Waiting for backend to start...
timeout /t 5 /nobreak >nul

REM ===================================================================
REM STEP 4: Start Frontend Server
REM ===================================================================
echo [4/5] Starting Frontend Server...
echo.

REM Start frontend in new window
start "Frontend - Sample Report Handler" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo Frontend server starting on http://localhost:5173
echo.

REM ===================================================================
REM STEP 5: Complete
REM ===================================================================
echo [5/5] Startup Complete!
echo ========================================
echo.
echo Both servers are now running:
echo   - Backend:  http://localhost:8000
echo   - Frontend: http://localhost:5173
echo   - API Docs: http://localhost:8000/docs
echo.
echo The application will open automatically in your browser...
echo.
echo To stop the servers, close their respective windows
echo or press Ctrl+C in each window.
echo.
echo ========================================

REM Wait a bit more for frontend to start
timeout /t 5 /nobreak >nul

REM Open browser
start http://localhost:5173

echo.
echo Press any key to exit this window...
pause >nul
