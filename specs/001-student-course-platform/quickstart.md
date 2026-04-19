# Quickstart: EduFlow — Student Course Platform

**Date**: 2026-04-12
**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

This guide validates the full development environment and exercises all P0 flows end-to-end.

---

## Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| Docker | 24+ | `docker --version` |
| Docker Compose | v2 (plugin) | `docker compose version` |
| Node.js | 20 LTS (local dev only) | `node --version` → `v20.x.x` |
| pnpm | 9.x (local dev only) | `pnpm --version` |
| Playwright | latest (E2E only) | `npx playwright --version` |

> **Docker is the primary runtime.** PostgreSQL, Redis, and FFmpeg run inside containers — no local
> installation of those services required.

---

## 1. Clone & Install

```bash
git clone <repo-url> eduflow
cd eduflow
```

---

## 2. Environment Setup

Copy and populate the single root-level env file (used by all Docker services):

```bash
cp .env.example .env
```

**`.env` minimum required** (root of repo, shared by all containers):
```env
# Database (used by postgres container + backend)
POSTGRES_USER=eduflow
POSTGRES_PASSWORD=change-me
POSTGRES_DB=eduflow_dev
DATABASE_URL="postgresql://eduflow:change-me@postgres:5432/eduflow_dev"

# Redis (used by backend)
REDIS_URL="redis://redis:6379"

# Auth
JWT_ACCESS_SECRET="change-me-32-chars-min"
JWT_REFRESH_SECRET="change-me-different-32-chars"
VIDEO_TOKEN_SECRET="change-me-video-32-chars"

# Paymob
PAYMOB_API_KEY="your_paymob_api_key"
PAYMOB_HMAC_SECRET="your_paymob_hmac_secret"
PAYMOB_INTEGRATION_ID="your_integration_id"
PAYMOB_IFRAME_ID="your_iframe_id"

# Google OAuth
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"

# Email
SMTP_HOST="smtp.example.com"
SMTP_PORT=587
SMTP_USER="noreply@eduflow.com"
SMTP_PASS="your_smtp_password"

# App
FRONTEND_URL="http://localhost"
NODE_ENV="development"
```

> **Note**: `DATABASE_URL` and `REDIS_URL` use Docker service hostnames (`postgres`, `redis`) —
> not `localhost`. These are resolved inside the `eduflow_net` Docker network.

---

## 3. Start the Full Stack (Docker)

```bash
# Default Docker workflow — frontend runs via Vite dev server for fast UI updates
docker compose up --build

# Optional: include the dev override when you also want backend hot reload and extra tooling
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

All core services start together: `frontend` (Vite dev server exposed on port 80), `backend`
(Express on port 3000, internal only), `postgres`, and `redis`.

**Run migrations + seed** (first time only):
```bash
docker compose exec backend pnpm prisma migrate deploy
docker compose exec backend pnpm prisma db seed
```

**Seed creates**:
- Admin: `admin@eduflow.com` / `Admin1234!` (role: ADMIN)
- Course settings: title EN/AR, price 499 EGP
- 3 sample lessons (2 published, 1 draft)

Verify the stack is running:
```bash
curl http://localhost/api/v1/course
# Expected: 200 with course title, price, lessonCount

# Frontend
open http://localhost
```

---

## 5. P0 Flow Validation

Run through each P0 flow to validate the environment.

### P0-01: Student Registration

```bash
curl -X POST http://localhost/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!","fullName":"Test Student"}'
# Expected: 201 with message about email verification
```

**UI validation**: Open `http://localhost/register` → fill form → submit → see success toast →
check email (or dev mailtrap) for verification link → click link → see "Email verified" page.

---

### P0-02: Paymob Purchase & Webhook

```bash
# 1. Login and get access token
TOKEN=$(curl -s -X POST http://localhost/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!"}' | jq -r '.accessToken')

# 2. Initiate checkout
curl -X POST http://localhost/api/v1/checkout \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
# Expected: 200 with paymentKey and orderId

# 3. Simulate webhook (Paymob sandbox or manual test)
# Use ngrok to expose localhost for Paymob sandbox webhook delivery:
ngrok http 3000
# Set webhook URL in Paymob dashboard to: https://<ngrok-url>/api/v1/webhooks/paymob
```

**Enrollment check after successful payment**:
```bash
curl http://localhost/api/v1/enrollment \
  -H "Authorization: Bearer $TOKEN"
# Expected: {"enrolled": true, "status": "ACTIVE"}
```

---

### P0-03: Protected Video Playback Token

```bash
# Get lessons (requires enrollment from P0-02)
LESSONS=$(curl -s http://localhost/api/v1/lessons \
  -H "Authorization: Bearer $TOKEN")

LESSON_ID=$(echo $LESSONS | jq -r '.lessons[0].id')

# Get lesson with video token
curl http://localhost/api/v1/lessons/$LESSON_ID \
  -H "Authorization: Bearer $TOKEN"
# Expected: 200 with videoToken, hlsUrl, watermark.name, watermark.maskedEmail

# Verify token expiry works
curl "http://localhost/api/v1/video/$LESSON_ID/playlist.m3u8?token=invalid_token"
# Expected: 401 INVALID_VIDEO_TOKEN
```

---

### P0-04: Admin tus Upload

```bash
# Get admin token
ADMIN_TOKEN=$(curl -s -X POST http://localhost/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@eduflow.com","password":"Admin1234!"}' | jq -r '.accessToken')

# Create upload session
UPLOAD_RESPONSE=$(curl -s -X POST http://localhost/api/v1/admin/uploads \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Tus-Resumable: 1.0.0" \
  -H "Upload-Length: 1048576" \
  -H "Upload-Metadata: filename $(echo -n 'test.mp4' | base64)")

echo $UPLOAD_RESPONSE
# Expected: 201 with Location header containing upload ID

# Get upload offset (resume check)
UPLOAD_ID="<from Location header>"
curl -X HEAD http://localhost/api/v1/admin/uploads/$UPLOAD_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Tus-Resumable: 1.0.0"
# Expected: Upload-Offset: 0
```

**UI validation**: Open `http://localhost/admin/lessons` → click "Upload Video" → Sheet panel opens →
select a video file → Progress bar updates → toast on completion.

---

### P0-05: Manual Student Enrollment

```bash
# Get student ID
STUDENT_ID=$(curl -s "http://localhost/api/v1/admin/students/search?q=test@example" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.results[0].id')

# Enroll student
curl -X POST http://localhost/api/v1/admin/students/$STUDENT_ID/enroll \
  -H "Authorization: Bearer $ADMIN_TOKEN"
# Expected: 201 with enrollment status ACTIVE, type ADMIN_ENROLLED

# Revoke enrollment
curl -X POST http://localhost/api/v1/admin/students/$STUDENT_ID/revoke \
  -H "Authorization: Bearer $ADMIN_TOKEN"
# Expected: 200 with status REVOKED
```

---

### P0-06: Progress Tracking

```bash
# Update lesson progress (requires enrolled student, valid lesson)
curl -X POST http://localhost/api/v1/lessons/$LESSON_ID/progress \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"lastPositionSeconds":300,"watchTimeSeconds":120,"completed":false}'
# Expected: 200 with updated progress and courseCompletionPercentage

# Mark lesson complete
curl -X POST http://localhost/api/v1/lessons/$LESSON_ID/progress \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"lastPositionSeconds":598,"watchTimeSeconds":540,"completed":true}'
# Expected: 200 with completedAt timestamp set
```

---

## 6. Run Automated Tests

```bash
cd backend

# Unit tests
pnpm test:unit

# Integration tests (requires running PostgreSQL + Redis)
pnpm test:integration

# All backend tests with coverage
pnpm test:coverage
```

```bash
cd frontend

# E2E tests (requires both servers running)
pnpm test:e2e

# E2E in UI mode
pnpm test:e2e --ui
```

**P0 test files to verify all pass**:
- `backend/tests/integration/auth.test.ts`
- `backend/tests/integration/payment-webhook.test.ts`
- `backend/tests/integration/video-token.test.ts`
- `backend/tests/integration/tus-upload.test.ts`
- `backend/tests/integration/enrollment.test.ts`
- `backend/tests/integration/progress.test.ts`
- `frontend/tests/e2e/registration.spec.ts`
- `frontend/tests/e2e/payment.spec.ts`
- `frontend/tests/e2e/video-playback.spec.ts`

---

## 7. RTL/LTR & Dark Mode Validation

**Bilingual check**:
1. Open `http://localhost`
2. Click language switcher → select "العربية"
3. Verify `dir="rtl"` is set on `<html>`
4. Verify layout flips correctly (text aligns right, icons mirror)
5. Verify Noto Kufi Arabic font is active for Arabic content

**Dark mode check**:
1. Click theme toggle
2. Verify all pages render correctly in dark mode
3. Video player watermark remains visible

---

## 8. Constitution Compliance Spot Checks

- [ ] Open browser DevTools → Network tab → confirm no requests to `/api/v1/` without version prefix
- [ ] Inspect cookies → confirm `refresh_token` is `httpOnly; Secure; SameSite=Strict`
- [ ] Open course page without enrollment → confirm redirect to `/checkout`
- [ ] Inspect any `.m3u8` URL → confirm it contains `?token=` parameter
- [ ] Open admin route as student → confirm 403 response
- [ ] Open any form → submit empty → confirm inline validation errors (not alert dialogs)
- [ ] Navigate to any empty table → confirm empty state illustration renders
- [ ] Click any destructive action → confirm Dialog opens before proceeding
- [ ] Inspect bundle via `pnpm build` → confirm multiple chunks (route-based code splitting)
