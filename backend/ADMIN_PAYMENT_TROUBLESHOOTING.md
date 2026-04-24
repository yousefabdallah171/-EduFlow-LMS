# Admin Payment Management: Troubleshooting Guide

**Last Updated:** April 24, 2026  
**Purpose:** Common issues, error codes, and troubleshooting procedures  
**Audience:** Operations team, Support engineers, DevOps

---

## Error Code Reference

### Validation Errors (422)

| Error Code | Message | Cause | Solution |
|-----------|---------|-------|----------|
| `VALIDATION_ERROR` | Field validation failed | Invalid request data | Check request format against API contract |
| `INVALID_ENUM` | Invalid enum value | Status/role not in allowed list | Use only valid enum values |
| `STRING_TOO_SHORT` | String must be >= X chars | Reason/notes too short | Provide longer string (min 5 for reason) |
| `STRING_TOO_LONG` | String must be <= X chars | Reason/notes too long | Shorten string (max 500 for reason) |
| `INVALID_NUMBER` | Must be integer >= X | Amount too low | Use amount >= 100 piasters |
| `INVALID_DATE` | Invalid ISO 8601 date | Wrong datetime format | Use format: YYYY-MM-DDTHH:MM:SSZ |

### Authorization Errors (401/403)

| Error Code | Message | Cause | Solution |
|-----------|---------|-------|----------|
| `UNAUTHORIZED` | Missing or invalid token | No Bearer token in header | Add Authorization header with valid token |
| `TOKEN_EXPIRED` | Token has expired | Token too old | Login again to get fresh token |
| `INSUFFICIENT_ROLE` | ADMIN role required | User is not admin | Use admin account token |

### Not Found Errors (404)

| Error Code | Message | Cause | Solution |
|-----------|---------|-------|----------|
| `PAYMENT_NOT_FOUND` | Payment not found | Payment ID doesn't exist | Verify payment ID exists in database |
| `USER_NOT_FOUND` | User not found | User ID doesn't exist | Verify user exists before creating payment |
| `PACKAGE_NOT_FOUND` | Package not found | Package ID doesn't exist | Verify package ID is valid |

### Server Errors (500)

| Error Code | Message | Cause | Solution |
|-----------|---------|-------|----------|
| `DATABASE_ERROR` | Database connection failed | Database unreachable | Check database service status |
| `SERVICE_ERROR` | Service unavailable | Enrollment/email service down | Check service logs and status |
| `INTERNAL_ERROR` | Unexpected error | Code bug or edge case | Check server logs, file issue |

---

## Common Issues & Resolutions

### Issue 1: "User already enrolled" When Creating Manual Payment

**Symptoms:**
- POST /admin/payments/manual returns 400
- Error message: "User already enrolled"
- Cannot create manual payment for student

**Root Causes:**
1. Student already has ACTIVE enrollment
2. Enrollment from previous payment not revoked
3. Duplicate manual payment attempts

**Diagnosis Steps:**

```bash
# 1. Check enrollment status
SELECT id, userId, status, enrolledAt, revokedAt 
FROM "Enrollment" 
WHERE userId = 'user_123';

# 2. If status is ACTIVE and revokedAt is NULL
# This is the problem - need to revoke first

# 3. Check if student should be enrolled
# - If yes: operation is correct, student already has access
# - If no: enrollment needs to be revoked
```

**Solutions:**

**Option A: Accept as normal (student already enrolled)**
```bash
# If student should be enrolled, this is expected behavior
# No action needed - student already has course access
```

**Option B: Revoke first, then create new payment**
```bash
# Revoke existing enrollment
curl -X POST "http://localhost:3000/api/v1/admin/payments/<old_payment_id>/revoke" \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Revoking for new payment"}'

# Then create new manual payment
curl -X POST "http://localhost:3000/api/v1/admin/payments/manual" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{...}'
```

**Option C: Manual database fix**
```bash
# If enrollment needs to be revoked manually
UPDATE "Enrollment"
SET status = 'REVOKED', revokedAt = NOW()
WHERE userId = 'user_123' AND status = 'ACTIVE';

# Then try manual payment again
```

---

### Issue 2: Payment Created But Enrollment Not Active

**Symptoms:**
- Manual payment created successfully
- Payment status is COMPLETED
- But enrollment status is not ACTIVE or missing
- Student cannot access course

**Root Causes:**
1. Enrollment service failed
2. User locked in enrollment system
3. Package validation failed
4. Race condition in concurrent operations

**Diagnosis Steps:**

```bash
# 1. Check payment exists
SELECT id, status, userId FROM "Payment" WHERE id = 'pay_123';
# Should return: status = COMPLETED

# 2. Check enrollment
SELECT id, status, enrolledAt FROM "Enrollment" WHERE userId = 'user_123';
# If NULL: enrollment not created (service failure)
# If status != ACTIVE: enrollment not activated

# 3. Check payment events
SELECT eventType, metadata FROM "PaymentEvent" WHERE paymentId = 'pay_123';
# Look for enrollment events

# 4. Check admin audit log
SELECT action, reason, metadata FROM "AdminAuditLog" 
WHERE paymentId = 'pay_123' AND action = 'CREATE_MANUAL_PAYMENT';
```

**Solutions:**

```bash
# Solution 1: Manually create enrollment
INSERT INTO "Enrollment" (userId, packageId, status, enrolledAt, createdAt, updatedAt)
VALUES (
  'user_123',
  'pkg_1',
  'ACTIVE',
  NOW(),
  NOW(),
  NOW()
);

# Solution 2: Activate existing enrollment
UPDATE "Enrollment"
SET status = 'ACTIVE', enrolledAt = NOW()
WHERE userId = 'user_123' AND status != 'ACTIVE';

# Solution 3: Link payment to enrollment
UPDATE "Payment"
SET enrollmentId = (SELECT id FROM "Enrollment" WHERE userId = 'user_123' LIMIT 1)
WHERE id = 'pay_123';

# Verify fix
SELECT id, status FROM "Enrollment" WHERE userId = 'user_123';
```

---

### Issue 3: Invalid Amount When Creating Manual Payment

**Symptoms:**
- POST /admin/payments/manual returns 422
- Error: "Number must be greater than or equal to 100"
- Cannot create payment with specified amount

**Root Causes:**
1. Amount specified is < 100 piasters
2. Amount is zero or negative
3. Amount in wrong currency (should be piasters, not EGP)

**Diagnosis Steps:**

```bash
# Check what amount you're sending
echo "Amount sent: 5000 piasters = 50 EGP"
# Minimum: 100 piasters = 1 EGP

# Verify conversion
# 100 piasters = 1 EGP
# So minimum of 100 piasters is required
```

**Solutions:**

```bash
# Solution 1: Use minimum allowed amount
"amount": 100  # = 1 EGP

# Solution 2: Use realistic amount
"amount": 10000  # = 100 EGP

# Solution 3: Verify amount calculation
# If customer paid 50 EGP, amount = 50 * 100 = 5000 piasters
# But 5000 piasters is too low for validation
# (This might be a business logic issue - check with team)
```

---

### Issue 4: Status Override Failed - Enrollment Not Triggered

**Symptoms:**
- POST /admin/payments/:paymentId/override returns 200
- Status is updated in database
- But enrollment is not created/activated
- Student cannot access course

**Root Causes:**
1. Enrollment service timeout
2. User locked out
3. Course access restrictions
4. Package validation failed

**Diagnosis Steps:**

```bash
# 1. Check payment status changed
SELECT status FROM "Payment" WHERE id = 'pay_123';
# Should be: COMPLETED (if override to COMPLETED worked)

# 2. Check enrollment
SELECT id, status FROM "Enrollment" WHERE paymentId = 'pay_123';
# If missing or status != ACTIVE: trigger failed

# 3. Check payment events
SELECT eventType, status, metadata FROM "PaymentEvent" 
WHERE paymentId = 'pay_123'
ORDER BY createdAt DESC;

# 4. Check service logs
grep "enrollmentService\|enrollment" backend/logs/*.log | tail -20;
```

**Solutions:**

```bash
# Solution 1: Manually trigger enrollment
INSERT INTO "Enrollment" (userId, packageId, status, enrolledAt, createdAt, updatedAt)
SELECT 
  p.userId,
  p.packageId,
  'ACTIVE',
  NOW(),
  NOW(),
  NOW()
FROM "Payment" p
WHERE p.id = 'pay_123'
ON CONFLICT (userId) DO UPDATE SET status = 'ACTIVE';

# Solution 2: If enrollment exists but not active
UPDATE "Enrollment"
SET status = 'ACTIVE', enrolledAt = NOW()
WHERE userId = (SELECT userId FROM "Payment" WHERE id = 'pay_123');

# Solution 3: Check if user is locked
SELECT enrollmentLocked, enrollmentLockedAt FROM "User" 
WHERE id = (SELECT userId FROM "Payment" WHERE id = 'pay_123');

# If locked:
UPDATE "User" SET enrollmentLocked = false 
WHERE id = (SELECT userId FROM "Payment" WHERE id = 'pay_123');

# Then try override again
```

---

### Issue 5: Revoke Payment Failed - Enrollment Still Active

**Symptoms:**
- POST /admin/payments/:paymentId/revoke returns 200
- Payment status changed to FAILED
- But enrollment status is still ACTIVE
- Student still has course access

**Root Causes:**
1. Enrollment revocation failed
2. Concurrent access to enrollment
3. Database constraint violation
4. User has multiple enrollments

**Diagnosis Steps:**

```bash
# 1. Check payment status
SELECT status FROM "Payment" WHERE id = 'pay_123';
# Should be: FAILED

# 2. Check enrollment
SELECT id, status, revokedAt FROM "Enrollment" WHERE paymentId = 'pay_123';
# If status = ACTIVE or revokedAt = NULL: revocation failed

# 3. Check if user has other enrollments
SELECT id, status FROM "Enrollment" WHERE userId = 'user_123';
# If multiple enrollments exist, might be accessing different one

# 4. Check for database locks
SELECT pg_blocking_pids(pid), pid, usename FROM pg_stat_activity 
WHERE state = 'active' AND wait_event IS NOT NULL;
```

**Solutions:**

```bash
# Solution 1: Manually revoke enrollment
UPDATE "Enrollment"
SET status = 'REVOKED', revokedAt = NOW()
WHERE paymentId = 'pay_123' AND status = 'ACTIVE';

# Verify
SELECT id, status, revokedAt FROM "Enrollment" WHERE paymentId = 'pay_123';

# Solution 2: If user has multiple enrollments
UPDATE "Enrollment"
SET status = 'REVOKED', revokedAt = NOW()
WHERE userId = 'user_123' AND status = 'ACTIVE';

# Solution 3: Check for database locks (if update fails)
# Wait a few seconds and retry
# Or kill blocking query:
SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
WHERE state = 'active' AND pid != pg_backend_pid();
```

---

### Issue 6: Audit Log Entry Missing

**Symptoms:**
- Payment created/modified
- But AdminAuditLog doesn't have entry
- Cannot track who made changes
- Compliance audit fails

**Root Causes:**
1. Audit middleware not running
2. Admin ID extraction failed
3. Database error on insert
4. Audit insert skipped on transaction rollback

**Diagnosis Steps:**

```bash
# 1. Check if audit log exists
SELECT COUNT(*) FROM "AdminAuditLog";

# 2. Check recent admin actions
SELECT adminId, action, paymentId, createdAt FROM "AdminAuditLog"
WHERE action LIKE '%PAYMENT%'
ORDER BY createdAt DESC LIMIT 10;

# 3. Check for errors in logs
grep "AdminAuditLog\|audit" backend/logs/*.log | tail -20;

# 4. Verify admin ID in request context
SELECT id, email, role FROM "User" WHERE role = 'ADMIN' LIMIT 5;
```

**Solutions:**

```bash
# Solution 1: Manually create audit log entry
INSERT INTO "AdminAuditLog" (
  adminId,
  action,
  paymentId,
  reason,
  metadata,
  createdAt
)
VALUES (
  'admin_uuid_here',
  'CREATE_MANUAL_PAYMENT',
  'pay_123',
  'Manual enrollment creation',
  '{"amount": 10000, "userId": "user_123"}',
  NOW()
);

# Verify
SELECT id, action, createdAt FROM "AdminAuditLog" 
WHERE paymentId = 'pay_123';

# Solution 2: Check audit middleware is enabled in app.ts
grep "auditMiddleware" backend/src/app.ts;

# If missing, add it to router:
router.use(auditMiddleware);
```

---

### Issue 7: Email Not Sent to Student

**Symptoms:**
- Payment created or status changed
- No email received by student
- Email log shows no entry
- Student unaware of enrollment

**Root Causes:**
1. Email service down
2. Invalid student email address
3. Email in spam folder
4. Email queue failure

**Diagnosis Steps:**

```bash
# 1. Check student email
SELECT email FROM "User" WHERE id = 'user_123';
# Verify email looks valid

# 2. Check email queue
SELECT id, email, status, retryCount FROM "WebhookRetryQueue"
WHERE paymentId = 'pay_123'
ORDER BY createdAt DESC;

# 3. Check email service status
# Check email service logs or dashboard

# 4. Check payment events
SELECT eventType, metadata FROM "PaymentEvent" WHERE paymentId = 'pay_123';
# Look for email-related events
```

**Solutions:**

```bash
# Solution 1: Send email manually
curl -X POST http://localhost:3000/api/v1/admin/send-email \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "type": "ENROLLMENT_ACTIVATED",
    "paymentId": "pay_123"
  }'

# Solution 2: Check if email is invalid
UPDATE "User" SET email = 'correct@example.com' WHERE id = 'user_123';

# Solution 3: Retry email sending
SELECT pg_notify('email_queue', json_build_object(
  'userId', 'user_123',
  'type', 'ENROLLMENT_ACTIVATED'
)::text);

# Solution 4: Contact student manually
# Send email manually from admin UI or notify support to contact customer
```

---

## Performance Optimization

### Slow Payment List Response

**Symptoms:**
- GET /admin/payments takes > 2 seconds
- List with filters very slow

**Optimization Steps:**

```bash
# 1. Check database indexes
\d+ "Payment";
# Verify indexes exist on: userId, status, createdAt

# 2. Verify indexes are being used
EXPLAIN ANALYZE 
SELECT * FROM "Payment" 
WHERE status = 'COMPLETED' 
ORDER BY createdAt DESC
LIMIT 50;

# 3. If indexes missing, create them
CREATE INDEX CONCURRENTLY idx_payment_status ON "Payment"(status);
CREATE INDEX CONCURRENTLY idx_payment_userId ON "Payment"(userId);
CREATE INDEX CONCURRENTLY idx_payment_createdAt ON "Payment"(createdAt DESC);

# 4. Analyze table
ANALYZE "Payment";

# 5. Test query performance again
```

### Large Offset Pagination Slow

**Symptoms:**
- GET /admin/payments?offset=10000 takes long time
- Higher offset values get progressively slower

**Solution:**

```bash
# Instead of high offset:
GET /admin/payments?offset=10000&limit=50  # SLOW

# Use cursor-based pagination (if implemented):
GET /admin/payments?after=<lastId>&limit=50  # FAST

# Or use filtering:
GET /admin/payments?startDate=2026-04-20T00:00:00Z&limit=50  # FASTER

# For large result sets, use date range or status filters
```

---

## Database Maintenance

### Regular Maintenance Tasks

```bash
# Weekly: Analyze tables
ANALYZE "Payment";
ANALYZE "Enrollment";
ANALYZE "PaymentEvent";
ANALYZE "AdminAuditLog";

# Monthly: Vacuum tables
VACUUM ANALYZE "Payment";
VACUUM ANALYZE "Enrollment";

# Quarterly: Reindex tables (if performance degrades)
REINDEX TABLE CONCURRENTLY "Payment";
REINDEX TABLE CONCURRENTLY "PaymentEvent";

# Annually: Archive old data
DELETE FROM "PaymentEvent" 
WHERE paymentId IN (
  SELECT id FROM "Payment" WHERE createdAt < NOW() - INTERVAL '1 year'
);
```

---

## Quick Diagnosis Checklist

```
[ ] Is backend running?
    - curl http://localhost:3000/api/v1/admin/health

[ ] Is admin authenticated?
    - Check Authorization header has valid token
    - Token not expired

[ ] Is database running?
    - psql -U postgres -d eduflow_db -c "SELECT 1;"

[ ] Are migrations applied?
    - Check schema exists for Payment, Enrollment tables

[ ] Are service dependencies available?
    - Email service running
    - Enrollment service running

[ ] Are there database locks?
    - SELECT * FROM pg_stat_activity WHERE state != 'idle';

[ ] Are there any error logs?
    - tail -f backend/logs/error.log

[ ] Is the request valid?
    - Check against API contract
    - Validate field types and values
```

---

## Escalation Path

**Level 1: Developer/On-Call Engineer**
- Verify request format
- Check database state
- Review error logs
- Run diagnosis commands

**Level 2: Database Administrator**
- Check database performance
- Review locks and queries
- Optimize slow queries
- Handle data recovery

**Level 3: DevOps/Infrastructure**
- Check service availability
- Review server resources (CPU, memory, disk)
- Handle service restarts
- Check network connectivity

---

## Contact & Resources

**Internal Channels:**
- Slack: #eduflow-support
- Email: support@eduflow.com
- On-call: Check PagerDuty

**External Resources:**
- API Contract: `ADMIN_PAYMENT_API_CONTRACT.md`
- Debugging Guide: `ADMIN_PAYMENT_DEBUGGING_GUIDE.md`
- Testing Guide: `ADMIN_PAYMENT_TESTING_GUIDE.md`

---

**Last Updated:** April 24, 2026  
**Version:** 1.0  
**Status:** Production Ready
