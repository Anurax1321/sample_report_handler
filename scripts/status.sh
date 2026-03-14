#!/bin/bash
# Check status of all services

echo "=== Docker Containers ==="
docker compose -f /home/anurag/projects/sample_report_handler/docker-compose.prod.yml ps

echo ""
echo "=== Nginx ==="
systemctl is-active nginx

echo ""
echo "=== Cloudflared ==="
systemctl is-active cloudflared

echo ""
echo "=== Health Checks ==="
curl -s http://127.0.0.1:8002/health && echo ""
curl -s -o /dev/null -w "Frontend: %{http_code}\n" http://127.0.0.1:3002/
