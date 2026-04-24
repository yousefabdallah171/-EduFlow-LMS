# EduFlow LMS - Paymob Integration Tasks

**Document Version:** 1.0  
**Date:** April 24, 2026  
**Status:** Ready for Implementation  
**Total Tasks:** 72 (9 Phases × 8 Tasks)  
**Estimated Duration:** Varies by team (unlimited timeline)  

---

## How to Use This Document

1. **Find your phase** — Each phase is numbered 1-9
2. **Find your task** — Each phase has 8 tasks
3. **Read the checklist** — Each task has detailed subtasks
4. **Mark as complete** — Check off each subtask as done
5. **Link to design** — Reference PAYMOB_INTEGRATION_DESIGN.md for details

**Naming Convention:** [PHASE][TASK] = Phase 1, Task 3 = **[1.3]**

---

# PHASE 1: Payment State Machine & Database

**Objective:** Extend database schema to support all payment states and event tracking

---

## [1.1] Extend Prisma Schema - Payment Model

**Description:** Add all new fields to Payment model for complete state tracking

**Subtasks:**
- [ ] Open `backend/prisma/schema.prisma`
- [ ] Locate `model Payment`
- [ ] Add enum `PaymentStatus` with all 12 states:
  - [ ] INITIATED
  - [ ] AWAITING_PAYMENT
  - [ ] WEBHOOK_PENDING
  - [ ] COMPLETED
  - [ ] FAILED
  - [ ] CANCELLED
  - [ ] ENROLLMENT_FAILED
  - [ ] EMAIL_FAILED
  - [ ] REFUND_REQUESTED
  - [ ] REFUNDED
  - [ ] REFUND_FAILED
  - [ ] DISPUTED
- [ ] Update Payment model:
  - [ ] Change `status` type from current to `PaymentStatus`
  - [ ] Set default to `INITIATED`
- [ ] Add refund tracking fields:
  - [ ] `refundInitiatedAt: DateTime?`
  - [ ] `refundInitiatedBy: String?`
  - [ ] `refundAmount: Int?`
  - [ ] `paymobRefundId: String? @unique`
  - [ ] `refundCompletedAt: DateTime?`
- [ ] Add dispute tracking fields:
  - [ ] `disputedAt: DateTime?`
  - [ ] `disputeReason: String?`
  - [ ] `resolvedAt: DateTime?`
  - [ ] `resolvedBy: String?`
- [ ] Add error tracking fields:
  - [ ] `errorCode: String?`
  - [ ] `errorMessage: String?`
  - [ ] `errorDetails: Json?`
- [ ] Add webhook tracking fields:
  - [ ] `webhookRetryCount: Int @default(0)`
  - [ ] `webhookPayload: Json?`
  - [ ] `paymobIdempotencyKey: String? @unique`
- [ ] Add audit fields:
  - [ ] `ipAddress: String?`
  - [ ] `userAgent: String?`
- [ ] Add relation to PaymentEvent:
  - [ ] `events PaymentEvent[]`
- [ ] Run `npx prisma format` to format schema

**Acceptance Criteria:**
- [ ] Schema compiles without errors
- [ ] All 12 payment states defined
- [ ] All new fields added
- [ ] Relations properly configured
- [ ] Schema formatted consistently

---

## [1.2] Create PaymentEvent Model

**Description:** Create new table for event sourcing

**Subtasks:**
- [ ] Open `backend/prisma/schema.prisma`
- [ ] Create enum `PaymentEventType` with 21 event types:
  - [ ] INITIATED
  - [ ] PAYMENT_KEY_GENERATED
  - [ ] PAYMOB_API_ERROR
  - [ ] WEBHOOK_RECEIVED
  - [ ] WEBHOOK_VERIFIED
  - [ ] WEBHOOK_DUPLICATE
  - [ ] STATUS_CHANGED
  - [ ] ENROLLMENT_TRIGGERED
  - [ ] ENROLLMENT_SUCCEEDED
  - [ ] ENROLLMENT_FAILED
  - [ ] EMAIL_QUEUED
  - [ ] EMAIL_SENT
  - [ ] EMAIL_FAILED
  - [ ] COUPON_INCREMENTED
  - [ ] REFUND_INITIATED
  - [ ] REFUND_API_CALL
  - [ ] REFUND_SUCCEEDED
  - [ ] REFUND_FAILED
  - [ ] DISPUTE_RECEIVED
  - [ ] MANUAL_OVERRIDE_APPLIED
  - [ ] PAYMENT_POLLED
- [ ] Add `model PaymentEvent`:
  - [ ] `id: String @id @default(cuid())`
  - [ ] `paymentId: String`
  - [ ] `payment: Payment @relation(fields: [paymentId], references: [id])`
  - [ ] `eventType: PaymentEventType`
  - [ ] `status: PaymentStatus?`
  - [ ] `previousStatus: PaymentStatus?`
  - [ ] `errorCode: String?`
  - [ ] `errorMessage: String?`
  - [ ] `metadata: Json?`
  - [ ] `createdAt: DateTime @default(now())`
- [ ] Add indexes:
  - [ ] `@@index([paymentId])`
  - [ ] `@@index([eventType])`
  - [ ] `@@index([createdAt])`
- [ ] Run `npx prisma format`

**Acceptance Criteria:**
- [ ] Model compiles
- [ ] All 21 event types defined
- [ ] Foreign key to Payment correct
- [ ] Indexes optimized for queries

---

## [1.3] Create PaymentReconciliation Model

**Description:** New table for tracking Paymob vs local reconciliation

**Subtasks:**
- [ ] Open `backend/prisma/schema.prisma`
- [ ] Add `model PaymentReconciliation`:
  - [ ] `id: String @id @default(cuid())`
  - [ ] `paymentId: String`
  - [ ] `payment: Payment @relation(fields: [paymentId], references: [id])`
  - [ ] `paymobStatus: String?`
  - [ ] `localStatus: String`
  - [ ] `paymobAmount: Int?`
  - [ ] `localAmount: Int`
  - [ ] `amountMismatch: Boolean @default(false)`
  - [ ] `isReconciled: Boolean @default(false)`
  - [ ] `reconciliedAt: DateTime?`
  - [ ] `reconciliedBy: String?` (admin user ID)
  - [ ] `notes: String?`
  - [ ] `createdAt: DateTime @default(now())`
  - [ ] `updatedAt: DateTime @updatedAt`
- [ ] Add indexes:
  - [ ] `@@index([paymentId])`
  - [ ] `@@index([isReconciled])`
- [ ] Run `npx prisma format`

**Acceptance Criteria:**
- [ ] Model compiles
- [ ] Indexes present
- [ ] Fields match design

---

## [1.4] Create Database Migration

**Description:** Generate and test Prisma migration

**Subtasks:**
- [ ] Run `npx prisma migrate dev --name payment_state_machine`
- [ ] Review generated migration file in `backend/prisma/migrations/`
- [ ] Verify migration includes:
  - [ ] Payment model updates
  - [ ] PaymentEvent table creation
  - [ ] PaymentReconciliation table creation
  - [ ] All indexes created
  - [ ] All enums created
- [ ] Test migration on local database:
  - [ ] Run `npx prisma migrate reset` (if safe on local)
  - [ ] Verify tables created successfully
  - [ ] Verify no TypeScript errors
  - [ ] Query each table to confirm it exists
- [ ] Generate Prisma client:
  - [ ] Run `npx prisma generate`
  - [ ] Verify new types in `@prisma/client`

**Acceptance Criteria:**
- [ ] Migration file present and valid
- [ ] No SQL errors in migration
- [ ] All tables created
- [ ] All indexes created
- [ ] TypeScript compiles

---

## [1.5] Create TypeScript Type Definitions

**Description:** Export types from Prisma for use in services

**Subtasks:**
- [ ] Create `backend/src/types/payment.types.ts`
- [ ] Export from Prisma:
  - [ ] `export type { Payment, PaymentStatus, PaymentEvent, PaymentEventType, PaymentReconciliation } from "@prisma/client";`
- [ ] Create type aliases for common queries:
  - [ ] `type PaymentWithEvents = Payment & { events: PaymentEvent[] };`
  - [ ] `type PaymentDetail = PaymentWithEvents & { reconciliation?: PaymentReconciliation };`
- [ ] Create DTO types:
  - [ ] `interface CreatePaymentInput`
  - [ ] `interface PaymentResponse`
  - [ ] `interface PaymentEventResponse`
  - [ ] `interface PaymentListResponse`
  - [ ] `interface PaymentDetailResponse`
- [ ] Export from main types file:
  - [ ] Add to `backend/src/types/index.ts`
- [ ] Verify TypeScript compiles:
  - [ ] Run `npm run build`

**Acceptance Criteria:**
- [ ] Types file created
- [ ] All types exported
- [ ] TypeScript compilation succeeds
- [ ] Types used in upcoming changes

---

## [1.6] Update Payment Repository

**Description:** Add new repository methods for state management

**Subtasks:**
- [ ] Open `backend/src/repositories/payment.repository.ts`
- [ ] Add method `findPendingByUserId(userId: string)`:
  - [ ] Query for payments with status IN [INITIATED, AWAITING_PAYMENT, WEBHOOK_PENDING]
  - [ ] Order by createdAt DESC
  - [ ] Return first or null
- [ ] Add method `findByPaymobIdempotencyKey(key: string)`:
  - [ ] Query by paymobIdempotencyKey
  - [ ] Return payment or null
- [ ] Add method `updateWithEvent(id: string, status: PaymentStatus, event: PaymentEventCreateInput)`:
  - [ ] Wrap in transaction
  - [ ] Update payment status, timestamps
  - [ ] Create PaymentEvent
  - [ ] Return updated payment with events
- [ ] Add method `getDetailWithEvents(id: string)`:
  - [ ] Include full PaymentEvent relation
  - [ ] Return PaymentWithEvents type
- [ ] Add method `listByStatus(status: PaymentStatus, limit: number, offset: number)`:
  - [ ] Query by status
  - [ ] Order by createdAt DESC
  - [ ] Return paginated results
- [ ] Add method `createReconciliation(paymentId: string, data: ReconciliationData)`:
  - [ ] Create PaymentReconciliation record
  - [ ] Return created record
- [ ] Add method `findRefundablePayments(limit: number)`:
  - [ ] Status = COMPLETED
  - [ ] Not already REFUND_REQUESTED
  - [ ] Return array
- [ ] Update all existing methods:
  - [ ] Update `findById` to include events
  - [ ] Update `findByPaymobTxId` to include events
  - [ ] Run type checks: `npm run build`

**Acceptance Criteria:**
- [ ] All new methods added
- [ ] Type signatures correct
- [ ] Repository compiles
- [ ] Methods follow existing patterns

---

## [1.7] Create Payment Event Service

**Description:** Service for creating and querying payment events

**Subtasks:**
- [ ] Create `backend/src/services/payment-event.service.ts`
- [ ] Add method `async logEvent(paymentId: string, eventType: PaymentEventType, data?: {})`:
  - [ ] Create PaymentEvent in database
  - [ ] Include metadata from data
  - [ ] Return created event
- [ ] Add method `async logStatusChange(paymentId: string, newStatus: PaymentStatus, previousStatus?: PaymentStatus, data?: {})`:
  - [ ] Call logEvent with STATUS_CHANGED type
  - [ ] Include both statuses in metadata
  - [ ] Return event
- [ ] Add method `async logError(paymentId: string, errorCode: string, errorMessage: string, details?: {})`:
  - [ ] Call logEvent with appropriate event type
  - [ ] Store error info
  - [ ] Return event
- [ ] Add method `async getPaymentHistory(paymentId: string)`:
  - [ ] Query all events for payment
  - [ ] Order by createdAt ASC
  - [ ] Return array of events
- [ ] Export as singleton:
  - [ ] `export const paymentEventService = { ... }`

**Acceptance Criteria:**
- [ ] Service created
- [ ] Methods functional
- [ ] Events logged to database
- [ ] History queryable

---

## [1.8] Add Database Indexes for Performance

**Description:** Optimize queries with proper indexing

**Subtasks:**
- [ ] Open `backend/prisma/schema.prisma`
- [ ] Add indexes to Payment model:
  - [ ] `@@index([userId])` - for student payment history
  - [ ] `@@index([status])` - for filtering by status
  - [ ] `@@index([createdAt])` - for date range queries
  - [ ] `@@index([paymobTransactionId])` - for webhook lookups
  - [ ] `@@index([paymobOrderId])` - for order tracking
- [ ] Add compound index:
  - [ ] `@@index([userId, status])` - for listing by user + status
  - [ ] `@@index([status, createdAt])` - for dashboard queries
- [ ] Verify no duplicate indexes
- [ ] Create migration:
  - [ ] `npx prisma migrate dev --name add_payment_indexes`
- [ ] Review generated SQL:
  - [ ] Confirm all indexes created
  - [ ] Check index names are readable
- [ ] Test index performance locally (if applicable)

**Acceptance Criteria:**
- [ ] All indexes created
- [ ] Migration generated
- [ ] No performance issues
- [ ] Schema compiles

---

# PHASE 2: Enhanced Checkout Flow

**Objective:** Improve checkout process with auth gate, validation, and error handling

---

## [2.1] Implement Auth Gate for Checkout

**Description:** Require login before accessing checkout

**Subtasks:**
- [ ] Open `frontend/src/pages/Checkout.tsx`
- [ ] Add auth check at component start:
  - [ ] If not authenticated, redirect to `/login?redirect=/checkout`
  - [ ] Use existing auth store hook
  - [ ] Show loading state while checking
- [ ] Open `backend/src/routes/student.routes.ts`
- [ ] Verify checkout endpoint has `authenticate` middleware
  - [ ] Check: `router.post("/checkout", authenticate, ...)`
  - [ ] Already present? ✓ Skip
  - [ ] If missing? Add it
- [ ] Create E2E test:
  - [ ] Navigate to /checkout without auth
  - [ ] Verify redirected to /login
  - [ ] Login
  - [ ] Verify on checkout page
- [ ] Update Checkout.tsx to handle unauthenticated state gracefully
  - [ ] Show spinner while auth checks
  - [ ] No flash of content before redirect

**Acceptance Criteria:**
- [ ] Unauthenticated users redirected to login
- [ ] Authenticated users see checkout
- [ ] No auth bypass possible
- [ ] E2E test passes

---

## [2.2] Implement Duplicate Enrollment Check

**Description:** Prevent checkout if student already enrolled

**Subtasks:**
- [ ] Open `backend/src/services/payment.service.ts`
- [ ] In `createPaymobOrder()` method:
  - [ ] Check enrollment status BEFORE creating payment
  - [ ] Current code: `const enrollmentStatus = await enrollmentService.getStatus(userId);`
  - [ ] Add detailed check:
    ```
    if (enrollmentStatus.enrolled && enrollmentStatus.status === "ACTIVE") {
      throw new PaymentError("ALREADY_ENROLLED", 409, "You are already enrolled in this course");
    }
    ```
  - [ ] Verify status is from `enrollment.repository.ts`
- [ ] Update frontend Checkout.tsx:
  - [ ] Query enrollment status on page load
  - [ ] If enrolled: show "Already Enrolled" page
  - [ ] Current code shows this (search for `isAlreadyEnrolled`) ✓
- [ ] Write unit test:
  - [ ] Test createPaymobOrder with already-enrolled user
  - [ ] Expect ALREADY_ENROLLED error
  - [ ] Verify no payment created
- [ ] Write E2E test:
  - [ ] Enroll student
  - [ ] Try to checkout again
  - [ ] Expect to see "Already Enrolled" page

**Acceptance Criteria:**
- [ ] Already-enrolled users can't create payment
- [ ] Error message clear
- [ ] Frontend handles gracefully
- [ ] Tests pass

---

## [2.3] Implement Concurrent Checkout Prevention

**Description:** Prevent multiple simultaneous checkouts

**Subtasks:**
- [ ] Open `backend/src/services/payment.service.ts`
- [ ] In `createPaymobOrder()` method:
  - [ ] Before creating payment, check for pending:
    ```typescript
    const pendingPayment = await paymentRepository.findPendingByUserId(userId);
    if (pendingPayment) {
      const createdAt = pendingPayment.createdAt.getTime();
      const now = Date.now();
      const minutesOld = (now - createdAt) / 1000 / 60;
      
      if (minutesOld < 30) { // 30 minute timeout
        throw new PaymentError("CHECKOUT_IN_PROGRESS", 409, 
          "You already have a pending checkout. Please wait 30 minutes or complete that payment first.");
      }
    }
    ```
  - [ ] Wrap in database transaction for atomicity
- [ ] Write unit test:
  - [ ] Create first payment
  - [ ] Try to create second payment immediately
  - [ ] Expect CHECKOUT_IN_PROGRESS error
  - [ ] Verify only first payment in database
- [ ] Write unit test for timeout:
  - [ ] Create payment
  - [ ] Mock time to 31 minutes later
  - [ ] Create second payment
  - [ ] Expect success

**Acceptance Criteria:**
- [ ] Cannot create second checkout within 30 mins
- [ ] After 30 mins, new checkout allowed
- [ ] Error message clear
- [ ] Unit tests pass

---

## [2.4] Enhanced Coupon Validation

**Description:** Improve coupon validation logic

**Subtasks:**
- [ ] Open `backend/src/services/coupon.service.ts`
- [ ] Review `validateCoupon()` method:
  - [ ] Check coupon exists
  - [ ] Check coupon not expired
  - [ ] Check usage limit not exceeded
  - [ ] Check package compatibility (if applicable)
- [ ] Add validation checks:
  - [ ] `if (!coupon)` → throw COUPON_NOT_FOUND
  - [ ] `if (coupon.expiresAt && coupon.expiresAt < new Date())` → throw COUPON_EXPIRED
  - [ ] `if (coupon.maxUses && coupon.uses >= coupon.maxUses)` → throw COUPON_LIMIT_REACHED
  - [ ] `if (coupon.minAmount && price < coupon.minAmount)` → throw COUPON_MINIMUM_AMOUNT
  - [ ] `if (coupon.maxDiscount && discount > coupon.maxDiscount)` → throw COUPON_MAX_DISCOUNT
- [ ] Update error messages:
  - [ ] Make user-friendly
  - [ ] Provide actionable feedback
- [ ] Write unit tests for each validation case
- [ ] Write E2E test:
  - [ ] Try expired coupon
  - [ ] Expect error
  - [ ] Try valid coupon
  - [ ] Expect discount applied

**Acceptance Criteria:**
- [ ] All validation checks present
- [ ] Clear error messages
- [ ] Unit tests pass
- [ ] E2E test passes

---

## [2.5] Package Selection Logic

**Description:** Handle package selection and caching

**Subtasks:**
- [ ] Open `frontend/src/pages/Checkout.tsx`
- [ ] Review package selection:
  - [ ] Current code uses URL params: `searchParams.get("package")`
  - [ ] Falls back to first package: `packages[0]?.id`
- [ ] Enhance logic:
  - [ ] If packageId in URL: use it
  - [ ] Else if student has saved selection in localStorage: use it
  - [ ] Else use first package
  - [ ] When user selects package: save to localStorage + update URL
- [ ] Open `backend/src/services/payment.service.ts`
- [ ] In `getCheckoutPackage()`:
  - [ ] Validate packageId is actually valid
  - [ ] Return null or throw if invalid
  - [ ] Current code: `packages.find((entry) => entry.id === packageId) ?? null`
- [ ] Write test for invalid package:
  - [ ] Try checkout with non-existent packageId
  - [ ] Expect error or fallback to default
- [ ] Write E2E test:
  - [ ] Navigate to /checkout?package=core-course
  - [ ] Verify package selected
  - [ ] Refresh page
  - [ ] Verify package still selected

**Acceptance Criteria:**
- [ ] Package selection persisted
- [ ] Invalid packages handled
- [ ] URL param works
- [ ] localStorage fallback works

---

## [2.6] Paymob API Error Handling

**Description:** Handle all possible Paymob API failures

**Subtasks:**
- [ ] Open `backend/src/services/payment.service.ts`
- [ ] Locate `paymobRequest()` function:
  - [ ] Currently throws PaymentError on !response.ok
  - [ ] Add more detailed error handling:
    ```typescript
    if (response.status === 401) {
      // Invalid API key
      throw new PaymentError("PAYMOB_AUTH_FAILED", 502, 
        "Payment service authentication failed. Please try again later.");
    }
    if (response.status === 429) {
      // Rate limited
      throw new PaymentError("PAYMOB_RATE_LIMITED", 503, 
        "Payment service is busy. Please try again in a few seconds.");
    }
    if (response.status >= 500) {
      // Server error
      throw new PaymentError("PAYMOB_SERVER_ERROR", 502, 
        "Payment service is temporarily unavailable. Please try again later.");
    }
    if (response.status >= 400) {
      // Client error
      const body = await response.json();
      throw new PaymentError("PAYMOB_API_ERROR", 400, 
        body.message || "Invalid payment request. Please check your details.");
    }
    ```
- [ ] Add timeout handling:
  - [ ] Paymob API request timeout after 10 seconds
  - [ ] Throw PAYMOB_TIMEOUT error
  - [ ] Store error in payment record
- [ ] In `createPaymobOrder()`:
  - [ ] Wrap auth request in try/catch
  - [ ] Store error details
  - [ ] Update payment status to PAYMOB_API_ERROR
  - [ ] Create event: PAYMOB_API_ERROR
  - [ ] Return error to client
- [ ] Add retry logic:
  - [ ] Retryable errors: 5xx, timeout, 429
  - [ ] Non-retryable: 4xx (except 429)
  - [ ] Return retry flag to frontend
- [ ] Write unit tests:
  - [ ] Test 401 error handling
  - [ ] Test 429 error handling
  - [ ] Test 500 error handling
  - [ ] Test timeout handling
  - [ ] Verify payment status set correctly
  - [ ] Verify error details stored

**Acceptance Criteria:**
- [ ] All error codes handled
- [ ] Error messages user-friendly
- [ ] Retryable vs non-retryable distinguished
- [ ] Unit tests pass

---

## [2.7] Retry Mechanism for Transient Errors

**Description:** Auto-retry failed checkout creation

**Subtasks:**
- [ ] Open `backend/src/services/payment.service.ts`
- [ ] In `createPaymobOrder()`:
  - [ ] Add wrapper function `createPaymobOrderWithRetry()`
  - [ ] Retry logic:
    ```typescript
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 1000; // 1 second initial
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await createPaymobOrder(...);
      } catch (error) {
        if (!isRetryableError(error)) throw error; // Non-retryable
        if (attempt === MAX_RETRIES) throw error; // Last attempt
        
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1); // Exponential backoff
        await new Promise(r => setTimeout(r, delay));
      }
    }
    ```
- [ ] Implement `isRetryableError()`:
  - [ ] Retryable: PAYMOB_SERVER_ERROR, PAYMOB_TIMEOUT, PAYMOB_RATE_LIMITED
  - [ ] Non-retryable: ALREADY_ENROLLED, INVALID_COUPON, USER_NOT_FOUND
- [ ] In controller, update to use retry version:
  - [ ] `const result = await paymentService.createPaymobOrderWithRetry(...)`
- [ ] Write unit tests:
  - [ ] First attempt fails, second succeeds
  - [ ] All retries fail, error thrown
  - [ ] Non-retryable error thrown immediately

**Acceptance Criteria:**
- [ ] Retryable errors auto-retry
- [ ] Exponential backoff implemented
- [ ] Non-retryable fail immediately
- [ ] Unit tests pass

---

## [2.8] Integration Tests for Checkout Flow

**Description:** End-to-end checkout flow testing

**Subtasks:**
- [ ] Create `backend/tests/integration/checkout-flow.test.ts`
- [ ] Test: Happy path checkout
  - [ ] Student logged in
  - [ ] Create payment via API
  - [ ] Verify payment created with AWAITING_PAYMENT status
  - [ ] Verify paymentKey returned
  - [ ] Verify payment event created
- [ ] Test: Checkout with coupon
  - [ ] Create payment with valid coupon
  - [ ] Verify discount applied
  - [ ] Verify coupon not yet incremented (happens on payment success)
- [ ] Test: Already enrolled
  - [ ] Student already enrolled
  - [ ] Try checkout
  - [ ] Expect ALREADY_ENROLLED error
  - [ ] Verify no payment created
- [ ] Test: Concurrent checkouts
  - [ ] Create first payment
  - [ ] Try to create second immediately
  - [ ] Expect CHECKOUT_IN_PROGRESS error
- [ ] Test: Paymob API error
  - [ ] Mock Paymob to return 500 error
  - [ ] Verify error handling
  - [ ] Verify payment status PAYMOB_API_ERROR
- [ ] Test: Invalid package
  - [ ] Try checkout with non-existent package
  - [ ] Verify error handling or fallback
- [ ] Run all tests:
  - [ ] `npm run test:integration checkout-flow`
  - [ ] All pass ✓

**Acceptance Criteria:**
- [ ] All test scenarios covered
- [ ] All tests pass
- [ ] Happy path verified
- [ ] Error paths verified

---

# PHASE 3: Webhook & Payment Success Handling

**Objective:** Implement idempotent webhook processing and success workflows

---

## [3.1] Idempotent Webhook Processing

**Description:** Ensure webhooks can be replayed safely

**Subtasks:**
- [ ] Open `backend/src/services/payment.service.ts`
- [ ] In `processWebhook()` method:
  - [ ] Extract idempotency key from webhook:
    ```typescript
    const idempotencyKey = transaction.id || transaction.order?.id;
    ```
  - [ ] Check for existing processed webhook:
    ```typescript
    const existingPayment = await paymentRepository.findByPaymobIdempotencyKey(idempotencyKey);
    if (existingPayment) {
      // Already processed, create WEBHOOK_DUPLICATE event
      await paymentEventService.logEvent(existingPayment.id, "WEBHOOK_DUPLICATE", { reason: "Duplicate webhook" });
      return existingPayment; // Return same result
    }
    ```
  - [ ] Store idempotency key after successful processing
  - [ ] Current code checks `findByPaymobTxId` but should also track key
- [ ] Update `paymentRepository.updateStatus()`:
  - [ ] Store `paymobIdempotencyKey` when updating
  - [ ] Make field unique for deduplication
- [ ] Write unit tests:
  - [ ] Send webhook first time
  - [ ] Verify payment created
  - [ ] Send same webhook again
  - [ ] Verify no duplicate payment
  - [ ] Verify WEBHOOK_DUPLICATE event created

**Acceptance Criteria:**
- [ ] Webhooks idempotent
- [ ] Duplicate detection works
- [ ] Same result returned on replay
- [ ] Unit tests pass

---

## [3.2] Event Sourcing for State Changes

**Description:** Log every state transition as immutable event

**Subtasks:**
- [ ] Open `backend/src/services/payment.service.ts`
- [ ] In `processWebhook()`:
  - [ ] Before updating status, log previous state
  - [ ] After updating, create event:
    ```typescript
    await paymentEventService.logStatusChange(
      payment.id,
      nextStatus,
      payment.status, // previous
      { webhookTransactionId: paymobTransactionId }
    );
    ```
- [ ] In `createPaymobOrder()`:
  - [ ] Log INITIATED event:
    ```typescript
    await paymentEventService.logEvent(payment.id, "INITIATED", { userId });
    ```
  - [ ] Log PAYMENT_KEY_GENERATED event:
    ```typescript
    await paymentEventService.logEvent(payment.id, "PAYMENT_KEY_GENERATED", { orderId: order.id });
    ```
- [ ] Add event logging to error scenarios:
  - [ ] PAYMOB_API_ERROR event when API fails
  - [ ] Log error details in metadata
- [ ] Write integration test:
  - [ ] Create payment
  - [ ] Query payment events
  - [ ] Verify events in correct order
  - [ ] Verify metadata correct

**Acceptance Criteria:**
- [ ] All state changes logged
- [ ] Events have correct sequence
- [ ] Metadata preserved
- [ ] Integration test passes

---

## [3.3] Enrollment Trigger with Error Recovery

**Description:** Enroll student on payment success with error handling

**Subtasks:**
- [ ] Open `backend/src/services/payment.service.ts`
- [ ] In `processWebhook()` after status update to COMPLETED:
  - [ ] Wrap enrollment in try/catch:
    ```typescript
    if (updatedPayment.status === "COMPLETED") {
      try {
        await enrollmentService.enroll(payment.userId, "PAID", payment.id);
        await paymentEventService.logEvent(payment.id, "ENROLLMENT_SUCCEEDED");
      } catch (enrollmentError) {
        await paymentRepository.update(payment.id, { 
          status: "ENROLLMENT_FAILED",
          errorCode: "ENROLLMENT_ERROR",
          errorMessage: enrollmentError.message
        });
        await paymentEventService.logEvent(payment.id, "ENROLLMENT_FAILED", {
          error: enrollmentError.message
        });
        // Trigger retry async (see next task)
        throw enrollmentError; // Don't swallow
      }
    }
    ```
- [ ] Handle webhook controller:
  - [ ] If payment service throws, create event
  - [ ] But still return 200 OK to Paymob (so it doesn't retry webhook)
  - [ ] Instead, schedule async retry
- [ ] Write unit test:
  - [ ] Mock enrollment service to throw error
  - [ ] Send webhook
  - [ ] Verify payment status ENROLLMENT_FAILED
  - [ ] Verify event created
  - [ ] Verify ENROLLMENT_SUCCEEDED not created

**Acceptance Criteria:**
- [ ] Enrollment failures caught
- [ ] Payment status reflects failure
- [ ] Event log shows failure
- [ ] Unit test passes

---

## [3.4] Email Queue Integration

**Description:** Queue email notifications after payment success

**Subtasks:**
- [ ] Open `backend/src/services/payment.service.ts`
- [ ] In `processWebhook()` after successful enrollment:
  - [ ] Queue emails (don't wait for completion):
    ```typescript
    // Fire and forget
    void (async () => {
      try {
        const student = await userRepository.findById(payment.userId);
        if (student) {
          await sendPaymentReceiptEmail({
            to: student.email,
            fullName: student.fullName,
            paymentId: updatedPayment.id,
            amountEgp: updatedPayment.amountPiasters / 100,
            currency: updatedPayment.currency,
            purchasedAt: updatedPayment.createdAt,
            dashboardUrl: `${env.FRONTEND_URL}/dashboard`
          });
          
          await sendEnrollmentActivatedEmail(
            student.email,
            student.fullName,
            `${env.FRONTEND_URL}/dashboard`
          );
          
          await paymentEventService.logEvent(payment.id, "EMAIL_SENT");
        }
      } catch (emailError) {
        // Log but don't fail payment
        await paymentEventService.logEvent(payment.id, "EMAIL_FAILED", {
          error: emailError.message
        });
        // Could also trigger async retry here
      }
    })();
    ```
- [ ] Verify emails sent in background:
  - [ ] Don't block webhook response
  - [ ] Log success/failure
  - [ ] Create event in either case
- [ ] Write integration test:
  - [ ] Mock email service
  - [ ] Send webhook
  - [ ] Verify emails queued
  - [ ] Verify email events created

**Acceptance Criteria:**
- [ ] Emails sent after payment success
- [ ] Don't block webhook response
- [ ] Failures logged
- [ ] Integration test passes

---

## [3.5] Cache Invalidation

**Description:** Clear relevant caches after payment success

**Subtasks:**
- [ ] Open `backend/src/services/payment.service.ts`
- [ ] In `processWebhook()` after successful enrollment:
  - [ ] Invalidate payment history cache:
    ```typescript
    await paymentService.invalidatePaymentHistoryCache(payment.userId);
    ```
  - [ ] Invalidate dashboard cache:
    ```typescript
    await dashboardService.invalidateStudentDashboard(payment.userId);
    ```
  - [ ] Invalidate enrollment cache:
    ```typescript
    await enrollmentService.invalidateEnrollmentCache(payment.userId);
    ```
- [ ] Verify methods exist in respective services:
  - [ ] Check `payment.service.ts` has `invalidatePaymentHistoryCache` ✓
  - [ ] Check `dashboard.service.ts` has `invalidateStudentDashboard`
  - [ ] Check `enrollment.service.ts` has `invalidateEnrollmentCache`
  - [ ] Add if missing
- [ ] Add error handling:
  - [ ] Wrap in try/catch
  - [ ] Log failures but don't block
- [ ] Write test:
  - [ ] Create payment
  - [ ] Set cache entry
  - [ ] Send webhook
  - [ ] Verify cache cleared

**Acceptance Criteria:**
- [ ] Caches invalidated after payment success
- [ ] Errors don't block payment
- [ ] Test passes

---

## [3.6] Enhanced Webhook Signature Validation

**Description:** Strengthen HMAC validation

**Subtasks:**
- [ ] Open `backend/src/middleware/webhook-validation.middleware.ts` or locate validation code
- [ ] Current validation: `validatePaymobHmac` middleware
- [ ] Enhance validation:
  - [ ] Check HMAC is present
  - [ ] Check HMAC header vs query param (Paymob can send either)
  - [ ] Use constant-time comparison (timing attack protection):
    ```typescript
    import crypto from "crypto";
    const constantTimeEquals = (a: string, b: string) => {
      return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
    };
    ```
  - [ ] Validate against correct HMAC secret from env
- [ ] Log validation failures:
  - [ ] Create event if webhook fails validation
  - [ ] Don't process invalid webhook
  - [ ] Return 403 Forbidden
- [ ] Write test:
  - [ ] Send webhook with invalid HMAC
  - [ ] Expect rejection
  - [ ] Verify event not created
  - [ ] Send webhook with valid HMAC
  - [ ] Expect success

**Acceptance Criteria:**
- [ ] HMAC validation strong
- [ ] Invalid webhooks rejected
- [ ] Timing attack protected
- [ ] Tests pass

---

## [3.7] Webhook Retry Logic

**Description:** Implement retry mechanism for transient failures

**Subtasks:**
- [ ] Open `backend/src/controllers/webhook.controller.ts`
- [ ] In `paymob()` webhook handler:
  - [ ] Current code: catch error and return status
  - [ ] Add retry on transient errors:
    ```typescript
    const isTransient = error.code?.includes("TIMEOUT") 
      || error.code?.includes("NETWORK")
      || error.status >= 500;
    
    if (isTransient) {
      // Schedule retry
      await scheduleWebhookRetry(req.body, retryCount + 1);
      return res.status(202).json({ received: true, scheduled: true });
    }
    ```
- [ ] Add `scheduleWebhookRetry()` function:
  - [ ] Store failed webhook payload
  - [ ] Schedule async retry after 5 minutes
  - [ ] Up to 5 retry attempts
  - [ ] Exponential backoff
- [ ] Update payment record:
  - [ ] Increment `webhookRetryCount`
  - [ ] Store next retry time
- [ ] Write test:
  - [ ] Mock transient error
  - [ ] Send webhook
  - [ ] Verify retry scheduled
  - [ ] Wait and verify retry processed

**Acceptance Criteria:**
- [ ] Transient errors trigger retry
- [ ] Exponential backoff implemented
- [ ] Max 5 retries
- [ ] Test passes

---

## [3.8] Integration Tests for Webhook

**Description:** Comprehensive webhook flow testing

**Subtasks:**
- [ ] Create `backend/tests/integration/webhook-flow.test.ts`
- [ ] Test: Happy path webhook
  - [ ] Create payment
  - [ ] Send successful webhook
  - [ ] Verify payment COMPLETED
  - [ ] Verify enrollment created
  - [ ] Verify events logged
- [ ] Test: Webhook duplicate
  - [ ] Send webhook
  - [ ] Send exact duplicate
  - [ ] Verify only one enrollment
  - [ ] Verify WEBHOOK_DUPLICATE event
- [ ] Test: Invalid HMAC
  - [ ] Send webhook with wrong HMAC
  - [ ] Expect 403 Forbidden
  - [ ] Verify no payment updated
- [ ] Test: Enrollment failure
  - [ ] Mock enrollment service to fail
  - [ ] Send webhook
  - [ ] Verify payment ENROLLMENT_FAILED
  - [ ] Verify event logged
- [ ] Test: Email failure
  - [ ] Mock email service to fail
  - [ ] Send webhook
  - [ ] Verify payment still COMPLETED
  - [ ] Verify EMAIL_FAILED event
- [ ] Test: Cache invalidation
  - [ ] Set cache entries
  - [ ] Send webhook
  - [ ] Verify caches cleared
- [ ] Run all tests:
  - [ ] `npm run test:integration webhook-flow`
  - [ ] All pass ✓

**Acceptance Criteria:**
- [ ] All webhook scenarios tested
- [ ] Happy path works
- [ ] Error cases handled
- [ ] All tests pass

---

# PHASE 4: Payment Failure & Recovery

**Objective:** Handle payment failures and provide recovery mechanisms

---

## [4.1] Failure State Management

**Description:** Proper handling of failed payments

**Subtasks:**
- [ ] Open `backend/src/services/payment.service.ts`
- [ ] In `processWebhook()`:
  - [ ] When transaction.success === false:
    ```typescript
    const nextStatus = "FAILED";
    await paymentRepository.updateStatus(payment.id, nextStatus, {
      paymobTransactionId,
      webhookReceivedAt: new Date(),
      webhookHmac: hmac,
      errorCode: transaction.response?.err?.code || "PAYMENT_DECLINED",
      errorMessage: transaction.response?.err?.message || "Payment was declined"
    });
    await paymentEventService.logStatusChange(
      payment.id,
      "FAILED",
      "WEBHOOK_PENDING",
      { 
        errorCode: transaction.response?.err?.code,
        reason: transaction.response?.err?.message
      }
    );
    ```
  - [ ] Don't enroll student
  - [ ] Don't send success email
  - [ ] Send failure notification email (different template)
- [ ] Store failure details:
  - [ ] Save errorCode from Paymob
  - [ ] Save errorMessage from Paymob
  - [ ] Save full response in errorDetails JSON
- [ ] Write unit test:
  - [ ] Send failed webhook
  - [ ] Verify payment status FAILED
  - [ ] Verify error details stored
  - [ ] Verify enrollment NOT created

**Acceptance Criteria:**
- [ ] Failed payments handled
- [ ] Error details stored
- [ ] No enrollment on failure
- [ ] Unit test passes

---

## [4.2] Error Details Storage

**Description:** Capture full error context for debugging

**Subtasks:**
- [ ] Open `backend/src/services/payment.service.ts`
- [ ] When storing error:
  - [ ] Error code: specific code from Paymob/system
  - [ ] Error message: user-friendly message
  - [ ] Error details: full JSON object with stack trace, context
  - [ ] Example:
    ```typescript
    errorCode: "CARD_DECLINED",
    errorMessage: "Your card was declined. Please use a different card.",
    errorDetails: {
      paymobErrorCode: transaction.response?.err?.code,
      paymobErrorMessage: transaction.response?.err?.message,
      paymobErrorSubcode: transaction.response?.err?.subcode,
      timestamp: new Date().toISOString(),
      userId: payment.userId,
      amount: payment.amountPiasters,
      orderId: transaction.order?.id
    }
    ```
- [ ] Add method to PaymentService:
  ```typescript
  storeErrorDetails(paymentId, errorCode, errorMessage, details)
  ```
- [ ] Use in all error paths:
  - [ ] Paymob API error
  - [ ] Webhook processing error
  - [ ] Enrollment error
  - [ ] Any other error
- [ ] Write test:
  - [ ] Cause payment error
  - [ ] Verify all details stored
  - [ ] Query and verify via API

**Acceptance Criteria:**
- [ ] All errors captured with context
- [ ] Details stored in JSON
- [ ] Queryable via API
- [ ] Test passes

---

## [4.3] Admin Alerts & Monitoring

**Description:** Notify admin of stuck/failed payments

**Subtasks:**
- [ ] Create `backend/src/services/payment-alerts.service.ts`
- [ ] Add method `alertPaymentFailed(paymentId: string)`:
  - [ ] Get payment details
  - [ ] Send email to admin:
    - [ ] To: admin email (from env)
    - [ ] Subject: "Payment Failed - Payment {id}"
    - [ ] Body: Student name, amount, error reason, link to admin panel
  - [ ] Create alert record in database
- [ ] Add method `alertEnrollmentFailed(paymentId: string)`:
  - [ ] Similar to above
  - [ ] Indicates enrollment issue
- [ ] Call in payment service:
  - [ ] After FAILED status: `await paymentAlertsService.alertPaymentFailed(payment.id)`
  - [ ] After ENROLLMENT_FAILED: `await paymentAlertsService.alertEnrollmentFailed(payment.id)`
- [ ] Add Prometheus metric:
  - [ ] `payment_failures_total` counter
  - [ ] Increment on each failure
- [ ] Write test:
  - [ ] Cause payment failure
  - [ ] Verify admin alert email sent
  - [ ] Verify metric incremented

**Acceptance Criteria:**
- [ ] Admin alerted on failures
- [ ] Metrics tracked
- [ ] Alerts contain useful info
- [ ] Test passes

---

## [4.4] Automatic Retry for Transient Failures

**Description:** Auto-retry payments that failed transiently

**Subtasks:**
- [ ] Create `backend/src/services/payment-retry.service.ts`
- [ ] Add method `scheduleRetry(paymentId: string, delayMinutes: number)`:
  - [ ] Store next retry time in database:
    ```typescript
    nextRetryAt: new Date(Date.now() + delayMinutes * 60000)
    ```
  - [ ] Increment retry count
- [ ] Add background job to process retries:
  - [ ] Query payments with:
    - [ ] Status = FAILED
    - [ ] nextRetryAt < now
    - [ ] retryCount < MAX_RETRIES (3)
  - [ ] For each, check if transient error:
    - [ ] Transient: TIMEOUT, NETWORK, RATE_LIMITED, INTERNAL_ERROR
    - [ ] Non-transient: CARD_DECLINED, INVALID_CARD, etc.
  - [ ] If transient: check Paymob for updated status
  - [ ] If still failed and transient: schedule next retry
  - [ ] If non-transient: mark as failed_non_recoverable
- [ ] Use node-schedule or similar for background job:
  - [ ] Run every 5 minutes
  - [ ] Check for payments due for retry
- [ ] Write test:
  - [ ] Create payment
  - [ ] Mark as FAILED with transient error
  - [ ] Schedule retry
  - [ ] Run retry job
  - [ ] Verify status checked/updated

**Acceptance Criteria:**
- [ ] Transient failures auto-retry
- [ ] Exponential backoff
- [ ] Max retries respected
- [ ] Test passes

---

## [4.5] Manual Recovery Tools

**Description:** Admin tools to recover stuck payments

**Subtasks:**
- [ ] Add endpoint `POST /api/v1/admin/payments/:id/mark-paid`
  - [ ] Only ADMIN role
  - [ ] Input: `{ reason: "Offline payment received" }`
  - [ ] Validation:
    - [ ] Payment exists
    - [ ] Payment is FAILED (or WEBHOOK_PENDING if stuck)
  - [ ] Process:
    - [ ] Update status to COMPLETED
    - [ ] Trigger enrollment
    - [ ] Send emails
    - [ ] Log manual override event
  - [ ] Response: Updated payment with status COMPLETED
- [ ] Add endpoint `POST /api/v1/admin/payments/:id/retry-enrollment`
  - [ ] For ENROLLMENT_FAILED status
  - [ ] Retry enrollment process
  - [ ] Response: success or error details
- [ ] Add endpoint `POST /api/v1/admin/payments/:id/resend-emails`
  - [ ] Resend receipt and enrollment emails
  - [ ] For payments with EMAIL_FAILED event
  - [ ] Response: success or error details
- [ ] Write integration tests:
  - [ ] Test mark-paid endpoint
  - [ ] Verify enrollment created
  - [ ] Verify emails sent
  - [ ] Test retry-enrollment
  - [ ] Test resend-emails

**Acceptance Criteria:**
- [ ] All manual recovery endpoints available
- [ ] Proper authorization checks
- [ ] Error handling
- [ ] Integration tests pass

---

## [4.6] Payment Status Polling API

**Description:** Let student check payment status (for timeout scenarios)

**Subtasks:**
- [ ] Add endpoint `GET /api/v1/student/payment/:paymentId`
  - [ ] Auth: Required (STUDENT role)
  - [ ] Authorization: Can only view own payments
  - [ ] Response:
    ```json
    {
      "id": "payment_xxx",
      "status": "COMPLETED",
      "enrolled": true,
      "errorMessage": null
    }
    ```
  - [ ] If WEBHOOK_PENDING status:
    ```json
    {
      "id": "payment_xxx",
      "status": "WEBHOOK_PENDING",
      "enrolled": false,
      "message": "Payment is being processed..."
    }
    ```
  - [ ] If FAILED status:
    ```json
    {
      "id": "payment_xxx",
      "status": "FAILED",
      "enrolled": false,
      "errorMessage": "Your card was declined. Please try another card."
    }
    ```
- [ ] In payment controller:
  - [ ] `async getPaymentStatus(req, res, next)`
  - [ ] Extract paymentId from params
  - [ ] Verify ownership
  - [ ] Return current status
- [ ] Write test:
  - [ ] Create payment
  - [ ] Query status
  - [ ] Verify response
  - [ ] Update payment status
  - [ ] Query again
  - [ ] Verify updated response

**Acceptance Criteria:**
- [ ] Endpoint available
- [ ] Authorization checks present
- [ ] Correct status returned
- [ ] Test passes

---

## [4.7] Timeout Detection and Handling

**Description:** Handle webhooks that take >10 minutes to arrive

**Subtasks:**
- [ ] When payment created (AWAITING_PAYMENT status):
  - [ ] Set timeout at 10 minutes
  - [ ] Use background job or database trigger
- [ ] Background job checks for timed-out payments:
  - [ ] Query payments with:
    - [ ] Status = AWAITING_PAYMENT or WEBHOOK_PENDING
    - [ ] createdAt < now - 10 minutes
    - [ ] webhookReceivedAt = null
  - [ ] For each:
    - [ ] Set status to WEBHOOK_PENDING_TIMEOUT
    - [ ] Create event: WEBHOOK_PENDING_TIMEOUT
    - [ ] Alert admin
    - [ ] Allow student to poll status (see task 4.6)
    - [ ] When webhook arrives late: process normally (webhook not lost)
- [ ] In webhook handler:
  - [ ] If payment already WEBHOOK_PENDING_TIMEOUT:
    - [ ] Process normally
    - [ ] Update status to COMPLETED or FAILED
    - [ ] Continue with enrollment/emails
- [ ] Write test:
  - [ ] Create payment
  - [ ] Mock time to 11 minutes later
  - [ ] Run timeout check job
  - [ ] Verify status WEBHOOK_PENDING_TIMEOUT
  - [ ] Send webhook
  - [ ] Verify processed correctly

**Acceptance Criteria:**
- [ ] Timeout detection works
- [ ] Late webhooks still processed
- [ ] Student alerted appropriately
- [ ] Test passes

---

## [4.8] Integration Tests for Failure & Recovery

**Description:** Comprehensive failure scenario testing

**Subtasks:**
- [ ] Create `backend/tests/integration/payment-failure-recovery.test.ts`
- [ ] Test: Payment failed at Paymob
  - [ ] Send failed webhook
  - [ ] Verify payment FAILED
  - [ ] Verify error stored
  - [ ] Verify admin alerted
- [ ] Test: Transient error retry
  - [ ] Create payment with transient error
  - [ ] Schedule retry
  - [ ] Run retry job
  - [ ] Verify status checked
- [ ] Test: Admin mark-paid
  - [ ] Create failed payment
  - [ ] Call mark-paid endpoint
  - [ ] Verify payment COMPLETED
  - [ ] Verify enrollment created
- [ ] Test: Enrollment retry
  - [ ] Create ENROLLMENT_FAILED payment
  - [ ] Call retry-enrollment endpoint
  - [ ] Verify enrollment created (if error resolved)
- [ ] Test: Resend emails
  - [ ] Create completed payment
  - [ ] Call resend-emails
  - [ ] Verify emails sent
- [ ] Test: Webhook timeout
  - [ ] Create payment
  - [ ] Wait 10+ minutes (or mock)
  - [ ] Verify status WEBHOOK_PENDING_TIMEOUT
  - [ ] Send webhook
  - [ ] Verify processed
- [ ] Run all tests:
  - [ ] `npm run test:integration payment-failure-recovery`
  - [ ] All pass ✓

**Acceptance Criteria:**
- [ ] All failure scenarios covered
- [ ] Recovery paths tested
- [ ] Admin tools verified
- [ ] All tests pass

---

# PHASE 5: Refund Handling

**Objective:** Implement complete refund workflow

---

## [5.1] Refund API Endpoints

**Description:** Create admin endpoints to process refunds

**Subtasks:**
- [ ] Add endpoint `POST /api/v1/admin/payments/:paymentId/refund`
  - [ ] Auth: ADMIN only
  - [ ] Input:
    ```json
    {
      "amount": 15000,  // Optional, full if omitted
      "reason": "CUSTOMER_REQUEST"  // Or DUPLICATE, CANCELLATION, etc.
    }
    ```
  - [ ] Validation:
    - [ ] Payment must exist
    - [ ] Payment status must be COMPLETED
    - [ ] Amount <= original amount
    - [ ] Not already refunding
  - [ ] Response:
    ```json
    {
      "id": "refund_xxx",
      "paymentId": "payment_xxx",
      "amount": 15000,
      "status": "REFUND_REQUESTED",
      "reason": "CUSTOMER_REQUEST"
    }
    ```
  - [ ] Call refund service to process
- [ ] Add endpoint `GET /api/v1/admin/payments/:paymentId/refunds`
  - [ ] List all refunds for a payment (support multiple partial refunds)
  - [ ] Response:
    ```json
    {
      "refunds": [
        { "id": "refund_xxx", "amount": 5000, "status": "REFUNDED", "createdAt": "..." }
      ]
    }
    ```
- [ ] Write integration tests:
  - [ ] Test successful refund request
  - [ ] Test refund on non-completed payment (should fail)
  - [ ] Test refund amount validation
  - [ ] Test list refunds

**Acceptance Criteria:**
- [ ] Endpoints implemented
- [ ] Validation works
- [ ] Integration tests pass

---

## [5.2] Paymob Refund API Integration

**Description:** Call Paymob to process refunds

**Subtasks:**
- [ ] Create `backend/src/services/refund.service.ts`
- [ ] Add method `async initiateRefund(paymentId: string, amount?: number)`:
  - [ ] Get payment details
  - [ ] Validate payment is refundable
  - [ ] Calculate refund amount (full or partial)
  - [ ] Call Paymob refund API:
    ```typescript
    const auth = await paymobRequest<{ token: string }>("/auth/tokens", {
      api_key: env.PAYMOB_API_KEY
    });
    
    const refund = await paymobRequest<{ id: string, success: boolean }>("/refunds", {
      auth_token: auth.token,
      transaction_id: payment.paymobTransactionId,
      amount_cents: amount || payment.amountPiasters
    });
    ```
  - [ ] Handle response:
    - [ ] If success: update payment to REFUNDED
    - [ ] If error: update to REFUND_FAILED with error details
  - [ ] Store paymobRefundId
  - [ ] Create event: REFUND_API_CALL, REFUND_SUCCEEDED or REFUND_FAILED
- [ ] Handle Paymob errors:
  - [ ] Already refunded: set to REFUNDED (idempotent)
  - [ ] Invalid transaction: error
  - [ ] Insufficient funds: error
  - [ ] Network error: retry
- [ ] Write unit tests:
  - [ ] Test successful refund
  - [ ] Test already refunded (idempotent)
  - [ ] Test network error
  - [ ] Test invalid transaction

**Acceptance Criteria:**
- [ ] Service created
- [ ] Paymob API integration works
- [ ] Error handling correct
- [ ] Unit tests pass

---

## [5.3] Enrollment Reversal Logic

**Description:** Remove student access on full refund

**Subtasks:**
- [ ] In refund service:
  - [ ] If full refund:
    ```typescript
    // Remove access
    await enrollmentService.revoke(payment.userId);
    
    // Or:
    await prisma.enrollment.updateMany({
      where: { userId: payment.userId },
      data: { status: "REVOKED" }
    });
    ```
  - [ ] If partial refund: keep access (refund is partial discount)
- [ ] Create event:
  - [ ] ENROLLMENT_REVOKED if full refund
  - [ ] LOG_NOTE if partial refund
- [ ] Verify student loses access:
  - [ ] Video access check: enrollment.status = REVOKED
  - [ ] Course page: show "No longer enrolled"
  - [ ] Dashboard: hide lessons
- [ ] Write test:
  - [ ] Full refund: verify enrollment status = REVOKED
  - [ ] Partial refund: verify enrollment status = ACTIVE
  - [ ] Try to access video after revoke: should fail

**Acceptance Criteria:**
- [ ] Full refunds revoke access
- [ ] Partial refunds keep access
- [ ] Access properly checked
- [ ] Test passes

---

## [5.4] Partial Refund Support

**Description:** Handle multiple refunds for same payment

**Subtasks:**
- [ ] Update Payment model:
  - [ ] `refundAmount: Int?` for each refund amount
  - [ ] Track total refunded separately
- [ ] Create Refund model:
  - [ ] `id: String`
  - [ ] `paymentId: String`
  - [ ] `amount: Int`
  - [ ] `status: RefundStatus` (REQUESTED, PROCESSING, SUCCEEDED, FAILED)
  - [ ] `paymobRefundId: String?`
  - [ ] `createdAt: DateTime`
- [ ] In refund service:
  - [ ] Allow multiple refunds as long as total <= original
  - [ ] Track each refund separately
  - [ ] On final refund reaching 100%: revoke enrollment
- [ ] Example flow:
  - [ ] Payment: 1000 EGP
  - [ ] Refund 1: 400 EGP (customer request) → keep enrollment
  - [ ] Refund 2: 600 EGP (full rest) → revoke enrollment
- [ ] Write test:
  - [ ] Create payment
  - [ ] Refund 400
  - [ ] Refund 600
  - [ ] Verify total refunded = 1000
  - [ ] Verify enrollment revoked after second refund

**Acceptance Criteria:**
- [ ] Multiple refunds supported
- [ ] Total tracked
- [ ] Partial refunds don't revoke
- [ ] Full refunds do revoke
- [ ] Test passes

---

## [5.5] Refund Event Tracking

**Description:** Log all refund state changes

**Subtasks:**
- [ ] In refund service:
  - [ ] Create event for each state transition
  - [ ] REFUND_INITIATED: admin clicked refund
  - [ ] REFUND_API_CALL: calling Paymob
  - [ ] REFUND_SUCCEEDED: success from Paymob
  - [ ] REFUND_FAILED: error from Paymob
  - [ ] ENROLLMENT_REVOKED: full refund revoked access
- [ ] Event metadata:
  - [ ] Refund amount
  - [ ] Reason
  - [ ] Admin user ID
  - [ ] Error (if failed)
- [ ] Query refund history:
  - [ ] GET /api/v1/admin/payments/:id/refunds
  - [ ] Shows all refund events
- [ ] Write test:
  - [ ] Initiate refund
  - [ ] Query payment events
  - [ ] Verify all refund events present
  - [ ] Verify correct sequence

**Acceptance Criteria:**
- [ ] Refund events logged
- [ ] History queryable
- [ ] Sequence correct
- [ ] Test passes

---

## [5.6] Refund Email Notifications

**Description:** Email student on refund completion

**Subtasks:**
- [ ] Create email template: `refund-confirmation.template.hbs`
  - [ ] Subject: "Refund Processed - {studentName}"
  - [ ] Body:
    - [ ] Greeting
    - [ ] Confirmation of refund amount
    - [ ] Expected arrival time (2-5 business days)
    - [ ] If full refund: note that access has been removed
    - [ ] Support contact info
- [ ] In refund service:
  - [ ] After successful refund:
    ```typescript
    await sendRefundEmail({
      to: student.email,
      fullName: student.fullName,
      refundAmount: refund.amount / 100, // EGP
      refundDate: new Date(),
      isFull: refund.amount === payment.amountPiasters
    });
    ```
  - [ ] Error handling: log but don't fail
- [ ] Update `backend/src/utils/email.ts`:
  - [ ] Add `sendRefundEmail()` function
  - [ ] Use email service layer
- [ ] Write test:
  - [ ] Process refund
  - [ ] Verify email sent
  - [ ] Verify email content correct

**Acceptance Criteria:**
- [ ] Email template created
- [ ] Email sent on refund success
- [ ] Correct content
- [ ] Test passes

---

## [5.7] Refund Retry on Failure

**Description:** Retry failed refunds automatically

**Subtasks:**
- [ ] Create background job to process failed refunds:
  - [ ] Query refunds with status = REFUND_FAILED
  - [ ] createdAt < 1 hour ago (retry window)
  - [ ] retryCount < 3
- [ ] For each failed refund:
  - [ ] Retry Paymob call
  - [ ] If succeeds: update to SUCCEEDED, send email
  - [ ] If fails: increment retry count, schedule next retry
  - [ ] After 3 failed retries: alert admin
- [ ] Run job every 10 minutes
- [ ] Write test:
  - [ ] Create failed refund
  - [ ] Mock Paymob to fail
  - [ ] Run retry job
  - [ ] Mock Paymob to succeed
  - [ ] Run retry job again
  - [ ] Verify refund succeeded

**Acceptance Criteria:**
- [ ] Retry mechanism works
- [ ] Max retries respected
- [ ] Admin alerted after max retries
- [ ] Test passes

---

## [5.8] Integration Tests for Refunds

**Description:** Comprehensive refund flow testing

**Subtasks:**
- [ ] Create `backend/tests/integration/refund-flow.test.ts`
- [ ] Test: Full refund
  - [ ] Create payment
  - [ ] Process webhook (COMPLETED)
  - [ ] Verify enrollment created
  - [ ] Initiate refund
  - [ ] Verify payment status REFUNDED
  - [ ] Verify enrollment revoked
  - [ ] Verify email sent
- [ ] Test: Partial refund
  - [ ] Create payment for 1000
  - [ ] Refund 400
  - [ ] Verify enrollment still active
  - [ ] Refund 600
  - [ ] Verify enrollment revoked
- [ ] Test: Refund non-completed payment (should fail)
  - [ ] Create FAILED payment
  - [ ] Try to refund
  - [ ] Expect error
- [ ] Test: Refund with Paymob error
  - [ ] Mock Paymob to error
  - [ ] Initiate refund
  - [ ] Verify refund FAILED status
  - [ ] Verify retry scheduled
- [ ] Test: Multiple refunds
  - [ ] Create 3 refunds for same payment
  - [ ] Verify each tracked separately
  - [ ] Verify total = sum
- [ ] Run all tests:
  - [ ] `npm run test:integration refund-flow`
  - [ ] All pass ✓

**Acceptance Criteria:**
- [ ] All refund scenarios covered
- [ ] Happy path works
- [ ] Error cases handled
- [ ] All tests pass

---

# PHASE 6: Admin Payment Management

**Objective:** Build comprehensive admin tools for payment management

---

## [6.1] Payment List Endpoint with Filtering

**Description:** Admin can view all payments with filters

**Subtasks:**
- [ ] Add endpoint `GET /api/v1/admin/payments`
  - [ ] Query params:
    - [ ] `status`: COMPLETED, FAILED, PENDING, REFUNDED, etc. (enum)
    - [ ] `dateFrom`, `dateTo`: ISO date strings
    - [ ] `userId`: Filter by student
    - [ ] `minAmount`, `maxAmount`: Amount range (in EGP)
    - [ ] `page`: 1-indexed (default 1)
    - [ ] `limit`: results per page (default 20, max 100)
    - [ ] `sort`: createdAt, amount, status (default createdAt DESC)
  - [ ] Auth: ADMIN only
- [ ] Implement filtering:
  - [ ] Build Prisma where clause:
    ```typescript
    const where: Prisma.PaymentWhereInput = {};
    if (status) where.status = status;
    if (dateFrom) where.createdAt = { gte: new Date(dateFrom) };
    if (dateTo) {
      where.createdAt = { ...where.createdAt, lte: new Date(dateTo) };
    }
    if (userId) where.userId = userId;
    if (minAmount) where.amountPiasters = { gte: minAmount * 100 };
    if (maxAmount) {
      where.amountPiasters = { ...where.amountPiasters, lte: maxAmount * 100 };
    }
    ```
  - [ ] Apply pagination
  - [ ] Apply sorting
- [ ] Response:
  ```json
  {
    "payments": [
      {
        "id": "payment_xxx",
        "userId": "user_xxx",
        "userName": "John Doe",
        "amount": 15000,
        "status": "COMPLETED",
        "createdAt": "2026-04-24T10:00:00Z"
      }
    ],
    "pagination": {
      "total": 150,
      "page": 1,
      "limit": 20,
      "pages": 8
    }
  }
  ```
- [ ] Write integration test:
  - [ ] Create multiple payments with different statuses
  - [ ] Filter by status
  - [ ] Filter by date range
  - [ ] Filter by amount
  - [ ] Verify pagination
  - [ ] Verify sorting

**Acceptance Criteria:**
- [ ] Endpoint implemented
- [ ] All filters work
- [ ] Pagination works
- [ ] Integration test passes

---

## [6.2] Payment Detail Endpoint with History

**Description:** Admin can see full payment details and event history

**Subtasks:**
- [ ] Add endpoint `GET /api/v1/admin/payments/:paymentId`
  - [ ] Auth: ADMIN only
  - [ ] Return:
    ```json
    {
      "payment": {
        "id": "payment_xxx",
        "userId": "user_xxx",
        "userName": "John Doe",
        "userEmail": "john@example.com",
        "status": "COMPLETED",
        "amount": 15000,
        "discountAmount": 5000,
        "finalAmount": 10000,
        "currency": "EGP",
        "couponCode": "SAVE20",
        "packageId": "core-course",
        "paymobOrderId": "123456",
        "paymobTransactionId": "789012",
        "webhookReceivedAt": "2026-04-24T10:00:01Z",
        "refundStatus": "REFUNDED",
        "refundAmount": 10000,
        "refundedAt": "2026-04-25T14:00:00Z",
        "errorCode": null,
        "errorMessage": null,
        "createdAt": "2026-04-24T09:59:00Z",
        "ipAddress": "192.168.1.1",
        "userAgent": "Mozilla/5.0..."
      },
      "events": [
        {
          "id": "event_xxx",
          "type": "INITIATED",
          "status": "INITIATED",
          "createdAt": "2026-04-24T09:59:00Z",
          "metadata": {}
        },
        {
          "id": "event_yyy",
          "type": "PAYMENT_KEY_GENERATED",
          "status": "AWAITING_PAYMENT",
          "createdAt": "2026-04-24T09:59:05Z",
          "metadata": { "orderId": "123456" }
        },
        {
          "id": "event_zzz",
          "type": "WEBHOOK_RECEIVED",
          "status": "WEBHOOK_PENDING",
          "createdAt": "2026-04-24T10:00:01Z",
          "metadata": {}
        },
        {
          "id": "event_aaa",
          "type": "STATUS_CHANGED",
          "status": "COMPLETED",
          "previousStatus": "WEBHOOK_PENDING",
          "createdAt": "2026-04-24T10:00:01Z",
          "metadata": {}
        },
        {
          "id": "event_bbb",
          "type": "ENROLLMENT_SUCCEEDED",
          "status": "COMPLETED",
          "createdAt": "2026-04-24T10:00:02Z",
          "metadata": {}
        }
      ],
      "reconciliation": {
        "status": "RECONCILED",
        "paymobStatus": "success",
        "localStatus": "COMPLETED",
        "amountMatch": true,
        "reconciliedAt": "2026-04-24T10:00:00Z"
      }
    }
    ```
- [ ] Implement query:
  - [ ] Get payment by ID
  - [ ] Include all events ordered by createdAt ASC
  - [ ] Include reconciliation if exists
  - [ ] Include user details
- [ ] Write integration test:
  - [ ] Create payment and send webhook
  - [ ] Query detail endpoint
  - [ ] Verify all events present
  - [ ] Verify event order correct
  - [ ] Verify all fields present

**Acceptance Criteria:**
- [ ] Endpoint implemented
- [ ] Full history shown
- [ ] Events in order
- [ ] Integration test passes

---

## [6.3] Manual Payment Creation

**Description:** Admin can manually record offline payments

**Subtasks:**
- [ ] Add endpoint `POST /api/v1/admin/payments`
  - [ ] Auth: ADMIN only
  - [ ] Input:
    ```json
    {
      "userId": "user_xxx",
      "amount": 15000,
      "currency": "EGP",
      "method": "BANK_TRANSFER",  // or CHEQUE, CASH, etc.
      "reference": "TRANSFER123",
      "notes": "Bank transfer received"
    }
    ```
  - [ ] Validation:
    - [ ] User exists
    - [ ] Amount > 0
    - [ ] User not already enrolled
  - [ ] Process:
    - [ ] Create payment record
    - [ ] Set status to MANUAL_OVERRIDE
    - [ ] Set manualOverrideBy to current admin user
    - [ ] Trigger enrollment
    - [ ] Send emails
    - [ ] Create event: MANUAL_OVERRIDE_APPLIED
  - [ ] Response: Created payment details
- [ ] Implement in payment service:
  - [ ] `async createManualPayment(userId, amount, method, reference, adminId)`
- [ ] Write integration test:
  - [ ] Create manual payment
  - [ ] Verify payment created with MANUAL_OVERRIDE status
  - [ ] Verify enrollment created
  - [ ] Verify emails sent

**Acceptance Criteria:**
- [ ] Endpoint implemented
- [ ] Admin can create offline payments
- [ ] Enrollment triggered
- [ ] Integration test passes

---

## [6.4] Payment Reconciliation API

**Description:** Admin can reconcile Paymob vs local payments

**Subtasks:**
- [ ] Add endpoint `GET /api/v1/admin/payments/reconciliation/summary`
  - [ ] Return:
    ```json
    {
      "summary": {
        "totalPayments": 1500,
        "reconciled": 1498,
        "mismatchCount": 2,
        "totalAmount": 22500000,
        "totalRefunded": 5000000,
        "lastReconciliation": "2026-04-24T10:00:00Z"
      },
      "mismatches": [
        {
          "paymentId": "payment_xxx",
          "issue": "AMOUNT_MISMATCH",
          "paymobAmount": 15000,
          "localAmount": 14500,
          "difference": 500,
          "status": "PENDING_REVIEW"
        },
        {
          "paymentId": "payment_yyy",
          "issue": "STATUS_MISMATCH",
          "paymobStatus": "success",
          "localStatus": "FAILED",
          "status": "PENDING_REVIEW"
        }
      ]
    }
    ```
- [ ] Add endpoint `POST /api/v1/admin/payments/reconciliation/run`
  - [ ] Query all COMPLETED payments from last 30 days
  - [ ] For each:
    - [ ] Call Paymob API to get transaction status
    - [ ] Compare with local status
    - [ ] Store in PaymentReconciliation table
  - [ ] Return summary of mismatches
  - [ ] This is expensive, admin should confirm before running
- [ ] Add endpoint `POST /api/v1/admin/payments/:paymentId/reconciliation/resolve`
  - [ ] Input: `{ resolution: "ACCEPT_LOCAL" | "ACCEPT_PAYMOB" | "MANUAL_FIX", notes: "..." }`
  - [ ] Mark reconciliation as resolved
  - [ ] If ACCEPT_PAYMOB and amounts differ: update local payment
  - [ ] Create audit event
- [ ] Write integration test:
  - [ ] Create payment with intentional mismatch
  - [ ] Run reconciliation
  - [ ] Verify mismatch found
  - [ ] Resolve mismatch
  - [ ] Verify resolved status

**Acceptance Criteria:**
- [ ] Reconciliation endpoints implemented
- [ ] Mismatches detected
- [ ] Manual resolution available
- [ ] Integration test passes

---

## [6.5] Paymob Sync Tools

**Description:** Sync payment status from Paymob

**Subtasks:**
- [ ] Add endpoint `POST /api/v1/admin/payments/:paymentId/sync-paymob`
  - [ ] Query Paymob for current transaction status
  - [ ] Compare with local status
  - [ ] If different: update local status
  - [ ] Log sync event
  - [ ] Response: payment details with sync result
- [ ] Add background job `SyncPaymobTransactionsJob`
  - [ ] Run every hour
  - [ ] Query all payments with status = WEBHOOK_PENDING
  - [ ] createdAt > 10 minutes ago (skip recent ones)
  - [ ] For each, call Paymob API
  - [ ] Update status if needed
  - [ ] Log sync events
- [ ] Implement Paymob query:
  - [ ] Call Paymob to get transaction by order ID
  - [ ] Extract current status
  - [ ] Extract error details if failed
- [ ] Write integration test:
  - [ ] Create payment
  - [ ] Mock Paymob status to COMPLETED
  - [ ] Call sync endpoint
  - [ ] Verify local status updated
  - [ ] Verify enrollment created

**Acceptance Criteria:**
- [ ] Sync endpoint implemented
- [ ] Background job runs
- [ ] Status properly updated
- [ ] Integration test passes

---

## [6.6] Export & Reporting

**Description:** Admin can export payment data for analysis

**Subtasks:**
- [ ] Add endpoint `GET /api/v1/admin/payments/export/csv`
  - [ ] Query params: same as payment list (status, date range, etc.)
  - [ ] Generate CSV with columns:
    - [ ] Payment ID, Student Name, Email, Amount, Status, Created At, Refunded
  - [ ] Return as downloadable file
  - [ ] Content-Type: text/csv
  - [ ] Content-Disposition: attachment; filename="payments-export.csv"
- [ ] Add endpoint `GET /api/v1/admin/payments/report/summary`
  - [ ] Return:
    ```json
    {
      "period": { "from": "2026-04-01", "to": "2026-04-30" },
      "summary": {
        "totalPayments": 150,
        "totalRevenue": 2250000,  // in piasters
        "averageOrderValue": 15000,
        "completionRate": 95.0,
        "refundRate": 2.0
      },
      "byDay": [
        { "date": "2026-04-01", "payments": 10, "revenue": 150000, "refunds": 1 }
      ],
      "byStatus": {
        "COMPLETED": 142,
        "FAILED": 5,
        "PENDING": 3
      }
    }
    ```
- [ ] Add endpoint `GET /api/v1/admin/payments/report/cohort`
  - [ ] Analyze students by enrollment date
  - [ ] Return: enrollment rate, refund rate, avg days to refund
- [ ] Write tests for each export

**Acceptance Criteria:**
- [ ] CSV export works
- [ ] Summary report works
- [ ] Cohort analysis works
- [ ] Data accurate

---

## [6.7] Admin Alerts System

**Description:** Notify admin of payment issues

**Subtasks:**
- [ ] Create alert types in database:
  - [ ] PAYMENT_FAILED: payment declined
  - [ ] ENROLLMENT_FAILED: payment succeeded but enrollment failed
  - [ ] WEBHOOK_TIMEOUT: no webhook after 10 mins
  - [ ] REFUND_FAILED: refund attempt failed
  - [ ] RECONCILIATION_MISMATCH: local vs Paymob difference
- [ ] Add endpoint `GET /api/v1/admin/alerts`
  - [ ] Query params: `type`, `resolved`, `limit`
  - [ ] Return list of alerts ordered by createdAt DESC
  - [ ] Include link to relevant payment
- [ ] Add endpoint `POST /api/v1/admin/alerts/:alertId/resolve`
  - [ ] Mark alert as resolved
  - [ ] Optional: store resolution notes
- [ ] Email alerts:
  - [ ] Send to admin email immediately when critical alert created
  - [ ] Include payment details and link to admin panel
  - [ ] Send digest email daily with all unresolved alerts
- [ ] Write tests:
  - [ ] Create payment that triggers alert
  - [ ] Verify alert created
  - [ ] Verify email sent
  - [ ] Query alerts endpoint
  - [ ] Mark resolved

**Acceptance Criteria:**
- [ ] Alert system implemented
- [ ] Emails sent
- [ ] Admin can see/manage alerts
- [ ] Tests pass

---

## [6.8] Integration Tests for Admin Management

**Description:** Comprehensive admin tools testing

**Subtasks:**
- [ ] Create `backend/tests/integration/admin-payments.test.ts`
- [ ] Test: List payments with filters
  - [ ] Create multiple payments
  - [ ] Filter by status
  - [ ] Filter by date range
  - [ ] Verify pagination
- [ ] Test: Payment detail view
  - [ ] Query detail endpoint
  - [ ] Verify full event history present
  - [ ] Verify all fields populated
- [ ] Test: Manual payment creation
  - [ ] Create via admin endpoint
  - [ ] Verify enrollment created
  - [ ] Verify emails sent
- [ ] Test: Reconciliation
  - [ ] Create intentional mismatch
  - [ ] Run reconciliation
  - [ ] Verify mismatch found
  - [ ] Resolve and verify
- [ ] Test: Export/Report
  - [ ] Generate CSV
  - [ ] Verify correct data
  - [ ] Generate summary report
  - [ ] Verify calculations
- [ ] Test: Alerts
  - [ ] Create alert-triggering scenario
  - [ ] Verify alert created
  - [ ] Verify email sent
  - [ ] Resolve alert
- [ ] Run all tests:
  - [ ] `npm run test:integration admin-payments`
  - [ ] All pass ✓

**Acceptance Criteria:**
- [ ] All admin tools tested
- [ ] Data integrity verified
- [ ] All tests pass

---

# PHASE 7: Monitoring & Observability

**Objective:** Track payment metrics and enable production monitoring

---

## [7.1] Payment Funnel Metrics

**Description:** Track conversion rates through payment flow

**Subtasks:**
- [ ] Add Prometheus metrics:
  - [ ] `payment_initiated_total` - counter, increment on INITIATED
  - [ ] `payment_awaiting_total` - counter, increment on AWAITING_PAYMENT
  - [ ] `payment_completed_total` - counter, increment on COMPLETED
  - [ ] `payment_failed_total` - counter, increment on FAILED
  - [ ] `payment_duration_seconds` - histogram, track time from INITIATED to COMPLETED
- [ ] Create metrics file `backend/src/observability/payment-metrics.ts`:
  - [ ] Export metric objects
  - [ ] Initialize in app startup
- [ ] In payment service:
  - [ ] Increment counters on each status change
  - [ ] Record duration when payment completes
  - [ ] Example:
    ```typescript
    prometheus.recordPaymentInitiated();
    // ...later...
    const duration = (Date.now() - payment.createdAt.getTime()) / 1000;
    prometheus.recordPaymentCompleted(duration);
    ```
- [ ] Export metrics at `/metrics` endpoint:
  - [ ] Prometheus scrape endpoint
  - [ ] Verify format is Prometheus-compatible
- [ ] Test:
  - [ ] Create payment
  - [ ] Complete webhook
  - [ ] Verify metrics incremented
  - [ ] Scrape `/metrics` endpoint
  - [ ] Verify metrics present

**Acceptance Criteria:**
- [ ] Metrics tracked
- [ ] Format correct
- [ ] Metrics queryable
- [ ] Test passes

---

## [7.2] Error Rate Monitoring

**Description:** Track payment failures and errors

**Subtasks:**
- [ ] Add Prometheus metrics:
  - [ ] `payment_errors_total` - counter with label `error_code`
  - [ ] `paymob_api_errors_total` - counter with label `http_status`
  - [ ] `enrollment_errors_total` - counter with label `error_reason`
  - [ ] `payment_failure_rate` - gauge (percentage)
- [ ] In payment service:
  - [ ] Increment `payment_errors_total` with error code on any error
  - [ ] Increment `paymob_api_errors_total` with HTTP status on API error
  - [ ] Example:
    ```typescript
    prometheus.recordError("ALREADY_ENROLLED");
    prometheus.recordPaymobError(response.status);
    ```
- [ ] Daily calculation job:
  - [ ] Calculate failure rate = failures / total
  - [ ] Set gauge value
  - [ ] Alert if > 5%
- [ ] Configure Prometheus alerts:
  - [ ] Alert: failure_rate > 0.05
  - [ ] Alert: paymob_api_errors > 10 in 5 minutes
  - [ ] Alert: enrollment_errors > 5 in 5 minutes
- [ ] Test:
  - [ ] Trigger various errors
  - [ ] Verify metrics incremented
  - [ ] Verify gauges updated

**Acceptance Criteria:**
- [ ] Error metrics tracked
- [ ] Alerts configured
- [ ] Dashboards show errors
- [ ] Test passes

---

## [7.3] Revenue Metrics

**Description:** Track revenue and transaction metrics

**Subtasks:**
- [ ] Add Prometheus metrics:
  - [ ] `payment_revenue_total` - counter with label `currency`, incrementing by amount in piasters
  - [ ] `payment_refunds_total` - counter incrementing by refund amount
  - [ ] `payment_average_value` - gauge updated daily
  - [ ] `payment_coupon_discount_total` - counter for discounts applied
- [ ] In payment service:
  - [ ] On payment completion:
    ```typescript
    prometheus.recordRevenue(payment.amountPiasters, payment.currency);
    ```
  - [ ] On refund:
    ```typescript
    prometheus.recordRefund(refund.amount);
    ```
  - [ ] On coupon applied:
    ```typescript
    prometheus.recordDiscount(payment.discountPiasters);
    ```
- [ ] Daily job:
  - [ ] Calculate average order value
  - [ ] Update gauge
  - [ ] Calculate net revenue (revenue - refunds)
- [ ] Test:
  - [ ] Create payments with different amounts
  - [ ] Process refunds
  - [ ] Verify metrics accurate

**Acceptance Criteria:**
- [ ] Revenue metrics tracked
- [ ] Accurate calculations
- [ ] Daily updates work
- [ ] Test passes

---

## [7.4] Webhook Event Tracking

**Description:** Monitor webhook delivery and processing

**Subtasks:**
- [ ] Add Prometheus metrics:
  - [ ] `webhook_received_total` - counter
  - [ ] `webhook_processing_time_seconds` - histogram
  - [ ] `webhook_duplicate_total` - counter
  - [ ] `webhook_failures_total` - counter with label `reason`
  - [ ] `webhook_delivery_latency_seconds` - histogram (time from payment to webhook)
- [ ] In webhook controller:
  - [ ] Record receipt:
    ```typescript
    const startTime = Date.now();
    try {
      await paymentService.processWebhook(...);
      const duration = (Date.now() - startTime) / 1000;
      prometheus.recordWebhookProcessed(duration);
    } catch (error) {
      prometheus.recordWebhookError(error.code);
    }
    ```
  - [ ] Calculate delivery latency:
    ```typescript
    const latency = (webhookReceivedAt - payment.createdAt) / 1000;
    prometheus.recordWebhookLatency(latency);
    ```
- [ ] Configure alerts:
  - [ ] Alert: webhook latency > 600 seconds (10 min)
  - [ ] Alert: webhook failures > 10 in 5 min
- [ ] Test:
  - [ ] Send webhook
  - [ ] Verify metrics recorded
  - [ ] Verify latency calculated

**Acceptance Criteria:**
- [ ] Webhook metrics tracked
- [ ] Latency measured
- [ ] Alerts configured
- [ ] Test passes

---

## [7.5] Failed Payment Alerts

**Description:** Send alerts when payments fail

**Subtasks:**
- [ ] Create alert template email
- [ ] Implement alert service:
  - [ ] `async alertPaymentFailed(paymentId: string)`
  - [ ] Get payment details
  - [ ] Send email to admin
  - [ ] Include payment info, error reason, link to admin panel
- [ ] In payment service:
  - [ ] After FAILED status:
    ```typescript
    await alertService.alertPaymentFailed(payment.id);
    ```
- [ ] Add alert summary job:
  - [ ] Run every 6 hours
  - [ ] Send email with summary of all unresolved failures
  - [ ] Include count, top error reasons, link to admin panel
- [ ] Make configurable:
  - [ ] Alert threshold (e.g., only alert if > 5 failures)
  - [ ] Email recipients (list of admin emails)
  - [ ] Alert frequency
- [ ] Test:
  - [ ] Cause payment failure
  - [ ] Verify email sent
  - [ ] Verify content correct

**Acceptance Criteria:**
- [ ] Alert emails sent
- [ ] Summary emails sent
- [ ] Configurable
- [ ] Test passes

---

## [7.6] Reconciliation Reports

**Description:** Regular reconciliation between Paymob and local database

**Subtasks:**
- [ ] Create scheduled job `DailyReconciliationJob`:
  - [ ] Run once per day (e.g., 6 AM)
  - [ ] Query all payments from last 7 days with COMPLETED status
  - [ ] For each:
    - [ ] Call Paymob API to verify
    - [ ] Compare with local status
    - [ ] Log any mismatches
  - [ ] Generate report
  - [ ] Email to admin if mismatches found
- [ ] Implement reconciliation logic:
  - [ ] Query Paymob for transaction by order ID
  - [ ] Compare amount
  - [ ] Compare status
  - [ ] Log to PaymentReconciliation table
- [ ] Report format:
  - [ ] Total payments checked
  - [ ] Matches vs Mismatches
  - [ ] Details of any mismatches
  - [ ] Action items
- [ ] Make configurable:
  - [ ] Reconciliation lookback period
  - [ ] Email recipients
  - [ ] Should alert if > N mismatches
- [ ] Test:
  - [ ] Create payment
  - [ ] Run reconciliation job
  - [ ] Verify reconciliation record created
  - [ ] Verify report generated

**Acceptance Criteria:**
- [ ] Reconciliation job runs
- [ ] Mismatches detected
- [ ] Reports generated
- [ ] Emails sent
- [ ] Test passes

---

## [7.7] Detailed Logging Improvements

**Description:** Better logging for debugging

**Subtasks:**
- [ ] Create `backend/src/observability/logger.ts`:
  - [ ] Structured logging with request ID
  - [ ] Include timestamp, level, message
  - [ ] Context info: userId, paymentId, etc.
  - [ ] Sample log:
    ```json
    {
      "timestamp": "2026-04-24T10:00:00Z",
      "level": "INFO",
      "requestId": "req-xxx",
      "userId": "user-xxx",
      "paymentId": "payment-xxx",
      "message": "Payment completed",
      "metadata": { "status": "COMPLETED", "amount": 15000 }
    }
    ```
- [ ] Replace console logs:
  - [ ] Remove all `console.log`, `console.error`, etc.
  - [ ] Replace with structured logger
  - [ ] Maintain INFO, WARN, ERROR, DEBUG levels
- [ ] Log critical paths:
  - [ ] Payment creation
  - [ ] Webhook receipt
  - [ ] Enrollment trigger
  - [ ] Email sending
  - [ ] Any errors
- [ ] Make searchable:
  - [ ] Logs sent to centralized logging service (if available)
  - [ ] Or stored with good indexing
  - [ ] Can query by requestId, userId, paymentId
- [ ] Test:
  - [ ] Perform payment flow
  - [ ] Verify logs created with correct structure
  - [ ] Verify searchable by IDs

**Acceptance Criteria:**
- [ ] Structured logging implemented
- [ ] All logs properly formatted
- [ ] Searchable by context
- [ ] Test passes

---

## [7.8] Observability Tests

**Description:** Test monitoring and alerting systems

**Subtasks:**
- [ ] Create `backend/tests/integration/observability.test.ts`
- [ ] Test: Payment metrics incremented
  - [ ] Create payment
  - [ ] Complete webhook
  - [ ] Query metrics endpoint
  - [ ] Verify counters incremented
  - [ ] Verify histogram recorded
- [ ] Test: Error metrics tracked
  - [ ] Trigger various errors
  - [ ] Verify error counter incremented with correct code
- [ ] Test: Revenue metrics accurate
  - [ ] Create payment with discount
  - [ ] Verify revenue recorded (discounted amount)
  - [ ] Process refund
  - [ ] Verify refund recorded
- [ ] Test: Webhook latency measured
  - [ ] Send webhook
  - [ ] Calculate expected latency
  - [ ] Verify metric recorded with correct value
- [ ] Test: Alerts generated
  - [ ] Simulate failure scenario
  - [ ] Verify alert created
  - [ ] Verify alert email sent
- [ ] Test: Logs created
  - [ ] Perform action
  - [ ] Query logs
  - [ ] Verify correct structure
  - [ ] Verify searchable
- [ ] Run all tests:
  - [ ] `npm run test:integration observability`
  - [ ] All pass ✓

**Acceptance Criteria:**
- [ ] All metrics tested
- [ ] All alerts tested
- [ ] All logs tested
- [ ] All tests pass

---

# PHASE 8: Frontend UX & Error Flows

**Objective:** Build user-facing pages and error handling

---

## [8.1] Checkout Page Enhancements

**Description:** Improve checkout page UX

**Subtasks:**
- [ ] Review `frontend/src/pages/Checkout.tsx`
- [ ] Add payment method selector (visual, static for now):
  - [ ] Show "Credit/Debit Card" as primary (Paymob handles)
  - [ ] Show "Other Payment Methods" as secondary (WhatsApp support)
- [ ] Add security badges/trust signals:
  - [ ] "Secured by Paymob" badge
  - [ ] SSL certificate indicator
  - [ ] Money-back guarantee note (if applicable)
- [ ] Improve form UX:
  - [ ] Clear pricing breakdown
  - [ ] Real-time discount calculation on coupon apply
  - [ ] Show savings amount in green
  - [ ] Clear call-to-action button
- [ ] Add loading state:
  - [ ] "Creating payment..." while API call in progress
  - [ ] Disable form during submission
  - [ ] Spinner animation
- [ ] Add error handling:
  - [ ] Show error message from API
  - [ ] Retry button for failed attempts
  - [ ] Link to contact support
- [ ] Test on mobile:
  - [ ] Responsive layout
  - [ ] Button sizes (min 48px)
  - [ ] Input fields readable
- [ ] Write E2E test:
  - [ ] Navigate to checkout
  - [ ] Enter coupon
  - [ ] Click pay
  - [ ] Verify redirected to Paymob

**Acceptance Criteria:**
- [ ] Checkout page improved
- [ ] Mobile responsive
- [ ] Error handling clear
- [ ] E2E test passes

---

## [8.2] Success Page Component

**Description:** Show success message after payment

**Subtasks:**
- [ ] Create `frontend/src/pages/PaymentSuccess.tsx`
  - [ ] Route: `/payment/success?paymentId=xxx`
  - [ ] Auto-verify payment status via API
  - [ ] Show:
    - [ ] Success checkmark icon
    - [ ] "Payment Successful!" heading
    - [ ] Payment amount and reference
    - [ ] Confirmation email sent message
    - [ ] Button: "Go to Course" (redirect to /course)
    - [ ] Button: "View Payment History" (redirect to /payments)
  - [ ] Include countdown: "Redirecting to course in 5 seconds..."
  - [ ] Auto-redirect after 5 seconds
- [ ] Add confetti animation (optional but nice)
- [ ] Mobile responsive
- [ ] Write E2E test:
  - [ ] Complete payment
  - [ ] Verify redirected to success page
  - [ ] Verify payment shown
  - [ ] Verify auto-redirect works

**Acceptance Criteria:**
- [ ] Success page created
- [ ] Shows payment details
- [ ] Auto-redirects
- [ ] Looks good on mobile
- [ ] E2E test passes

---

## [8.3] Failure Page Component

**Description:** Show failure message with recovery options

**Subtasks:**
- [ ] Create `frontend/src/pages/PaymentFailure.tsx`
  - [ ] Route: `/payment/failure?paymentId=xxx&reason=xxx`
  - [ ] Query payment to get error details
  - [ ] Show:
    - [ ] Error X icon
    - [ ] "Payment Failed" heading
    - [ ] User-friendly error message (from backend)
    - [ ] Payment reference
    - [ ] Button: "Try Again" (new checkout)
    - [ ] Button: "Use Different Card" (new checkout)
    - [ ] Button: "View Payment History"
    - [ ] Link: "Contact Support" (to support email/form)
  - [ ] Don't show technical error codes
  - [ ] Explain what might have gone wrong based on error:
    - [ ] CARD_DECLINED: "Your card was declined. Please check your card details and try again."
    - [ ] NETWORK_ERROR: "Connection error. Please check your internet and try again."
    - [ ] TIMEOUT: "Payment took too long. Please try again."
    - [ ] etc.
- [ ] Mobile responsive
- [ ] Write E2E test:
  - [ ] Mock Paymob failure
  - [ ] Complete checkout
  - [ ] Verify redirected to failure page
  - [ ] Verify error message shown
  - [ ] Click "Try Again"
  - [ ] Verify new checkout started

**Acceptance Criteria:**
- [ ] Failure page created
- [ ] Shows friendly error message
- [ ] Recovery options clear
- [ ] Looks good on mobile
- [ ] E2E test passes

---

## [8.4] Pending State Handling

**Description:** Show "Processing..." page while awaiting webhook

**Subtasks:**
- [ ] Create `frontend/src/pages/PaymentPending.tsx`
  - [ ] Route: `/payment/pending?paymentId=xxx`
  - [ ] Poll payment status every 3 seconds
  - [ ] Show:
    - [ ] Spinner/progress animation
    - [ ] "Processing Payment..." heading
    - [ ] "Your payment is being processed. This usually takes a few seconds."
    - [ ] Payment reference
    - [ ] Timeout message after 2 minutes: "Your payment is taking longer than expected."
  - [ ] Once COMPLETED:
    - [ ] Redirect to success page
    - [ ] Show success message
  - [ ] If FAILED:
    - [ ] Redirect to failure page
    - [ ] Show error message
  - [ ] If still WEBHOOK_PENDING after 5 minutes:
    - [ ] Allow user to close page
    - [ ] Show: "You can close this page. We'll email you when payment is confirmed."
    - [ ] Status will be updated when webhook arrives
- [ ] Implement polling:
  - [ ] GET /api/v1/student/payment/:paymentId
  - [ ] Check status field
  - [ ] Stop polling when COMPLETED or FAILED
- [ ] Mobile responsive
- [ ] Write integration test:
  - [ ] Render pending page
  - [ ] Verify status polled
  - [ ] Mock status update
  - [ ] Verify redirect to success

**Acceptance Criteria:**
- [ ] Pending page created
- [ ] Polling works
- [ ] Auto-redirects on status change
- [ ] Timeout handling clear
- [ ] Test passes

---

## [8.5] Network Error Recovery

**Description:** Handle network failures gracefully

**Subtasks:**
- [ ] Add error boundary in checkout:
  - [ ] Catch network errors
  - [ ] Show error message: "Network error. Please check your connection and try again."
  - [ ] Provide retry button
- [ ] Add offline detection:
  - [ ] Detect if browser is offline
  - [ ] Show warning: "You appear to be offline. Please check your internet connection."
  - [ ] Disable checkout button
- [ ] Handle timeout gracefully:
  - [ ] If checkout API call times out > 10 seconds
  - [ ] Show: "Payment service is slow. Still trying..."
  - [ ] Allow cancel and retry
  - [ ] Don't create duplicate payment
- [ ] Handle Paymob iframe errors:
  - [ ] If iframe fails to load
  - [ ] Show error message
  - [ ] Provide retry button
- [ ] Write test:
  - [ ] Simulate network error
  - [ ] Verify error shown
  - [ ] Verify retry works
  - [ ] Simulate offline mode
  - [ ] Verify warning shown

**Acceptance Criteria:**
- [ ] Network errors handled gracefully
- [ ] Offline detection works
- [ ] Timeouts handled
- [ ] Test passes

---

## [8.6] Payment History Page

**Description:** Student can view their payment history

**Subtasks:**
- [ ] Create `frontend/src/pages/PaymentHistory.tsx`
  - [ ] Route: `/payments`
  - [ ] Auth: Required
  - [ ] Query: GET /api/v1/student/payments
  - [ ] Display as table or list:
    - [ ] Date of payment
    - [ ] Amount (in EGP)
    - [ ] Status (COMPLETED, FAILED, REFUNDED)
    - [ ] Action: View details (if applicable)
  - [ ] Show total amount paid
  - [ ] Show refunded amounts
  - [ ] Filter/sort options (optional)
- [ ] Payment detail modal:
  - [ ] Click on payment to see details
  - [ ] Show:
    - [ ] Full payment info
    - [ ] Event history (if admin)
    - [ ] Refund status
  - [ ] Close button
- [ ] Empty state:
  - [ ] If no payments: "No payments yet. Go to checkout to purchase the course."
  - [ ] Link to checkout
- [ ] Mobile responsive:
  - [ ] Collapse columns on small screens
  - [ ] Readable on mobile
- [ ] Write E2E test:
  - [ ] Enroll student
  - [ ] Navigate to payment history
  - [ ] Verify payment listed
  - [ ] Verify details show

**Acceptance Criteria:**
- [ ] Payment history page created
- [ ] Shows all payments
- [ ] Mobile responsive
- [ ] E2E test passes

---

## [8.7] Error Message Improvements

**Description:** User-friendly error messages throughout

**Subtasks:**
- [ ] Map backend error codes to user messages:
  - [ ] ALREADY_ENROLLED → "You're already enrolled in this course."
  - [ ] INVALID_COUPON → "This coupon code is invalid or has expired."
  - [ ] CHECKOUT_IN_PROGRESS → "You already have a pending checkout. Please complete that first."
  - [ ] PAYMOB_API_ERROR → "Payment service error. Please try again."
  - [ ] PAYMOB_TIMEOUT → "Connection to payment service timed out. Please try again."
  - [ ] CARD_DECLINED → "Your card was declined. Please check your card details and try another card."
  - [ ] NETWORK_ERROR → "Network error. Please check your connection."
  - [ ] etc.
- [ ] Create error mapping file:
  - [ ] `frontend/src/utils/payment-errors.ts`
  - [ ] Export function: `getErrorMessage(errorCode: string): string`
  - [ ] Use throughout checkout/payment pages
- [ ] Error display:
  - [ ] Show in red/warning color
  - [ ] Include actionable advice
  - [ ] Include contact support link for unresolved errors
- [ ] Write test:
  - [ ] Test each error code maps to message
  - [ ] Message is user-friendly (no technical jargon)

**Acceptance Criteria:**
- [ ] All error codes mapped
- [ ] Messages user-friendly
- [ ] Messages actionable
- [ ] Test passes

---

## [8.8] Frontend E2E Tests

**Description:** End-to-end payment flow testing from user perspective

**Subtasks:**
- [ ] Create `frontend/tests/e2e/payment-flow.spec.ts`
- [ ] Test: Happy path checkout
  - [ ] Navigate to checkout
  - [ ] Enter coupon (valid)
  - [ ] Click pay
  - [ ] Wait for Paymob iframe
  - [ ] Complete payment (mock)
  - [ ] Verify pending page
  - [ ] Wait for webhook (mock)
  - [ ] Verify success page
  - [ ] Verify redirect to course
- [ ] Test: Already enrolled
  - [ ] Navigate to checkout
  - [ ] Verify "Already enrolled" message
  - [ ] Verify button to course
- [ ] Test: Payment failure
  - [ ] Checkout
  - [ ] Mock payment failure
  - [ ] Verify failure page
  - [ ] Click retry
  - [ ] Verify new checkout starts
- [ ] Test: Network error
  - [ ] Checkout
  - [ ] Simulate network error
  - [ ] Verify error message
  - [ ] Click retry
  - [ ] Verify succeeds
- [ ] Test: Timeout recovery
  - [ ] Checkout
  - [ ] Wait 2+ minutes on pending page
  - [ ] Verify "taking longer" message
  - [ ] Close page
  - [ ] Later: webhook arrives
  - [ ] Access course (should work)
- [ ] Run with headless browser:
  - [ ] `npm run test:e2e payment-flow`
  - [ ] All scenarios pass ✓

**Acceptance Criteria:**
- [ ] All payment flows tested
- [ ] Happy path works
- [ ] Error cases handled
- [ ] All tests pass

---

# PHASE 9: Testing & Documentation

**Objective:** Comprehensive test coverage and operational documentation

---

## [9.1] Unit Test Suite for Payment Logic

**Description:** Unit tests for payment service and helpers

**Subtasks:**
- [ ] Create `backend/tests/unit/payment.service.test.ts`
- [ ] Test `createPaymobOrder()`:
  - [ ] Happy path: creates payment with AWAITING_PAYMENT status
  - [ ] Already enrolled: throws ALREADY_ENROLLED error
  - [ ] Checkout in progress: throws CHECKOUT_IN_PROGRESS error
  - [ ] Invalid coupon: throws INVALID_COUPON error
  - [ ] Paymob API error: throws PAYMOB_API_ERROR
  - [ ] User not found: throws USER_NOT_FOUND error
- [ ] Test `processWebhook()`:
  - [ ] Happy path: updates to COMPLETED, triggers enrollment
  - [ ] Duplicate webhook: returns same payment, creates WEBHOOK_DUPLICATE event
  - [ ] Failed webhook: updates to FAILED, no enrollment
  - [ ] Enrollment error: updates to ENROLLMENT_FAILED
  - [ ] Missing webhook data: throws INVALID_WEBHOOK_PAYLOAD error
- [ ] Test `validateCoupon()`:
  - [ ] Valid coupon: returns discount amount
  - [ ] Expired coupon: throws COUPON_EXPIRED error
  - [ ] Limit reached: throws COUPON_LIMIT_REACHED error
  - [ ] Minimum amount not met: throws COUPON_MINIMUM_AMOUNT error
- [ ] Test `getCheckoutPackage()`:
  - [ ] Valid package ID: returns package
  - [ ] Invalid package ID: returns default
  - [ ] No packages: returns settings-based package
- [ ] Run tests:
  - [ ] `npm run test:unit payment.service`
  - [ ] All pass with >90% coverage ✓

**Acceptance Criteria:**
- [ ] Unit tests comprehensive
- [ ] >90% code coverage
- [ ] All edge cases tested
- [ ] All tests pass

---

## [9.2] Unit Tests for Payment Repository

**Description:** Unit tests for data access layer

**Subtasks:**
- [ ] Create `backend/tests/unit/payment.repository.test.ts`
- [ ] Test `create()`:
  - [ ] Creates payment with correct fields
  - [ ] Returns created payment
  - [ ] Validates required fields
- [ ] Test `findById()`:
  - [ ] Returns payment if exists
  - [ ] Returns null if not found
- [ ] Test `findByPaymobTxId()`:
  - [ ] Returns payment for valid txId
  - [ ] Returns null for invalid txId
- [ ] Test `findByPaymobIdempotencyKey()`:
  - [ ] Returns payment for valid key
  - [ ] Returns null for invalid key
- [ ] Test `findPendingByUserId()`:
  - [ ] Returns pending payments for user
  - [ ] Filters by status (INITIATED, AWAITING_PAYMENT, WEBHOOK_PENDING)
  - [ ] Returns null if no pending
- [ ] Test `updateStatus()`:
  - [ ] Updates status and timestamp
  - [ ] Creates event atomically
  - [ ] Returns updated payment
- [ ] Test `listByStatus()`:
  - [ ] Filters by status
  - [ ] Applies pagination
  - [ ] Applies sorting
  - [ ] Returns correct count
- [ ] Run tests:
  - [ ] `npm run test:unit payment.repository`
  - [ ] All pass with >95% coverage ✓

**Acceptance Criteria:**
- [ ] Repository tests comprehensive
- [ ] >95% coverage
- [ ] All CRUD operations tested
- [ ] All tests pass

---

## [9.3] Integration Tests for Entire Flow

**Description:** End-to-end integration testing

**Subtasks:**
- [ ] Create `backend/tests/integration/full-payment-flow.test.ts`
- [ ] Test: Complete happy path
  - [ ] Student creates checkout
  - [ ] Payment created in database
  - [ ] Paymob order created
  - [ ] Payment key returned
  - [ ] Send webhook with success
  - [ ] Payment updated to COMPLETED
  - [ ] Enrollment created
  - [ ] Payment history cache invalidated
  - [ ] Emails sent
- [ ] Test: Failed payment recovery
  - [ ] Student creates checkout
  - [ ] Send webhook with failure
  - [ ] Payment updated to FAILED
  - [ ] Admin marks as paid
  - [ ] Enrollment created
  - [ ] Emails sent
- [ ] Test: Refund flow
  - [ ] Complete payment flow
  - [ ] Admin initiates refund
  - [ ] Paymob refund API called
  - [ ] Payment updated to REFUNDED
  - [ ] Enrollment revoked
  - [ ] Refund email sent
- [ ] Test: Error scenarios
  - [ ] Paymob API down: payment shows error, retry available
  - [ ] Network timeout: payment pending, webhook arrives later
  - [ ] Duplicate webhook: only one enrollment created
  - [ ] Enrollment error: payment ENROLLMENT_FAILED, retry scheduled
  - [ ] Email error: payment succeeds, email fails, retry scheduled
- [ ] Test: Concurrent scenarios
  - [ ] Two checkouts: only first succeeds
  - [ ] Two webhooks: only first processed
  - [ ] Simultaneous refund: only one succeeds
- [ ] Test database state:
  - [ ] All events logged
  - [ ] All relationships correct
  - [ ] Caches properly invalidated
- [ ] Run tests:
  - [ ] `npm run test:integration full-payment-flow`
  - [ ] All scenarios pass ✓

**Acceptance Criteria:**
- [ ] Full flow tested end-to-end
- [ ] All state transitions verified
- [ ] Error recovery verified
- [ ] Concurrency handled
- [ ] All tests pass

---

## [9.4] Paymob Sandbox Testing

**Description:** Test against actual Paymob sandbox environment

**Subtasks:**
- [ ] Set up Paymob sandbox account (if not already done)
- [ ] Get sandbox API key and integration ID
- [ ] Configure environment variables:
  - [ ] PAYMOB_API_KEY=sandbox_key
  - [ ] PAYMOB_INTEGRATION_ID=sandbox_integration
  - [ ] PAYMOB_BASE_URL=https://accept.paymob.com/api (already set)
- [ ] Test workflows:
  - [ ] Create order via API
  - [ ] Generate payment key
  - [ ] Open iframe in browser
  - [ ] Complete payment flow
  - [ ] Verify webhook sent
  - [ ] Check payment recorded correctly
- [ ] Test error scenarios:
  - [ ] Use invalid card number → should decline
  - [ ] Use expired card → should decline
  - [ ] Cancel payment → should fail
  - [ ] Close browser during payment → should timeout
- [ ] Test refunds:
  - [ ] Complete payment
  - [ ] Initiate refund via Paymob API
  - [ ] Verify refund status in Paymob
  - [ ] Verify local database updated
- [ ] Documentation:
  - [ ] Screenshot/document test card numbers used
  - [ ] Document expected webhook payload
  - [ ] Document error responses
- [ ] Clean up:
  - [ ] Use production API key in CI/CD
  - [ ] Keep sandbox config for local development

**Acceptance Criteria:**
- [ ] Sandbox testing complete
- [ ] All flows verified with actual Paymob
- [ ] Error scenarios tested
- [ ] Documentation captured

---

## [9.5] Refund Scenario Testing

**Description:** Comprehensive refund workflow testing

**Subtasks:**
- [ ] Unit tests for refund service:
  - [ ] `initiateRefund()` with valid payment
  - [ ] `initiateRefund()` with invalid payment (not COMPLETED)
  - [ ] `initiateRefund()` with amount validation
  - [ ] `initiateRefund()` with Paymob error
- [ ] Integration tests for refund flow:
  - [ ] Full refund (100%): enrollment revoked
  - [ ] Partial refund (50%): enrollment stays active
  - [ ] Multiple refunds: total tracked
  - [ ] Refund failure: retry scheduled
  - [ ] Refund timeout: alert sent to admin
- [ ] E2E test (if applicable):
  - [ ] Complete payment
  - [ ] Refund via admin panel
  - [ ] Verify payment history shows refund
  - [ ] Verify student loses access
  - [ ] Verify email received
- [ ] Edge cases:
  - [ ] Refund amount > payment amount → error
  - [ ] Refund already refunded payment → error
  - [ ] Refund with Paymob already-refunded → idempotent (success)
  - [ ] Refund during webhook processing → race condition handled
- [ ] Run all refund tests:
  - [ ] `npm run test refund`
  - [ ] All pass ✓

**Acceptance Criteria:**
- [ ] All refund scenarios tested
- [ ] Happy path works
- [ ] Error cases handled
- [ ] Edge cases covered
- [ ] All tests pass

---

## [9.6] API Documentation

**Description:** Document payment APIs for frontend/integration

**Subtasks:**
- [ ] Create `backend/docs/PAYMENT_API.md`
- [ ] Document endpoints:
  - [ ] POST /api/v1/student/checkout
    - [ ] Request/response examples
    - [ ] Error codes
    - [ ] Rate limiting
  - [ ] GET /api/v1/student/payment/:paymentId
    - [ ] Request/response examples
    - [ ] Polling frequency recommendation
  - [ ] POST /api/v1/student/payment/:paymentId/retry
  - [ ] GET /api/v1/student/payments
  - [ ] POST /api/v1/webhooks/paymob
    - [ ] Webhook signature validation
    - [ ] Payload structure
    - [ ] Idempotency guarantee
  - [ ] (Admin endpoints)
    - [ ] GET /api/v1/admin/payments
    - [ ] GET /api/v1/admin/payments/:paymentId
    - [ ] POST /api/v1/admin/payments/:paymentId/mark-paid
    - [ ] POST /api/v1/admin/payments/:paymentId/refund
    - [ ] etc.
- [ ] Include authentication requirements
- [ ] Include rate limits
- [ ] Include error code reference table
- [ ] Include code examples (curl, JS fetch, etc.)
- [ ] Include webhook example payload
- [ ] Publish to `/docs/api/payments` or similar

**Acceptance Criteria:**
- [ ] All endpoints documented
- [ ] Examples clear
- [ ] Error codes explained
- [ ] Ready for frontend team to use

---

## [9.7] Operational Runbooks

**Description:** Guides for ops team to handle production issues

**Subtasks:**
- [ ] Create `backend/docs/runbooks/payment-issues.md`
- [ ] Runbook: Payment stuck in WEBHOOK_PENDING
  - [ ] Symptom: Payment not completing
  - [ ] Diagnosis: Check webhook logs, verify Paymob webhook delivery
  - [ ] Resolution: Manual mark-paid or webhook replay
  - [ ] Links to relevant endpoints/tools
- [ ] Runbook: High payment failure rate
  - [ ] Symptom: Alert: payment failure rate > 5%
  - [ ] Diagnosis: Check recent errors, query error logs
  - [ ] Resolution: Contact Paymob support, check card issuer blocking, etc.
  - [ ] Commands to run:
    ```
    SELECT error_code, COUNT(*) FROM payment_events
    WHERE event_type = 'PAYMENT_FAILED' AND created_at > NOW() - INTERVAL 1 HOUR
    GROUP BY error_code;
    ```
- [ ] Runbook: Webhook delivery delays
  - [ ] Symptom: Alert: webhook latency > 10 minutes
  - [ ] Diagnosis: Check Paymob status page, webhook logs
  - [ ] Resolution: Wait or check Paymob connectivity
- [ ] Runbook: Reconciliation mismatch
  - [ ] Symptom: Alert: reconciliation mismatch found
  - [ ] Diagnosis: Query mismatch details
  - [ ] Resolution: Investigate root cause, manual override if needed
- [ ] Runbook: Student can't enroll after payment
  - [ ] Symptom: Payment COMPLETED but student not enrolled
  - [ ] Diagnosis: Check enrollment errors, database state
  - [ ] Resolution: Manual enrollment via admin endpoint
- [ ] Runbook: Refund failed
  - [ ] Symptom: Refund stuck in REFUND_FAILED
  - [ ] Diagnosis: Check Paymob error, check refund amount valid
  - [ ] Resolution: Retry or contact Paymob support
- [ ] Runbook: Database recovery
  - [ ] How to restore payment state if database issue
  - [ ] How to replay webhooks from Paymob
  - [ ] How to reconcile after recovery
- [ ] Add contact info:
  - [ ] Paymob support: +20 XXX XXX
  - [ ] Internal escalation contacts
  - [ ] On-call rotation schedule

**Acceptance Criteria:**
- [ ] All common issues covered
- [ ] Steps are clear and actionable
- [ ] Links to tools/commands included
- [ ] Contact info updated

---

## [9.8] Post-Implementation Review

**Description:** Review and finalize implementation

**Subtasks:**
- [ ] Code review:
  - [ ] All changes reviewed by team
  - [ ] No obvious bugs or security issues
  - [ ] Code style consistent
  - [ ] Tests comprehensive
- [ ] Performance testing:
  - [ ] Payment endpoint latency < 500ms
  - [ ] Webhook processing < 2 seconds
  - [ ] Database queries optimized (verified with EXPLAIN)
  - [ ] No N+1 queries
  - [ ] Cache hit rates > 80% for high-frequency queries
- [ ] Security review:
  - [ ] Webhook signature validation tested
  - [ ] No sensitive data in logs
  - [ ] HTTPS everywhere
  - [ ] API rate limiting in place
  - [ ] Proper authorization checks
  - [ ] Input validation present
- [ ] Monitoring setup:
  - [ ] Prometheus metrics defined
  - [ ] Alerts configured
  - [ ] Dashboards created
  - [ ] Runbooks written
  - [ ] On-call escalation setup
- [ ] Documentation:
  - [ ] API docs complete
  - [ ] Runbooks written
  - [ ] Code comments where needed
  - [ ] Architecture diagram
- [ ] Deployment:
  - [ ] Migrations ready
  - [ ] Environment variables documented
  - [ ] Rollback plan documented
  - [ ] Deployment checklist created
- [ ] Final sign-off:
  - [ ] Product owner approval
  - [ ] Engineering team approval
  - [ ] Ops team approval
  - [ ] Security team approval (if applicable)
- [ ] Retrospective:
  - [ ] What went well
  - [ ] What could be improved
  - [ ] Learnings documented
  - [ ] Action items for next phase

**Acceptance Criteria:**
- [ ] All code reviewed and approved
- [ ] Performance verified
- [ ] Security verified
- [ ] Monitoring ready
- [ ] Documentation complete
- [ ] Ready for production deployment

---

## Task Tracking Summary

| Phase | Task | Status | Owner |
|-------|------|--------|-------|
| 1 | Database Schema | ⏳ Pending | TBD |
| 1 | PaymentEvent Model | ⏳ Pending | TBD |
| 1 | Reconciliation Model | ⏳ Pending | TBD |
| 1 | Migration | ⏳ Pending | TBD |
| 1 | Types | ⏳ Pending | TBD |
| 1 | Repository | ⏳ Pending | TBD |
| 1 | Event Service | ⏳ Pending | TBD |
| 1 | Indexes | ⏳ Pending | TBD |
| 2 | Auth Gate | ⏳ Pending | TBD |
| 2 | Enrollment Check | ⏳ Pending | TBD |
| 2 | Concurrent Prevention | ⏳ Pending | TBD |
| 2 | Coupon Validation | ⏳ Pending | TBD |
| 2 | Package Selection | ⏳ Pending | TBD |
| 2 | Error Handling | ⏳ Pending | TBD |
| 2 | Retry Mechanism | ⏳ Pending | TBD |
| 2 | Integration Tests | ⏳ Pending | TBD |
| ... | ... | ... | ... |

---

**Total Tasks: 72**
**Estimated Story Points (if using Agile): ~500 points**
**Estimated Timeline (with 1000 devs): Highly parallelizable, could be 1-2 weeks with proper coordination**

---

**Document Generated:** April 24, 2026  
**Last Updated:** April 24, 2026  
**Status:** Ready for Implementation

---

# NEXT STEPS

1. ✅ Design complete (PAYMOB_INTEGRATION_DESIGN.md)
2. ✅ Tasks detailed (PAYMOB_INTEGRATION_TASKS.md)
3. ⏳ **Assign tasks to developers**
4. ⏳ **Set up git branches per phase**
5. ⏳ **Begin Phase 1 implementation**
6. ⏳ **Daily standups during each phase**
7. ⏳ **Phase reviews before proceeding to next**
8. ⏳ **Integration testing between phases**
9. ⏳ **Production deployment planning**
10. ⏳ **Go-live and monitoring**

---

