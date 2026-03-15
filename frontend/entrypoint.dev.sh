#!/bin/sh
set -e

# Detect Vite port from config (grep the port number from vite.config.ts)
VITE_PORT=$(grep -oP 'port:\s*\K[0-9]+' vite.config.ts 2>/dev/null || echo "5173")

# HOST_PORT is passed via docker-compose environment; defaults to VITE_PORT
HOST_PORT="${HOST_PORT:-$VITE_PORT}"

echo ""
echo "  ➜  Frontend: http://localhost:${HOST_PORT}/vijayrekha/"
echo "  ➜  Backend:  http://localhost:8002"
echo ""

exec npm run dev -- --host 0.0.0.0
