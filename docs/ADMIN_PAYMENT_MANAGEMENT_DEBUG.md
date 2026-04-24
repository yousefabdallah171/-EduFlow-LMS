# Admin Payment Management - Debugging Guide

This guide helps debug issues with the admin payment management system.

## System Overview

```
HTTP Request → adminPaymentsController → adminPaymentService / adminPaymentManagementService → Prisma → Database
```

### Components

- **Controller** (`admin/payments.controller.ts`) - HTTP request validation & response formatting
- **Service** (`admin-payment.service.ts`) - Read operations (list, detail, search, stats)
- **Management Service** (`admin-payment-management.service.ts`) - Write operations (create, override, revoke)
- **Database** - Prisma ORM with Payment, PaymentEvent, AdminAuditLog models

---

## Common Issues & Solutions

### 1. 401 Unauthorized Errors

**Error:**
```json
{
  "error": "UNAUTHORIZED",
  "message": "Admin not authenticated"
}
```

**Root Causes:**
- User not authenticated (missing auth token)
- User authenticated but `req.user` not populated by middleware
- Admin user without ADMIN role

**Debug Steps:**
1. Check authentication middleware is applied to route:
   ```typescript
   router.post("/payments/manual", requireRole("ADMIN"), ...)
   ```

2. Verify `auditMiddleware` is registered:
   ```typescript
   router.use(auditMiddleware); // Should be before route definitions
   ```

3. Check user object in controller:
   ```typescript
   console.log("User:", req.user); // Should exist with id and role
   if (!req.user?.id) console.log("User ID missing!");
   ```

4. Verify user has ADMIN role in database:
   ```sql
   SELECT id, role FROM "User" WHERE id = 'admin-id';
   ```

### 2. 422 Validation Errors

**Error:**
```json
{
  "error": "VALIDATION_ERROR",
  "fields": {
    "amount": "Expected integer, received string"
  }
}
```

**Root Causes:**
- Request body/query parameters don't match Zod schema
- Wrong data types (string instead of number)
- Missing required fields
- Values outside allowed ranges

**Debug Steps:**
1. Check request format:
   ```bash
   # POST /admin/payments/manual
   curl -X POST http://localhost:3000/api/v1/admin/payments/manual \
     -H "Content-Type: application/json" \
     -d '{
       "userId": "user-123",
       "packageId": "pkg-456",
       "amount": 10000,
       "reason": "Manual payment for testing purposes"
     }'
   ```

2. Review schema in controller:
   ```typescript
   const createManualPaymentSchema = z.object({
     userId: z.string().min(1),
     packageId: z.string().min(1),
     amount: z.number().int().min(100),
     reason: z.string().min(5).max(500),
     adminNotes: z.string().max(1000).optional()
   });
   ```

3. Validate each field:
   - `userId`: non-empty string ✓
   - `packageId`: non-empty string ✓
   - `amount`: integer >= 100 (in piasters) ✓
   - `reason`: string with 5-500 characters ✓
   - `adminNotes`: optional, max 1000 chars ✓

### 3. 404 Payment Not Found

**Error:**
```json
{
  "error": "PAYMENT_NOT_FOUND",
  "message": "Payment payment-id not found"
}
```

**Root Causes:**
- Payment ID doesn't exist in database
- Typo in payment ID
- Payment was deleted or has wrong case

**Debug Steps:**
1. Check if payment exists:
   ```sql
   SELECT id, userId, status, createdAt FROM "Payment" WHERE id = 'payment-id';
   ```

2. List recent payments:
   ```sql
   SELECT id, userId, status, createdAt FROM "Payment"
   ORDER BY createdAt DESC
   LIMIT 10;
   ```

3. Check for case sensitivity issues:
   ```bash
   # Payment IDs are case-sensitive
   curl http://localhost:3000/api/v1/admin/payments/PAYMENT-ID  # Won't match
   curl http://localhost:3000/api/v1/admin/payments/payment-id  # Match
   ```

### 4. Enrollment Revocation Fails

**Error:**
```
[Refund Service] Error revoking enrollment for payment-id: 
  Cannot revoke enrollment - user not enrolled
```

**Root Causes:**
- User not enrolled despite payment completed
- Enrollment was already revoked
- Missing enrollment record

**Debug Steps:**
1. Check enrollment status:
   ```sql
   SELECT id, userId, status, enrolledAt, revokedAt FROM "Enrollment"
   WHERE userId = 'user-id';
   ```

2. Check if payment triggers enrollment:
   ```typescript
   // In admin-payment-management.service.ts, createManualPayment method
   if (newStatus === "COMPLETED") {
     await enrollmentService.enroll(userId, "LIFETIME", paymentId);
   }
   ```

3. Verify enrollmentService.revoke works:
   ```typescript
   const enrollmentService = {
     async revoke(userId: string, adminId: string) {
       // Should update enrollment status to REVOKED
       // Should set revokedAt timestamp
     }
   };
   ```

4. Check logs for enrollment service errors:
   ```bash
   grep -n "enrollment.*error\|Error.*revok" logs/*.log
   ```

### 5. Email Notifications Not Sent

**Error:**
```
[Admin Payment Management] Error sending enrollment email: Error: Mail service unavailable
```

**Root Causes:**
- Email service not configured
- SMTP credentials invalid
- Network connectivity issue
- Email template missing

**Debug Steps:**
1. Check if email error is critical (it shouldn't be):
   ```typescript
   // Payment creation should NOT fail if email fails
   try {
     await sendEnrollmentActivatedEmail(user.email, user.name);
   } catch (error) {
     console.error("[Admin Payment Management] Error sending email:", error);
     // Don't throw - continue with payment creation
   }
   ```

2. Verify email service is configured:
   ```bash
   echo $SMTP_HOST
   echo $SMTP_PORT
   echo $SMTP_USER
   echo $SMTP_FROM
   ```

3. Check email template exists:
   ```bash
   find . -name "*.email.ts" -o -name "*.email.html" | head -20
   ```

4. Test email service independently:
   ```typescript
   import { sendEnrollmentActivatedEmail } from "../utils/email.js";
   
   await sendEnrollmentActivatedEmail("test@example.com", "Test User");
   ```

### 6. Audit Log Not Created

**Error:**
```
[Admin Payment Management] Manual payment created but no audit log
```

**Root Causes:**
- AdminAuditLog table not migrated
- Unique constraint violation on audit log
- Service error after payment creation

**Debug Steps:**
1. Verify AdminAuditLog table exists:
   ```sql
   SELECT * FROM "AdminAuditLog" LIMIT 1;
   ```

2. Check audit log is being created:
   ```typescript
   // In admin-payment-management.service.ts
   await prisma.adminAuditLog.create({
     data: {
       adminId,
       action: "CREATE_MANUAL_PAYMENT",
       paymentId: payment.id,
       targetId: userId,
       reason,
       metadata: { userId, packageId, amount, adminNotes, timestamp }
     }
   });
   ```

3. Verify constraints:
   ```sql
   SELECT constraint_name FROM information_schema.table_constraints
   WHERE table_name = 'AdminAuditLog';
   ```

4. Check if audit creation throws:
   ```bash
   grep -A5 "AdminAuditLog.create" backend/src/services/*.ts
   ```

### 7. Concurrent Payment Creation Issues

**Error:**
```
Multiple payments created for same user simultaneously
```

**Root Causes:**
- No uniqueness constraint on pending payments
- Race condition in manual payment creation
- Transaction not used for payment + enrollment

**Debug Steps:**
1. Check if user has multiple pending payments:
   ```sql
   SELECT id, userId, status, createdAt FROM "Payment"
   WHERE userId = 'user-id' AND status IN ('PENDING', 'WEBHOOK_PENDING')
   ORDER BY createdAt DESC;
   ```

2. Verify transaction is used:
   ```typescript
   // Should use Prisma transaction
   const payment = await prisma.$transaction(async (tx) => {
     const payment = await tx.payment.create({ data: {...} });
     await tx.paymentEvent.create({ data: {...} });
     return payment;
   });
   ```

3. Add uniqueness constraint for pending payments:
   ```sql
   -- Check if constraint exists
   SELECT constraint_name FROM information_schema.table_constraints
   WHERE table_name = 'Payment'
   AND constraint_name LIKE '%unique%pending%';
   ```

### 8. Status Override Not Working

**Error:**
```
Payment status override succeeds but enrollment not updated
```

**Root Causes:**
- Override logic not handling all status transitions
- Enrollment not created when status becomes COMPLETED
- Enrollment not revoked when status becomes non-COMPLETED

**Debug Steps:**
1. Check override logic:
   ```typescript
   // In admin-payment-management.service.ts, overridePaymentStatus
   if (newStatus === "COMPLETED" && oldStatus !== "COMPLETED") {
     // Trigger enrollment
     const enrollment = await enrollmentService.enroll(...);
   }
   
   if (oldStatus === "COMPLETED" && newStatus !== "COMPLETED") {
     // Revoke enrollment
     await enrollmentService.revoke(...);
   }
   ```

2. Verify enrollment state before and after:
   ```bash
   # Before override
   SELECT status FROM "Enrollment" WHERE userId = 'user-id';
   
   # Call override endpoint
   curl -X POST http://localhost:3000/api/v1/admin/payments/payment-id/override \
     -H "Content-Type: application/json" \
     -d '{"newStatus": "REFUNDED", "reason": "Test override"}'
   
   # After override
   SELECT status FROM "Enrollment" WHERE userId = 'user-id';
   ```

3. Check for errors in override response:
   ```bash
   curl -X POST ... 2>&1 | jq '.error // .message'
   ```

### 9. Search Endpoint Returns No Results

**Error:**
```
GET /admin/payments/search?query=test@example.com returns empty array
```

**Root Causes:**
- Email address not exactly matching (case sensitivity)
- Payment not found due to incorrect search criteria
- Search is case-sensitive but data is stored differently

**Debug Steps:**
1. Check what data exists:
   ```sql
   SELECT p.id, p.userId, u.email, u.name
   FROM "Payment" p
   JOIN "User" u ON p.userId = u.id
   WHERE u.email ILIKE '%test%' OR u.name ILIKE '%test%'
   LIMIT 10;
   ```

2. Check search implementation uses case-insensitive search:
   ```typescript
   // In admin-payment.service.ts, searchPayments
   where: {
     OR: [
       { id: { contains: query, mode: "insensitive" } },
       { userId: { contains: query, mode: "insensitive" } },
       { user: { email: { contains: query, mode: "insensitive" } } },
       { user: { name: { contains: query, mode: "insensitive" } } }
     ]
   }
   ```

3. Test with raw SQL:
   ```sql
   SELECT id FROM "Payment"
   WHERE id ILIKE '%test%'
   OR userId ILIKE '%test%'
   LIMIT 5;
   ```

### 10. Pagination Not Working

**Error:**
```
listPayments returns fewer items than limit
```

**Root Causes:**
- Incorrect offset/limit values
- Total count doesn't match paginated results
- hasMore flag calculated incorrectly

**Debug Steps:**
1. Check pagination math:
   ```typescript
   // In admin-payment.service.ts, listPayments
   const total = await prisma.payment.count({ where });
   const payments = await prisma.payment.findMany({
     where,
     take: limit,
     skip: offset
   });
   
   // hasMore should be: (offset + limit) < total
   hasMore: offset + limit < total
   ```

2. Verify with manual query:
   ```sql
   -- Total count
   SELECT COUNT(*) as total FROM "Payment";
   
   -- Paginated results
   SELECT id FROM "Payment" ORDER BY createdAt DESC
   LIMIT 50 OFFSET 0;
   
   -- Check if more exist
   SELECT COUNT(*) FROM "Payment"
   OFFSET 50;
   ```

3. Test with different limits:
   ```bash
   curl http://localhost:3000/api/v1/admin/payments?limit=10\&offset=0
   curl http://localhost:3000/api/v1/admin/payments?limit=10\&offset=10
   ```

---

## Logging & Monitoring

### Enable Detailed Logging

```typescript
// In services, add request context
console.log(`[Admin Payments] Creating manual payment for user ${userId}`);
console.log(`[Admin Payments] Payment created: ${payment.id}`);
console.log(`[Admin Payments] Enrollment triggered for user ${userId}`);
```

### Check Error Logs

```bash
# Search for payment errors
grep -i "payment.*error\|error.*payment" logs/*.log

# Search for enrollment errors
grep -i "enrollment.*error\|error.*enroll" logs/*.log

# Search for audit log errors
grep -i "audit.*error\|error.*audit" logs/*.log
```

### Monitor Database Queries

```typescript
// Enable Prisma query logging
const prisma = new PrismaClient({
  log: [
    { emit: 'stdout', level: 'query' },
    { emit: 'stdout', level: 'error' }
  ]
});
```

### Test Routes Manually

```bash
# List all payments
curl http://localhost:3000/api/v1/admin/payments

# List completed payments
curl http://localhost:3000/api/v1/admin/payments?status=COMPLETED

# Get payment details
curl http://localhost:3000/api/v1/admin/payments/payment-id

# Search payments
curl http://localhost:3000/api/v1/admin/payments/search?query=test@example.com

# Get payment stats
curl http://localhost:3000/api/v1/admin/payments/stats

# Create manual payment
curl -X POST http://localhost:3000/api/v1/admin/payments/manual \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "packageId": "pkg-456",
    "amount": 10000,
    "reason": "Manual payment for testing"
  }'

# Override payment status
curl -X POST http://localhost:3000/api/v1/admin/payments/payment-id/override \
  -H "Content-Type: application/json" \
  -d '{"newStatus": "REFUNDED", "reason": "Refund requested"}'

# Revoke payment
curl -X POST http://localhost:3000/api/v1/admin/payments/payment-id/revoke \
  -H "Content-Type: application/json" \
  -d '{"reason": "Payment revoked by admin"}'
```

---

## Testing Strategy

### Unit Tests
- Run: `npm test -- admin-payment.service.test.ts`
- Coverage: Service logic, filtering, pagination, error handling

### Integration Tests
- Run: `npm test -- admin-payments.integration.test.ts`
- Coverage: Controller validation, error responses, service integration

### Manual Testing
1. Create manual payment and verify enrollment
2. Override payment status and verify enrollment changes
3. Revoke payment and verify refund + enrollment revocation
4. Search payments and verify results
5. List payments with filters and verify pagination

---

## Performance Debugging

### Slow Queries

```sql
-- Enable slow query logging (adjust threshold)
SET log_min_duration_statement = 1000;  -- Log queries > 1s

-- Analyze query plans
EXPLAIN ANALYZE SELECT * FROM "Payment"
WHERE status = 'COMPLETED'
ORDER BY createdAt DESC
LIMIT 50;
```

### N+1 Queries

```typescript
// Bad: Fetches user separately for each payment
payments.forEach(async (p) => {
  const user = await db.user.findUnique({ where: { id: p.userId } });
  // Use user...
});

// Good: Fetch user with payment in one query
const payments = await prisma.payment.findMany({
  include: { user: true }
});
```

### Memory Leaks

```bash
# Monitor memory usage
node --inspect backend/src/server.ts

# Connect Chrome DevTools to debug memory
# chrome://inspect
```

---

## Support & Resources

- Database Schema: `prisma/schema.prisma`
- Service Source: `backend/src/services/admin-payment*.service.ts`
- Controller Source: `backend/src/controllers/admin/payments.controller.ts`
- Routes: `backend/src/routes/admin.routes.ts`
