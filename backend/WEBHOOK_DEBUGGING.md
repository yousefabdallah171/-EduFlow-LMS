# Webhook Debugging Guide

This guide provides step-by-step instructions for debugging webhook processing in the EduFlow LMS payment system.

## Quick Start: Simulate a Webhook

### Development Only
Debug endpoints are only available when `NODE_ENV=development`.

### Successful Webhook
```bash
curl -X POST http://localhost:3001/api/v1/dev/payments/payment_xxx/webhook/success \
  -H "Content-Type: application/json"
```

### Failed Webhook
```bash
curl -X POST http://localhost:3001/api/v1/dev/payments/payment_xxx/webhook/failure \
  -H "Content-Type: application/json"
```

Replace `payment_xxx` with an actual payment ID from your database.

---

## Manual Testing Workflow

### 1. Create a Test Payment

Start the backend server:
```bash
cd backend
npm run dev
```

Create a user and payment in the database manually, or use your existing test user:
```sql
-- Get a user ID
SELECT id, email FROM "User" LIMIT 1;

-- Create a test payment (replace user_id)
INSERT INTO "Payment" (id, "userId", "amountPiasters", currency, status, "createdAt", "updatedAt")
VALUES ('payment_test_123', 'user_id_here', 49900, 'EGP', 'WEBHOOK_PENDING', NOW(), NOW());
```

### 2. Trigger Webhook Simulation

Use the development endpoint to simulate webhook:
```bash
curl -X POST http://localhost:3001/api/v1/dev/payments/payment_test_123/webhook/success \
  -H "Content-Type: application/json"
```

Expected response:
```json
{
  "success": true,
  "message": "Webhook simulated successfully",
  "payment": {
    "id": "payment_test_123",
    "status": "COMPLETED",
    "paymobTransactionId": "1234567890",
    "webhookReceivedAt": "2026-04-24T12:00:00.000Z"
  }
}
```

### 3. Verify Database State

Check payment status updated correctly:
```sql
SELECT id, status, "paymobTransactionId", "webhookReceivedAt", "webhookHmac"
FROM "Payment"
WHERE id = 'payment_test_123';
```

Expected output:
```
id                 | payment_test_123
status             | COMPLETED
paymobTransactionId | 1234567890 (unix timestamp)
webhookReceivedAt  | 2026-04-24 12:00:00.000
webhookHmac        | (valid hmac hash)
```

Check enrollment created:
```sql
SELECT id, "enrollmentType", status, "userId"
FROM "Enrollment"
WHERE "userId" = 'user_id_here'
ORDER BY "createdAt" DESC LIMIT 1;
```

Expected output:
```
id              | (uuid)
enrollmentType  | PAID
status          | ACTIVE
userId          | user_id_here
```

Check payment events logged:
```sql
SELECT "eventType", "status", message, "createdAt"
FROM "PaymentEvent"
WHERE "paymentId" = 'payment_test_123'
ORDER BY "createdAt" ASC;
```

Expected events sequence:
```
eventType          | WEBHOOK_RECEIVED
eventType          | WEBHOOK_VERIFIED
eventType          | STATUS_CHANGED
eventType          | ENROLLMENT_TRIGGERED
eventType          | ENROLLMENT_SUCCEEDED
eventType          | EMAIL_QUEUED (payment receipt)
eventType          | EMAIL_QUEUED (enrollment activated)
eventType          | CACHE_INVALIDATED
```

---

## Logging Verification Checklist

### Success Path Logging
When a webhook is processed successfully, you should see:

1. ✅ **WEBHOOK_RECEIVED** - Webhook payload received and validated
   ```
   [timestamp] INFO: WEBHOOK_RECEIVED paymentId=payment_xxx transactionId=123456789
   ```

2. ✅ **WEBHOOK_VERIFIED** - HMAC signature validated
   ```
   [timestamp] INFO: WEBHOOK_VERIFIED paymentId=payment_xxx hmac=valid
   ```

3. ✅ **STATUS_CHANGED** - Payment status transitioned
   ```
   [timestamp] INFO: STATUS_CHANGED paymentId=payment_xxx from=WEBHOOK_PENDING to=COMPLETED
   ```

4. ✅ **ENROLLMENT_TRIGGERED** - Enrollment service called
   ```
   [timestamp] INFO: ENROLLMENT_TRIGGERED paymentId=payment_xxx userId=user_xxx
   ```

5. ✅ **ENROLLMENT_SUCCEEDED** - Enrollment created successfully
   ```
   [timestamp] INFO: ENROLLMENT_SUCCEEDED enrollmentId=enr_xxx userId=user_xxx
   ```

6. ✅ **EMAIL_QUEUED** - Emails queued for sending (2 emails)
   ```
   [timestamp] INFO: EMAIL_QUEUED type=PAYMENT_RECEIPT email=student@example.com
   [timestamp] INFO: EMAIL_QUEUED type=ENROLLMENT_ACTIVATED email=student@example.com
   ```

7. ✅ **CACHE_INVALIDATED** - Cache cleared
   ```
   [timestamp] INFO: CACHE_INVALIDATED keys=paymentHistory:user_xxx,enrollment:user_xxx
   ```

### Failure Path Logging
When a failed webhook is processed:

1. ✅ **WEBHOOK_RECEIVED** - Webhook payload received
2. ✅ **WEBHOOK_VERIFIED** - HMAC signature validated
3. ✅ **STATUS_CHANGED** - Payment status set to FAILED
4. ❌ **NO ENROLLMENT** - Enrollment NOT created
5. ❌ **NO EMAILS** - Emails NOT queued

### Error Path Logging
When errors occur:

**Invalid payload:**
```
[timestamp] ERROR: INVALID_WEBHOOK_PAYLOAD code=INVALID_WEBHOOK_PAYLOAD status=400 message="Webhook payload is missing transaction details"
```

**Payment not found:**
```
[timestamp] ERROR: PAYMENT_NOT_FOUND code=PAYMENT_NOT_FOUND status=404 message="Payment record not found"
```

**Duplicate webhook:**
```
[timestamp] INFO: WEBHOOK_DEDUPLICATED paymentId=payment_xxx transactionId=123456789 message="Already processed, returning existing payment"
```

---

## Common Debugging Scenarios

### Scenario 1: Webhook Processed but Enrollment Not Created
**Symptoms:** Payment status is COMPLETED, but no enrollment record exists

**Debugging Steps:**
1. Check payment events for ENROLLMENT_FAILED:
   ```sql
   SELECT * FROM "PaymentEvent" WHERE "paymentId" = 'payment_xxx' AND "eventType" = 'ENROLLMENT_FAILED';
   ```

2. Check application logs for enrollment service errors:
   ```bash
   tail -f logs/error.log | grep "ENROLLMENT"
   ```

3. Verify user exists:
   ```sql
   SELECT id FROM "User" WHERE id = 'user_xxx';
   ```

4. Check if user already enrolled:
   ```sql
   SELECT * FROM "Enrollment" WHERE "userId" = 'user_xxx';
   ```

**Resolution:**
- If user not found: verify payment.userId is correct
- If already enrolled: intended behavior (prevent duplicates)
- If enrollment error in logs: check enrollment service for validation errors

---

### Scenario 2: Webhook Processed but Emails Not Sent
**Symptoms:** Payment status is COMPLETED, but no emails received

**Debugging Steps:**
1. Check payment events for email status:
   ```sql
   SELECT * FROM "PaymentEvent" WHERE "paymentId" = 'payment_xxx' AND "eventType" LIKE 'EMAIL%';
   ```

2. Check application logs for email errors:
   ```bash
   tail -f logs/error.log | grep -i "email"
   ```

3. Verify email configuration in .env:
   ```bash
   grep -i "mail\|email\|smtp" .env
   ```

**Resolution:**
- If EMAIL_FAILED events exist: check email service configuration
- If no email events: webhook processing completed but email step was skipped
- If email errors in logs: verify SMTP credentials and network connectivity

---

### Scenario 3: Duplicate Webhook (Same Transaction ID)
**Symptoms:** Webhook processed twice, but only one payment/enrollment created

**Debugging Steps:**
1. Check for existing payment with paymobTransactionId:
   ```sql
   SELECT * FROM "Payment" WHERE "paymobTransactionId" = '123456789';
   ```

2. Check payment events for webhook handling:
   ```sql
   SELECT * FROM "PaymentEvent" WHERE "paymentId" = 'payment_xxx' ORDER BY "createdAt" DESC;
   ```

**Expected Behavior:**
- First webhook: Creates payment, enrollment, sends emails
- Second webhook: Returns same payment, no duplicate enrollment
- Payment events show: WEBHOOK_DEDUPLICATED on second attempt

**Verification:**
```sql
-- Count enrollments (should be 1)
SELECT COUNT(*) FROM "Enrollment" WHERE "paymentId" = 'payment_xxx';

-- Verify both webhooks in events
SELECT DISTINCT "eventType" FROM "PaymentEvent" WHERE "paymentId" = 'payment_xxx';
```

---

### Scenario 4: Webhook with Coupon
**Symptoms:** Payment completed with coupon, but discount not recorded

**Debugging Steps:**
1. Check payment has coupon:
   ```sql
   SELECT "couponId", "amountPiasters" FROM "Payment" WHERE id = 'payment_xxx';
   ```

2. Check coupon uses incremented:
   ```sql
   SELECT code, "currentUses", "maxUses" FROM "Coupon" WHERE id = 'coupon_xxx';
   ```

3. Check coupon cache invalidation:
   ```bash
   tail -f logs/combined.log | grep "COUPON.*INVALIDATE"
   ```

**Expected Behavior:**
- Payment.couponId populated
- Coupon.currentUses incremented by 1
- Cache invalidation event logged

---

## Database Query Cheat Sheet

### Get Payment Status
```sql
SELECT id, status, "paymobTransactionId", "webhookReceivedAt"
FROM "Payment"
WHERE id = 'payment_xxx';
```

### Get All Payment Events
```sql
SELECT "eventType", "status", message, "createdAt"
FROM "PaymentEvent"
WHERE "paymentId" = 'payment_xxx'
ORDER BY "createdAt" ASC;
```

### Get Enrollment
```sql
SELECT id, "enrollmentType", status, "createdAt"
FROM "Enrollment"
WHERE "paymentId" = 'payment_xxx';
```

### Get Coupon Usage
```sql
SELECT code, "currentUses", "maxUses", "validUntil"
FROM "Coupon"
WHERE id = 'coupon_xxx';
```

### Get User Payments
```sql
SELECT id, status, "amountPiasters", "createdAt"
FROM "Payment"
WHERE "userId" = 'user_xxx'
ORDER BY "createdAt" DESC;
```

### Get Failed Payments
```sql
SELECT id, status, "errorCode", "errorMessage", "createdAt"
FROM "Payment"
WHERE status = 'FAILED' AND "userId" = 'user_xxx'
ORDER BY "createdAt" DESC;
```

### Clean Up Test Data
```sql
-- Delete test payment and related records
DELETE FROM "PaymentEvent" WHERE "paymentId" = 'payment_test_123';
DELETE FROM "Enrollment" WHERE "paymentId" = 'payment_test_123';
DELETE FROM "Payment" WHERE id = 'payment_test_123';
```

---

## Troubleshooting Tips

### 1. Enable Debug Logging
Set `LOG_LEVEL=debug` in `.env` to see detailed logs:
```bash
echo "LOG_LEVEL=debug" >> .env
npm run dev
```

### 2. Check HMAC Secret
Ensure webhook HMAC secret matches in `.env`:
```bash
grep PAYMOB_WEBHOOK_SECRET .env
```

### 3. Verify Webhook Endpoint
Test that webhook endpoint is accessible:
```bash
curl http://localhost:3001/health
```

### 4. Check Payment Status Transitions
Valid transitions:
- INITIATED → AWAITING_PAYMENT → WEBHOOK_PENDING → COMPLETED/FAILED
- WEBHOOK_PENDING → COMPLETED (on successful webhook)
- WEBHOOK_PENDING → FAILED (on failed webhook)

### 5. Test Concurrency
Multiple webhooks for same payment should be deduplicated:
```bash
# Send same webhook twice quickly
curl -X POST http://localhost:3001/api/v1/dev/payments/payment_test_123/webhook/success &
curl -X POST http://localhost:3001/api/v1/dev/payments/payment_test_123/webhook/success
```

Both should return same payment ID with COMPLETED status.

---

## Integration Test Execution

Run webhook tests locally:

```bash
# Unit tests only
cd backend
npm test -- tests/unit/webhook.service.test.ts

# Integration tests (requires PostgreSQL)
npm test -- tests/integration/webhook.integration.test.ts

# All tests
npm test

# Watch mode for development
npm test -- --watch tests/unit/webhook.service.test.ts
```

---

## Production Considerations

### Security
- Debug endpoints (POST /api/v1/dev/*) disabled in production
- HMAC signature always validated
- Rate limiting applied to webhook endpoint
- Webhook secret from environment variables

### Monitoring
- All webhook events logged with PaymentEvent records
- Payment status transitions auditable
- Email failures logged but don't block processing
- Enrollment failures create error events

### Reliability
- Idempotent webhook handling (duplicate detection)
- Database transactions ensure consistency
- Email errors don't block payment completion
- Enrollment errors logged but don't prevent payment success

---

## Support

For issues with webhook processing:

1. Check logs: `tail -f logs/combined.log | grep "payment_id"`
2. Verify database state using queries above
3. Run unit tests to isolate payment service issues
4. Run integration tests to test full flow
5. Check debug endpoints for webhook simulation

For Paymob-specific issues:
- Verify API credentials in `.env`
- Check webhook URL configured in Paymob dashboard
- Ensure HMAC secret matches Paymob configuration
- Contact Paymob support for transaction details
