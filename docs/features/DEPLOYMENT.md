# EduFlow LMS — Deployment

> **Update rule:** Any time you change Docker config, ports, CI/CD pipeline, or add env vars, update this doc.

---

## Quick Start (Development)

```bash
cp .env.example .env          # fill in secrets
docker-compose up -d          # start all services
# Frontend: http://localhost
# Backend:  http://localhost:3000
# API:      http://localhost:3000/api/v1
```

With monitoring:
```bash
docker-compose --profile monitoring up -d
# Prometheus:    http://localhost:9090
# Grafana:       http://localhost:3001  (admin/admin)
# Alertmanager:  http://localhost:9093
```

---

## Services & Ports

### Development (`docker-compose.yml`)

| Service | Image | Port | Notes |
|---------|-------|------|-------|
| `frontend` | `docker/frontend.Dockerfile` (dev) | 80 → 5173 | Vite dev server with HMR |
| `backend` | `docker/backend.Dockerfile` (dev) | 3000 → 3000 | Node.js with hot reload |
| `postgres` | `postgres:16-alpine` | internal | Health checked |
| `redis` | `redis:7-alpine` | internal | appendonly mode |
| `prometheus` | `prom/prometheus:v2.53.0` | 9090 | monitoring profile |
| `alertmanager` | `prom/alertmanager:v0.27.0` | 9093 | monitoring profile |
| `grafana` | `grafana/grafana:11.1.0` | 3001 → 3000 | monitoring profile |

### Production (`docker-compose.prod.yml`)

| Service | Image | Port | Internal IP |
|---------|-------|------|------------|
| `frontend` | `ghcr.io/.../frontend:latest` | 3007 → 80 | — |
| `backend` | `ghcr.io/.../backend:latest` | 8000 → 8000 | 10.89.0.30 |
| `postgres` | `postgres:16-alpine` | internal | 10.89.0.10 |
| `redis` | `redis:7-alpine` | internal | 10.89.0.20 |

Network: `eduflow_prod_net` bridge with static IPs.

---

## Dockerfile Build Stages

### `docker/backend.Dockerfile`

```
deps     → node:20-alpine, install ffmpeg + openssl + deps
dev      → development stage
build    → tsc compilation → dist/
runtime  → production: prisma migrate deploy + node dist/src/server.js
```

### `docker/frontend.Dockerfile`

```
deps     → node:20-alpine, install dependencies
dev      → adds Chromium + Playwright for testing
build    → pnpm --filter frontend build → dist/
final    → nginx:alpine serving built assets on port 80
```

---

## Nginx Reverse Proxy

### Development (`docker/nginx.dev.conf`)
```
/         → proxy → frontend-dev:5173  (with WebSocket upgrade for HMR)
/api/     → proxy → backend:3000
/api/v1/admin/uploads → no request buffering, unlimited body, 3600s timeout
```

### Production (`docker/nginx.conf`)
```
/              → no-store cache, SPA fallback to index.html
/assets/       → public, immutable, max-age=31536000
/api/          → proxy → http://10.89.0.30:8000 (3 retries, 5s timeout)
/api/v1/admin/uploads → client_max_body_size 0, 3600s timeout (large uploads)
```

---

## Backend Startup Sequence

**Development:**
```
1. pnpm prisma:generate
2. prisma migrate deploy  OR  prisma db push --skip-generate (fallback)
3. pnpm prisma:seed
4. pnpm dev  (ts-node-dev with hot reload)
```

**Production:**
```
1. prisma migrate deploy  (retry loop inside Dockerfile)
2. prisma db seed
3. node dist/src/server.js  (compiled JS)
```

Graceful shutdown on `SIGTERM`/`SIGINT`: closes all Bull job queues before exit.

---

## CI/CD Pipeline (`.github/workflows/deploy.yml`)

**Trigger:** Push to `main` branch  
**Runner:** Self-hosted Linux x64

```
1. Checkout code
2. Setup Node.js 22
3. Install dependencies (frontend + backend)
4. Run frontend tests         (continue-on-error: true)
5. Build frontend             (npm run build)
6. Run backend linter         (continue-on-error: true)
7. Deploy:
   - Run fix-permissions.sh if exists
   - Copy frontend/dist/* → $DEPLOY_PATH/public_html/
   - Copy backend src + package.json + tsconfig.json + prisma → $DEPLOY_PATH/backend/
   - Run deploy.sh if exists
8. Notify: POST to https://workflow-course.youesf-abdallah.online
```

Required secret: `DEPLOY_PATH`

---

## Health Checks

| Endpoint | Returns | Used By |
|----------|---------|---------|
| `GET /health` | `{ status: "ok" }` | Docker healthcheck |
| `GET /api/v1/health` | `{ status: "ok" }` | Load balancer |
| `GET /api/v1/version` | version info | Monitoring |
| `GET /health/metrics` | telemetry snapshot | Observability |
| `GET /metrics` | Prometheus text format | Prometheus scraper |
| `GET /metrics/health` | `{ status: "ok", timestamp }` | Alertmanager |

Docker Compose production healthcheck:
```
backend:  wget -qO- http://localhost:8000/ (30s interval, 10s timeout, 3 retries)
postgres: pg_isready -U ${POSTGRES_USER} (10s interval, 5s timeout, 5 retries)
redis:    redis-cli ping (10s interval, 5s timeout, 5 retries)
```

---

## Environment Variables

### Required (no defaults — app crashes if missing)

```env
DATABASE_URL=postgresql://user:pass@host:5432/db?schema=public
REDIS_URL=redis://host:6379

FRONTEND_URL=https://yourdomain.com   (must be valid URL)

JWT_ACCESS_SECRET=...    (min 32 chars)
JWT_REFRESH_SECRET=...   (min 32 chars)
VIDEO_TOKEN_SECRET=...   (min 32 chars)

PAYMOB_API_KEY=...
PAYMOB_HMAC_SECRET=...
PAYMOB_INTEGRATION_ID=...
PAYMOB_IFRAME_ID=...

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=...
```

### Optional (with defaults)

```env
NODE_ENV=production              # development | test | production
BACKEND_PORT=3000                # or 8000 in prod
ENFORCE_SINGLE_SESSION=true
STORAGE_PATH=storage             # local video storage path
PROMETHEUS_METRICS_ENABLED=false
PROMETHEUS_METRICS_TOKEN=        # optional bearer token for /metrics
REDIS_KEY_PREFIX=                # prefix all redis keys (useful for multi-tenant)
DEFAULT_COURSE_ID=primary

# Sentry (optional)
SENTRY_DSN=
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1

# Cache TTLs (seconds)
CACHE_TTL_DASHBOARD_SECONDS=300
CACHE_TTL_ENROLLMENT_SECONDS=120
CACHE_TTL_LESSON_METADATA_SECONDS=7200
CACHE_TTL_PUBLISHED_LESSON_COUNT_SECONDS=7200
CACHE_TTL_PAYMENTS_SECONDS=3600
CACHE_TTL_VIDEO_TOKEN_SECONDS=300
CACHE_TTL_VIDEO_PREVIEW_SECONDS=900
CACHE_TTL_SEARCH_SECONDS=300
```

---

## Prisma Migrations

```bash
# Generate client after schema changes
npx prisma generate

# Create a new migration (dev only)
npx prisma migrate dev --name describe_change

# Apply migrations to production DB
npx prisma migrate deploy

# Seed initial data
npx prisma db seed
```

Migration files live in `backend/prisma/migrations/`.  
Current migration count: **17** (from `20260412180000_init` through `20260425000000_add_enrollment_retry_count`).

---

## Test Environment

```bash
# Start isolated test containers
docker-compose -f docker-compose.test.yml up -d
# PostgreSQL: localhost:5433
# Redis:      localhost:6380
```

Env for running tests:
```bash
NODE_ENV=test
DATABASE_URL=postgresql://eduflow_test:test_password_123@localhost:5433/eduflow_test?schema=public
REDIS_URL=redis://localhost:6380
```
