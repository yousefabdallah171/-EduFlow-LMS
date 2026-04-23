# EduFlow LMS — Security Architecture (Dev/Prod Guide)

This document describes the security model implemented in this repository. It is written for engineers and QC/security reviewers.

## Threat model (practical web)

- No browser video system is truly “undownloadable”. Screen recording is always possible.
- The goal is to make **network extraction**, token reuse, playlist reuse, segment scraping, and casual DevTools downloading much harder.

## Auth model

- Access token (JWT) is returned to the frontend and used for API calls (`Authorization: Bearer ...`).
- Refresh token is stored as an **httpOnly** cookie and rotated on refresh.
- Single-session enforcement can be enabled (default true in env schema) to invalidate the prior session on re-login.

Key paths:
- Backend auth: `backend/src/controllers/auth.controller.ts`
- Refresh/session window constants: `backend/src/utils/jwt.ts`
- Access token middleware: `backend/src/middleware/auth.middleware.ts`
- Single-session enforcement: `backend/src/services/session.service.ts`

## RBAC

- Admin endpoints are mounted behind auth + role gating.

Key paths:
- Admin mount: `backend/src/app.ts`
- Role guard: `backend/src/middleware/rbac.middleware.ts`

## Video security (HLS hardening)

### Token + session gating

- Lesson playback issues a short-lived video token (5 minutes).
- Playlist/key/segment requests require:
  - a valid video token, AND
  - a valid refresh-session cookie (for enrolled lessons), AND
  - enrollment status ACTIVE at validation time.

Key paths:
- Token issuing/validation: `backend/src/services/video-token.service.ts`
- HLS endpoints + headers + traversal protections: `backend/src/controllers/lesson.controller.ts`

### Preview (public, cookie-bound)

- Preview is intentionally public, but URL sharing should not work:
  - Preview issuance sets `preview_session` httpOnly cookie.
  - Token payload contains `previewSessionId`, which must match the cookie.
  - Preview session record is stored in Redis with UA/IP-prefix tolerance.

Key paths:
- Preview issuance: `backend/src/controllers/lesson.controller.ts`
- Preview validation: `backend/src/services/video-token.service.ts`

### Anti-scrape

- Video endpoints enforce rate limits + a concurrency lease.
- Anomalies are stored as `VideoSecurityEvent` for review.

Key paths:
- Abuse controls + Redis counters: `backend/src/services/video-abuse.service.ts`
- Admin review endpoint: `backend/src/controllers/admin/video-security.controller.ts`

## Data isolation

- Student-specific data is always filtered by `req.user.userId` and access is role-gated.

Example key areas:
- Notes: `backend/src/controllers/notes.controller.ts`
- Orders (student): `backend/src/routes/student.routes.ts`

## Observability / monitoring security

- Prometheus metrics are supported behind `/metrics` and are enabled via env.
- In production, protect `/metrics` behind a token or internal network policy.

Key paths:
- Metrics: `backend/src/observability/prometheus.ts`
- Monitoring overlay compose: `docker-compose.monitoring.yml`

## What remains “human sign-off”

- Attacker-style manual checks (DevTools/Incognito replay, logout replay, burst scraping) must be performed by a reviewer and attached as evidence.
- Staging/prod-like load testing is required for any “100k users” claim.

