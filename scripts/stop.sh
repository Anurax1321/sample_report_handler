#!/bin/bash
# Stop all containers
set -e

cd /home/anurag/projects/sample_report_handler
docker compose -f docker-compose.prod.yml down
echo "All containers stopped."
