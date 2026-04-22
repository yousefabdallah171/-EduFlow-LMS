#!/usr/bin/env bash
set -euo pipefail

DEPLOY_DIR="/home/youesf-abdallah-workflow-course/htdocs/workflow-course.youesf-abdallah.online"
COMPOSE_FILE="$DEPLOY_DIR/docker-compose.prod.yml"
BACKEND_IMAGE="ghcr.io/yousefabdallah171/-eduflow-lms/backend"
FRONTEND_IMAGE="ghcr.io/yousefabdallah171/-eduflow-lms/frontend"

log() { echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] $*"; }
die() { echo "[ERROR] $*" >&2; exit 1; }

[[ -z "${GITHUB_SHA:-}" ]] && die "GITHUB_SHA is not set"
[[ -z "${GHCR_TOKEN:-}" ]] && die "GHCR_TOKEN is not set"
[[ -z "${GHCR_USER:-}" ]]  && die "GHCR_USER is not set"

cd "$DEPLOY_DIR"

# 1. Login to GHCR
echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin

# 2. Pull new images while old containers are still serving traffic
log "Pulling backend:${GITHUB_SHA}..."
docker pull "${BACKEND_IMAGE}:${GITHUB_SHA}"
docker tag  "${BACKEND_IMAGE}:${GITHUB_SHA}" "${BACKEND_IMAGE}:latest"

log "Pulling frontend:${GITHUB_SHA}..."
docker pull "${FRONTEND_IMAGE}:${GITHUB_SHA}"
docker tag  "${FRONTEND_IMAGE}:${GITHUB_SHA}" "${FRONTEND_IMAGE}:latest"

# 3. Run DB migrations in a temp container — OLD BACKEND STILL RUNNING
log "Running Prisma migrations..."
NETWORK=$(docker inspect eduflow_backend_prod --format='{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}' 2>/dev/null || echo "")
docker run --rm \
  --network "${NETWORK:-bridge}" \
  --env-file "$DEPLOY_DIR/.env" \
  --entrypoint "" \
  "${BACKEND_IMAGE}:latest" \
  sh -c "cd /app/backend && node node_modules/.bin/prisma migrate deploy"

# 4. Restart backend — only 2-3 seconds downtime (no migrations at startup)
log "Restarting backend..."
docker compose -f "$COMPOSE_FILE" up -d --no-deps --force-recreate backend

# 5. Wait for backend healthy
log "Waiting for backend health..."
TIMEOUT=60; ELAPSED=0
while true; do
  STATUS=$(docker inspect --format='{{.State.Health.Status}}' eduflow_backend_prod 2>/dev/null || echo "unknown")
  [[ "$STATUS" == "healthy" ]] && { log "Backend healthy."; break; }
  [[ "$ELAPSED" -ge "$TIMEOUT" ]] && { docker logs --tail 50 eduflow_backend_prod; die "Backend health timeout"; }
  sleep 3; ELAPSED=$((ELAPSED + 3))
done

# 6. Restart frontend — static assets, very fast
log "Restarting frontend..."
docker compose -f "$COMPOSE_FILE" up -d --no-deps --force-recreate frontend

# 7. Prune old images
docker image prune -f || true

log "Deploy of ${GITHUB_SHA} complete."
docker compose -f "$COMPOSE_FILE" ps
