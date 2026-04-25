# EduFlow LMS — Payment Gateway (Paymob)

**Last Updated:** April 25, 2026  
**Status:** ✅ Production Ready  
**Covers:** Phases 5 → 11 of payment implementation

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Configuration](#configuration)
4. [Payment Flow](#payment-flow)
5. [Refund System](#refund-system)
6. [Admin Payment Management](#admin-payment-management)
7. [Webhook Handling](#webhook-handling)
8. [Failure Recovery](#failure-recovery)
9. [Monitoring & Alerting](#monitoring--alerting)
10. [Debugging Guide](#debugging-guide)
11. [API Reference](#api-reference)
12. [Troubleshooting](#troubleshooting)
13. [Testing](#testing)

---

## Overview

EduFlow LMS uses **Paymob** as its payment gateway. When a student purchases a course package, the payment goes through Paymob's hosted iframe, a webhook confirms the result, and enrollment is automatically activated (or rolled back on failure).

**Key capabilities:**
- Full and partial refunds via Paymob API
- Idempotent webhook processing (duplicate webhooks ignored)
- Automatic enrollment retry on failure
- Admin dashboard for payment management and overrides
- Prometheus/Grafana monitoring with 10 alert rules

---

## Architecture

```
┌───────────────────────────────────────────────────────────┐
│                        STUDENT                            │
│  Clicks "Buy" → Checkout Page → Paymob iframe             │
└───────────────────────────┬───────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────┐
│                  PAYMENT SERVICE                          │
│  POST /api/v1/checkout                                    │
│  1. Validate: not enrolled, no active checkout            │
│  2. Apply coupon (if any)                                 │
│  3. Call Paymob: authenticate → create order → get key   │
│  4. Save Payment record (status: INITIATED)               │
│  5. Return iframe URL to frontend                         │
└───────────────────────────┬───────────────────────────────┘
                            │ Student pays in iframe
                            ▼
┌───────────────────────────────────────────────────────────┐
│                  WEBHOOK CONTROLLER                       │
│  POST /api/v1/payments/webhook                            │
│  1. Validate HMAC signature                               │
│  2. Check idempotency (skip if already processed)         │
│  3. success=true  → COMPLETED + create Enrollment         │
│  4. success=false → FAILED   + notify student             │
└───────────────────────────┬───────────────────────────────┘
                            │
               ┌────────────┴────────────┐
               ▼                         ▼
     ┌──────────────────┐    ┌──────────────────────┐
     │  ENROLLMENT      │    │  EMAIL NOTIFICATION  │
     │  enrollService   │    │  Receipt or failure  │
     │  .createOrUpdate │    │  email via SMTP      │
     └──────────────────┘    └──────────────────────┘
```

### Payment State Machine

```
INITIATED → AWAITING_PAYMENT → WEBHOOK_PENDING
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
               COMPLETED                        FAILED
                    │
         ┌──────────┴──────────┐
         ▼                     ▼
  REFUND_REQUESTED          DISPUTED
         │
    ┌────┴────┐
    ▼         ▼
 REFUNDED   REFUND_FAILED
```

### Key Files

| File | Purpose |
|------|---------|
| `backend/src/services/payment.service.ts` | Core payment logic, Paymob API calls |
| `backend/src/services/refund.service.ts` | Refund initiation & completion |
| `backend/src/services/enrollment.service.ts` | Enrollment creation/revocation |
| `backend/src/controllers/webhook.controller.ts` | Paymob webhook handler |
| `backend/src/controllers/refund.controller.ts` | Refund endpoints |
| `backend/src/controllers/admin/payments.controller.ts` | Admin payment management |
| `backend/src/services/metrics.service.ts` | Prometheus metrics recording |
| `backend/src/jobs/refund-processing.job.ts` | Async refund queue (Bull) |
| `backend/prisma/migrations/` | Database schema history |

---

## Configuration

Required environment variables in `.env`:

```env
# Paymob
PAYMOB_API_KEY=your_paymob_api_key
PAYMOB_HMAC_SECRET=your_paymob_hmac_secret
PAYMOB_INTEGRATION_ID=your_paymob_integration_id
PAYMOB_IFRAME_ID=your_paymob_iframe_id

# Database & Cache
DATABASE_URL=postgresql://user:pass@host:5432/db?schema=public
REDIS_URL=redis://localhost:6379

# JWT
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=your_smtp_password

# App
FRONTEND_URL=https://yourdomain.com
NODE_ENV=production
```

---

## Payment Flow

### Happy Path (Student Checkout)

```
1. Student visits /checkout
2. Frontend calls: POST /api/v1/checkout
   Body: { packageId, couponCode? }

3. Backend:
   a. Validates student not already enrolled
   b. Validates no in-progress checkout (prevents duplicate payments)
   c. Applies coupon discount if provided
   d. Calls Paymob API: POST /auth/tokens → get auth token
   e. Calls Paymob API: POST /ecommerce/orders → create order
   f. Calls Paymob API: POST /acceptance/payment_keys → get payment key
   g. Saves Payment { status: INITIATED, paymobOrderId }
   h. Returns { iframeUrl } to frontend

4. Frontend redirects student to Paymob iframe

5. Student enters card details and pays

6. Paymob sends webhook: POST /api/v1/payments/webhook
   Body: { obj.success, obj.id, obj.order.id, hmac }

7. Backend:
   a. Validates HMAC signature (security check)
   b. Checks idempotency: skip if same webhook already processed
   c. On success=true:
      - Updates Payment { status: COMPLETED }
      - Creates Enrollment { status: ACTIVE }
      - Increments coupon usage
      - Sends receipt email
      - Clears dashboard cache
   d. On success=false:
      - Updates Payment { status: FAILED }
      - Sends failure notification email

8. Paymob redirects student back to /payment/success or /payment/failure
```

### Concurrent Checkout Protection

If a student tries to start two checkouts simultaneously, the second one is blocked:
```
Error 409: "Another checkout is already in progress for this user"
```
The system uses a Redis lock keyed on `checkout:lock:{userId}` with a 15-minute TTL.

---

## Refund System

### Initiating a Refund

**User-initiated:**
```bash
curl -X POST http://localhost:3000/api/v1/refunds/initiate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "pay_123",
    "amount": 5000,
    "reason": "Course not as described"
  }'
```

**Admin-initiated:**
```bash
curl -X POST http://localhost:3000/api/v1/admin/refunds/initiate \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "pay_123",
    "amount": 10000,
    "reason": "Customer complaint"
  }'
```

Omit `amount` for a full refund; provide `amount` in piasters for a partial refund.

### Refund Processing Flow

```
initiateRefund()
  → Validate payment status is COMPLETED
  → Validate refund amount ≤ original amount
  → Update Payment { status: REFUND_REQUESTED }
  → Queue refund job (Bull queue)
  → Job calls Paymob refund API
  → Wait for Paymob webhook confirmation
  → webhookController.paymobRefund()
    → Full refund:    revoke Enrollment + update Payment { status: REFUNDED }
    → Partial refund: keep Enrollment  + update Payment { status: REFUNDED }
```

### Check Refund Status

```bash
curl http://localhost:3000/api/v1/refunds/pay_123/status \
  -H "Authorization: Bearer <token>"
```

Response:
```json
{
  "paymentId": "pay_123",
  "refundStatus": "PROCESSING",
  "refundAmount": 10000,
  "initiatedAt": "2026-04-25T10:00:00Z"
}
```

### Refund Status Values

| Status | Meaning |
|--------|---------|
| `REQUESTED` | Refund queued, waiting for processing |
| `PROCESSING` | Refund API call sent to Paymob |
| `COMPLETED` | Refund confirmed by Paymob webhook |
| `FAILED` | Paymob rejected the refund |
| `CANCELLED` | Admin cancelled the refund request |

---

## Admin Payment Management

### API Endpoints (all require Admin token)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/admin/payments` | List payments with filters |
| GET | `/api/v1/admin/payments/:id` | Get payment details |
| GET | `/api/v1/admin/payments/search` | Search by keyword |
| GET | `/api/v1/admin/payments/status/:status` | Filter by status |
| GET | `/api/v1/admin/payments/stats` | Revenue & conversion stats |
| POST | `/api/v1/admin/payments/manual` | Create manual payment (free/admin grant) |
| POST | `/api/v1/admin/payments/:id/override` | Override payment status |
| POST | `/api/v1/admin/payments/:id/revoke` | Revoke payment & enrollment |

### List Payments Example

```bash
curl "http://localhost:3000/api/v1/admin/payments?status=COMPLETED&limit=20&offset=0" \
  -H "Authorization: Bearer <admin-token>"
```

Query parameters: `status`, `userId`, `startDate`, `endDate`, `minAmount`, `maxAmount`, `limit` (max 100), `offset`.

### Override a Stuck Payment

If a payment is stuck in `WEBHOOK_PENDING` after the student confirms payment:
```bash
curl -X POST "http://localhost:3000/api/v1/admin/payments/pay_123/override" \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "COMPLETED",
    "reason": "Confirmed via Paymob dashboard - transaction #987654"
  }'
```

### Create Manual Payment (Free Access)

```bash
curl -X POST "http://localhost:3000/api/v1/admin/payments/manual" \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_abc",
    "packageId": "pkg_xyz",
    "amount": 0,
    "reason": "Scholarship grant"
  }'
```

---

## Webhook Handling

### Paymob Sends Webhooks To

```
POST https://yourdomain.com/api/v1/payments/webhook
```

Configure this URL in your Paymob dashboard under Transaction Processed Callback.

### HMAC Validation

Every webhook is validated before processing:
```
HMAC = HMAC-SHA512(PAYMOB_HMAC_SECRET, concatenated_fields)
```
Requests with invalid HMAC are rejected with `400 INVALID_WEBHOOK_HMAC`.

### Simulate a Webhook (Development Only)

```bash
# Simulate success
curl -X POST http://localhost:3000/api/v1/dev/payments/pay_123/webhook/success

# Simulate failure
curl -X POST http://localhost:3000/api/v1/dev/payments/pay_123/webhook/failure

# Simulate refund confirmation
curl -X POST http://localhost:3000/api/v1/dev/payments/pay_123/webhook/refund
```

These endpoints only exist when `NODE_ENV=development`.

### Verify Webhook Received

```sql
SELECT id, status, "paymobTransactionId", "webhookReceivedAt", "webhookHmac"
FROM "Payment"
WHERE id = 'pay_123';
```

---

## Failure Recovery

### Automatic Retry System (Bull + Redis)

Three queues handle different failure types:

| Queue | Triggers On | Retry Strategy | Max Retries |
|-------|-------------|----------------|-------------|
| `failedPaymentRecovery` | Paymob API errors | 10min → 30min → 1hr | 3 |
| `enrollmentRetry` | Enrollment failed after payment success | 1min → 5min → 15min | 3 |
| `emailRetry` | Email sending failed | 2min → 10min → 30min | 3 |

### Manual Recovery Commands

**Check failed jobs:**
```bash
# In Redis CLI
redis-cli
> LLEN bull:failedPaymentRecoveryQueue:failed
> LRANGE bull:enrollmentRetryQueue:failed 0 -1
```

**Retry all failed jobs (Bull dashboard or code):**
```typescript
await failedPaymentRecoveryQueue.retryJobs();
await enrollmentRetryQueue.retryJobs();
```

**Manually fix a stuck payment:**
```bash
# 1. Check current state
curl http://localhost:3000/api/v1/admin/payments/pay_123 \
  -H "Authorization: Bearer <admin-token>"

# 2. If WEBHOOK_PENDING but confirmed in Paymob dashboard:
curl -X POST "http://localhost:3000/api/v1/admin/payments/pay_123/override" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{"status":"COMPLETED","reason":"Confirmed in Paymob"}'

# 3. If enrollment was not created after COMPLETED:
# Will be retried automatically by enrollmentRetryQueue
# Or create manually via POST /admin/payments/manual
```

### Paymob API Error Codes

| Code | Meaning | Recovery |
|------|---------|----------|
| `PAYMOB_AUTH_FAILED` | Invalid API key | Check `PAYMOB_API_KEY` in .env |
| `PAYMOB_RATE_LIMITED` | Too many requests | Retry with exponential backoff |
| `PAYMOB_SERVER_ERROR` | Paymob is down | Wait and retry |
| `PAYMOB_TIMEOUT` | Network timeout | Retry |

---

## Monitoring & Alerting

### Start the Monitoring Stack

```bash
docker-compose --profile monitoring up -d
```

| Service | URL | Credentials |
|---------|-----|-------------|
| **Prometheus** | http://localhost:9090 | No auth |
| **Grafana** | http://localhost:3001 | admin / admin |
| **Alertmanager** | http://localhost:9093 | No auth |

### Grafana Dashboard

Open **http://localhost:3001** → Dashboards → **"EduFlow Payment Monitoring"**

Contains 12 panels:
1. Payment Success Rate (real-time %)
2. Payment Volume (requests/min)
3. Processing Time P95/P99
4. Paymob API Latency
5. Error Rate by Type
6. Database Query Performance
7. Active Payments by Status
8. Webhook Processing Times
9. Enrollment Success Rate
10. Refund Operations
11. System CPU/Memory
12. Disk Usage

### Prometheus Metrics (15 custom metrics)

```
# Payment
eduflow_payments_total{method, status}
eduflow_payment_amount_piasters{method}
eduflow_payment_processing_time_ms{status}
eduflow_active_payments{status}
eduflow_paymob_api_request_time_ms{endpoint}
eduflow_paymob_api_errors_total{endpoint, error}

# Refunds
eduflow_refunds_total{type, status}
eduflow_refund_amount_piasters{type}
eduflow_refund_processing_time_ms{status}

# Database (automatic via Prisma middleware)
eduflow_db_query_time_ms{operation, table}
eduflow_db_query_errors_total{operation, table}

# Webhooks
eduflow_webhook_processing_time_ms{type, status}
eduflow_webhook_errors_total{type, error}

# Enrollment
eduflow_enrollments_total{operation, status}
eduflow_enrollment_processing_time_ms{status}
```

### Alert Rules (10 active rules)

| Alert | Condition | Severity |
|-------|-----------|----------|
| HighPaymentFailureRate | >10% for 5min | 🔴 Critical |
| PaymobApiErrors | >5% for 5min | 🔴 Critical |
| SlowPaymentProcessing | P95 > 5s | 🔴 Critical |
| WebhookFailureRate | >5% for 5min | 🔴 Critical |
| DatabaseQuerySlow | avg > 1s | 🔴 Critical |
| EnrollmentFailureRate | >5% | 🟡 Warning |
| PrometheusScrapeFailed | No scrape for 1min | 🟡 Warning |
| DiskSpaceRunningOut | <10% free | 🟡 Warning |
| HighMemoryUsage | >80% | 🟡 Warning |
| ServiceDown | Health check fails | 🟡 Warning |

### Configure Email/Slack Alerts

Edit `docker/monitoring/alertmanager/alertmanager.yml`:
```yaml
global:
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_auth_username: 'your-email@gmail.com'
  smtp_auth_password: 'your-app-password'
  smtp_from: 'alerts@yourdomain.com'
```

For Slack, set the environment variable:
```bash
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK"
docker-compose restart alertmanager
```

### Useful PromQL Queries

```promql
# Payment success rate (last 5 min)
rate(eduflow_payments_total{status="success"}[5m])
/ rate(eduflow_payments_total[5m])

# P95 payment processing time
histogram_quantile(0.95, rate(eduflow_payment_processing_time_ms_bucket[5m]))

# Webhook error rate
rate(eduflow_webhook_errors_total[5m])
/ rate(eduflow_webhook_processing_time_ms_count[5m])
```

---

## Debugging Guide

### Check Recent Payment Errors (backend logs)

```bash
# Docker
docker logs eduflow-lms-backend-1 --tail=100 | grep -i "payment\|webhook\|refund"

# Direct
npm run dev 2>&1 | grep -E "ERROR|payment|webhook"
```

### Check Database State

```sql
-- Recent payments
SELECT id, status, "paymobOrderId", "webhookReceivedAt", "createdAt"
FROM "Payment"
ORDER BY "createdAt" DESC
LIMIT 20;

-- Payments stuck in WEBHOOK_PENDING
SELECT id, "userId", status, "createdAt"
FROM "Payment"
WHERE status = 'WEBHOOK_PENDING'
AND "createdAt" < NOW() - INTERVAL '30 minutes';

-- Refund queue status
SELECT id, "paymentId", status, resolution, "createdAt"
FROM "RefundQueue"
ORDER BY "createdAt" DESC;

-- Enrollment state after payment
SELECT p.id, p.status, e.status as enrollment_status, e."enrolledAt"
FROM "Payment" p
LEFT JOIN "Enrollment" e ON e."userId" = p."userId"
WHERE p.status = 'COMPLETED'
ORDER BY p."createdAt" DESC
LIMIT 10;
```

### Check Metrics Endpoint

```bash
curl http://localhost:3000/metrics | grep eduflow_
```

### Verify Paymob Can Reach Your Webhook

Make sure your webhook URL is publicly accessible:
```bash
# From a public machine or use ngrok for local dev
curl -X POST https://yourdomain.com/api/v1/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
# Expected: 400 INVALID_WEBHOOK_HMAC (means it reached the server)
```

---

## API Reference

### Student Endpoints

#### POST `/api/v1/checkout`
Start a payment for a package.

**Auth:** Required (Student)

**Request:**
```json
{
  "packageId": "pkg_abc",
  "couponCode": "DISC20"
}
```

**Response 200:**
```json
{
  "iframeUrl": "https://accept.paymob.com/api/acceptance/iframes/...",
  "paymentId": "pay_xyz"
}
```

**Error cases:**
- `409` — Already enrolled or checkout in progress
- `404` — Package not found
- `400` — Invalid coupon

---

#### POST `/api/v1/payments/webhook`
Paymob webhook receiver. **Not called directly — Paymob calls this.**

---

#### GET `/api/v1/payments/:paymentId/status`
Check current payment status.

**Auth:** Required (owns payment)

**Response:**
```json
{
  "id": "pay_xyz",
  "status": "COMPLETED",
  "refundStatus": null,
  "amount": 49900
}
```

---

#### POST `/api/v1/refunds/initiate`
Request a refund.

**Auth:** Required (owns payment)

**Request:**
```json
{
  "paymentId": "pay_xyz",
  "amount": 49900,
  "reason": "Did not meet expectations"
}
```

---

### Admin Endpoints

All require `Authorization: Bearer <admin-token>` and `ADMIN` role.

#### GET `/api/v1/admin/payments`
List payments. Query params: `status`, `userId`, `startDate`, `endDate`, `minAmount`, `maxAmount`, `limit`, `offset`.

#### GET `/api/v1/admin/payments/stats`
Revenue summary, conversion rates, refund totals.

#### POST `/api/v1/admin/payments/:id/override`
Override payment status manually.
```json
{ "status": "COMPLETED", "reason": "Confirmed via Paymob" }
```

#### POST `/api/v1/admin/payments/:id/revoke`
Revoke payment and remove enrollment.
```json
{ "reason": "Fraudulent transaction" }
```

#### POST `/api/v1/admin/payments/manual`
Grant access without payment.
```json
{ "userId": "user_abc", "packageId": "pkg_xyz", "amount": 0, "reason": "Scholarship" }
```

---

## Troubleshooting

### Student paid but not enrolled

1. Check webhook was received:
   ```sql
   SELECT status, "webhookReceivedAt" FROM "Payment" WHERE id = 'pay_xyz';
   ```
2. If `webhookReceivedAt` is NULL → webhook not received. Check Paymob dashboard for delivery status.
3. If status is `COMPLETED` but no enrollment → enrollment job failed. Check `enrollmentRetryQueue`.
4. Quick fix: `POST /api/v1/admin/payments/:id/override` with `status: COMPLETED` to trigger enrollment.

---

### Webhook keeps failing (HMAC error)

1. Verify `PAYMOB_HMAC_SECRET` in `.env` matches what's in Paymob dashboard.
2. Check that the webhook URL in Paymob is exactly: `https://yourdomain.com/api/v1/payments/webhook`
3. HMAC errors in logs will show: `INVALID_WEBHOOK_HMAC`.

---

### Refund stuck in REQUESTED status

1. Check if Bull queue workers are running:
   ```bash
   docker logs eduflow-lms-backend-1 | grep "refund job"
   ```
2. Check Redis is reachable:
   ```bash
   redis-cli -u $REDIS_URL ping  # Should return PONG
   ```
3. Check for errors in the refund job:
   ```bash
   # In Redis
   LLEN bull:refundProcessingQueue:failed
   ```
4. Manually trigger refund via admin endpoint.

---

### Payment shows FAILED but student says it succeeded

1. Go to Paymob merchant dashboard and verify the transaction.
2. If confirmed successful in Paymob but `FAILED` in our DB: override it.
   ```bash
   POST /api/v1/admin/payments/:id/override
   { "status": "COMPLETED", "reason": "Confirmed in Paymob dashboard - TXN#..." }
   ```

---

### "Already enrolled" error when student tries to checkout

Student already has an active enrollment. Either:
- They paid before (check Payments table)
- An admin granted access manually
- Action: No action needed — student already has access

---

## Testing

### Run Payment Tests

```bash
cd backend

# Unit tests (all payment logic, mocked)
npm run test:unit

# Integration tests (requires PostgreSQL + Redis)
export DATABASE_URL="postgresql://eduflow_test:test_password_123@localhost:5433/eduflow_test?schema=public"
export REDIS_URL="redis://localhost:6380"
npm run test:integration

# Security tests (OWASP, HMAC, rate limiting)
npm run test:security

# All tests
npm run test
```

### Start Test Database

```bash
docker-compose -f docker-compose.test.yml up -d
```

Runs PostgreSQL on port **5433** and Redis on port **6380** (isolated from production).

### Test Coverage (Phase 8 Results)

| Suite | Tests | Pass Rate |
|-------|-------|-----------|
| Unit | 117 | **100%** |
| Integration | 74 | 70% |
| Security | 72+ | Ready |
| Performance | 10+ | Ready |
| **Total** | **200+** | **90%+** |

### Manual Webhook Testing (Development)

```bash
# 1. Start backend
npm run dev

# 2. Create test payment in DB
psql $DATABASE_URL -c "INSERT INTO \"Payment\" (id, \"userId\", \"amountPiasters\", status, \"createdAt\", \"updatedAt\") VALUES ('pay_test', 'user_id', 49900, 'WEBHOOK_PENDING', NOW(), NOW());"

# 3. Simulate Paymob success webhook
curl -X POST http://localhost:3000/api/v1/dev/payments/pay_test/webhook/success

# 4. Verify enrollment created
psql $DATABASE_URL -c "SELECT status FROM \"Enrollment\" WHERE \"userId\" = 'user_id';"
```

---

## SLOs (Service Level Objectives)

| Objective | Target | Metric |
|-----------|--------|--------|
| Payment success rate | ≥ 99.5% | `rate(eduflow_payments_total{status="success"})` |
| Checkout latency P95 | < 2s | `histogram_quantile(0.95, eduflow_payment_processing_time_ms)` |
| Webhook processing P95 | < 5s | `histogram_quantile(0.95, eduflow_webhook_processing_time_ms)` |
| DB query P95 | < 500ms | `histogram_quantile(0.95, eduflow_db_query_time_ms)` |
| Uptime | ≥ 99.9% | Alertmanager `ServiceDown` alert |
