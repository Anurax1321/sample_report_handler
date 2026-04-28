#!/bin/bash
# Deploy/redeploy the application (rebuild and restart containers)
set -euo pipefail

PROJECT_DIR="/home/anurag/projects/sample_report_handler"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.prod"
LOG_FILE="$PROJECT_DIR/deploy.log"

log() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo "$msg"
    echo "$msg" >> "$LOG_FILE"
}

fail() {
    log "DEPLOY FAILED: $1"
    exit 1
}

cd "$PROJECT_DIR" || fail "Could not cd to $PROJECT_DIR"

# Remove trigger file if it exists
rm -f "$PROJECT_DIR/.deploy-trigger"

log "========== Starting deployment =========="

# 1. Pull latest code
log "Pulling latest code from git..."
git pull origin main >> "$LOG_FILE" 2>&1 || fail "git pull failed"

# 2. Verify required files exist
log "Verifying project files..."
[[ -f "$COMPOSE_FILE" ]] || fail "Missing $COMPOSE_FILE"
[[ -f "$ENV_FILE" ]] || fail "Missing $ENV_FILE"
[[ -f "frontend/Dockerfile" ]] || fail "Missing frontend/Dockerfile"
[[ -f "backend/Dockerfile" ]] || fail "Missing backend/Dockerfile"

# 3. Stop existing containers
log "Stopping existing containers..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down >> "$LOG_FILE" 2>&1 || log "WARNING: Failed to stop containers (may not be running)"

# 4. Remove old frontend image to prevent stale cached assets
log "Removing old frontend image to ensure fresh build..."
docker rmi "$(docker images -q sample_report_handler-frontend 2>/dev/null)" 2>/dev/null || true

# 5. Build new images (no cache for frontend to guarantee fresh assets)
log "Building containers..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build --no-cache frontend >> "$LOG_FILE" 2>&1 || fail "Frontend build failed — check $LOG_FILE for details"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build backend >> "$LOG_FILE" 2>&1 || fail "Backend build failed — check $LOG_FILE for details"

# 6. Start all containers
log "Starting containers..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d >> "$LOG_FILE" 2>&1 || fail "Failed to start containers"

# 7. Wait for containers to be healthy
log "Waiting for containers to become healthy..."
MAX_WAIT=120
WAITED=0
while [[ $WAITED -lt $MAX_WAIT ]]; do
    BACKEND_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' sample-report-backend-prod 2>/dev/null || echo "missing")
    FRONTEND_STATUS=$(docker inspect --format='{{.State.Status}}' sample-report-frontend-prod 2>/dev/null || echo "missing")
    DB_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' sample-report-db-prod 2>/dev/null || echo "missing")

    if [[ "$BACKEND_HEALTH" == "healthy" && "$FRONTEND_STATUS" == "running" && "$DB_HEALTH" == "healthy" ]]; then
        log "All containers are healthy."
        break
    fi

    if [[ "$BACKEND_HEALTH" == "unhealthy" ]]; then
        fail "Backend container is unhealthy. Logs: $(docker logs --tail 20 sample-report-backend-prod 2>&1)"
    fi
    if [[ "$FRONTEND_STATUS" == "exited" || "$FRONTEND_STATUS" == "dead" ]]; then
        fail "Frontend container crashed. Logs: $(docker logs --tail 20 sample-report-frontend-prod 2>&1)"
    fi
    if [[ "$DB_HEALTH" == "unhealthy" ]]; then
        fail "Database container is unhealthy. Logs: $(docker logs --tail 20 sample-report-db-prod 2>&1)"
    fi

    sleep 2
    WAITED=$((WAITED + 2))
done

if [[ $WAITED -ge $MAX_WAIT ]]; then
    log "WARNING: Containers did not become healthy within ${MAX_WAIT}s"
    log "  Backend: $BACKEND_HEALTH | Frontend: $FRONTEND_STATUS | DB: $DB_HEALTH"
    fail "Health check timed out"
fi

# 8. Verify frontend is serving real assets (not HTML fallback)
log "Verifying frontend assets..."
RESPONSE_TYPE=$(curl -s -o /dev/null -w '%{content_type}' http://127.0.0.1:3002/ 2>/dev/null || echo "unreachable")
if [[ "$RESPONSE_TYPE" != *"text/html"* ]]; then
    log "WARNING: Frontend root is not returning HTML (got: $RESPONSE_TYPE)"
fi

# Extract a CSS/JS filename from index.html and verify it serves the correct MIME type
INDEX_HTML=$(curl -s http://127.0.0.1:3002/ 2>/dev/null)
CSS_FILE=$(echo "$INDEX_HTML" | grep -oP 'href="/([^"]+\.css)"' | head -1 | sed 's/href="//;s/"//')
JS_FILE=$(echo "$INDEX_HTML" | grep -oP 'src="/([^"]+\.js)"' | head -1 | sed 's/src="//;s/"//')

if [[ -n "$CSS_FILE" ]]; then
    CSS_TYPE=$(curl -s -o /dev/null -w '%{content_type}' "http://127.0.0.1:3002${CSS_FILE}" 2>/dev/null)
    if [[ "$CSS_TYPE" != *"text/css"* ]]; then
        fail "CSS asset '${CSS_FILE}' returned MIME type '${CSS_TYPE}' instead of text/css — stale build detected!"
    fi
    log "CSS asset verified: $CSS_FILE → $CSS_TYPE"
else
    log "WARNING: No CSS file found in index.html to verify"
fi

if [[ -n "$JS_FILE" ]]; then
    JS_TYPE=$(curl -s -o /dev/null -w '%{content_type}' "http://127.0.0.1:3002${JS_FILE}" 2>/dev/null)
    if [[ "$JS_TYPE" != *"javascript"* ]]; then
        fail "JS asset '${JS_FILE}' returned MIME type '${JS_TYPE}' instead of javascript — stale build detected!"
    fi
    log "JS asset verified: $JS_FILE → $JS_TYPE"
else
    log "WARNING: No JS file found in index.html to verify"
fi

# 9. Clean up dangling images
log "Cleaning up old Docker images..."
docker image prune -f >> "$LOG_FILE" 2>&1 || true

log "========== Deploy complete =========="
