# Phase 4: Payment Failure Recovery & Operations Guide

**Last Updated:** April 24, 2026  
**Status:** Phase 4 Complete  
**Purpose:** Operations runbook for managing payment failures, job queues, and recovery procedures

---

## Quick Start

### Health Check
```bash
curl http://localhost:3000/api/v1/health
```

### Queue Status
```bash
curl http://localhost:3000/api/v1/admin/payments/:paymentId/recovery/status \
  -H "Authorization: Bearer <admin-token>"
```

### Emergency Shutdown
```bash
kill -TERM $(lsof -t -i :3000)
```

---

## Architecture Overview

### Job Queues (Bull + Redis)

Three independent Bull queues for asynchronous processing:

1. **Webhook Retry Queue** (`bull:webhook-retry`)
   - Retries failed webhook processing from Paymob
   - Backoff: 5min → 15min → 1hr
   - Max retries: 3

2. **Email Queue** (`bull:email-queue`)
   - Sends transactional emails (receipts, enrollment, refunds)
   - Backoff: Dynamic based on SMTP response
   - Max retries: 5

3. **Failed Payment Recovery Queue** (`bull:failed-payment-recovery`)
   - Processes failed payments and attempts recovery
   - Max retries: 3
   - Requires manual admin intervention after failures

### Database Tables

- **FailedPaymentQueue**: Tracks payments requiring manual recovery
- **EmailQueue**: Email delivery status and retry tracking
- **WebhookRetryQueue**: Webhook processing retries with exponential backoff
- **AdminAuditLog**: Audit trail of all admin recovery actions

---

## Queue Management

### Starting the System

```bash
# 1. Start Redis
redis-server

# 2. Start backend (in another terminal)
npm run dev

# 3. Verify initialization
# Check logs for: "[App] Job queue processors initialized"
```

### Monitoring Queue Health

```bash
# Get queue metrics
curl http://localhost:3000/api/v1/admin/payments/metrics \
  -H "Authorization: Bearer <admin-token>"
```

### Viewing Queued Jobs

```bash
redis-cli

# Webhook retry queue
LRANGE bull:webhook-retry:wait 0 -1

# Email queue
LRANGE bull:email-queue:wait 0 -1

# Failed payment recovery queue
LRANGE bull:failed-payment-recovery:wait 0 -1
```

---

## Recovery Operations

### 1. Manual Payment Override

**Scenario:** Payment stuck in FAILED, customer confirmed payment

```bash
POST /api/v1/admin/payments/:paymentId/recovery/override
{
  "newStatus": "COMPLETED",
  "reason": "Manual override - customer confirmed payment received"
}
```

### 2. Retry Failed Payment

**Scenario:** Paymob API was down, now it's back up

```bash
POST /api/v1/admin/payments/:paymentId/recovery/retry
{
  "reason": "Paymob API recovered, retrying payment processing"
}
```

### 3. Cancel Payment

**Scenario:** Customer requests refund

```bash
POST /api/v1/admin/payments/:paymentId/recovery/cancel
{
  "reason": "Customer requested cancellation",
  "refundInitiatedBy": "support@eduflow.com"
}
```

### 4. View Recovery Status

```bash
GET /api/v1/admin/payments/:paymentId/recovery/status
```

### 5. View Audit Log

```bash
GET /api/v1/admin/payments/:paymentId/recovery/audit-log
```

---

## Debugging Guide

### Enable Debug Logging

```bash
export DEBUG=eduflow:*
npm run dev
```

### Check Job Status in Redis

```bash
redis-cli

# View all jobs
LRANGE bull:webhook-retry:wait 0 -1
LRANGE bull:email-queue:wait 0 -1
LRANGE bull:failed-payment-recovery:wait 0 -1

# View job details
HGETALL bull:webhook-retry:job:1
```

### Query Database for Recovery Info

```sql
-- Find all failed payments pending retry
SELECT id, paymentId, failureType, nextRetry, retryCount
FROM "FailedPaymentQueue"
WHERE resolvedAt IS NULL
ORDER BY nextRetry ASC;

-- Find emails in DLQ
SELECT id, recipient, emailType, lastError
FROM "EmailQueue"
WHERE status IN ('FAILED_PERMANENT', 'DLQ')
ORDER BY createdAt DESC
LIMIT 20;

-- View all admin recovery actions
SELECT a.id, a.action, u.email, a.reason, a.createdAt
FROM "AdminAuditLog" a
JOIN "User" u ON a.adminId = u.id
ORDER BY a.createdAt DESC
LIMIT 50;
```

---

## Common Issues & Solutions

### Issue 1: Payment Stuck in FAILED State

**Solution:**
```bash
# Check Paymob API
curl https://api.paymob.com/api/acceptance/payments/:paymobTransactionId \
  -H "Authorization: Bearer <paymob-key>"

# If Paymob shows successful, override locally
curl -X POST http://localhost:3000/api/v1/admin/payments/:paymentId/recovery/override \
  -H "Authorization: Bearer <admin-token>" \
  -d '{"newStatus": "COMPLETED", "reason": "Verified with Paymob API"}'
```

### Issue 2: Webhook Stuck in Retry Loop

**Solution:**
```bash
# Check webhook error details
SELECT payload, errorDetails FROM "WebhookRetryQueue"
WHERE paymentId = 'pay_123';

# If permanent error, mark as resolved
UPDATE "WebhookRetryQueue"
SET resolution = 'FAILED'
WHERE paymentId = 'pay_123' AND resolvedAt IS NULL;
```

### Issue 3: Emails Not Sending

**Solution:**
```bash
# Check SMTP configuration
echo $SMTP_HOST $SMTP_PORT

# View recent errors
SELECT recipient, emailType, lastError
FROM "EmailQueue"
WHERE status IN ('FAILED_PERMANENT', 'BOUNCED')
ORDER BY lastAttempt DESC
LIMIT 5;
```

---

## Edge Cases

1. **Concurrent Checkout:** Only one active checkout per user (30-minute window)
2. **Duplicate Webhook:** Idempotency key prevents duplicate processing
3. **Late Webhook:** Processed but marked with flag for manual review
4. **Amount Mismatch:** Reconciliation detects and alerts finance team
5. **Admin Override During Retry:** Override is priority, retries cancelled
6. **Partial Refund:** Enrollment stays active, refund amount tracked
7. **Refund After Completion:** Allowed within 7-day window per policy
8. **Enrollment Already Exists:** Unique constraint prevents duplicates

---

## Monitoring & Alerts

### Prometheus Metrics

```
bull_queue_job_count{queue="webhook-retry"}
bull_queue_job_count{queue="email-queue"}
bull_queue_job_count{queue="failed-payment-recovery"}
bull_queue_job_duration_seconds{queue="..."}
bull_queue_job_errors_total{queue="..."}
```

### Alert Rules

- Webhook retries stuck >1 hour: Check Paymob API status
- Email DLQ growing: Check SMTP configuration
- Payment recovery failing: Check database connectivity

---

**Phase 4 provides:**
✅ Three job queues with exponential backoff retry  
✅ Complete audit trail for admin actions  
✅ Graceful shutdown handling  
✅ Comprehensive error handling and recovery  
✅ Admin recovery API endpoints

**Next Phase:** Phase 5 (Refund Handling) builds on this infrastructure

---

Contact: support@eduflow.com
