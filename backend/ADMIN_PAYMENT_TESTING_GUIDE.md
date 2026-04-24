# Admin Payment Management: Manual Testing Guide

**Last Updated:** April 24, 2026  
**Purpose:** Step-by-step manual testing procedures for admin payment operations  
**Duration:** ~30-45 minutes for full test suite

---

## Setup Prerequisites

### 1. Environment Setup

```bash
# Start development server
npm run dev

# In another terminal, ensure database is running
# PostgreSQL should be accessible

# Verify backend is running
curl http://localhost:3000/api/v1/admin/health
# Expected response: {"scope": "admin"}
```

### 2. Create Test Data

```bash
# Create test admin user
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-admin@test.com",
    "password": "AdminPassword123!",
    "name": "Test Admin",
    "role": "ADMIN"
  }'

# Create test student user
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-student@test.com",
    "password": "StudentPassword123!",
    "name": "Test Student"
  }'

# Get admin token (for testing)
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-admin@test.com",
    "password": "AdminPassword123!"
  }'
# Response: {"token": "eyJhbGci..."}
# Save this token for use in all requests below
```

### 3. Verify Test Data

```bash
# Get student user ID (needed for manual payment test)
curl -X GET http://localhost:3000/api/v1/admin/students/search?query=test-student@test.com \
  -H "Authorization: Bearer <admin-token>"
# Response will include user_id

# Get package ID (needed for manual payment test)
curl -X GET http://localhost:3000/api/v1/course \
  -H "Authorization: Bearer <admin-token>"
# Response will include packageId
```

---

## Test Cases

### Test Case 1: List Payments (Default)

**Objective:** Verify list payments endpoint returns paginated results

**Prerequisites:**
- Admin token obtained
- At least one payment exists in database

**Steps:**

1. **Make request:**
   ```bash
   curl -X GET http://localhost:3000/api/v1/admin/payments \
     -H "Authorization: Bearer <admin-token>"
   ```

2. **Verify response code:** 200 OK

3. **Verify response structure:**
   ```json
   {
     "success": true,
     "data": {
       "payments": [
         {
           "id": "string",
           "userId": "string",
           "amount": number,
           "status": "string",
           "refundStatus": null or "string",
           "createdAt": "ISO datetime",
           "user": {
             "email": "string",
             "name": "string"
           }
         }
       ],
       "pagination": {
         "total": number >= 0,
         "limit": 50,
         "offset": 0,
         "hasMore": boolean
       }
     }
   }
   ```

4. **Verify values:**
   - `success` = true
   - `pagination.limit` = 50
   - `pagination.offset` = 0
   - `pagination.total` >= 0
   - `payments` is array

5. **Pass Criteria:** ✅ Response matches structure and values

---

### Test Case 2: List Payments with Filters

**Objective:** Verify filtering by status works correctly

**Prerequisites:**
- Admin token obtained
- Payments with COMPLETED status exist

**Steps:**

1. **Make request with status filter:**
   ```bash
   curl -X GET "http://localhost:3000/api/v1/admin/payments?status=COMPLETED&limit=10" \
     -H "Authorization: Bearer <admin-token>"
   ```

2. **Verify response code:** 200 OK

3. **Verify all payments have matching status:**
   ```bash
   # Check in response
   response.data.payments.forEach(p => {
     assert(p.status === "COMPLETED", `Expected COMPLETED, got ${p.status}`)
   })
   ```

4. **Verify pagination:**
   - `limit` = 10
   - `offset` = 0
   - `hasMore` = boolean based on total

5. **Pass Criteria:** ✅ All payments match filter + correct pagination

---

### Test Case 3: List Payments with Date Range Filter

**Objective:** Verify filtering by date range works

**Prerequisites:**
- Admin token obtained
- Payments from today exist

**Steps:**

1. **Calculate date range:**
   ```bash
   startDate="2026-04-24T00:00:00Z"
   endDate="2026-04-24T23:59:59Z"
   ```

2. **Make request:**
   ```bash
   curl -X GET "http://localhost:3000/api/v1/admin/payments?startDate=2026-04-24T00:00:00Z&endDate=2026-04-24T23:59:59Z" \
     -H "Authorization: Bearer <admin-token>"
   ```

3. **Verify response code:** 200 OK

4. **Verify all payments are within date range:**
   ```bash
   response.data.payments.forEach(p => {
     const createdAt = new Date(p.createdAt);
     assert(createdAt >= startDate && createdAt <= endDate);
   })
   ```

5. **Pass Criteria:** ✅ All payments within specified date range

---

### Test Case 4: Search Payments

**Objective:** Verify search by email works

**Prerequisites:**
- Admin token obtained
- Payment for test-student@test.com exists

**Steps:**

1. **Make search request:**
   ```bash
   curl -X GET "http://localhost:3000/api/v1/admin/payments/search?query=test-student@test.com&limit=20" \
     -H "Authorization: Bearer <admin-token>"
   ```

2. **Verify response code:** 200 OK

3. **Verify response structure:**
   ```json
   {
     "success": true,
     "data": [
       {
         "id": "string",
         "userId": "string",
         "user": {
           "email": "string",
           "name": "string"
         }
       }
     ],
     "count": number
   }
   ```

4. **Verify search results contain query:**
   ```bash
   response.data.forEach(p => {
     assert(
       p.user.email.includes("test-student") ||
       p.id.includes("test-student"),
       "Payment doesn't match search query"
     )
   })
   ```

5. **Pass Criteria:** ✅ Results match search query

---

### Test Case 5: Get Payment Detail

**Objective:** Verify getting payment detail with full information

**Prerequisites:**
- Admin token obtained
- Payment ID known (from earlier test)

**Steps:**

1. **Make request:**
   ```bash
   curl -X GET "http://localhost:3000/api/v1/admin/payments/pay_<id>" \
     -H "Authorization: Bearer <admin-token>"
   ```

2. **Verify response code:** 200 OK

3. **Verify response includes:**
   - `id` - Payment ID
   - `userId` - User who made payment
   - `status` - Current payment status
   - `user` - User details (email, name)
   - `events` - Array of PaymentEvent objects
   - `enrollment` - Enrollment details if enrolled

4. **Verify events array:**
   ```bash
   assert(response.data.events.length > 0, "No payment events found");
   response.data.events.forEach(e => {
     assert(e.eventType !== undefined);
     assert(e.status !== undefined);
   })
   ```

5. **Verify enrollment if active:**
   ```bash
   if (response.data.status === "COMPLETED") {
     assert(response.data.enrollment !== null, "COMPLETED payment should have enrollment");
     assert(response.data.enrollment.status === "ACTIVE", "Enrollment should be active");
   }
   ```

6. **Pass Criteria:** ✅ Full payment details returned with events and enrollment

---

### Test Case 6: Get Payments by Status

**Objective:** Verify filtering by status enum

**Prerequisites:**
- Admin token obtained

**Steps:**

1. **Test each status:**
   ```bash
   for status in COMPLETED FAILED PENDING REFUND_REQUESTED; do
     curl -X GET "http://localhost:3000/api/v1/admin/payments/status/$status?limit=5" \
       -H "Authorization: Bearer <admin-token>"
   done
   ```

2. **For each response, verify:**
   - Response code 200 OK
   - All payments have matching status
   - `count` >= 0

3. **Test invalid status:**
   ```bash
   curl -X GET "http://localhost:3000/api/v1/admin/payments/status/INVALID_STATUS" \
     -H "Authorization: Bearer <admin-token>"
   ```

4. **Verify invalid status returns 422:**
   ```json
   {
     "error": "VALIDATION_ERROR",
     "fields": {
       "status": "Invalid enum value"
     }
   }
   ```

5. **Pass Criteria:** ✅ All valid statuses work + invalid returns 422

---

### Test Case 7: Get Payment Statistics

**Objective:** Verify statistics endpoint returns correct format

**Prerequisites:**
- Admin token obtained
- Multiple payments exist

**Steps:**

1. **Make request (no date range):**
   ```bash
   curl -X GET "http://localhost:3000/api/v1/admin/payments/stats" \
     -H "Authorization: Bearer <admin-token>"
   ```

2. **Verify response structure:**
   ```json
   {
     "success": true,
     "data": {
       "COMPLETED": {
         "count": number >= 0,
         "totalAmount": number >= 0
       },
       "PENDING": { "count": number, "totalAmount": number },
       "FAILED": { "count": number, "totalAmount": number }
     }
   }
   ```

3. **Verify counts sum correctly:**
   ```bash
   totalCount = sum of all count values
   # Verify totalCount matches payments in database
   ```

4. **Test with date range:**
   ```bash
   curl -X GET "http://localhost:3000/api/v1/admin/payments/stats?startDate=2026-04-01T00:00:00Z&endDate=2026-04-30T23:59:59Z" \
     -H "Authorization: Bearer <admin-token>"
   ```

5. **Verify date range stats are less than or equal to all-time stats**

6. **Pass Criteria:** ✅ Stats structure correct + counts accurate

---

### Test Case 8: Create Manual Payment (Happy Path)

**Objective:** Verify manual payment creation and enrollment trigger

**Prerequisites:**
- Admin token obtained
- Test student user ID: `<student_user_id>`
- Package ID: `<package_id>`

**Steps:**

1. **Make request:**
   ```bash
   curl -X POST "http://localhost:3000/api/v1/admin/payments/manual" \
     -H "Authorization: Bearer <admin-token>" \
     -H "Content-Type: application/json" \
     -d '{
       "userId": "<student_user_id>",
       "packageId": "<package_id>",
       "amount": 10000,
       "reason": "Testing manual payment creation",
       "adminNotes": "Test case for manual enrollment"
     }'
   ```

2. **Verify response code:** 201 Created

3. **Verify response includes:**
   ```json
   {
     "success": true,
     "data": {
       "id": "string",
       "userId": "<student_user_id>",
       "status": "COMPLETED",
       "createdAt": "ISO datetime",
       "paymentMethod": "MANUAL",
       "enrollment": {
         "id": "string",
         "status": "ACTIVE"
       }
     }
   }
   ```

4. **Verify in database:**
   ```bash
   # Query Payment
   SELECT id, status, userId FROM "Payment" WHERE id = '<payment_id>'
   # Should return: COMPLETED status
   
   # Query Enrollment
   SELECT id, status FROM "Enrollment" WHERE userId = '<student_user_id>'
   # Should return: ACTIVE status
   
   # Query AdminAuditLog
   SELECT action, paymentId FROM "AdminAuditLog" WHERE paymentId = '<payment_id>'
   # Should return: CREATE_MANUAL_PAYMENT action
   ```

5. **Verify enrollment is active:**
   ```bash
   # Student should now be able to access course
   curl http://localhost:3000/api/v1/enrollment \
     -H "Authorization: Bearer <student-token>"
   # Should return enrolled status
   ```

6. **Pass Criteria:** ✅ Payment created + enrollment active + audit logged

---

### Test Case 9: Create Manual Payment (User Not Found)

**Objective:** Verify error handling when user doesn't exist

**Prerequisites:**
- Admin token obtained

**Steps:**

1. **Make request with non-existent user:**
   ```bash
   curl -X POST "http://localhost:3000/api/v1/admin/payments/manual" \
     -H "Authorization: Bearer <admin-token>" \
     -H "Content-Type: application/json" \
     -d '{
       "userId": "user_does_not_exist_99999",
       "packageId": "<package_id>",
       "amount": 10000,
       "reason": "Testing error case"
     }'
   ```

2. **Verify response code:** 404 Not Found

3. **Verify error message:**
   ```json
   {
     "error": "PAYMENT_NOT_FOUND",
     "message": "User user_does_not_exist_99999 not found"
   }
   ```

4. **Verify payment NOT created:**
   ```bash
   # Check database - should find no payment with this user
   ```

5. **Pass Criteria:** ✅ Returns 404 + payment not created

---

### Test Case 10: Create Manual Payment (Invalid Amount)

**Objective:** Verify validation of payment amount

**Prerequisites:**
- Admin token obtained

**Steps:**

1. **Test with amount too low:**
   ```bash
   curl -X POST "http://localhost:3000/api/v1/admin/payments/manual" \
     -H "Authorization: Bearer <admin-token>" \
     -H "Content-Type: application/json" \
     -d '{
       "userId": "<student_user_id>",
       "packageId": "<package_id>",
       "amount": 50,
       "reason": "Amount too low"
     }'
   ```

2. **Verify response code:** 422 Unprocessable Entity

3. **Verify error includes field validation:**
   ```json
   {
     "error": "VALIDATION_ERROR",
     "fields": {
       "amount": "Number must be greater than or equal to 100"
     }
   }
   ```

4. **Test with negative amount:**
   ```bash
   "amount": -1000
   ```

5. **Verify same validation error**

6. **Pass Criteria:** ✅ Validates minimum amount

---

### Test Case 11: Create Manual Payment (Duplicate Enrollment)

**Objective:** Verify prevention of duplicate active enrollment

**Prerequisites:**
- Admin token obtained
- Test student already has active enrollment

**Steps:**

1. **Make request for already-enrolled user:**
   ```bash
   curl -X POST "http://localhost:3000/api/v1/admin/payments/manual" \
     -H "Authorization: Bearer <admin-token>" \
     -H "Content-Type: application/json" \
     -d '{
       "userId": "<already_enrolled_user_id>",
       "packageId": "<package_id>",
       "amount": 10000,
       "reason": "Try to enroll again"
     }'
   ```

2. **Verify response code:** 400 Bad Request or 404

3. **Verify error message indicates duplicate:**
   ```json
   {
     "error": "PAYMENT_NOT_FOUND",
     "message": "User ... already enrolled"
   }
   ```

4. **Verify no duplicate payment created**

5. **Pass Criteria:** ✅ Prevents duplicate enrollment

---

### Test Case 12: Override Payment Status

**Objective:** Verify payment status override triggers enrollment changes

**Prerequisites:**
- Admin token obtained
- Payment ID from earlier test (or create new one)

**Steps:**

1. **Override to COMPLETED:**
   ```bash
   curl -X POST "http://localhost:3000/api/v1/admin/payments/pay_<id>/override" \
     -H "Authorization: Bearer <admin-token>" \
     -H "Content-Type: application/json" \
     -d '{
       "newStatus": "COMPLETED",
       "reason": "Paymob webhook issue - manual verification"
     }'
   ```

2. **Verify response code:** 200 OK

3. **Verify status updated:**
   ```bash
   # Query database
   SELECT status FROM "Payment" WHERE id = 'pay_<id>'
   # Should return: COMPLETED
   ```

4. **Verify enrollment triggered:**
   ```bash
   SELECT id, status FROM "Enrollment" WHERE paymentId = 'pay_<id>'
   # Should return: ACTIVE
   ```

5. **Verify audit logged:**
   ```bash
   SELECT action FROM "AdminAuditLog" WHERE paymentId = 'pay_<id>'
   # Should include: OVERRIDE_PAYMENT_STATUS
   ```

6. **Test override to FAILED:**
   ```bash
   # Create another payment first
   # Override status to FAILED
   # Verify enrollment is revoked
   ```

7. **Pass Criteria:** ✅ Status updated + enrollment changes + audit logged

---

### Test Case 13: Override Payment Status (Invalid Status)

**Objective:** Verify enum validation for status

**Prerequisites:**
- Admin token obtained
- Payment ID

**Steps:**

1. **Make request with invalid status:**
   ```bash
   curl -X POST "http://localhost:3000/api/v1/admin/payments/pay_<id>/override" \
     -H "Authorization: Bearer <admin-token>" \
     -H "Content-Type: application/json" \
     -d '{
       "newStatus": "INVALID_STATUS",
       "reason": "Testing validation"
     }'
   ```

2. **Verify response code:** 422 Unprocessable Entity

3. **Verify error includes field validation:**
   ```json
   {
     "error": "VALIDATION_ERROR",
     "fields": {
       "newStatus": "Invalid enum value 'INVALID_STATUS'"
     }
   }
   ```

4. **Pass Criteria:** ✅ Validates enum values

---

### Test Case 14: Revoke Payment

**Objective:** Verify payment revocation and enrollment revocation

**Prerequisites:**
- Admin token obtained
- Payment with active enrollment

**Steps:**

1. **Make revoke request:**
   ```bash
   curl -X POST "http://localhost:3000/api/v1/admin/payments/pay_<id>/revoke" \
     -H "Authorization: Bearer <admin-token>" \
     -H "Content-Type: application/json" \
     -d '{
       "reason": "User requested refund"
     }'
   ```

2. **Verify response code:** 200 OK

3. **Verify payment status changed:**
   ```bash
   SELECT status FROM "Payment" WHERE id = 'pay_<id>'
   # Should return: FAILED
   ```

4. **Verify enrollment revoked:**
   ```bash
   SELECT id, status, revokedAt FROM "Enrollment" WHERE paymentId = 'pay_<id>'
   # Should return: status = REVOKED, revokedAt = not null
   ```

5. **Verify student loses access:**
   ```bash
   # Try to list enrollments as student
   # Should not show this course anymore
   ```

6. **Verify audit logged:**
   ```bash
   SELECT action FROM "AdminAuditLog" WHERE paymentId = 'pay_<id>'
   # Should include: REVOKE_PAYMENT
   ```

7. **Pass Criteria:** ✅ Payment revoked + enrollment revoked + audit logged

---

### Test Case 15: Revoke Payment (Short Reason)

**Objective:** Verify reason validation

**Prerequisites:**
- Admin token obtained
- Payment ID

**Steps:**

1. **Make request with short reason:**
   ```bash
   curl -X POST "http://localhost:3000/api/v1/admin/payments/pay_<id>/revoke" \
     -H "Authorization: Bearer <admin-token>" \
     -H "Content-Type: application/json" \
     -d '{
       "reason": "no"
     }'
   ```

2. **Verify response code:** 422 Unprocessable Entity

3. **Verify error message:**
   ```json
   {
     "error": "VALIDATION_ERROR",
     "fields": {
       "reason": "String must contain at least 5 character(s)"
     }
   }
   ```

4. **Pass Criteria:** ✅ Validates minimum reason length

---

### Test Case 16: Unauthorized Access

**Objective:** Verify ADMIN role enforcement

**Prerequisites:**
- Student token (not admin)

**Steps:**

1. **Try to access admin endpoint with student token:**
   ```bash
   curl -X GET "http://localhost:3000/api/v1/admin/payments" \
     -H "Authorization: Bearer <student-token>"
   ```

2. **Verify response code:** 401 or 403 (Unauthorized or Forbidden)

3. **Verify error message indicates auth failure**

4. **Try POST as student:**
   ```bash
   curl -X POST "http://localhost:3000/api/v1/admin/payments/manual" \
     -H "Authorization: Bearer <student-token>" \
     -d '{...}'
   ```

5. **Verify same authorization error**

6. **Pass Criteria:** ✅ Students cannot access admin endpoints

---

### Test Case 17: Missing Token

**Objective:** Verify authentication is required

**Prerequisites:**
- None

**Steps:**

1. **Make request without token:**
   ```bash
   curl -X GET "http://localhost:3000/api/v1/admin/payments"
   ```

2. **Verify response code:** 401 Unauthorized

3. **Verify error indicates missing token**

4. **Pass Criteria:** ✅ Token required for access

---

### Test Case 18: Pagination

**Objective:** Verify pagination works correctly

**Prerequisites:**
- Admin token obtained
- Multiple payments exist (>50)

**Steps:**

1. **Get first page (default):**
   ```bash
   curl -X GET "http://localhost:3000/api/v1/admin/payments?limit=10&offset=0" \
     -H "Authorization: Bearer <admin-token>"
   ```

2. **Verify response:**
   ```json
   {
     "data": {
       "payments": [... 10 items ...],
       "pagination": {
         "limit": 10,
         "offset": 0,
         "hasMore": true
       }
     }
   }
   ```

3. **Get second page:**
   ```bash
   curl -X GET "http://localhost:3000/api/v1/admin/payments?limit=10&offset=10" \
     -H "Authorization: Bearer <admin-token>"
   ```

4. **Verify:**
   - Different items than page 1
   - `offset` = 10

5. **Test large limit:**
   ```bash
   # limit=100 (max allowed)
   ```

6. **Verify returns max 100 items**

7. **Pass Criteria:** ✅ Pagination works correctly

---

## Test Summary

**Total Test Cases:** 18  
**Estimated Duration:** 30-45 minutes

**Test Coverage:**
- ✅ GET /admin/payments (4 tests)
- ✅ GET /admin/payments/:paymentId (2 tests)
- ✅ GET /admin/payments/search (1 test)
- ✅ GET /admin/payments/status/:status (1 test)
- ✅ GET /admin/payments/stats (1 test)
- ✅ POST /admin/payments/manual (5 tests)
- ✅ POST /admin/payments/:paymentId/override (2 tests)
- ✅ POST /admin/payments/:paymentId/revoke (2 tests)
- ✅ Authentication/Authorization (2 tests)
- ✅ Pagination (1 test)

---

## Cleanup

After testing, clean up test data:

```bash
# Delete test payments
DELETE FROM "Payment" WHERE paymentMethod = 'MANUAL' AND createdAt > NOW() - INTERVAL '1 hour';

# Delete test enrollments
DELETE FROM "Enrollment" WHERE userId IN (
  SELECT id FROM "User" WHERE email LIKE 'test-%@test.com'
);

# Delete test users (optional - keep for future testing)
DELETE FROM "User" WHERE email LIKE 'test-%@test.com';

# Verify cleanup
SELECT COUNT(*) FROM "Payment" WHERE paymentMethod = 'MANUAL';
```

---

## Sign-Off

**Testing Complete:** When all 18 tests pass, Phase 6 admin payment management is verified and ready for deployment.

- [ ] Test Case 1: List Payments (Default)
- [ ] Test Case 2: List Payments with Filters
- [ ] Test Case 3: List Payments with Date Range Filter
- [ ] Test Case 4: Search Payments
- [ ] Test Case 5: Get Payment Detail
- [ ] Test Case 6: Get Payments by Status
- [ ] Test Case 7: Get Payment Statistics
- [ ] Test Case 8: Create Manual Payment (Happy Path)
- [ ] Test Case 9: Create Manual Payment (User Not Found)
- [ ] Test Case 10: Create Manual Payment (Invalid Amount)
- [ ] Test Case 11: Create Manual Payment (Duplicate Enrollment)
- [ ] Test Case 12: Override Payment Status
- [ ] Test Case 13: Override Payment Status (Invalid Status)
- [ ] Test Case 14: Revoke Payment
- [ ] Test Case 15: Revoke Payment (Short Reason)
- [ ] Test Case 16: Unauthorized Access
- [ ] Test Case 17: Missing Token
- [ ] Test Case 18: Pagination

**Overall Result:** _________________ (PASS/FAIL)
