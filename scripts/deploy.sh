#!/bin/bash
# Deploy/redeploy the application (rebuild and restart containers)
set -e

PROJECT_DIR="/home/anurag/projects/sample_report_handler"
cd "$PROJECT_DIR"

# Remove trigger file if it exists
rm -f "$PROJECT_DIR/.deploy-trigger"

echo "Building and starting containers..."
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
echo "Deploy complete."
