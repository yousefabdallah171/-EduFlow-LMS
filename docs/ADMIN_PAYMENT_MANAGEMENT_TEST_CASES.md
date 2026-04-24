# Admin Payment Management - Manual Test Cases

## Prerequisites

- [ ] Backend server running (`npm run dev`)
- [ ] Admin user with valid auth token
- [ ] Database seeded with test data (at least 1 user, 1 package, 1 payment)
- [ ] API tool ready (Postman, curl, or similar)

---

## Test Environment Setup

### 1. Get Admin Auth Token

```bash
# Login as admin
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "adminpassword"
  }'

# Extract token from response
# Store in shell variable for reuse
export ADMIN_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 2. Get Test Data

```bash
# Get a valid user ID
curl -X GET http://localhost:3000/api/v1/admin/students \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data[0].id'

export USER_ID="user-123"

# Get a valid package ID
curl -X GET http://localhost:3000/api/v1/admin/pricing/packages \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data[0].id'

export PACKAGE_ID="pkg-456"

# Get a valid payment ID
curl -X GET http://localhost:3000/api/v1/admin/payments \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data.payments[0].id'

export PAYMENT_ID="payment-789"
```

---

## Test Cases

### TC-1: List All Payments (No Filters)

**Endpoint:** `GET /api/v1/admin/payments`

**Test Steps:**
```bash
curl -X GET "http://localhost:3000/api/v1/admin/payments" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Expected Results:**
- [ ] Status code: 200
- [ ] Response has `success: true`
- [ ] Response contains `data.payments` array
- [ ] Response contains `data.pagination` object
- [ ] `pagination.total` > 0
- [ ] Each payment has: `id`, `userId`, `amount`, `status`, `createdAt`, `user.email`
- [ ] Results ordered by `createdAt` DESC (newest first)

**Notes:** Test without authentication to verify 401 response

---

### TC-2: List Payments with Status Filter

**Endpoint:** `GET /api/v1/admin/payments?status=COMPLETED`

**Test Steps:**
```bash
curl -X GET "http://localhost:3000/api/v1/admin/payments?status=COMPLETED" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Test All Statuses:**
- [ ] `status=COMPLETED` - returns only completed payments
- [ ] `status=PENDING` - returns only pending payments
- [ ] `status=FAILED` - returns only failed payments
- [ ] `status=WEBHOOK_PENDING` - returns only webhook pending
- [ ] `status=REFUND_REQUESTED` - returns only refund requested
- [ ] `status=REFUNDED` - returns only refunded

**Expected Results:**
- [ ] Status code: 200
- [ ] All returned payments have matching status
- [ ] Invalid status returns 422 validation error

---

### TC-3: List Payments with User Filter

**Endpoint:** `GET /api/v1/admin/payments?userId=user-123`

**Test Steps:**
```bash
curl -X GET "http://localhost:3000/api/v1/admin/payments?userId=$USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Expected Results:**
- [ ] Status code: 200
- [ ] All returned payments have userId matching filter
- [ ] Can filter by valid userId
- [ ] Returns empty array for non-existent userId

---

### TC-4: List Payments with Date Range Filter

**Endpoint:** `GET /api/v1/admin/payments?startDate=2024-01-01T00:00:00.000Z&endDate=2024-12-31T23:59:59.999Z`

**Test Steps:**
```bash
curl -X GET "http://localhost:3000/api/v1/admin/payments?startDate=2024-01-01T00:00:00Z&endDate=2024-12-31T23:59:59Z" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Test Cases:**
- [ ] Filter by start date only
- [ ] Filter by end date only
- [ ] Filter by both start and end date
- [ ] Invalid date format returns 422 error

**Expected Results:**
- [ ] Status code: 200 (valid dates)
- [ ] All returned payments within date range
- [ ] 422 (invalid dates like "2024-13-45")

---

### TC-5: List Payments with Amount Range Filter

**Endpoint:** `GET /api/v1/admin/payments?minAmount=5000&maxAmount=50000`

**Test Steps:**
```bash
curl -X GET "http://localhost:3000/api/v1/admin/payments?minAmount=5000&maxAmount=50000" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Test Cases:**
- [ ] Filter by minAmount only
- [ ] Filter by maxAmount only
- [ ] Filter by both minAmount and maxAmount
- [ ] minAmount > maxAmount (should still work, just return empty)

**Expected Results:**
- [ ] All returned payments within amount range (in piasters)
- [ ] Negative amounts return 422 error
- [ ] Non-numeric amounts return 422 error

---

### TC-6: List Payments with Pagination

**Endpoint:** `GET /api/v1/admin/payments?limit=10&offset=0`

**Test Steps:**
```bash
# Page 1
curl -X GET "http://localhost:3000/api/v1/admin/payments?limit=10&offset=0" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Page 2
curl -X GET "http://localhost:3000/api/v1/admin/payments?limit=10&offset=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Expected Results:**
- [ ] First page returns up to 10 items
- [ ] Second page returns different items
- [ ] `pagination.limit` = 10
- [ ] `pagination.offset` = 0 (first) or 10 (second)
- [ ] `pagination.hasMore` = true (if more items exist)
- [ ] `pagination.hasMore` = false (if at end)
- [ ] Max limit of 100 is enforced (limit > 100 returns 422)

---

### TC-7: Get Payment Detail

**Endpoint:** `GET /api/v1/admin/payments/:paymentId`

**Test Steps:**
```bash
curl -X GET "http://localhost:3000/api/v1/admin/payments/$PAYMENT_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Test Cases:**
- [ ] Valid payment ID returns full details
- [ ] Invalid payment ID returns 404
- [ ] Empty payment ID returns 422 validation error

**Expected Results:**
- [ ] Status code: 200
- [ ] Response contains all payment details
- [ ] Response includes `user` object with name and email
- [ ] Response includes `events` array with payment history
- [ ] Response includes `enrollment` object (if exists)
- [ ] Response includes Paymob transaction IDs (if applicable)

---

### TC-8: Search Payments

**Endpoint:** `GET /api/v1/admin/payments/search?query=test`

**Test Steps:**
```bash
# Search by email
curl -X GET "http://localhost:3000/api/v1/admin/payments/search?query=test@example.com" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Search by user name
curl -X GET "http://localhost:3000/api/v1/admin/payments/search?query=John" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Search by payment ID
curl -X GET "http://localhost:3000/api/v1/admin/payments/search?query=payment-" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Search with custom limit
curl -X GET "http://localhost:3000/api/v1/admin/payments/search?query=test&limit=5" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Expected Results:**
- [ ] Returns payments matching email (case-insensitive)
- [ ] Returns payments matching user name (case-insensitive)
- [ ] Returns payments matching payment ID (case-insensitive)
- [ ] Empty query returns 422 error
- [ ] Query < 1 character returns 422 error
- [ ] Query > 100 characters returns 422 error
- [ ] Default limit of 20 is applied
- [ ] Custom limit respected

---

### TC-9: Get Payments by Status

**Endpoint:** `GET /api/v1/admin/payments/status/:status`

**Test Steps:**
```bash
curl -X GET "http://localhost:3000/api/v1/admin/payments/status/COMPLETED" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Test All Statuses:**
- [ ] COMPLETED
- [ ] PENDING
- [ ] FAILED
- [ ] WEBHOOK_PENDING
- [ ] REFUND_REQUESTED
- [ ] REFUNDED

**Expected Results:**
- [ ] Status code: 200
- [ ] All returned payments have matching status
- [ ] Invalid status returns 422 error
- [ ] Response includes count of matched payments

---

### TC-10: Get Payment Statistics

**Endpoint:** `GET /api/v1/admin/payments/stats`

**Test Steps:**
```bash
# Get all-time stats
curl -X GET "http://localhost:3000/api/v1/admin/payments/stats" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Get stats for specific date range
curl -X GET "http://localhost:3000/api/v1/admin/payments/stats?startDate=2024-01-01T00:00:00Z&endDate=2024-12-31T23:59:59Z" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Expected Results:**
- [ ] Status code: 200
- [ ] Response contains `total` count
- [ ] Response contains `totalAmount` in piasters
- [ ] Response contains `byStatus` array with breakdown by status
- [ ] Each status entry has: `status`, `count`, `amount`
- [ ] Sum of status counts equals total
- [ ] Sum of status amounts equals totalAmount

---

### TC-11: Create Manual Payment

**Endpoint:** `POST /api/v1/admin/payments/manual`

**Test Steps:**
```bash
curl -X POST "http://localhost:3000/api/v1/admin/payments/manual" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$USER_ID'",
    "packageId": "'$PACKAGE_ID'",
    "amount": 10000,
    "reason": "Manual payment for testing purposes"
  }'
```

**Test Cases:**
1. **Happy Path:**
   - [ ] All required fields provided
   - [ ] Status code: 201
   - [ ] Payment created with status COMPLETED
   - [ ] Payment event created
   - [ ] Audit log entry created
   - [ ] Enrollment triggered (user should be enrolled)
   - [ ] Enrollment activation email sent
   - [ ] Response includes new payment object

2. **Missing Fields:**
   - [ ] Missing `userId` → 422
   - [ ] Missing `packageId` → 422
   - [ ] Missing `amount` → 422
   - [ ] Missing `reason` → 422

3. **Invalid Values:**
   - [ ] `userId` = empty string → 422
   - [ ] `packageId` = empty string → 422
   - [ ] `amount` = 50 (< 100) → 422
   - [ ] `amount` = "10000" (string) → 422
   - [ ] `reason` = "abc" (< 5 chars) → 422
   - [ ] `reason` = string > 500 chars → 422

4. **Non-existent Records:**
   - [ ] Non-existent `userId` → should throw error
   - [ ] Non-existent `packageId` → should throw error

5. **Duplicate Enrollment:**
   - [ ] User already enrolled → should throw error "already enrolled"

6. **Admin Authorization:**
   - [ ] Request without token → 401
   - [ ] Request with non-admin user token → 401

---

### TC-12: Override Payment Status

**Endpoint:** `POST /api/v1/admin/payments/:paymentId/override`

**Test Steps:**
```bash
# Override to REFUNDED
curl -X POST "http://localhost:3000/api/v1/admin/payments/$PAYMENT_ID/override" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "newStatus": "REFUNDED",
    "reason": "Customer refund request",
    "adminNotes": "Refunded via manual override"
  }'
```

**Test Cases:**
1. **Happy Path:**
   - [ ] Status code: 200
   - [ ] Payment status updated
   - [ ] Payment event created
   - [ ] Audit log entry created
   - [ ] Response includes updated payment

2. **Status Transitions:**
   - [ ] COMPLETED → REFUNDED: Should revoke enrollment
   - [ ] PENDING → COMPLETED: Should create enrollment
   - [ ] FAILED → COMPLETED: Should create enrollment
   - [ ] COMPLETED → FAILED: Should revoke enrollment
   - [ ] WEBHOOK_PENDING → COMPLETED: Should create enrollment
   - [ ] COMPLETED → WEBHOOK_PENDING: Should revoke enrollment

3. **Validation:**
   - [ ] Invalid status → 422
   - [ ] Missing `newStatus` → 422
   - [ ] Missing `reason` → 422
   - [ ] `reason` < 5 chars → 422
   - [ ] `reason` > 500 chars → 422

4. **Authorization:**
   - [ ] Request without token → 401
   - [ ] Non-admin user → 401

5. **Error Cases:**
   - [ ] Non-existent payment → 404

---

### TC-13: Revoke Payment

**Endpoint:** `POST /api/v1/admin/payments/:paymentId/revoke`

**Test Steps:**
```bash
curl -X POST "http://localhost:3000/api/v1/admin/payments/$PAYMENT_ID/revoke" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Customer requested full refund"
  }'
```

**Test Cases:**
1. **Happy Path:**
   - [ ] Status code: 200
   - [ ] Payment status set to REFUNDED
   - [ ] Enrollment revoked (user should be unenrolled)
   - [ ] Audit log entry created
   - [ ] Response includes updated payment

2. **Validation:**
   - [ ] Missing `reason` → 422
   - [ ] `reason` = empty string → 422
   - [ ] `reason` < 5 chars → 422
   - [ ] `reason` > 500 chars → 422

3. **Authorization:**
   - [ ] Request without token → 401
   - [ ] Non-admin user → 401

4. **Error Cases:**
   - [ ] Non-existent payment → 404

---

## Verification Checklist

### Database Verification

After each test, verify database changes:

```bash
# Check payment was created/updated
psql -U postgres -d eduflow -c \
  "SELECT id, userId, status, createdAt FROM payment WHERE id = '$PAYMENT_ID';"

# Check enrollment was created
psql -U postgres -d eduflow -c \
  "SELECT userId, status, enrolledAt FROM enrollment WHERE userId = '$USER_ID';"

# Check audit log entry
psql -U postgres -d eduflow -c \
  "SELECT adminId, action, paymentId FROM admin_audit_log WHERE paymentId = '$PAYMENT_ID' ORDER BY createdAt DESC LIMIT 1;"

# Check payment event
psql -U postgres -d eduflow -c \
  "SELECT paymentId, eventType, status FROM payment_event WHERE paymentId = '$PAYMENT_ID' ORDER BY createdAt DESC LIMIT 1;"
```

### Logs Verification

Check application logs for:
- [ ] No ERROR level logs
- [ ] All operations logged with request context
- [ ] Payment operations include admin ID
- [ ] Enrollment changes logged
- [ ] Email sending attempts logged (success or failure)

```bash
# View logs
tail -f logs/app.log | grep -i "payment\|enrollment\|audit"
```

### Email Verification

For manual payment creation:
- [ ] Enrollment activation email sent to user
- [ ] Email includes course name
- [ ] Email includes enrollment date
- [ ] Email has action link to dashboard

---

## Edge Cases

### EC-1: Concurrent Requests
- [ ] Create 2 manual payments for same user simultaneously
- [ ] Only one should succeed; other should fail

### EC-2: Large Result Sets
- [ ] Search query that matches 1000+ payments
- [ ] Pagination should work correctly
- [ ] Response should not timeout

### EC-3: Special Characters
- [ ] Reason with special characters: `!@#$%^&*()`
- [ ] Search query with special characters
- [ ] Admin notes with newlines and tabs

### EC-4: Boundary Values
- [ ] Amount = 100 (minimum)
- [ ] Amount = 9999999 (very large)
- [ ] Reason = exactly 5 characters
- [ ] Reason = exactly 500 characters

### EC-5: Database Errors
- [ ] Create payment when package no longer exists
- [ ] Override status when audit log table is full
- [ ] Revoke payment when enrollment table is corrupted

---

## Performance Benchmarks

### Expected Response Times

- [ ] List 50 payments: < 100ms
- [ ] Search 1000 payments: < 200ms
- [ ] Get payment detail: < 50ms
- [ ] Create manual payment: < 500ms (includes email)
- [ ] Override status: < 300ms
- [ ] Revoke payment: < 300ms

### Load Testing

```bash
# Test 10 concurrent list requests
for i in {1..10}; do
  curl -X GET "http://localhost:3000/api/v1/admin/payments" \
    -H "Authorization: Bearer $ADMIN_TOKEN" &
done
wait
```

---

## Sign-Off Checklist

- [ ] All test cases passed
- [ ] No validation errors
- [ ] All database changes verified
- [ ] No error logs
- [ ] Response times acceptable
- [ ] Email notifications working
- [ ] Authorization properly enforced
- [ ] Pagination working correctly
- [ ] Edge cases handled
- [ ] Documentation accurate

---

## Bug Report Template

If issues are found:

```
**Test Case:** TC-X: [Test Name]
**Environment:** [dev/staging/production]
**Expected:** [What should happen]
**Actual:** [What actually happened]
**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]
3. [Step 3]
**Database State:**
- Payment: [id, status]
- Enrollment: [userId, status]
- Logs: [relevant error messages]
```
