#!/usr/bin/env bash
set -euo pipefail

#
# EduFlow LMS Local Deployment Script
# Run this from your PC or server to build and deploy with zero downtime
# Usage: ./deploy-local.sh
#

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$DEPLOY_DIR/docker-compose.prod.yml"
BACKEND_IMAGE="eduflow-lms-backend:local"
FRONTEND_IMAGE="eduflow-lms-frontend:local"

log() { echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] $*"; }
die() { echo "[ERROR] $*" >&2; exit 1; }

cd "$DEPLOY_DIR"

log "Starting zero-downtime deployment..."
log "Directory: $DEPLOY_DIR"

# ── 1. Pull latest code from main ────────────────────────────────────────────
log "Pulling latest code from main branch..."
git fetch origin main
git reset --hard origin/main

# ── 2. Build backend image (with BuildKit disabled for reliability) ──────────
log "Building backend image (using local registry)..."
DOCKER_BUILDKIT=0 docker build \
  --no-cache \
  --file docker/backend.Dockerfile \
  --target runtime \
  --tag "$BACKEND_IMAGE" \
  .

# ── 3. Build frontend image ──────────────────────────────────────────────────
log "Building frontend image (using local registry)..."
DOCKER_BUILDKIT=0 docker build \
  --no-cache \
  --file docker/frontend.Dockerfile \
  --tag "$FRONTEND_IMAGE" \
  .

# ── 4. Update docker-compose.prod.yml to use local images ────────────────────
log "Updating docker-compose to use locally built images..."
# Temporarily update image references for this deployment
TEMP_COMPOSE=$(mktemp)
sed "s|ghcr.io/yousefabdallah171/-eduflow-lms/backend:latest|$BACKEND_IMAGE|g; \
     s|ghcr.io/yousefabdallah171/-eduflow-lms/frontend:latest|$FRONTEND_IMAGE|g" \
  "$COMPOSE_FILE" > "$TEMP_COMPOSE"

# ── 5. Restart backend with new image (migrations run in container startup) ────
log "Restarting backend container..."
log "   (Note: Migrations will run automatically on container startup)"
docker compose -f "$TEMP_COMPOSE" up -d --no-deps --force-recreate backend

# ── 6. Wait for backend to be healthy ────────────────────────────────────────
log "Waiting for backend to become healthy (max 60s)..."
TIMEOUT=60; ELAPSED=0
while true; do
  STATUS=$(docker inspect --format='{{.State.Health.Status}}' eduflow_backend_prod 2>/dev/null || echo "unknown")
  if [[ "$STATUS" == "healthy" ]]; then
    log "✅ Backend is healthy!"
    break
  fi
  if [[ "$ELAPSED" -ge "$TIMEOUT" ]]; then
    log "Backend health check timed out. Last 50 logs:"
    docker logs --tail 50 eduflow_backend_prod || true
    rm -f "$TEMP_COMPOSE"
    die "Backend failed to become healthy"
  fi
  sleep 3
  ELAPSED=$((ELAPSED + 3))
done

# ── 8. Restart frontend with new image ───────────────────────────────────────
log "Restarting frontend container..."
docker compose -f "$TEMP_COMPOSE" up -d --no-deps --force-recreate frontend

# ── 9. Verify frontend ───────────────────────────────────────────────────────
log "Waiting for frontend to respond (max 30s)..."
TIMEOUT=30; ELAPSED=0
while true; do
  if docker exec eduflow_frontend_prod wget -qO- http://localhost:80/ >/dev/null 2>&1; then
    log "✅ Frontend is responding!"
    break
  fi
  if [[ "$ELAPSED" -ge "$TIMEOUT" ]]; then
    log "Frontend health check timed out. Last 20 logs:"
    docker logs --tail 20 eduflow_frontend_prod || true
    rm -f "$TEMP_COMPOSE"
    die "Frontend failed to respond"
  fi
  sleep 2
  ELAPSED=$((ELAPSED + 2))
done

# ── 10. Restore original docker-compose.prod.yml ─────────────────────────────
log "Restoring docker-compose.prod.yml..."
rm -f "$TEMP_COMPOSE"

# ── 11. Prune old images ─────────────────────────────────────────────────────
log "Pruning dangling images..."
docker image prune -f || true

# ── 12. Final status ─────────────────────────────────────────────────────────
log "✅ Deployment complete!"
log ""
log "Container status:"
docker compose -f "$COMPOSE_FILE" ps
log ""
log "Test the deployment:"
log "  curl https://workflow-course.youesf-abdallah.online/"
log "  curl https://workflow-course.youesf-abdallah.online/api/v1/health"
