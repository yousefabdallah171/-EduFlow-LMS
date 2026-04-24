# Refund Handling: Debugging Guide

**Last Updated:** April 24, 2026  
**Purpose:** Operations guide for troubleshooting refund processing  
**Scope:** Full/partial refunds, Paymob integration, webhook handling, retry logic

---

## Quick Start

### Check Refund Status
```bash
curl -X GET http://localhost:3000/api/v1/refunds/:paymentId/status \
  -H "Authorization: Bearer <token>"
```

### Initiate Refund (User)
```bash
curl -X POST http://localhost:3000/api/v1/refunds/initiate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "pay_123",
    "amount": 5000,
    "reason": "Partial refund"
  }'
```

### Admin Initiate Refund
```bash
curl -X POST http://localhost:3000/api/v1/admin/refunds/initiate \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "paymentId": "pay_123",
    "amount": 10000,
    "reason": "Customer request"
  }'
```

---

## Refund Flow Overview

```
User/Admin initiates refund
    ↓
refundService.initiateRefund()
    ↓
Validate payment & amount
    ↓
Update Payment status → REFUND_REQUESTED
    ↓
Queue refund job (Bull queue)
    ↓
Job processor starts
    ↓
Call refundService.processPaymobRefund()
    ↓
Call Paymob refund API
    ↓
Wait for webhook from Paymob
    ↓
Webhook received
    ↓
webhookController.paymobRefund()
    ↓
Complete or fail refund
    ↓
Revoke enrollment (if full refund)
```

---

## Common Issues & Solutions

### Issue 1: Refund Stuck in REQUESTED Status

**Symptom:** Refund stays in REQUESTED status indefinitely, never moves to PROCESSING

**Root Causes:**
1. Refund queue processor not initialized
2. Redis connection down
3. Job queue error

**Debug Steps:**
```bash
# Check logs for processor initialization
grep "setupRefundProcessor" backend/logs/*.log

# Verify Redis connection
redis-cli ping
# Expected: PONG

# Check refund queue status
redis-cli LRANGE bull:refund-queue:wait 0 -1

# Check if jobs exist but not processing
redis-cli HGETALL bull:refund-queue:job:1
```

**Solution:**
```bash
# 1. Ensure setupRefundProcessor() called in app.ts
grep "setupRefundProcessor" backend/src/app.ts

# 2. Restart app if needed
npm run dev

# 3. Manually re-queue if stuck
curl -X POST http://localhost:3000/api/v1/admin/refunds/:paymentId/retry \
  -H "Authorization: Bearer <admin-token>"
```

---

### Issue 2: Refund Failed with Paymob Error

**Symptom:** Refund status shows FAILED, payment shows error message

**Root Causes:**
1. Paymob API returned error (invalid transaction, insufficient funds, etc.)
2. Network timeout
3. Invalid refund parameters

**Debug Steps:**
```bash
# Check error details in database
SELECT 
  id, paymentId, refundStatus, refundAmount,
  status, errorMessage, errorDetails
FROM "Payment"
WHERE id = 'pay_123';

# Check refund queue entry
SELECT id, paymentId, resolution, errorDetails, retryCount
FROM "RefundQueue"
WHERE paymentId = 'pay_123';

# Check payment event log
SELECT eventType, errorMessage, metadata
FROM "PaymentEvent"
WHERE paymentId = 'pay_123'
AND eventType LIKE '%REFUND%'
ORDER BY createdAt DESC;
```

**Common Error Codes:**
- `INSUFFICIENT_FUNDS` - Paymob account doesn't have funds
- `INVALID_TRANSACTION` - Transaction not found in Paymob
- `TIMEOUT` - API call timed out (will retry)
- `API_ERROR` - Generic Paymob API error
- `ENROLLMENT_REVOCATION_FAILED` - Failed to revoke enrollment

**Solutions:**
```bash
# For temporary errors (TIMEOUT), manually retry
curl -X POST http://localhost:3000/api/v1/admin/refunds/:paymentId/retry \
  -H "Authorization: Bearer <admin-token>" \
  -d '{"reason": "Manual retry after API recovered"}'

# For permanent errors, contact Paymob support
# Document error in AdminAuditLog
curl -X POST http://localhost:3000/api/v1/admin/refunds/initiate \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "paymentId": "pay_123",
    "reason": "Override after Paymob investigation"
  }'
```

---

### Issue 3: Webhook Never Received from Paymob

**Symptom:** Refund shows PROCESSING status indefinitely, no webhook update

**Root Causes:**
1. Webhook endpoint not accessible to Paymob
2. Paymob configuration wrong
3. Firewall blocking Paymob IPs
4. Webhook payload parsing error

**Debug Steps:**
```bash
# Check webhook endpoint is accessible
curl -X POST http://localhost:3000/api/v1/webhooks/paymob/refund \
  -H "Content-Type: application/json" \
  -d '{"type": "refund.succeeded", "data": {"id": 123, "success": true}}'
# Expected: 200 OK with {"received": true}

# Check webhook logs
grep "paymobRefund\|webhook" backend/logs/*.log

# Verify Paymob webhook configuration
# (Check Paymob dashboard for webhook URL and test button)

# Check if webhooks are being queued but not processed
SELECT id, paymentId, firstAttempt, lastAttempt, retryCount
FROM "WebhookRetryQueue"
WHERE paymentId = 'pay_123'
ORDER BY createdAt DESC;
```

**Solutions:**
```bash
# 1. Verify webhook endpoint URL is correct in Paymob dashboard
# Settings → Webhooks → Check refund webhook URL

# 2. If webhook never arrives, manually complete refund
curl -X POST http://localhost:3000/api/v1/admin/refunds/:paymentId/override \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "newStatus": "COMPLETED",
    "reason": "Manual completion - webhook timeout"
  }'

# 3. Check firewall allows Paymob IPs
# Paymob IPs should be whitelisted
```

---

### Issue 4: Enrollment Not Revoked After Full Refund

**Symptom:** Refund completed successfully but enrollment still ACTIVE

**Root Causes:**
1. Partial refund (enrollment should stay active)
2. Enrollment revocation failed
3. Database update failed silently

**Debug Steps:**
```bash
# Check if refund was actually FULL
SELECT id, refundAmount, amountPiasters,
  CASE WHEN refundAmount = amountPiasters THEN 'FULL' ELSE 'PARTIAL' END as type
FROM "Payment"
WHERE id = 'pay_123';

# Check enrollment status
SELECT id, status, revokedAt, revokedById
FROM "Enrollment"
WHERE paymentId = 'pay_123';

# Check events
SELECT eventType, metadata
FROM "PaymentEvent"
WHERE paymentId = 'pay_123'
AND eventType LIKE '%REVOK%'
ORDER BY createdAt DESC;
```

**Solutions:**
```bash
# If enrollment should be revoked but isn't:
# Update enrollment manually
UPDATE "Enrollment"
SET status = 'REVOKED', revokedAt = NOW()
WHERE paymentId = 'pay_123'
AND status = 'ACTIVE';

# Log the manual action
INSERT INTO "AdminAuditLog" (adminId, action, paymentId, reason, createdAt)
VALUES ('admin_id', 'REVOKE_ENROLLMENT', 'pay_123', 'Manual fix - refund revocation failed', NOW());
```

---

### Issue 5: Duplicate Refund Prevention Not Working

**Symptom:** System allows multiple refunds for same payment when it shouldn't

**Root Causes:**
1. Duplicate check not running
2. Race condition in concurrent requests
3. Database constraint not applied

**Debug Steps:**
```bash
# Check for duplicate refunds
SELECT COUNT(*) as count, paymentId
FROM "RefundQueue"
GROUP BY paymentId
HAVING COUNT(*) > 1;

# Check Payment table for duplicate refund status
SELECT id, refundStatus, refundAmount
FROM "Payment"
WHERE refundStatus IN ('REQUESTED', 'PROCESSING', 'COMPLETED');

# Check if UNIQUE constraint exists
SELECT constraint_name
FROM information_schema.table_constraints
WHERE table_name = 'RefundQueue'
AND constraint_type = 'UNIQUE';
```

**Solutions:**
```bash
# Verify UNIQUE constraint on RefundQueue
-- Should see: "RefundQueue_paymentId_key"

# For existing duplicates, mark older ones as cancelled
UPDATE "RefundQueue"
SET resolution = 'CANCELLED'
WHERE paymentId = 'pay_123'
AND createdAt < (
  SELECT MAX(createdAt)
  FROM "RefundQueue"
  WHERE paymentId = 'pay_123'
);
```

---

## Edge Cases & Handling

### Edge Case 1: Partial Refund > Remaining Balance

**Scenario:** Payment = 10,000, already refunded 7,000, user requests 5,000 more

**Expected:** Should fail with REFUND_INVALID_AMOUNT

```bash
# Test
curl -X POST http://localhost:3000/api/v1/refunds/initiate \
  -H "Authorization: Bearer <token>" \
  -d '{"paymentId": "pay_123", "amount": 5000}'

# Should return 400
# "Refund amount must be between 1 and 3000"
```

---

### Edge Case 2: Refund After Enrollment Expires

**Scenario:** Course expires but refund still requested

**Expected:** Should allow refund regardless of enrollment status

```sql
-- Check enrollment expiration
SELECT enrollmentId, status, expiresAt
FROM "Enrollment"
WHERE paymentId = 'pay_123'
AND NOW() > expiresAt;
```

---

### Edge Case 3: Webhook Arrives Out of Order

**Scenario:** Partial refund webhook arrives before full refund completes

**Expected:** System should handle gracefully with idempotent processing

```bash
# Verify idempotency key
SELECT paymobRefundId, COUNT(*)
FROM "RefundQueue"
WHERE paymobRefundId IS NOT NULL
GROUP BY paymobRefundId
HAVING COUNT(*) > 1;
# Should be 0 (no duplicates)
```

---

### Edge Case 4: Concurrent Refund Requests

**Scenario:** Two refund requests for same payment simultaneously

**Expected:** First succeeds, second fails with "already refunded"

```bash
# Simulate with parallel requests
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/v1/refunds/initiate \
    -H "Authorization: Bearer <token>" \
    -d '{"paymentId": "pay_123"}' &
done

# Check results - only one should succeed
```

---

## Queue Management

### View Refund Queue Status

```bash
redis-cli

# Check queue sizes
LLEN bull:refund-queue:wait      # Jobs waiting
LLEN bull:refund-queue:active    # Jobs processing
LLEN bull:refund-queue:completed # Completed
LLEN bull:refund-queue:failed    # Failed

# View specific job
HGETALL bull:refund-queue:job:1
```

### Pause/Resume Refund Queue

```bash
redis-cli

# Pause (stop processing, keep jobs)
HSET pause-queues refund-queue 1

# Resume
HDEL pause-queues refund-queue
```

### Clear Completed Jobs

```bash
redis-cli

# Keep last 100 completed jobs, remove older
LTRIM bull:refund-queue:completed 0 99

# Or clear all
DEL bull:refund-queue:completed
```

---

## Monitoring & Alerts

### Metrics to Watch

```sql
-- Refund processing time
SELECT 
  paymentId,
  EXTRACT(EPOCH FROM (refundCompletedAt - refundInitiatedAt)) as duration_seconds
FROM "Payment"
WHERE refundStatus = 'COMPLETED'
AND refundInitiatedAt > NOW() - INTERVAL '24 hours'
ORDER BY duration_seconds DESC;

-- Failed refunds
SELECT COUNT(*) as failed_count
FROM "RefundQueue"
WHERE resolution = 'FAILED'
AND createdAt > NOW() - INTERVAL '24 hours';

-- Stuck refunds (in PROCESSING > 1 hour)
SELECT paymentId, refundStatus, refundInitiatedAt
FROM "Payment"
WHERE refundStatus = 'PROCESSING'
AND refundInitiatedAt < NOW() - INTERVAL '1 hour';
```

### Alert Conditions

1. **Refund failure rate > 5%**
   - Check Paymob API status
   - Check account balance
   - Review error logs

2. **Refund processing time > 5 minutes**
   - Check webhook delivery
   - Check job queue status
   - Check database connectivity

3. **Enrollment revocation failures**
   - Check enrollment service logs
   - Manually revoke affected enrollments
   - Create ticket with engineering team

---

## Testing Refunds Locally

### Setup Test Environment

```bash
# Start all services
redis-server                    # Terminal 1
npm run dev                     # Terminal 2

# Create test payment
curl -X POST http://localhost:3000/api/v1/checkout \
  -H "Authorization: Bearer <token>" \
  -d '{"packageId": "pkg_1"}'
# Response: {"paymentId": "pay_123"}

# Complete payment via webhook (simulate)
curl -X POST http://localhost:3000/api/v1/webhooks/paymob \
  -H "Content-Type: application/json" \
  -d '{
    "type": "charge.success",
    "data": {
      "order": {"id": "order_123"},
      "transaction": {"id": "tx_123"},
      "success": true
    }
  }'
```

### Test Refund Flow

```bash
# 1. Initiate refund
curl -X POST http://localhost:3000/api/v1/refunds/initiate \
  -H "Authorization: Bearer <token>" \
  -d '{"paymentId": "pay_123", "reason": "Test refund"}'

# 2. Check status (should be REQUESTED)
curl http://localhost:3000/api/v1/refunds/pay_123/status \
  -H "Authorization: Bearer <token>"

# 3. Simulate Paymob webhook
curl -X POST http://localhost:3000/api/v1/webhooks/paymob/refund \
  -d '{
    "type": "refund.succeeded",
    "data": {"id": "refund_123", "success": true}
  }'

# 4. Check status again (should be COMPLETED)
curl http://localhost:3000/api/v1/refunds/pay_123/status \
  -H "Authorization: Bearer <token>"
```

---

## Database Queries for Troubleshooting

```sql
-- All refunds for a user
SELECT p.id, p.refundStatus, p.refundAmount, p.refundInitiatedAt
FROM "Payment" p
WHERE p.userId = 'user_123'
AND p.refundStatus IS NOT NULL;

-- Refunds by status
SELECT refundStatus, COUNT(*) as count
FROM "Payment"
WHERE refundInitiatedAt > NOW() - INTERVAL '7 days'
GROUP BY refundStatus;

-- Failed refunds with errors
SELECT id, paymentId, resolution, errorDetails, retryCount
FROM "RefundQueue"
WHERE resolution = 'FAILED'
ORDER BY createdAt DESC
LIMIT 20;

-- Admin refund actions
SELECT a.id, u.email, a.action, a.paymentId, a.reason, a.createdAt
FROM "AdminAuditLog" a
JOIN "User" u ON a.adminId = u.id
WHERE a.action LIKE '%REFUND%'
ORDER BY a.createdAt DESC
LIMIT 50;
```

---

## Troubleshooting Checklist

- [ ] Is refund processor initialized? `grep setupRefundProcessor app.ts`
- [ ] Is Redis running? `redis-cli ping`
- [ ] Is refund queue getting jobs? `redis-cli LLEN bull:refund-queue:wait`
- [ ] Are webhooks being received? Check logs for `paymobRefund`
- [ ] Is enrollment being revoked? Query enrollment status
- [ ] Are error details logged? Check Payment.errorDetails
- [ ] Is admin audit log updated? Query AdminAuditLog
- [ ] Are tests passing? `npm test`

---

**For assistance:** Contact support@eduflow.com or check logs in `backend/logs/`
