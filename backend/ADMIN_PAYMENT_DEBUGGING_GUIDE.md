# Admin Payment Management: Debugging Guide

**Last Updated:** April 24, 2026  
**Purpose:** Operations guide for troubleshooting admin payment operations  
**Scope:** Payment listing, search, creation, override, revocation

---

## Quick Start

### List All Payments
```bash
curl -X GET http://localhost:3000/api/v1/admin/payments \
  -H "Authorization: Bearer <admin-token>"

# With filters
curl -X GET "http://localhost:3000/api/v1/admin/payments?status=COMPLETED&limit=20&offset=0" \
  -H "Authorization: Bearer <admin-token>"
```

### Search Payments
```bash
curl -X GET "http://localhost:3000/api/v1/admin/payments/search?query=user@email.com" \
  -H "Authorization: Bearer <admin-token>"
```

### Get Payment Detail
```bash
curl -X GET http://localhost:3000/api/v1/admin/payments/pay_123 \
  -H "Authorization: Bearer <admin-token>"
```

### Get Payment Statistics
```bash
curl -X GET http://localhost:3000/api/v1/admin/payments/stats \
  -H "Authorization: Bearer <admin-token>"

# With date range
curl -X GET "http://localhost:3000/api/v1/admin/payments/stats?startDate=2026-04-01T00:00:00Z&endDate=2026-04-30T23:59:59Z" \
  -H "Authorization: Bearer <admin-token>"
```

### Create Manual Payment
```bash
curl -X POST http://localhost:3000/api/v1/admin/payments/manual \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "packageId": "pkg_1",
    "amount": 10000,
    "reason": "Enrollment issue - admin override",
    "adminNotes": "Customer complained about payment failure"
  }'
```

### Override Payment Status
```bash
curl -X POST http://localhost:3000/api/v1/admin/payments/pay_123/override \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "newStatus": "COMPLETED",
    "reason": "Paymob API confirmed transaction",
    "adminNotes": "Manual verification completed"
  }'
```

### Revoke Payment
```bash
curl -X POST http://localhost:3000/api/v1/admin/payments/pay_123/revoke \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "User requested refund - duplicate charge"
  }'
```

---

## Admin Payment Flow Overview

```
Admin User Initiates Operation
    ↓
    ├─→ List/Search/Filter Payments
    │   ├─→ adminPaymentService.listPayments()
    │   ├─→ adminPaymentService.searchPayments()
    │   └─→ Response: Payment list with pagination
    │
    ├─→ Create Manual Payment
    │   ├─→ Validate user exists
    │   ├─→ Validate package exists
    │   ├─→ Check for duplicate enrollment
    │   ├─→ Create Payment record (COMPLETED)
    │   ├─→ Create PaymentEvent (audit)
    │   ├─→ Call enrollmentService.enroll()
    │   ├─→ Send confirmation email
    │   ├─→ Create AdminAuditLog
    │   └─→ Response: Payment created + enrollment active
    │
    ├─→ Override Payment Status
    │   ├─→ Validate payment exists
    │   ├─→ Validate new status
    │   ├─→ Update Payment.status
    │   ├─→ Create PaymentEvent
    │   ├─→ If COMPLETED: trigger enrollment
    │   ├─→ If REFUND: revoke enrollment
    │   ├─→ Send status change email
    │   ├─→ Create AdminAuditLog
    │   └─→ Response: Payment updated
    │
    └─→ Revoke Payment
        ├─→ Validate payment exists
        ├─→ Set Payment.status = FAILED
        ├─→ Revoke enrollment
        ├─→ Create PaymentEvent
        ├─→ Send revocation email
        ├─→ Create AdminAuditLog
        └─→ Response: Payment revoked + enrollment inactive
```

---

## Common Issues & Solutions

### Issue 1: Manual Payment Creation Failed

**Symptom:** POST /admin/payments/manual returns error

**Root Causes:**
1. User ID doesn't exist
2. Package ID doesn't exist  
3. User already has active enrollment
4. Invalid amount (< 100 piasters)
5. Missing required fields

**Debug Steps:**
```bash
# Check if user exists
SELECT id, email, name FROM "User" WHERE id = 'user_123';

# Check if package exists
SELECT id, title, priceEgp FROM "CoursePackage" WHERE id = 'pkg_1';

# Check for existing enrollment
SELECT id, status, enrolledAt FROM "Enrollment" WHERE userId = 'user_123';

# Check admin audit log for errors
SELECT adminId, action, paymentId, reason, createdAt 
FROM "AdminAuditLog"
WHERE action = 'CREATE_MANUAL_PAYMENT'
ORDER BY createdAt DESC LIMIT 10;
```

**Error Codes & Solutions:**

| Error Code | Message | Solution |
|-----------|---------|----------|
| `USER_NOT_FOUND` | "User X not found" | Verify user ID exists in User table |
| `PACKAGE_NOT_FOUND` | "Package X not found" | Verify package ID exists in CoursePackage table |
| `ALREADY_ENROLLED` | "User already enrolled" | Check Enrollment table - must be REVOKED or not exist |
| `INVALID_AMOUNT` | "Amount must be >= 100" | Provide amount in piasters >= 100 |
| `VALIDATION_ERROR` | Field validation failed | Check request body format and required fields |

**Solutions:**
```bash
# 1. Verify user exists first
curl http://localhost:3000/api/v1/admin/students/user_123 \
  -H "Authorization: Bearer <admin-token>"

# 2. If user missing, create via admin UI first

# 3. If package missing, check available packages
SELECT id, title FROM "CoursePackage" WHERE status = 'ACTIVE';

# 4. If duplicate enrollment, revoke first
UPDATE "Enrollment" 
SET status = 'REVOKED', revokedAt = NOW()
WHERE userId = 'user_123' AND status = 'ACTIVE';

# 5. Try manual payment creation again
curl -X POST http://localhost:3000/api/v1/admin/payments/manual \
  -H "Authorization: Bearer <admin-token>" \
  -d '{...}'
```

---

### Issue 2: Payment Override Failed

**Symptom:** POST /admin/payments/:paymentId/override returns error

**Root Causes:**
1. Payment ID doesn't exist
2. Invalid status enum value
3. Reason too short (< 5 chars)
4. Enrollment trigger failed on COMPLETED
5. Database update failed

**Debug Steps:**
```bash
# Check if payment exists
SELECT id, status, userId, amountPiasters FROM "Payment" WHERE id = 'pay_123';

# Check enrollment status
SELECT id, status, userId FROM "Enrollment" WHERE paymentId = 'pay_123';

# Check payment events for errors
SELECT eventType, status, metadata, createdAt 
FROM "PaymentEvent" 
WHERE paymentId = 'pay_123'
ORDER BY createdAt DESC;

# Check admin audit log
SELECT adminId, action, paymentId, reason, metadata 
FROM "AdminAuditLog"
WHERE action = 'OVERRIDE_PAYMENT_STATUS'
AND paymentId = 'pay_123'
ORDER BY createdAt DESC;
```

**Error Codes & Solutions:**

| Error Code | Message | Solution |
|-----------|---------|----------|
| `PAYMENT_NOT_FOUND` | "Payment not found" | Verify payment ID in Payment table |
| `INVALID_STATUS` | "Invalid status enum" | Use only: PENDING, COMPLETED, FAILED, WEBHOOK_PENDING, REFUND_REQUESTED, REFUNDED |
| `INVALID_REASON` | "Reason must be 5-500 chars" | Provide reason string between 5-500 characters |
| `ENROLLMENT_TRIGGER_FAILED` | "Failed to trigger enrollment" | Check enrollmentService - user may be locked out |
| `ENROLLMENT_REVOCATION_FAILED` | "Failed to revoke enrollment" | Check if enrollment exists, may need manual revocation |

**Solutions:**
```bash
# 1. Verify payment exists and get current status
SELECT id, status FROM "Payment" WHERE id = 'pay_123';

# 2. Verify enrollment exists and status
SELECT id, status FROM "Enrollment" WHERE paymentId = 'pay_123';

# 3. If enrollment trigger failed, manually trigger enrollment
UPDATE "Enrollment" 
SET status = 'ACTIVE', enrolledAt = NOW()
WHERE paymentId = 'pay_123';

# 4. If enrollment revocation failed, manually revoke
UPDATE "Enrollment"
SET status = 'REVOKED', revokedAt = NOW()
WHERE paymentId = 'pay_123';

# 5. Try override again
curl -X POST http://localhost:3000/api/v1/admin/payments/pay_123/override \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "newStatus": "COMPLETED",
    "reason": "Manual enrollment trigger after investigation"
  }'
```

---

### Issue 3: Payment Revocation Failed

**Symptom:** POST /admin/payments/:paymentId/revoke returns error

**Root Causes:**
1. Payment not found
2. Reason too short
3. Enrollment revocation failed
4. Email service down
5. Database locked

**Debug Steps:**
```bash
# Check payment exists
SELECT id, status FROM "Payment" WHERE id = 'pay_123';

# Check enrollment to revoke
SELECT id, status, userId FROM "Enrollment" WHERE paymentId = 'pay_123';

# Check for locks or pending transactions
SELECT pid, usename, state, query FROM pg_stat_activity 
WHERE datname = 'eduflow_db' AND state != 'idle';

# Check email queue
SELECT id, paymentId, email, status, retryCount 
FROM "WebhookRetryQueue"
WHERE paymentId = 'pay_123'
ORDER BY createdAt DESC;
```

**Solutions:**
```bash
# 1. If enrollment doesn't exist, just update payment
UPDATE "Payment" 
SET status = 'FAILED'
WHERE id = 'pay_123';

# 2. If enrollment exists, manually revoke it
UPDATE "Enrollment"
SET status = 'REVOKED', revokedAt = NOW()
WHERE paymentId = 'pay_123';

# 3. Create PaymentEvent for audit trail
INSERT INTO "PaymentEvent" (paymentId, eventType, status, metadata, createdAt)
VALUES ('pay_123', 'PAYMENT_REVOKED', 'FAILED', 
  '{"adminId": "admin_1", "reason": "Manual revocation after investigation"}', NOW());

# 4. Create AdminAuditLog entry
INSERT INTO "AdminAuditLog" (adminId, action, paymentId, reason, metadata, createdAt)
VALUES ('admin_1', 'REVOKE_PAYMENT', 'pay_123', 'Manual revocation', 
  '{"enrollmentId": "enroll_1"}', NOW());

# 5. Try revocation again or consider it complete
```

---

### Issue 4: Enrollment Not Created After Manual Payment

**Symptom:** Payment created but enrollment still not active

**Root Causes:**
1. Enrollment service failed
2. User locked out in enrollment system
3. Package validation failed
4. Database constraint violation

**Debug Steps:**
```bash
# Check payment was created
SELECT id, status, userId, packageId FROM "Payment" WHERE id = 'pay_123';

# Check if enrollment exists
SELECT id, userId, status, enrolledAt FROM "Enrollment" WHERE userId = 'user_123';

# Check if user is locked
SELECT id, status, enrollmentLocked, enrollmentLockedAt FROM "User" WHERE id = 'user_123';

# Check payment events
SELECT eventType, metadata FROM "PaymentEvent" WHERE paymentId = 'pay_123';
```

**Solutions:**
```bash
# 1. Unlock user if needed
UPDATE "User" SET enrollmentLocked = false WHERE id = 'user_123';

# 2. Manually create enrollment if missing
INSERT INTO "Enrollment" (userId, packageId, status, enrolledAt, createdAt, updatedAt)
VALUES ('user_123', 'pkg_1', 'ACTIVE', NOW(), NOW(), NOW());

# 3. Link to payment
UPDATE "Payment" 
SET enrollmentId = (SELECT id FROM "Enrollment" WHERE userId = 'user_123' LIMIT 1)
WHERE id = 'pay_123';

# 4. Verify enrollment active
SELECT id, status FROM "Enrollment" WHERE userId = 'user_123';
```

---

### Issue 5: Audit Log Missing

**Symptom:** AdminAuditLog entry not created for admin action

**Root Causes:**
1. Audit middleware not running
2. Admin ID not extracted from request
3. Database error on insert
4. Audit log insert skipped on error

**Debug Steps:**
```bash
# Check audit logs exist
SELECT COUNT(*) FROM "AdminAuditLog";

# Check recent admin actions
SELECT adminId, action, paymentId, reason, createdAt 
FROM "AdminAuditLog"
WHERE action LIKE 'PAYMENT%' OR action LIKE 'MANUAL_PAYMENT%'
ORDER BY createdAt DESC LIMIT 20;

# Check for errors in logs
grep "AdminAuditLog" backend/logs/*.log | tail -20;

# Verify admin ID in request context
SELECT id, email, role FROM "User" WHERE role = 'ADMIN';
```

**Solutions:**
```bash
# If audit log missing, manually create entry
INSERT INTO "AdminAuditLog" (adminId, action, paymentId, reason, metadata, createdAt)
VALUES (
  'admin_id_here',
  'CREATE_MANUAL_PAYMENT',
  'pay_123',
  'Reason for manual payment',
  '{"amount": 10000, "packageId": "pkg_1"}',
  NOW()
);

# Verify it was created
SELECT id, action, createdAt FROM "AdminAuditLog" WHERE paymentId = 'pay_123';
```

---

## Edge Cases & Handling

### Edge Case 1: Duplicate Manual Payment Requests

**Scenario:** Admin submits create manual payment twice rapidly

**Expected:** Only one payment created, second request fails with validation error

**Test:**
```bash
# Simulate concurrent requests
for i in {1..3}; do
  curl -X POST http://localhost:3000/api/v1/admin/payments/manual \
    -H "Authorization: Bearer <admin-token>" \
    -H "Content-Type: application/json" \
    -d '{"userId": "user_123", "packageId": "pkg_1", "amount": 10000, "reason": "Test"}' &
done

# Check result - only one should succeed
SELECT COUNT(*) as payment_count FROM "Payment" WHERE userId = 'user_123';
# Expected: 1 (or 2 if previous test)

# Check enrollments
SELECT COUNT(*) as enrollment_count FROM "Enrollment" WHERE userId = 'user_123';
# Expected: 1
```

---

### Edge Case 2: Status Override from FAILED to COMPLETED

**Scenario:** Payment failed, admin overrides to COMPLETED

**Expected:** Enrollment should be triggered, user gains access

**Test:**
```bash
# Create failed payment
curl -X POST http://localhost:3000/api/v1/admin/payments/manual \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{...}' # Then manually set to FAILED in DB

# Override to COMPLETED
curl -X POST http://localhost:3000/api/v1/admin/payments/pay_123/override \
  -H "Authorization: Bearer <admin-token>" \
  -d '{"newStatus": "COMPLETED", "reason": "Paymob issue resolved"}'

# Verify enrollment active
SELECT id, status FROM "Enrollment" WHERE paymentId = 'pay_123';
# Expected: status = ACTIVE
```

---

### Edge Case 3: Revoke Payment Then Try to Override

**Scenario:** Payment revoked, then admin tries to override status

**Expected:** First override attempt succeeds, status changes; second would see FAILED

**Test:**
```bash
# Revoke payment
curl -X POST http://localhost:3000/api/v1/admin/payments/pay_123/revoke \
  -H "Authorization: Bearer <admin-token>" \
  -d '{"reason": "User request"}'

# Check status
SELECT status FROM "Payment" WHERE id = 'pay_123';
# Expected: FAILED

# Try override - should work if validation allows
curl -X POST http://localhost:3000/api/v1/admin/payments/pay_123/override \
  -H "Authorization: Bearer <admin-token>" \
  -d '{"newStatus": "COMPLETED", "reason": "Mistake - user wants to keep"}'

# Check new status
SELECT status FROM "Payment" WHERE id = 'pay_123';
```

---

## Monitoring & Alerts

### Metrics to Watch

```sql
-- Manual payments created today
SELECT COUNT(*) as count, DATE(createdAt) as date
FROM "Payment"
WHERE status = 'COMPLETED' 
AND paymentMethod = 'MANUAL'
AND createdAt > NOW() - INTERVAL '24 hours'
GROUP BY DATE(createdAt);

-- Payment overrides by admin
SELECT adminId, COUNT(*) as count
FROM "AdminAuditLog"
WHERE action = 'OVERRIDE_PAYMENT_STATUS'
AND createdAt > NOW() - INTERVAL '24 hours'
GROUP BY adminId;

-- Failed operations
SELECT action, COUNT(*) as count
FROM "AdminAuditLog"
WHERE metadata->>'error' IS NOT NULL
AND createdAt > NOW() - INTERVAL '24 hours'
GROUP BY action;

-- Enrollment success rate
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN e.id IS NOT NULL THEN 1 END) as with_enrollment,
  ROUND(COUNT(CASE WHEN e.id IS NOT NULL THEN 1 END)::numeric / COUNT(*) * 100, 2) as success_rate
FROM "Payment" p
LEFT JOIN "Enrollment" e ON p.id = e.paymentId
WHERE p.paymentMethod = 'MANUAL'
AND p.createdAt > NOW() - INTERVAL '24 hours';
```

### Alert Conditions

1. **Manual Payment Failure Rate > 10%**
   - Check enrollmentService status
   - Verify package IDs are valid
   - Check user status

2. **Override Operation Failures**
   - Check if status enums changed
   - Verify enrollment service connectivity
   - Review recent code changes

3. **Audit Log Missing**
   - Verify audit middleware active
   - Check database connectivity
   - Review error logs

4. **Email Not Sent**
   - Check email service status
   - Verify user email addresses valid
   - Check email queue

---

## Testing Locally

### Setup Test Environment

```bash
# Start services
npm run dev  # Terminal 1

# In another terminal, create test admin
curl -X POST http://localhost:3000/api/v1/admin/students \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "email": "test-admin@example.com",
    "password": "TestPassword123",
    "name": "Test Admin",
    "role": "ADMIN"
  }'

# Create test student
curl -X POST http://localhost:3000/api/v1/admin/students \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "email": "test-student@example.com",
    "password": "StudentPassword123",
    "name": "Test Student",
    "role": "STUDENT"
  }'

# Get admin token
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test-admin@example.com", "password": "TestPassword123"}'
# Response: {"token": "..."}
```

### Test Flows

```bash
# 1. List payments (empty initially)
curl http://localhost:3000/api/v1/admin/payments \
  -H "Authorization: Bearer <admin-token>"

# 2. Create manual payment
curl -X POST http://localhost:3000/api/v1/admin/payments/manual \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "packageId": "pkg_1",
    "amount": 10000,
    "reason": "Test enrollment"
  }'
# Response: {"success": true, "data": {"id": "pay_123", ...}}

# 3. List payments again (should see new payment)
curl http://localhost:3000/api/v1/admin/payments \
  -H "Authorization: Bearer <admin-token>"

# 4. Get payment detail
curl http://localhost:3000/api/v1/admin/payments/pay_123 \
  -H "Authorization: Bearer <admin-token>"

# 5. Override payment status
curl -X POST http://localhost:3000/api/v1/admin/payments/pay_123/override \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"newStatus": "FAILED", "reason": "Testing override"}'

# 6. Revoke payment
curl -X POST http://localhost:3000/api/v1/admin/payments/pay_123/revoke \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Testing revocation"}'
```

---

## Database Queries for Troubleshooting

```sql
-- All admin actions on a specific payment
SELECT a.adminId, u.email, a.action, a.reason, a.metadata, a.createdAt
FROM "AdminAuditLog" a
JOIN "User" u ON a.adminId = u.id
WHERE a.paymentId = 'pay_123'
ORDER BY a.createdAt DESC;

-- Manual payments created by admin
SELECT p.id, p.userId, p.amountPiasters, p.status, e.status as enrollment_status, a.createdAt
FROM "Payment" p
LEFT JOIN "Enrollment" e ON p.id = e.paymentId
LEFT JOIN "AdminAuditLog" a ON p.id = a.paymentId
WHERE p.paymentMethod = 'MANUAL'
AND a.action = 'CREATE_MANUAL_PAYMENT'
ORDER BY a.createdAt DESC;

-- Users with enrollment issues
SELECT u.id, u.email, u.name, COUNT(e.id) as enrollment_count,
  STRING_AGG(DISTINCT e.status, ', ') as enrollment_statuses
FROM "User" u
LEFT JOIN "Enrollment" e ON u.id = e.userId
WHERE u.role = 'STUDENT'
GROUP BY u.id
HAVING COUNT(e.id) > 1 OR MAX(e.status) = 'REVOKED';

-- Payment timeline
SELECT p.id, p.status, p.createdAt, 
  STRING_AGG(pe.eventType, ' → ' ORDER BY pe.createdAt) as events
FROM "Payment" p
LEFT JOIN "PaymentEvent" pe ON p.id = pe.paymentId
WHERE p.id = 'pay_123'
GROUP BY p.id;

-- Failed admin operations
SELECT adminId, action, COUNT(*) as count
FROM "AdminAuditLog"
WHERE metadata->>'error' IS NOT NULL
OR metadata->>'errorCode' IS NOT NULL
GROUP BY adminId, action
ORDER BY count DESC;
```

---

## Troubleshooting Checklist

- [ ] Is admin authenticated? `check Authorization header`
- [ ] Is admin role ADMIN? `SELECT role FROM "User" WHERE id = '...'`
- [ ] Does payment exist? `SELECT id FROM "Payment" WHERE id = '...'`
- [ ] Does user exist? `SELECT id FROM "User" WHERE id = '...'`
- [ ] Does package exist? `SELECT id FROM "CoursePackage" WHERE id = '...'`
- [ ] Is enrollment status correct? `SELECT status FROM "Enrollment" WHERE userId = '...'`
- [ ] Are PaymentEvents being created? `SELECT COUNT(*) FROM "PaymentEvent" WHERE paymentId = '...'`
- [ ] Are AdminAuditLogs being created? `SELECT COUNT(*) FROM "AdminAuditLog" WHERE paymentId = '...'`
- [ ] Are emails being sent? `check email service logs`
- [ ] TypeScript compiling? `npm run build`
- [ ] Tests passing? `npm test -- admin-payment`

---

**For assistance:** Contact support@eduflow.com or check logs in `backend/logs/`
