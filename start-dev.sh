#!/bin/bash

# ===================================================================
# Sample Report Handler - Development Startup Script (WSL/Linux)
# ===================================================================

set -e  # Exit on error

echo "========================================"
echo "Starting Sample Report Handler (Development Mode)"
echo "========================================"
echo ""

# Change to script directory
cd "$(dirname "$0")"
PROJECT_ROOT="$(pwd)"

# ===================================================================
# STEP 1: Setup Backend
# ===================================================================
echo "[1/5] Setting up Backend..."
echo ""

cd backend

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv .venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source .venv/bin/activate

# Install dependencies
echo "Installing backend dependencies..."
pip install -q -r requirements.txt

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cp .env.example .env
fi

# Run database migrations
echo "Running database migrations..."
alembic upgrade head || echo "WARNING: Database migrations failed - continuing anyway"

# Seed database if needed
echo "Seeding database..."
python seed_data.py || echo "WARNING: Database seeding failed - continuing anyway"

echo "Backend setup complete!"
echo ""

cd "$PROJECT_ROOT"

# ===================================================================
# STEP 2: Setup Frontend
# ===================================================================
echo "[2/5] Setting up Frontend..."
echo ""

cd frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
else
    echo "Frontend dependencies already installed"
fi

# Check if .env.development exists
if [ ! -f ".env.development" ]; then
    echo "Creating .env.development file..."
    cat > .env.development << EOF
VITE_API_URL=http://localhost:8000

# Disable Vite caching in development
VITE_FORCE_NO_CACHE=true
EOF
fi

echo "Frontend setup complete!"
echo ""

cd "$PROJECT_ROOT"

# ===================================================================
# STEP 3: Start Backend Server
# ===================================================================
echo "[3/5] Starting Backend Server..."
echo ""

cd backend
source .venv/bin/activate

# Start backend in background
echo "Starting backend on http://localhost:8000..."
nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > ../backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > ../backend.pid
echo "Backend PID: $BACKEND_PID"

cd "$PROJECT_ROOT"

# Wait for backend to start
echo "Waiting for backend to start..."
sleep 5

# ===================================================================
# STEP 4: Start Frontend Server
# ===================================================================
echo "[4/5] Starting Frontend Server..."
echo ""

cd frontend

# Start frontend in background
echo "Starting frontend on http://localhost:5173..."
nohup npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > ../frontend.pid
echo "Frontend PID: $FRONTEND_PID"

cd "$PROJECT_ROOT"

# ===================================================================
# STEP 5: Complete
# ===================================================================
echo ""
echo "[5/5] Startup Complete!"
echo "========================================"
echo ""
echo "Both servers are now running:"
echo "  - Backend:  http://localhost:8000"
echo "  - Frontend: http://localhost:5173"
echo "  - API Docs: http://localhost:8000/docs"
echo ""
echo "Logs:"
echo "  - Backend:  tail -f backend.log"
echo "  - Frontend: tail -f frontend.log"
echo ""
echo "To stop the servers:"
echo "  ./stop-dev.sh"
echo ""
echo "========================================"

# Wait a bit for frontend to start
sleep 5

echo ""
echo "Opening application in browser..."
# Try to open in Windows browser from WSL
if command -v wslview &> /dev/null; then
    wslview http://localhost:5173
elif command -v powershell.exe &> /dev/null; then
    powershell.exe -c "Start-Process 'http://localhost:5173'"
else
    echo "Please open http://localhost:5173 in your browser"
fi

echo ""
echo "All services started!"
