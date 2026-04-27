# EduFlow LMS — Testing

> **Update rule:** Any time you add, remove, or change a test file or script, update this doc.

---

## Stack

| Layer | Framework | Version |
|-------|-----------|---------|
| Backend unit & integration | Vitest | 4.1.4 |
| Frontend unit | Vitest | 4.1.4 |
| Frontend E2E | Playwright | 1.48.1 |

---

## Running Tests

```bash
# From backend/
npm run test                # all tests
npm run test:unit           # unit only
npm run test:integration    # integration only
npm run test:security       # security only
npm run test:performance    # performance only

# From frontend/
npx playwright test         # all E2E tests
npx playwright test --project=chromium   # specific browser
PW_ALL_BROWSERS=1 npx playwright test    # all 3 browsers
```

`pretest` runs `pnpm prisma:generate` automatically before every test run.

---

## Test Infrastructure

### Isolated Test Database
```bash
# Start PostgreSQL (port 5433) + Redis (port 6380) for tests
docker-compose -f docker-compose.test.yml up -d
```

### Environment for integration tests
```bash
export NODE_ENV=test
export DATABASE_URL="postgresql://eduflow_test:test_password_123@localhost:5433/eduflow_test?schema=public"
export REDIS_URL="redis://localhost:6380"
```

### Global test setup (`backend/tests/setup/vitest.global.ts`)
- Creates isolated schema per test run: `vitest_{timestamp}_{uuid}`
- Runs Prisma migrations into that schema
- Tears down schema after all tests finish
- Sets `REDIS_KEY_PREFIX` so test keys don't collide with dev/prod

### Playwright config (`frontend/playwright.config.ts`)
- Base URL: `http://localhost:5173` (override with `PLAYWRIGHT_BASE_URL`)
- Workers: 1 default (override with `PW_WORKERS`)
- Screenshots: on failure only
- Default project: Chromium; add Firefox + Safari with `PW_ALL_BROWSERS=1`

---

## Test File Map

### Backend — Unit (11 files, 117 tests)

| File | What It Tests |
|------|--------------|
| `tests/unit/analytics.test.ts` | KPI aggregation, revenue calculation, enrollment stats |
| `tests/unit/coupon.test.ts` | Coupon validation, discount logic, expiry, usage limits |
| `tests/unit/hmac.test.ts` | HMAC-SHA512 signing, timing-safe comparison |
| `tests/unit/payment-errors.test.ts` | PaymentError class, 40+ error codes, recovery logic |
| `tests/unit/payment.model.test.ts` | Payment model validation and state transitions |
| `tests/unit/payment.service.test.ts` | Payment service logic (fully mocked Prisma) |
| `tests/unit/refund.service.test.ts` | Refund initiation, processing, status transitions |
| `tests/unit/webhook.service.test.ts` | Webhook event parsing and delivery |
| `tests/unit/services/admin-payment.service.test.ts` | Admin payment list, filter, override |
| `tests/unit/services/metrics.service.test.ts` | Prometheus metric recording |
| `tests/unit/services/payment-event.service.test.ts.skip` | Skipped (import resolution pending) |

### Backend — Integration (20 files, 74 tests)

| File | What It Tests |
|------|--------------|
| `tests/integration/auth.test.ts` | Register, login, token refresh, logout |
| `tests/integration/enrollment.test.ts` | Enroll, revoke, status checks |
| `tests/integration/complete-user-journey.test.ts` | Full flow: register → pay → enroll → watch |
| `tests/integration/checkout-flow.integration.test.ts` | Checkout endpoint, coupon apply |
| `tests/integration/payment-webhook.test.ts` | Paymob webhook success/failure handling |
| `tests/integration/webhook.integration.test.ts` | Webhook HMAC, idempotency, retry |
| `tests/integration/refund.integration.test.ts` | Full refund cycle via API |
| `tests/integration/admin-payments.integration.test.ts` | Admin payment list, filter, override |
| `tests/integration/admin-orders.test.ts` | Admin order management |
| `tests/integration/failure-recovery.integration.test.ts` | Retry queues, recovery orchestration |
| `tests/integration/student-dashboard.test.ts` | Dashboard data aggregation |
| `tests/integration/progress.test.ts` | Lesson progress update, completion |
| `tests/integration/notes.test.ts` | Create, update, delete notes |
| `tests/integration/preview.test.ts` | Preview lesson access without enrollment |
| `tests/integration/video-token.test.ts` | Video token generation, expiry |
| `tests/integration/video-hardening.test.ts` | Risk scoring, IP/UA mismatch rejection |
| `tests/integration/tus-upload.test.ts` | Chunked video upload |
| `tests/integration/audit-log.test.ts` | Admin audit trail recording |
| `tests/integration/single-session.test.ts` | Single session enforcement |
| `tests/integration/monitoring.integration.test.ts` | Prometheus metrics endpoint |

### Backend — Security (6 files)

| File | What It Tests |
|------|--------------|
| `tests/security/authorization.test.ts` | RBAC: student/admin/guest access enforcement |
| `tests/security/data-protection.test.ts` | PII handling, field masking |
| `tests/security/injection-prevention.test.ts` | SQL injection, XSS, path traversal payloads |
| `tests/security/owasp-top-10.test.ts` | OWASP Top 10 vulnerability checks |
| `tests/security/rate-limiting.test.ts` | Rate limit enforcement per endpoint |
| `tests/security/webhook-hmac.test.ts` | HMAC validation, replay attack prevention |

### Backend — Performance (1 file)

| File | What It Tests |
|------|--------------|
| `tests/performance/api-performance.test.ts` | Auth, profile, dashboard response time benchmarks |

### Frontend — Unit (1 file)

| File | What It Tests |
|------|--------------|
| `tests/checkout.test.tsx` | Checkout component logic |

### Frontend — E2E / Playwright (23 files)

**Payment Flows:**
- `tests/e2e/payment-flow.spec.ts` — Full checkout flow
- `tests/e2e/checkout.spec.ts` — Checkout page interactions
- `tests/e2e/scenarios/happy-path.spec.ts` — Success path end-to-end
- `tests/e2e/scenarios/failure-recovery.spec.ts` — Payment failure + retry
- `tests/e2e/scenarios/refund-flow.spec.ts` — Refund request flow
- `tests/e2e/scenarios/timeout-recovery.spec.ts` — Timeout + resume
- `tests/e2e/payment-accessibility.spec.ts` — WCAG 2.1 AA compliance
- `tests/e2e/payment-responsive.spec.ts` — Mobile/tablet/desktop layouts
- `tests/e2e/payment-visual.spec.ts` — Visual regression screenshots
- `tests/e2e/compatibility/payment-compatibility.spec.ts` — 3 browsers × 3 devices

**Core App Flows:**
- `tests/e2e/registration.spec.ts` — User registration
- `tests/e2e/student-dashboard.spec.ts` — Dashboard page
- `tests/e2e/progress.spec.ts` — Progress tracking
- `tests/e2e/video-playback.spec.ts` — Video player
- `tests/e2e/admin-enrollment.spec.ts` — Admin enroll/revoke
- `tests/e2e/admin-upload.spec.ts` — Admin video upload
- `tests/e2e/preview-flow.spec.ts` — Course preview without login

**Utility:**
- `tests/e2e/smoke.spec.ts` — Quick smoke test (all pages 200)
- `tests/e2e/public-funnel.spec.ts` — Public pages funnel
- `tests/e2e/mobile-student.spec.ts` — Mobile student flow
- `tests/e2e/rtl-all-pages.spec.ts` — Arabic RTL layout
- `tests/e2e/runtime-coverage.spec.ts` — Code coverage collection

**Load Tests (k6):** `tests/load/`
- `concurrent-checkouts.js` — 100 virtual users doing concurrent checkouts
- `webhook-processing.js` — 50 concurrent webhook deliveries
- `history-queries.js` — 1000 payment history queries

---

## Vitest Config (`backend/vitest.config.ts`)

```
Path aliases:    @/ → src/, @/config → src/config, etc.
Parallelism:     false (sequential — avoids DB race conditions)
Coverage:        v8 provider
Thresholds:      70% lines/functions/statements, 60% branches
Reporters:       text, json, html
Hook timeout:    30,000ms
Excluded:        node_modules, dist, *.d.ts, index.ts, *.config.ts, app.ts, server.ts
```

---

## Current Status

| Suite | Files | Tests | Status |
|-------|-------|-------|--------|
| Backend Unit | 11 | 117 | ✅ 100% passing |
| Backend Integration | 20 | 74 | ⚠️ ~70% (16 fail — schema drift, not bugs) |
| Backend Security | 6 | 72+ | ⏳ Ready to run |
| Backend Performance | 1 | 10+ | ⏳ Ready to run |
| Frontend Unit | 1 | — | ✅ Passing |
| Frontend E2E | 23 | — | ⏳ Requires running app |
| Load Tests | 3 | — | ⏳ Requires k6 installed |

Coverage target: **70% lines** (v8). Achieved on unit suite.

Known schema gaps (do not block production):
- `Payment.enrollmentRetryCount` — migration `20260425000000` adds it
- Integration test data may use fields added after initial migration set
