@echo off
setlocal enabledelayedexpansion

echo ========================================
echo Starting Sample Report Handler (Windows)
echo ========================================
echo.

REM Get the script directory
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

REM Check Python installation
echo [1/6] Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python from https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation
    pause
    exit /b 1
)
python --version
echo.

REM Check Node.js installation
echo [2/6] Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
node --version
npm --version
echo.

REM Setup Backend
echo [3/6] Setting up Backend...
cd "%SCRIPT_DIR%backend"

if not exist ".venv" (
    echo Creating Python virtual environment...
    python -m venv .venv
    if errorlevel 1 (
        echo ERROR: Failed to create virtual environment
        pause
        exit /b 1
    )
)

echo Activating virtual environment...
call .venv\Scripts\activate.bat
if errorlevel 1 (
    echo ERROR: Failed to activate virtual environment
    pause
    exit /b 1
)

echo Upgrading pip, setuptools, and wheel...
python -m pip install --upgrade pip setuptools wheel >nul 2>&1

echo Installing backend dependencies (Windows optimized)...
if exist "requirements-windows.txt" (
    echo Using requirements-windows.txt...
    pip install -r requirements-windows.txt
) else (
    echo Installing numpy and pandas with precompiled binaries...
    pip install --only-binary :all: "numpy>=1.24.0,<2.0.0" "pandas>=2.0.0,<3.0.0"
    echo Installing other dependencies...
    pip install -r requirements.txt
)

if errorlevel 1 (
    echo.
    echo ERROR: Failed to install backend dependencies
    echo.
    echo Try running these commands manually:
    echo   cd backend
    echo   .venv\Scripts\activate
    echo   pip install --only-binary :all: numpy pandas
    echo   pip install -r requirements.txt
    echo.
    pause
    exit /b 1
)
echo Backend dependencies installed successfully!
echo.

REM Run database migrations
echo [4/6] Running database migrations...
alembic upgrade head
if errorlevel 1 (
    echo WARNING: Database migration failed, but continuing...
)
echo.

REM Setup Frontend
echo [5/6] Setting up Frontend...
cd "%SCRIPT_DIR%frontend"

if not exist "node_modules" (
    echo Installing frontend dependencies...
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install frontend dependencies
        pause
        exit /b 1
    )
) else (
    echo Frontend dependencies already installed
)
echo.

REM Start servers
echo [6/6] Starting servers...
echo.
echo ========================================
echo   Backend will run on:  http://localhost:8000
echo   Frontend will run on: http://localhost:5173
echo   API Docs:            http://localhost:8000/docs
echo ========================================
echo.
echo Press Ctrl+C in each window to stop the servers
echo.
pause

REM Start backend in new window
cd "%SCRIPT_DIR%backend"
start "Backend Server" cmd /k "call .venv\Scripts\activate.bat && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

REM Wait a bit for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend in new window
cd "%SCRIPT_DIR%frontend"
start "Frontend Server" cmd /k "npm run dev"

echo.
echo ========================================
echo Servers are starting in separate windows!
echo.
echo If servers don't start, check the separate windows for errors.
echo ========================================
echo.
pause
