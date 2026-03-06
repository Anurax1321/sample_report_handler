#!/bin/bash
# Deploy/redeploy the application (rebuild and restart containers)
set -e

cd /home/anurag/projects/sample_report_handler
echo "Building and starting containers..."
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
echo "Deploy complete."
