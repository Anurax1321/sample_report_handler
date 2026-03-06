#!/bin/bash
# View logs for a service (backend, frontend, db, or all)
# Usage: ./scripts/logs.sh [service]
# Examples: ./scripts/logs.sh backend
#           ./scripts/logs.sh          (shows all)

SERVICE=${1:-}
cd /home/anurag/projects/sample_report_handler

if [ -z "$SERVICE" ]; then
    docker compose -f docker-compose.prod.yml logs -f --tail=50
else
    docker compose -f docker-compose.prod.yml logs -f --tail=50 "$SERVICE"
fi
