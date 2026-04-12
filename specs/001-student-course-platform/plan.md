# Implementation Plan: EduFlow — Student Course Platform

**Branch**: `001-student-course-platform` | **Date**: 2026-04-12 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-student-course-platform/spec.md`

## Summary

Build EduFlow — a private single-course Arabic/English bilingual LMS. Students register (email or Google
OAuth), purchase the course through Paymob, and watch HLS-streamed protected video lessons with a dynamic
watermark. Admin (Yousef) manages content via a tus-based video upload pipeline, controls pricing and
coupons, manages student enrollment, and monitors analytics. The frontend uses a governed three-layer UI
system (shadcn/ui + Headless UI + Floating UI) with full RTL/LTR support via CSS logical properties, and
dark/light mode across all surfaces.

## Technical Context

**Language/Version**: Node.js 20 LTS + TypeScript 5.4 (backend); React 18.3 + TypeScript 5.4 (frontend)
**Primary Dependencies**:
- Backend: Express 4.x, Prisma 5.x, ioredis, jsonwebtoken, bcrypt, @tus-io/server, nodemailer, passport-google-oauth20
- Frontend: Vite 5.x, React Router 6.x, shadcn/ui, @headlessui/react, @floating-ui/react, hls.js, tus-js-client, react-i18next, TanStack Query v5, Zustand, Zod + react-hook-form

**Storage**: PostgreSQL 16 (primary data), Redis 7 (sessions, enrollment cache, upload state)
**Testing**: Vitest + supertest (backend unit + integration), Playwright (frontend E2E)
**Target Platform**: Linux web server (production); modern browsers Chrome 90+, Firefox 90+, Safari 15+; responsive 320px+
**Project Type**: Full-stack web application (monorepo: `backend/` + `frontend/`)
**Performance Goals**: Page LCP < 2s, API p95 < 500ms, video first-frame < 3s, error rate < 0.1%
**Constraints**: TLS 1.3 in transit, AES-256 at rest, bcrypt cost ≥ 12, RBAC on every protected route, rate limiting on auth + payment routes, no hardcoded `left`/`right` CSS values
**Scale/Scope**: Single course, ~1000 concurrent students (initial target), single admin user

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Gate | Status | Notes |
|-----------|------|--------|-------|
| I. Clean Architecture | Controllers → routing only; Services → logic; Repositories → Prisma queries | ✅ PASS | Project structure enforces three layers; Redis only in services |
| II. Security-First | bcrypt ≥ 12, JWT httpOnly cookies, RBAC server-side, 2FA admin, HMAC webhooks, rate limiting, TLS 1.3, AES-256 | ✅ PASS | All controls planned; 2FA deferred to v2 per spec assumption — architected for v2 |
| III. Video Protection | HLS only via signed URLs, tus upload, watermark overlay, token per session | ✅ PASS | No direct MP4 access; token invalidated on logout |
| IV. Performance Standards | Redis caching, route code-splitting, Skeleton loaders, query optimization | ✅ PASS | Redis planned for sessions + enrollment; Vite code-splitting by route |
| V. UI System Integrity | shadcn/ui base, Headless UI primitives, Floating UI positioning, brand tokens #EB2027, Inter + Noto Kufi Arabic | ✅ PASS | Each component assigned to correct layer (see spec FR-024–028) |
| VI. Bilingual & Accessibility | CSS logical properties only, i18n strings externalized, dir attribute on html, WCAG 2.1 AA | ✅ PASS | react-i18next for en/ar; eslint-plugin-logical-css to catch violations |
| VII. UX Consistency | Inline validation, Skeleton loaders, Sonner toasts, empty states, Dialog confirmation | ✅ PASS | All seven UX consistency requirements planned in feature spec (FR-019–023) |
| VIII. Testing P0 | All 6 P0 flows covered (registration, payment/webhook, video token, tus upload, manual enroll, progress) | ✅ PASS | Vitest integration tests + Playwright E2E for each P0 flow |

**Constitution Check result: ALL GATES PASS — proceeding to Phase 0**

## Project Structure

### Documentation (this feature)

```text
specs/001-student-course-platform/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── auth.md
│   ├── student.md
│   ├── video.md
│   ├── admin-students.md
│   ├── admin-content.md
│   └── admin-analytics.md
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── config/
│   │   ├── env.ts               # zod-validated env schema
│   │   ├── database.ts          # Prisma client singleton
│   │   └── redis.ts             # ioredis client singleton
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── student.controller.ts
│   │   ├── lesson.controller.ts
│   │   ├── payment.controller.ts
│   │   ├── webhook.controller.ts
│   │   └── admin/
│   │       ├── students.controller.ts
│   │       ├── lessons.controller.ts
│   │       ├── uploads.controller.ts
│   │       ├── coupons.controller.ts
│   │       ├── pricing.controller.ts
│   │       └── analytics.controller.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── enrollment.service.ts
│   │   ├── payment.service.ts
│   │   ├── video-token.service.ts
│   │   ├── upload.service.ts
│   │   ├── coupon.service.ts
│   │   ├── progress.service.ts
│   │   └── analytics.service.ts
│   ├── repositories/
│   │   ├── user.repository.ts
│   │   ├── enrollment.repository.ts
│   │   ├── payment.repository.ts
│   │   ├── lesson.repository.ts
│   │   ├── progress.repository.ts
│   │   ├── coupon.repository.ts
│   │   └── video-token.repository.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts       # JWT validation + attach req.user
│   │   ├── rbac.middleware.ts       # requireRole('ADMIN' | 'STUDENT')
│   │   ├── rate-limit.middleware.ts # express-rate-limit config
│   │   └── hmac.middleware.ts       # Paymob webhook HMAC validation
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── student.routes.ts
│   │   ├── webhook.routes.ts
│   │   └── admin.routes.ts
│   ├── utils/
│   │   ├── jwt.ts                   # sign/verify access + refresh tokens
│   │   ├── hmac.ts                  # Paymob HMAC-SHA512 validation
│   │   ├── video-token.ts           # signed HLS URL generation
│   │   ├── email.ts                 # nodemailer wrapper
│   │   └── mask-email.ts            # j***@example.com masking
│   └── app.ts
├── prisma/
│   └── schema.prisma
└── tests/
    ├── integration/
    │   ├── auth.test.ts
    │   ├── payment-webhook.test.ts
    │   ├── video-token.test.ts
    │   ├── tus-upload.test.ts
    │   ├── enrollment.test.ts
    │   └── progress.test.ts
    └── unit/
        ├── hmac.test.ts
        ├── video-token.test.ts
        ├── coupon.test.ts
        └── analytics.test.ts

frontend/
├── src/
│   ├── components/
│   │   ├── ui/                  # shadcn/ui component registry (restyled)
│   │   ├── layout/
│   │   │   ├── RootLayout.tsx   # dir + theme provider
│   │   │   ├── NavBar.tsx       # Headless UI Menu language switcher
│   │   │   ├── MobileDrawer.tsx # Headless UI Disclosure drawer
│   │   │   └── AdminShell.tsx
│   │   └── shared/
│   │       ├── VideoPlayer.tsx  # hls.js + watermark + Floating UI tooltips
│   │       ├── WatermarkOverlay.tsx
│   │       ├── EmptyState.tsx
│   │       ├── LanguageSwitcher.tsx
│   │       └── ThemeToggle.tsx
│   ├── pages/
│   │   ├── Landing.tsx
│   │   ├── Register.tsx
│   │   ├── Login.tsx
│   │   ├── ForgotPassword.tsx
│   │   ├── Checkout.tsx
│   │   ├── Course.tsx
│   │   ├── Lesson.tsx
│   │   └── admin/
│   │       ├── Dashboard.tsx
│   │       ├── Students.tsx
│   │       ├── Lessons.tsx
│   │       ├── Pricing.tsx
│   │       └── Analytics.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useVideoToken.ts
│   │   ├── useEnrollment.ts
│   │   └── useTusUpload.ts
│   ├── stores/
│   │   ├── auth.store.ts        # Zustand: user + role
│   │   ├── theme.store.ts       # Zustand: light/dark
│   │   └── locale.store.ts     # Zustand: en/ar
│   ├── lib/
│   │   ├── api.ts               # axios instance with interceptors
│   │   └── i18n.ts              # react-i18next configuration
│   ├── locales/
│   │   ├── en.json
│   │   └── ar.json
│   └── styles/
│       ├── globals.css          # CSS variables + logical properties
│       └── tailwind.config.ts   # brand token #EB2027 tonal scale
└── tests/
    └── e2e/
        ├── registration.spec.ts
        ├── payment.spec.ts
        ├── video-playback.spec.ts
        ├── admin-upload.spec.ts
        ├── admin-enrollment.spec.ts
        └── progress.spec.ts
```

**Structure Decision**: Option 2 (web application) — separate `backend/` and `frontend/` directories at
repository root. Backend is a REST API (Node.js/Express), frontend is a Vite SPA (React 18). Chosen because:
(a) the constitution specifies this exact stack, (b) clear separation enables independent deployments,
(c) allows different test runners per tier (Vitest for backend, Playwright for frontend E2E).

### Docker Setup (repository root)

All services run via Docker Compose. One command starts the full stack: frontend, backend, PostgreSQL,
and Redis. Storage volumes are mounted for video files and database persistence.

```text
docker/
├── backend.Dockerfile      # Node.js 20 LTS production image
├── frontend.Dockerfile     # Nginx serving Vite production build
└── nginx.conf              # Reverse proxy: / → frontend, /api → backend

docker-compose.yml          # Full stack: frontend + backend + postgres + redis
docker-compose.dev.yml      # Development override: hot-reload mounts
.dockerignore
```

**`docker-compose.yml`** — services:

| Service | Image | Port | Notes |
|---------|-------|------|-------|
| `frontend` | `docker/frontend.Dockerfile` | 80 (internal) | Nginx serves Vite build; proxies `/api` to backend |
| `backend` | `docker/backend.Dockerfile` | 3000 (internal) | Express API; runs `prisma migrate deploy` on startup |
| `postgres` | `postgres:16-alpine` | 5432 (internal) | Volume: `pgdata` |
| `redis` | `redis:7-alpine` | 6379 (internal) | Volume: `redisdata` |

**Networking**: All services on a single `eduflow_net` bridge network. Only the `frontend` Nginx
container exposes port `80` (and `443` in production) to the host. No DB or Redis ports are exposed
externally.

**Volumes**:
- `pgdata` — PostgreSQL data persistence
- `redisdata` — Redis persistence (AOF enabled)
- `video_storage` — mounted at `/app/storage` in the backend container (HLS segments + raw uploads)

**Environment**: `.env` at repo root is loaded by Compose for all services. Service-specific overrides
use `docker-compose.dev.yml` (`COMPOSE_FILE=docker-compose.yml:docker-compose.dev.yml`).

**Development workflow** (hot reload):
```bash
# Start full stack with hot reload (backend tsx watch, frontend Vite HMR)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Run migrations inside running backend container
docker compose exec backend pnpm prisma migrate dev

# Seed database
docker compose exec backend pnpm prisma db seed
```

**Production workflow**:
```bash
# Build and start all containers
docker compose up --build -d

# View logs
docker compose logs -f backend
```

**`docker/backend.Dockerfile`** outline:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY backend/package.json backend/pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY backend/ .
RUN pnpm build && pnpm prisma generate

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
CMD ["sh", "-c", "node dist/app.js"]
```

**`docker/frontend.Dockerfile`** outline:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY frontend/ .
RUN pnpm build          # outputs to /app/dist

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

**`docker/nginx.conf`** — routes all `/api/*` traffic to the backend container:
```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API + webhooks to backend
    location /api/ {
        proxy_pass http://backend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # tus upload endpoint (large bodies, extended timeout)
    location /api/v1/admin/uploads {
        proxy_pass http://backend:3000;
        proxy_request_buffering off;
        client_max_body_size 0;
        proxy_read_timeout 3600s;
    }
}
```

**Note on video storage**: The `video_storage` volume is shared between the backend container
(writes uploads + HLS segments) and the Nginx container (serves `.m3u8`/`.ts` files directly
for performance). In production, replace with a CDN/object storage mount.

## Complexity Tracking

> No violations requiring justification — all principles satisfied by this design.
