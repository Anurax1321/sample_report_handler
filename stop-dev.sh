#!/bin/bash

# ===================================================================
# Sample Report Handler - Stop Development Servers (WSL/Linux)
# ===================================================================

echo "Stopping Sample Report Handler servers..."
echo ""

# Change to script directory
cd "$(dirname "$0")"

# Kill backend
if [ -f "backend.pid" ]; then
    BACKEND_PID=$(cat backend.pid)
    if kill -0 $BACKEND_PID 2>/dev/null; then
        echo "Stopping backend (PID: $BACKEND_PID)..."
        kill $BACKEND_PID
        rm backend.pid
    else
        echo "Backend already stopped"
        rm backend.pid
    fi
else
    # Try to find and kill uvicorn process
    pkill -f "uvicorn app.main:app" && echo "Stopped backend server" || echo "Backend not running"
fi

# Kill frontend
if [ -f "frontend.pid" ]; then
    FRONTEND_PID=$(cat frontend.pid)
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        echo "Stopping frontend (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID
        rm frontend.pid
    else
        echo "Frontend already stopped"
        rm frontend.pid
    fi
else
    # Try to find and kill vite process
    pkill -f "vite" && echo "Stopped frontend server" || echo "Frontend not running"
fi

echo ""
echo "All servers stopped!"
echo ""
