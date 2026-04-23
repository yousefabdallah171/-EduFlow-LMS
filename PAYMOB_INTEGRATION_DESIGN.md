# EduFlow LMS - Comprehensive Paymob Integration Design

**Document Version:** 1.0  
**Date:** April 24, 2026  
**Status:** Design Phase - Awaiting Approval  
**Scope:** Complete payment processing with all states, error handling, and edge cases  
**Timeline:** Unlimited  
**Team Size:** 1000+ developers available  

---

## Executive Summary

This document outlines a production-grade Paymob payment integration for EduFlow LMS with:
- **Complete payment state machine** (PENDING, COMPLETED, FAILED, REFUND_REQUESTED, REFUNDED, DISPUTED, CANCELLED, WEBHOOK_PENDING)
- **Comprehensive error handling** for all failure scenarios
- **Edge case coverage** (concurrent checkouts, already enrolled, API failures, webhook retries)
- **Event sourcing** for complete audit trail
- **Idempotent webhooks** preventing duplicate processing
- **Admin tools** for payment reconciliation and manual overrides
- **User UX flows** for all payment outcomes
- **Monitoring & observability** for production reliability
- **Full refund capability** with state tracking
- **Unit test coverage** for all critical paths

---

## Section 1: Current State Analysis

### What's Working
✅ Basic Paymob OAuth integration (auth tokens)  
✅ Order creation via Paymob API  
✅ Payment key generation  
✅ Frontend iframe redirect  
✅ Webhook receiving  
✅ HMAC signature validation  
✅ Coupon system  
✅ Basic payment recording  
✅ Enrollment trigger on success  
✅ Email notifications  

### Critical Gaps
❌ Only 2 payment states (PENDING, COMPLETED, FAILED) - missing REFUND, DISPUTED, CANCELLED, WEBHOOK_PENDING  
❌ No event audit trail - can't reconstruct payment history  
❌ No idempotency key tracking - webhooks could process twice  
❌ No Paymob API error handling - silent failures  
❌ No retry mechanism - failed enrollments/emails are lost  
❌ No UX for failure states - student sees blank page if payment fails  
❌ No admin payment management - no way to fix stuck payments  
❌ No refund handling - can't process refunds  
❌ No webhook replay handling - if Paymob retries webhook, duplicate processing  
❌ No concurrent checkout prevention - multiple checkouts for same user  
❌ No auth gate - anonymous users can't checkout (need login first)  
❌ No payment pending UX - student doesn't know payment is processing  
❌ No reconciliation tools - can't verify payments match Paymob  
❌ No monitoring/alerting - payment failures invisible  
❌ No unit tests for payment logic  

---

## Section 2: Payment State Machine

### State Diagram

```
┌─────────────┐
│  INITIATED  │ ← Student starts checkout
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│ AWAITING_PAYMENT │ ← Payment key generated, redirected to iframe
└──────┬───────────┘
       │
       ├─────────────────────────────────────┐
       │                                     │
       ▼                                     ▼
┌─────────────────┐                  ┌──────────────────┐
│   WEBHOOK_      │                  │   WEBHOOK_       │
│   PENDING       │                  │   PENDING        │
│ (timeout case)  │                  │ (network error)  │
└─────┬───────────┘                  └──────┬───────────┘
      │                                     │
      ├─→ Webhook arrives after timeout    │
      │   (state → COMPLETED)              │
      │                                     │
      └─→ User polls (via API) ←───────────┘
          (gets current status)
       
       ┌────────────────────────────────────────────┐
       │                                            │
       ▼                                            ▼
┌────────────┐                            ┌──────────┐
│ COMPLETED  │ ← Webhook: success=true    │  FAILED  │ ← Webhook: success=false
└─────┬──────┘                            └────┬─────┘
      │                                        │
      ├─→ Create Enrollment                   ├─→ Store error details
      ├─→ Send Receipt Email                  ├─→ Mark payment as failed
      ├─→ Invalidate cache                    ├─→ Flag for admin review
      └─→ Increment coupon usage              └─→ Student sees retry option

┌──────────────────────────────────────────────────────┐
│ REFUND / DISPUTE STATES (from COMPLETED)            │
└──────────────────────────────────────────────────────┘

COMPLETED
   │
   ├─→ Admin initiates refund
   │   └─→ REFUND_REQUESTED ─→ Paymob API call ─→ REFUNDED / REFUND_FAILED
   │
   └─→ Dispute from Paymob
       └─→ DISPUTED ─→ Admin reviews ─→ RESOLVED / REFUNDED

```

### State Definitions

| State | Meaning | Triggers | Actions | Next States |
|-------|---------|----------|---------|------------|
| **INITIATED** | Checkout form submitted, user entering details | User clicks "Pay" button | Create payment record | AWAITING_PAYMENT |
| **AWAITING_PAYMENT** | Payment key generated, waiting for user to pay | Paymob iframe ready, user on payment page | Generate payment key, store key | WEBHOOK_PENDING, FAILED, CANCELLED |
| **WEBHOOK_PENDING** | Webhook not received yet, student waiting | User returned from iframe or stayed on pending page | Poll for status, wait for webhook | COMPLETED, FAILED, TIMEOUT |
| **COMPLETED** | Payment successful | Webhook received with success=true | Enroll student, send emails, update cache | REFUND_REQUESTED, DISPUTED |
| **FAILED** | Payment failed at Paymob | Webhook received with success=false | Log error, flag for review, notify student | AWAITING_PAYMENT (retry) |
| **CANCELLED** | Student cancelled checkout before paying | User closed iframe or timed out | Mark as cancelled, cleanup | AWAITING_PAYMENT (retry) |
| **WEBHOOK_PENDING_TIMEOUT** | Webhook not received in 10 minutes | No webhook after AWAITING_PAYMENT | Poll endpoint, retry webhook | COMPLETED, FAILED, MANUAL_REVIEW |
| **ENROLLMENT_FAILED** | Payment succeeded but enrollment failed (rare) | Enrollment service threw error | Store error, flag for admin | COMPLETED (manual recovery) |
| **EMAIL_FAILED** | Payment succeeded, enrollment OK, email failed | Email service threw error | Log error, retry async | COMPLETED (emails retry later) |
| **REFUND_REQUESTED** | Admin initiated refund | Admin clicks "Refund" button | Call Paymob refund API | REFUNDED, REFUND_FAILED |
| **REFUNDED** | Refund completed | Paymob API returned success | Reverse enrollment, update records | REFUND_COMPLETED |
| **REFUND_FAILED** | Refund failed | Paymob API returned error | Log error, flag for admin retry | REFUND_REQUESTED (retry) |
| **DISPUTED** | Chargeback/dispute from Paymob | Paymob webhook received | Flag for admin, await decision | RESOLVED, REFUNDED |
| **MANUAL_OVERRIDE** | Admin manually marked as paid | Admin clicks "Mark Paid" | Create enrollment, send emails | COMPLETED |

---

## Section 3: Database Schema Extensions

### Payments Table (Enhanced)

```typescript
// Current schema additions needed:
enum PaymentStatus {
  INITIATED
  AWAITING_PAYMENT
  WEBHOOK_PENDING
  COMPLETED
  FAILED
  CANCELLED
  ENROLLMENT_FAILED
  EMAIL_FAILED
  REFUND_REQUESTED
  REFUNDED
  REFUND_FAILED
  DISPUTED
  MANUAL_OVERRIDE
}

model Payment {
  // Existing fields
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id])
  packageId       String?
  package         Package?  @relation(fields: [packageId], references: [id])
  amountPiasters  Int
  discountPiasters Int       @default(0)
  currency        String
  couponId        String?
  coupon          Coupon?   @relation(fields: [couponId], references: [id])
  
  // Payment state tracking
  status          PaymentStatus  @default(INITIATED)
  
  // Paymob integration
  paymobOrderId           String?   @unique
  paymobTransactionId     String?   @unique
  paymobIdempotencyKey    String?   @unique // For webhook idempotency
  
  // Webhook tracking
  webhookReceivedAt       DateTime?
  webhookHmac             String?
  webhookPayload          Json?     // Store full webhook for audit
  webhookRetryCount       Int       @default(0)
  
  // Error tracking
  errorCode               String?   // PAYMOB_API_ERROR, ENROLLMENT_FAILED, etc
  errorMessage            String?
  errorDetails            Json?     // Full error for debugging
  
  // Refund tracking
  refundInitiatedAt       DateTime?
  refundInitiatedBy       String?   // Admin user ID
  refundAmount            Int?      // Partial refund support
  paymobRefundId          String?   @unique
  refundCompletedAt       DateTime?
  
  // Dispute tracking
  disputedAt              DateTime?
  disputeReason           String?
  resolvedAt              DateTime?
  resolvedBy              String?   // Admin user ID
  
  // Metadata
  ipAddress               String?
  userAgent               String?
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt
  
  // Relations
  events                  PaymentEvent[]
  
  @@index([userId])
  @@index([status])
  @@index([createdAt])
}
```

### Payment Events Table (New)

```typescript
enum PaymentEventType {
  INITIATED
  PAYMENT_KEY_GENERATED
  PAYMOB_API_ERROR
  WEBHOOK_RECEIVED
  WEBHOOK_VERIFIED
  WEBHOOK_DUPLICATE
  STATUS_CHANGED
  ENROLLMENT_TRIGGERED
  ENROLLMENT_SUCCEEDED
  ENROLLMENT_FAILED
  EMAIL_QUEUED
  EMAIL_SENT
  EMAIL_FAILED
  COUPON_INCREMENTED
  REFUND_INITIATED
  REFUND_API_CALL
  REFUND_SUCCEEDED
  REFUND_FAILED
  DISPUTE_RECEIVED
  MANUAL_OVERRIDE_APPLIED
  PAYMENT_POLLED
}

model PaymentEvent {
  id              String        @id @default(cuid())
  paymentId       String
  payment         Payment       @relation(fields: [paymentId], references: [id])
  
  eventType       PaymentEventType
  status          PaymentStatus?  // State after event
  previousStatus  PaymentStatus?  // State before event
  
  errorCode       String?
  errorMessage    String?
  
  metadata        Json?         // Event-specific data
  
  createdAt       DateTime      @default(now())
  
  @@index([paymentId])
  @@index([eventType])
  @@index([createdAt])
}
```

### Payment Reconciliation Table (New)

```typescript
model PaymentReconciliation {
  id              String    @id @default(cuid())
  paymentId       String
  payment         Payment   @relation(fields: [paymentId], references: [id])
  
  // Paymob vs Local comparison
  paymobStatus    String?   // From Paymob API
  localStatus     String    // From our database
  
  // Amounts
  paymobAmount    Int?
  localAmount     Int
  amountMismatch  Boolean   @default(false)
  
  // Reconciliation result
  isReconciled    Boolean   @default(false)
  reconciliedAt   DateTime?
  reconciliedBy   String?   // Admin user ID
  notes           String?
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@index([paymentId])
  @@index([isReconciled])
}
```

---

## Section 4: API Endpoints

### Student Endpoints

#### 1. POST /api/v1/student/checkout (Enhanced)
**Purpose:** Create checkout session  
**Auth:** Required (STUDENT role)  
**Input:**
```json
{
  "packageId": "core-course-101",
  "couponCode": "SAVE20"
}
```
**Output:**
```json
{
  "orderId": "payment_xxx",
  "paymentKey": "ZXhhbXBsZQ==",
  "amount": 15000,
  "currency": "EGP",
  "discountApplied": 5000,
  "iframeId": "123456"
}
```
**Error Cases:**
- ALREADY_ENROLLED: Student already has active enrollment
- INVALID_COUPON: Coupon invalid/expired
- PAYMOB_API_ERROR: Paymob service unavailable
- CHECKOUT_IN_PROGRESS: Student has pending checkout
- PACKAGE_NOT_FOUND: Selected package doesn't exist

---

#### 2. GET /api/v1/student/payment/:paymentId
**Purpose:** Poll payment status (for webhook timeout scenarios)  
**Auth:** Required (STUDENT role)  
**Output:**
```json
{
  "id": "payment_xxx",
  "status": "COMPLETED",
  "enrolled": true,
  "failureReason": null
}
```
**Use Case:** Student returned from Paymob iframe, wants to check if payment processed

---

#### 3. POST /api/v1/student/payment/:paymentId/retry
**Purpose:** Retry failed payment (new checkout session)  
**Auth:** Required (STUDENT role)  
**Output:** New checkout session (same as checkout endpoint)

---

#### 4. GET /api/v1/student/payments
**Purpose:** Payment history  
**Auth:** Required (STUDENT role)  
**Output:**
```json
{
  "payments": [
    {
      "id": "payment_xxx",
      "amount": 15000,
      "status": "COMPLETED",
      "createdAt": "2026-04-24T10:00:00Z",
      "refundStatus": null
    }
  ]
}
```

---

### Webhook Endpoint

#### 1. POST /api/v1/webhooks/paymob
**Purpose:** Receive Paymob payment notifications  
**Auth:** HMAC signature validation  
**Input:** Paymob webhook payload  
**Processing:**
1. Validate HMAC signature
2. Extract transaction ID and merchant order ID
3. Check for duplicate (idempotency key)
4. Update payment status
5. Trigger enrollment if completed
6. Queue email notifications
7. Return 200 OK (for Paymob to confirm delivery)

---

### Admin Endpoints

#### 1. GET /api/v1/admin/payments
**Purpose:** List all payments  
**Query Params:**
- `status`: COMPLETED, FAILED, PENDING, REFUNDED, etc.
- `dateFrom`, `dateTo`: Date range filter
- `userId`: Filter by student
- `minAmount`, `maxAmount`: Amount range
- `page`, `limit`: Pagination
- `sort`: createdAt, amount, status

**Output:**
```json
{
  "payments": [...],
  "pagination": {
    "total": 1500,
    "page": 1,
    "limit": 50
  }
}
```

---

#### 2. GET /api/v1/admin/payments/:paymentId
**Purpose:** Payment detail with full history  
**Output:**
```json
{
  "payment": {
    "id": "payment_xxx",
    "userId": "user_xxx",
    "status": "COMPLETED",
    "amount": 15000,
    "paymobOrderId": "123456",
    "paymobTransactionId": "789012",
    "webhookReceivedAt": "2026-04-24T10:00:01Z",
    "refundStatus": null
  },
  "events": [
    {
      "type": "INITIATED",
      "status": "INITIATED",
      "createdAt": "2026-04-24T09:59:00Z"
    },
    {
      "type": "PAYMENT_KEY_GENERATED",
      "status": "AWAITING_PAYMENT",
      "createdAt": "2026-04-24T09:59:05Z"
    },
    {
      "type": "WEBHOOK_RECEIVED",
      "status": "WEBHOOK_PENDING",
      "createdAt": "2026-04-24T10:00:01Z"
    },
    {
      "type": "STATUS_CHANGED",
      "previousStatus": "WEBHOOK_PENDING",
      "status": "COMPLETED",
      "createdAt": "2026-04-24T10:00:01Z"
    },
    {
      "type": "ENROLLMENT_TRIGGERED",
      "status": "COMPLETED",
      "createdAt": "2026-04-24T10:00:02Z"
    },
    {
      "type": "ENROLLMENT_SUCCEEDED",
      "status": "COMPLETED",
      "createdAt": "2026-04-24T10:00:03Z"
    }
  ]
}
```

---

#### 3. POST /api/v1/admin/payments/:paymentId/mark-paid
**Purpose:** Manually mark payment as completed (for offline payments)  
**Input:**
```json
{
  "notes": "Bank transfer received"
}
```
**Actions:**
- Mark payment as COMPLETED
- Trigger enrollment
- Send emails
- Create event log

---

#### 4. POST /api/v1/admin/payments/:paymentId/refund
**Purpose:** Initiate refund  
**Input:**
```json
{
  "amount": 15000,  // Optional, full refund if omitted
  "reason": "CUSTOMER_REQUEST"
}
```
**Processing:**
1. Validate payment is COMPLETED
2. Call Paymob refund API
3. Update payment to REFUND_REQUESTED
4. Create refund event
5. Reverse enrollment if full refund
6. Send refund email

---

#### 5. GET /api/v1/admin/payments/reconciliation
**Purpose:** Reconciliation dashboard  
**Output:**
```json
{
  "summary": {
    "total_payments": 1500,
    "reconciled": 1498,
    "mismatches": 2,
    "total_amount": 22500000,
    "last_reconciliation": "2026-04-24T10:00:00Z"
  },
  "mismatches": [
    {
      "paymentId": "payment_xxx",
      "paymobAmount": 15000,
      "localAmount": 14500,
      "status": "PENDING_REVIEW"
    }
  ]
}
```

---

## Section 5: Error Handling

### Paymob API Errors

**Scenario:** Paymob API returns error when creating order  
**Current:** Silent failure  
**Solution:**
1. Catch error from Paymob API
2. Store error code/message in payment.errorDetails
3. Set payment status to PAYMOB_API_ERROR
4. Return error to frontend with retry option
5. Create payment event with error details
6. Alert admin via monitoring system

**Retryable Errors:**
- Connection timeout → Auto-retry 3 times with backoff
- 5xx errors → Auto-retry 3 times with backoff
- Rate limited (429) → Retry with exponential backoff

**Non-retryable Errors:**
- 4xx errors (invalid input) → Display error to user, require fixing input
- Invalid API key → Alert admin immediately

---

### Webhook Errors

**Scenario:** Webhook arrives but enrollment fails  
**Current:** Enrollment error gets silently caught  
**Solution:**
1. Webhook received and verified
2. Payment status updated to WEBHOOK_PENDING (status changed event)
3. Attempt enrollment
4. If enrollment fails: 
   - Set status to ENROLLMENT_FAILED
   - Store error details
   - Create alert for admin
   - Keep payment in COMPLETED state (payment was successful, enrollment is the issue)
5. Retry enrollment async every 5 minutes for 24 hours
6. If still failing after 24 hours, flag for manual intervention

---

### Network Errors

**Scenario:** Student submitted payment but internet connection drops  
**Current:** Student doesn't know status  
**Solution:**
1. Payment created in INITIATED state
2. Paymob API called, timeout after 10 seconds
3. If timeout, payment set to WEBHOOK_PENDING
4. Return status to frontend: "Payment processing..."
5. Frontend shows "Checking payment status..." page
6. Frontend polls GET /api/v1/student/payment/:id every 3 seconds
7. After 2 minutes of polling, show "Payment is taking longer than expected" message
8. Allow user to close page; status will be updated when webhook arrives

---

### Webhook Duplicate Processing

**Scenario:** Paymob sends same webhook twice (network retry)  
**Current:** Payment processed twice, enrollment duplicated  
**Solution:**
1. Store `paymobIdempotencyKey` from webhook
2. Check for duplicate before processing:
   ```typescript
   const existingTx = await paymentRepository.findByPaymobIdempotencyKey(idempotencyKey);
   if (existingTx) {
     // Already processed, return same result
     return existingTx;
   }
   ```
3. Create PaymentEvent with type WEBHOOK_DUPLICATE for tracking
4. Return same response to Paymob so it doesn't retry again

---

### Concurrent Checkout Prevention

**Scenario:** Student clicks "Pay" twice, two checkouts started  
**Current:** Two checkout sessions possible  
**Solution:**
1. Before creating checkout, check for pending payment:
   ```typescript
   const pendingPayment = await paymentRepository.findPendingByUserId(userId);
   if (pendingPayment && pendingPayment.createdAt > 30 minutes ago) {
     throw new PaymentError("CHECKOUT_IN_PROGRESS", 409, "You already have a pending checkout");
   }
   ```
2. If pending > 30 min old, allow new checkout (assume first one abandoned)
3. Use database transaction to prevent race condition

---

## Section 6: Refund Processing

### Full Refund Flow

1. **Admin initiates refund**
   - POST /api/v1/admin/payments/:id/refund
   - Validation: payment must be COMPLETED
   - Set status to REFUND_REQUESTED
   - Create refund event

2. **Call Paymob refund API**
   - Use Paymob API to initiate refund
   - Store paymobRefundId
   - Handle Paymob response

3. **Refund successful**
   - Set status to REFUNDED
   - Get refund ID from Paymob
   - Reverse enrollment (remove access)
   - Send refund confirmation email
   - Log full refund event

4. **Refund failed**
   - Set status to REFUND_FAILED
   - Store error details
   - Alert admin
   - Allow admin to retry

### Partial Refund Support

- Store refund amount in payment.refundAmount
- Can process multiple partial refunds
- Each refund creates separate event
- Total refunded tracked

### Refund & Re-enrollment

- If full refund: enrollment status set to REVOKED
- Student loses access immediately
- If partial refund: enrollment stays active (student keeps access)
- Admin can manually revoke if needed

---

## Section 7: Monitoring & Observability

### Metrics to Track

**Payment Funnel:**
- Checkouts initiated: count per day/week/month
- Checkouts completed: count per day/week/month
- Conversion rate: completed / initiated
- Average time to completion: from INITIATED to COMPLETED
- Failure rate: FAILED / completed

**Error Rates:**
- Paymob API errors: count per error code
- Webhook failures: count per failure type
- Enrollment failures: count per failure type
- Email failures: count per failure type

**Revenue:**
- Total revenue per day/week/month
- Average transaction value
- Revenue by package type
- Revenue by discount (coupon) usage
- Refund rate: refunds / completed payments

**Latency:**
- Webhook delivery time (seconds from payment to webhook)
- Time to enrollment (from webhook to enrollment created)
- Time to email (from webhook to email sent)

### Alerts to Configure

- Payment fails > 5% of attempts
- Webhook delivery > 5 minutes
- Paymob API response time > 10 seconds
- Failed enrollment backlog > 10 payments
- Failed email backlog > 50 emails
- Webhook HMAC validation failures

### Audit Logging

- Every payment state change logged with:
  - Previous state
  - New state
  - Timestamp
  - Actor (system or admin user)
  - Reason/notes
  
- All API calls to Paymob logged:
  - Request body (sanitized)
  - Response body
  - Timestamp
  - Duration
  - Error (if any)

---

## Section 8: Frontend UX Flows

### Flow 1: First-Time Checkout (Not Logged In)

1. User clicks "Enroll Now" on landing page
2. Redirected to /login?redirect=/checkout
3. User logs in or registers
4. Redirected to /checkout
5. See payment form (amount, coupon option)
6. Click "Pay Now"
7. Redirected to Paymob iframe
8. User completes payment
9. Returned to /checkout/pending
10. Shows "Processing payment..." spinner
11. Polls status every 3 seconds
12. When COMPLETED:
    - Show success page
    - Button "Go to Course"
13. If FAILED:
    - Show failure message with reason
    - Button "Try Again"
14. If timeout (> 2 min):
    - Show "Taking longer than expected"
    - Button "Check Status"
    - Button "Contact Support"

### Flow 2: Already Enrolled User Tries to Checkout

1. User navigates to /checkout
2. Frontend checks enrollment status
3. Already enrolled → Show "You're already enrolled!" page
4. Offer button to "Go to Course"

### Flow 3: Retry After Failed Payment

1. User on failure page
2. Click "Try Again"
3. Create new checkout session
4. Repeat payment flow
5. After payment: check if new payment succeeded
6. If yes: enroll with new payment
7. (Old failed payment stays in system for audit)

### Flow 4: Refund Request (Admin)

1. Admin on /admin/payments
2. Find payment with status COMPLETED
3. Click "Refund" button
4. Modal asks for reason and amount
5. Submit refund
6. Request sent to backend
7. Backend calls Paymob
8. If success: show "Refund successful"
9. If failure: show "Refund failed, please try again"

---

## Section 9: Testing Strategy

### Unit Tests

**PaymentService**
- Test payment creation with valid coupon
- Test payment creation with invalid coupon
- Test payment creation when already enrolled
- Test webhook processing with valid HMAC
- Test webhook processing with invalid HMAC
- Test webhook duplicate detection
- Test webhook -> enrollment trigger
- Test webhook with enrollment failure
- Test refund initiation
- Test refund success
- Test refund failure

**PaymentController**
- Test checkout endpoint with auth
- Test checkout endpoint without auth (should fail)
- Test validateCoupon endpoint
- Test getPaymentStatus endpoint
- Test retryPayment endpoint

**PaymentRepository**
- Test create payment
- Test findById
- Test findByPaymobTxId
- Test updateStatus
- Test findPendingByUserId

**PaymentRepository - Reconciliation**
- Test compare Paymob vs local
- Test create mismatch record
- Test mark as reconciled

### Integration Tests

**Full Checkout Flow**
1. User creates payment
2. Mock Paymob API returns order
3. Mock Paymob returns payment key
4. Send webhook with success
5. Verify enrollment created
6. Verify email queued
7. Verify payment status COMPLETED

**Webhook Duplicate Detection**
1. Send webhook
2. Process and create enrollment
3. Send same webhook again
4. Verify enrollment not duplicated
5. Verify same response returned

**Paymob API Error Handling**
1. Mock Paymob API returns 500 error
2. Verify payment status PAYMOB_API_ERROR
3. Verify error details stored
4. Verify error event created

**Enrollment Failure Recovery**
1. Send webhook with success
2. Mock enrollment service to throw error
3. Verify payment status ENROLLMENT_FAILED
4. Verify error details stored
5. Verify retry scheduled
6. Mock enrollment to succeed on retry
7. Verify enrollment created after retry

**Concurrent Checkout Prevention**
1. Create first checkout
2. Attempt second checkout immediately
3. Verify second fails with CHECKOUT_IN_PROGRESS
4. Wait 31 minutes
5. Attempt third checkout
6. Verify succeeds (first one timed out)

### E2E Tests

**Full Student Journey**
1. Register new student
2. Navigate to checkout
3. Select package
4. Enter coupon
5. Proceed to payment
6. Mock Paymob payment
7. Wait for webhook
8. Verify enrollment granted
9. Verify payment history shows
10. Navigate to course (should succeed)

**Admin Refund Flow**
1. Admin finds paid payment
2. Clicks refund button
3. Submits refund request
4. Verify Paymob API called
5. Verify enrollment revoked
6. Verify refund email sent
7. Verify payment shows refunded status

---

## Section 10: Implementation Phases

### Phase 1: Payment State Machine & Database (8 tasks)
- Extend Prisma schema with payment states
- Create PaymentEvent table
- Create PaymentReconciliation table
- Migration scripts
- Type definitions
- Repository updates
- Seed data for testing
- Database indexing for performance

### Phase 2: Enhanced Checkout Flow (8 tasks)
- Auth gate (require login)
- Duplicate enrollment check
- Concurrent checkout prevention
- Coupon validation v2
- Package selection logic
- Error handling for all Paymob API calls
- Retry mechanism for transient errors
- Integration tests

### Phase 3: Webhook & Success Handling (8 tasks)
- Idempotent webhook processing
- Event sourcing for state changes
- Enrollment trigger with error recovery
- Email queue integration
- Cache invalidation
- Webhook signature validation enhancements
- Webhook retry logic
- Integration tests

### Phase 4: Payment Failure & Recovery (8 tasks)
- Failure state management
- Error details storage
- Admin alerts/monitoring
- Automatic retry for transient failures
- Manual recovery tools
- Payment status polling API
- Timeout detection and handling
- Integration tests

### Phase 5: Refund Handling (8 tasks)
- Refund API endpoints
- Paymob refund API integration
- Enrollment reversal logic
- Partial refund support
- Refund event tracking
- Refund email notifications
- Admin refund UI requirements (documented)
- Unit & integration tests

### Phase 6: Admin Payment Management (8 tasks)
- Payment list API with filtering
- Payment detail API with history
- Manual payment creation
- Payment reconciliation API
- Paymob sync tools
- Export/reporting functionality
- Admin alerts system
- Integration tests

### Phase 7: Monitoring & Observability (8 tasks)
- Payment metrics (funnel, errors, revenue)
- Webhook event tracking
- Failed payment alerts
- Reconciliation reports
- Prometheus metrics
- Alert configuration
- Logging improvements
- Observability tests

### Phase 8: Frontend UX & Error Flows (8 tasks)
- Checkout page enhancements
- Success page component
- Failure page component
- Pending state handling
- Status polling logic
- Payment history page
- Error message improvements
- E2E tests

### Phase 9: Testing & Documentation (8 tasks)
- Complete unit test suite
- Complete integration test suite
- E2E test scenarios
- Paymob sandbox testing
- Refund scenario testing
- API documentation
- Runbooks for operators
- Post-implementation review

---

## Section 11: Key Design Principles

### 1. Event Sourcing
Every state change is recorded as an immutable event. This enables:
- Complete audit trail
- Replay for debugging
- Reconciliation tools
- Analytics on state transitions

### 2. Idempotency
All critical operations are idempotent:
- Webhook processing: same webhook always produces same result
- Enrollment trigger: can be called multiple times safely
- Email sending: retries don't create duplicates

### 3. Atomicity
Database transactions ensure:
- Payment created AND order created together
- Payment status changed AND event created together
- Enrollment created AND cache invalidated together

### 4. Separation of Concerns
- PaymentService: Paymob API & business logic
- PaymentRepository: Database persistence
- EnrollmentService: Side effects (enrollment logic)
- PaymentController: HTTP request handling
- WebhookController: Webhook orchestration

### 5. Error Transparency
- All errors stored with context
- Admin can see exact failure reasons
- Student gets actionable error messages
- System alerts on critical failures

### 6. Graceful Degradation
- If Paymob API slow: timeout and retry
- If webhook fails: retry async
- If email fails: log but don't block payment
- If Redis down: continue without caching

---

## Section 12: Security Considerations

### 1. Webhook Validation
- HMAC signature validation mandatory
- Paymob test signature != production signature
- Signature validation on every request

### 2. Data Masking
- Sensitive payment data not logged
- Only first 6 & last 4 of card logged (if logged)
- Error messages don't expose system details

### 3. Role-Based Access
- Only ADMIN can see all payments
- Students see only their own payments
- Only authenticated users can refund
- Payment details require authorization

### 4. Audit Trail
- All state changes logged
- All admin actions logged
- All API calls to Paymob logged
- Tamper detection via event sourcing

---

## Section 13: Deployment Checklist

- [ ] Paymob API keys configured in environment
- [ ] HMAC secret configured in environment
- [ ] Database migrations applied
- [ ] Payment service deployed
- [ ] Webhook endpoint accessible at /api/v1/webhooks/paymob
- [ ] Paymob webhook configured to hit correct URL
- [ ] Monitoring/alerts configured
- [ ] Admin access to payment dashboard verified
- [ ] Production testing with Paymob sandbox
- [ ] Production testing with real payment (small amount)
- [ ] Runbook shared with ops team

---

## Sign-Off

This design provides comprehensive Paymob integration with:
✅ Complete state machine (8 states + transitions)
✅ Event sourcing for audit trail
✅ Error handling for all failure modes
✅ Edge case coverage (concurrent, webhook duplicate, timeouts)
✅ Admin tools for reconciliation & recovery
✅ Monitoring & observability
✅ Full refund capability
✅ Unit test strategy
✅ Frontend UX flows
✅ Security hardening

Ready for implementation phase approval.
