# Payment Flow - Complete Documentation

## Overview

This document provides a complete breakdown of the payment flow from student enrollment to course access.

---

## Flow Diagram

```
┌──────────────┐
│   Student    │ ◄─ Authenticated user
│   Interface  │
└──────┬───────┘
       │
       │ "Enroll in course"
       ▼
┌─────────────────────────────────────┐
│   1. CHECKOUT PAGE LOADS            │
│   ✓ Auth check (redirect if not)    │
│   ✓ Load packages                   │
│   ✓ Load student coupon history     │
│   ✓ Generate Paymob payment key     │
└─────────┬───────────────────────────┘
          │
          │ Student fills form:
          │ - Select package
          │ - Apply coupon (optional)
          │ - Review amount
          │
          ▼
┌─────────────────────────────────────┐
│   2. FORM VALIDATION                │
│   ✓ Package exists                  │
│   ✓ Not already enrolled            │
│   ✓ Coupon valid (if provided)      │
│   ✓ Calculate final amount          │
└─────────┬───────────────────────────┘
          │
          │ If invalid:
          │ → Show error to student
          │ → Stay on checkout page
          │
          │ If valid:
          │ → Create payment record
          │ → Call Paymob API
          ▼
┌─────────────────────────────────────┐
│   3. CREATE PAYMENT (Backend)       │
│   POST /api/v1/checkout             │
│   Request: {packageId, couponCode}  │
│   ✓ Create Payment (PENDING)        │
│   ✓ Validate coupon                 │
│   ✓ Calculate amount                │
│   ✓ Create Paymob order             │
│   ✓ Generate payment key            │
│   Response: {paymentKey, iframeId}  │
└─────────┬───────────────────────────┘
          │
          │ Payment record state:
          │ - ID: pay-xxx
          │ - Status: PENDING
          │ - Amount: calculated
          │ - Coupon: applied
          │
          ▼
┌─────────────────────────────────────┐
│   4. PAYMOB PAYMENT IFRAME          │
│   ✓ Show secure iframe              │
│   ✓ Student enters card             │
│   ✓ Paymob processes payment        │
│   ✓ Card validation & charge        │
└─────────┬───────────────────────────┘
          │
          │ Three possible outcomes:
          │
          ├─ Success (approved)
          │  └─ Paymob sends webhook
          │
          ├─ Declined (card issue)
          │  └─ Show retry button
          │
          └─ Timeout (network)
             └─ Show pending page
             
          ▼
┌─────────────────────────────────────┐
│   5. WEBHOOK DELIVERY (Paymob)      │
│   POST /api/v1/webhooks/paymob      │
│   Body: {                           │
│     obj: {                          │
│       success: true,                │
│       order: { id: paymob-id },     │
│       amount_cents: 100000          │
│     }                               │
│   }                                 │
└─────────┬───────────────────────────┘
          │
          │ Can happen while frontend
          │ waiting OR after user
          │ navigation
          │
          ▼
┌─────────────────────────────────────┐
│   6. WEBHOOK PROCESSING (Backend)   │
│   ✓ Validate HMAC signature         │
│   ✓ Check payment exists            │
│   ✓ Prevent duplicates              │
│   ✓ Update payment status           │
│   ✓ Create enrollment               │
│   ✓ Log event                       │
│   ✓ Send confirmation email         │
└─────────┬───────────────────────────┘
          │
          │ If success:
          │ Payment.status = COMPLETED
          │ Create enrollment
          │ Queue confirmation email
          │
          │ If failure:
          │ Payment.status = FAILED
          │ Queue failure email
          │
          ▼
┌─────────────────────────────────────┐
│   7. FRONTEND UPDATE                │
│   ✓ Poll for payment status         │
│   ✓ Auto-redirect on completion     │
│   ✓ Show success page               │
│   ✓ Display receipt                 │
│   ✓ Link to course                  │
└─────────┬───────────────────────────┘
          │
          ▼
┌─────────────────────────────────────┐
│   8. STUDENT ENROLLED! ✓            │
│   Can now access course             │
│   Confirmation email sent           │
│   Receipt available                 │
└─────────────────────────────────────┘
```

---

## State Transitions

### Payment Status Machine

```
PENDING
  │
  ├─ Student in checkout form
  │
  ▼
PROCESSING
  │
  ├─ Paymob processing card
  │
  ├─────────────┬───────────────┬──────────────┐
  │             │               │              │
  ▼             ▼               ▼              ▼
COMPLETED   FAILED        WEBHOOK_PENDING   WEBHOOK_TIMEOUT
  │             │               │              │
  ├─ Success    ├─ Declined      ├─ Webhook    ├─ No webhook
  │             │    - Retry     │    pending  │    after 10min
  │             └─ Invalid card  ├─ Retrying  │
  │                              ▼             │
  │                         COMPLETED        │
  │                         (when webhook    │
  │                          arrives)        │
  │                                         │
  │                                        ▼
  │                                   FAILED or
  │                                   TIMEOUT
  │                                   (manual
  │                                    admin
  │                                    action)
  │
  ▼
REFUNDED (if refund requested)
```

### Enrollment Status Machine

```
NOT_ENROLLED
  │
  ├─ Student not enrolled yet
  │
  ▼
PAYMENT_PENDING
  │
  ├─ Payment created, waiting for webhook
  │
  ├──────────────────┬──────────────┐
  │                  │              │
  ▼                  ▼              ▼
ENROLLED        ENROLLMENT_FAILED  PAYMENT_FAILED
  │               │                 │
  ├─ Success       ├─ Database      ├─ Payment
  │   Can access   │    error       │   failed or
  │   course       │    Retry       │   refunded
  │                │    queued      │   No access
  │                │                │
  └────────────────┴────────────────┘
```

---

## API Calls Overview

### 1. GET /api/v1/packages

**When:** Checkout page loads
**Purpose:** Load available packages
**Request:**
```json
GET /api/v1/packages
Authorization: Bearer <token>
```

**Response:**
```json
{
  "packages": [
    {
      "id": "pkg-123",
      "name": "Beginner Course",
      "price": 1000,
      "currency": "EGP",
      "description": "..."
    }
  ]
}
```

### 2. GET /api/v1/checkout/validate-coupon

**When:** Student applies coupon
**Purpose:** Validate coupon and show discount
**Request:**
```json
GET /api/v1/checkout/validate-coupon?code=SAVE10&packageId=pkg-123
Authorization: Bearer <token>
```

**Response:**
```json
{
  "valid": true,
  "code": "SAVE10",
  "discountAmount": 100,
  "finalAmount": 900,
  "expiresAt": "2026-04-30T00:00:00Z"
}
```

**Errors:**
- `COUPON_EXPIRED` - Coupon date passed
- `COUPON_INVALID` - Code doesn't exist
- `COUPON_LIMIT_REACHED` - Max uses exceeded
- `COUPON_NOT_APPLICABLE` - Not valid for this package

### 3. POST /api/v1/checkout

**When:** Student submits payment form
**Purpose:** Create payment and get Paymob payment key
**Request:**
```json
POST /api/v1/checkout
Authorization: Bearer <token>
Content-Type: application/json

{
  "packageId": "pkg-123",
  "couponCode": "SAVE10"
}
```

**Response:**
```json
{
  "paymentId": "pay-abc123",
  "paymentKey": "ZXhhbXBsZV9wYXltZW50X2tleQ==",
  "iframeId": "paymob-order-456",
  "amount": 900,
  "currency": "EGP"
}
```

**Errors:**
- `ALREADY_ENROLLED` - Student already has access
- `PACKAGE_NOT_FOUND` - Package doesn't exist
- `INVALID_COUPON` - Coupon validation failed
- `PAYMOB_ERROR` - Paymob API error
- `CHECKOUT_IN_PROGRESS` - Another payment pending
- `RATE_LIMIT_EXCEEDED` - Too many requests

### 4. POST /api/v1/webhooks/paymob

**When:** Paymob sends webhook (asynchronously)
**Purpose:** Process payment result and create enrollment
**Request:** (from Paymob)
```json
POST /api/v1/webhooks/paymob
Content-Type: application/json
Authorization: <HMAC signature>

{
  "obj": {
    "id": "paymob-transaction-123",
    "order": {
      "id": "paymob-order-456"  // Maps to paymentId
    },
    "success": true,
    "amount_cents": 90000,
    "error": null
  }
}
```

**Response:** (always 200)
```json
{
  "status": "received"
}
```

**Processing:**
1. ✅ Validate HMAC signature
2. ✅ Find payment by Paymob order ID
3. ✅ Check for idempotency (prevent duplicates)
4. ✅ Update payment status (COMPLETED/FAILED)
5. ✅ Create enrollment (if success)
6. ✅ Send confirmation email
7. ✅ Log event

### 5. GET /api/v1/student/orders

**When:** Student views payment history
**Purpose:** List student's payments
**Request:**
```json
GET /api/v1/student/orders?page=1&limit=10
Authorization: Bearer <token>
```

**Response:**
```json
{
  "orders": [
    {
      "id": "pay-abc123",
      "amount": 900,
      "currency": "EGP",
      "status": "COMPLETED",
      "courseId": "pkg-123",
      "courseName": "Beginner Course",
      "createdAt": "2026-04-24T10:30:00Z",
      "receipt": "/api/v1/orders/pay-abc123/receipt"
    }
  ],
  "total": 5,
  "page": 1
}
```

### 6. POST /api/v1/orders/:paymentId/refund

**When:** Student/admin requests refund
**Purpose:** Refund payment and revoke enrollment
**Request:**
```json
POST /api/v1/orders/pay-abc123/refund
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 900,  // Optional: partial refund
  "reason": "Student requested"
}
```

**Response:**
```json
{
  "refundId": "ref-123",
  "amount": 900,
  "status": "PROCESSING",
  "createdAt": "2026-04-24T10:35:00Z"
}
```

---

## Database Operations

### Create Payment

```sql
INSERT INTO payments (
  id,
  student_id,
  package_id,
  amount,
  status,
  paymob_order_id,
  coupon_code,
  created_at
) VALUES (
  'pay-abc123',
  'student-1',
  'pkg-123',
  90000,  -- cents
  'PENDING',
  NULL,   -- filled after Paymob call
  'SAVE10',
  NOW()
);
```

### Update Payment Status

```sql
UPDATE payments
SET status = 'COMPLETED',
    paymob_transaction_id = 'paymob-txn-456',
    updated_at = NOW()
WHERE id = 'pay-abc123';
```

### Create Enrollment

```sql
INSERT INTO enrollments (
  student_id,
  course_id,
  payment_id,
  created_at
) VALUES (
  'student-1',
  'pkg-123',
  'pay-abc123',
  NOW()
);
```

### Check Already Enrolled

```sql
SELECT EXISTS (
  SELECT 1 FROM enrollments
  WHERE student_id = 'student-1'
  AND course_id = 'pkg-123'
);
```

### Apply Coupon

```sql
UPDATE coupons
SET uses = uses + 1,
    updated_at = NOW()
WHERE code = 'SAVE10'
AND expires_at > NOW()
AND uses < max_uses;
```

---

## Event Types

All operations are logged as events for audit trail.

```typescript
enum PaymentEventType {
  PAYMENT_CREATED = 'PAYMENT_CREATED',
  PAYMENT_PROCESSING = 'PAYMENT_PROCESSING',
  PAYMENT_COMPLETED = 'PAYMENT_COMPLETED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  WEBHOOK_RECEIVED = 'WEBHOOK_RECEIVED',
  WEBHOOK_VALIDATED = 'WEBHOOK_VALIDATED',
  ENROLLMENT_CREATED = 'ENROLLMENT_CREATED',
  ENROLLMENT_FAILED = 'ENROLLMENT_FAILED',
  COUPON_APPLIED = 'COUPON_APPLIED',
  EMAIL_SENT = 'EMAIL_SENT',
  REFUND_REQUESTED = 'REFUND_REQUESTED',
  REFUND_COMPLETED = 'REFUND_COMPLETED',
  ERROR_OCCURRED = 'ERROR_OCCURRED',
  RETRY_ATTEMPTED = 'RETRY_ATTEMPTED'
}
```

### Event Storage

```sql
-- Every event logged
INSERT INTO payment_events (
  payment_id,
  event_type,
  metadata,
  created_at
) VALUES (
  'pay-abc123',
  'PAYMENT_COMPLETED',
  '{"paymobTransactionId": "txn-456"}',
  NOW()
);

-- Query timeline
SELECT event_type, metadata, created_at
FROM payment_events
WHERE payment_id = 'pay-abc123'
ORDER BY created_at ASC;
```

---

## Error Handling

### Frontend Errors

| Error | Message | Action |
|-------|---------|--------|
| Invalid package | "Course not found" | Redirect to courses |
| Already enrolled | "You already have access" | Redirect to course |
| Coupon expired | "Discount code expired" | Show expiry date |
| Network error | "Connection failed" | Retry button |
| Card declined | "Payment declined" | Retry with different card |
| Timeout | "Payment processing" | Check email for status |

### Backend Errors

| Error Code | HTTP | Retry | Action |
|------------|------|-------|--------|
| CARD_DECLINED | 402 | Yes | User retries with different card |
| COUPON_EXPIRED | 400 | No | User chooses different coupon |
| ALREADY_ENROLLED | 409 | No | User can't pay twice |
| PAYMOB_ERROR | 502 | Yes | Auto-retry with backoff |
| RATE_LIMIT | 429 | Yes | Wait then retry |
| PAYMENT_TIMEOUT | 408 | Yes | Webhook will complete |

---

## Edge Cases Handled

### 1. Webhook Arrives Before Frontend

**Scenario:** Webhook processed before frontend checks status

**Handling:**
- Frontend polls for status every 2 seconds
- Auto-detects completion
- Redirects to success page
- No user action needed

### 2. Webhook Never Arrives

**Scenario:** Network issue, webhook lost

**Handling:**
- Payment stays in WEBHOOK_PENDING
- Admin alert after 10 minutes
- Manual webhook trigger available
- Payment can be marked complete by admin

### 3. Duplicate Webhook

**Scenario:** Paymob sends same webhook twice

**Handling:**
- Idempotency check (payment already COMPLETED)
- Webhook rejected as duplicate
- No duplicate enrollment created

### 4. Concurrent Checkouts

**Scenario:** User clicks checkout twice

**Handling:**
- Lock check: only one PENDING payment per user
- Second attempt blocked with error
- First payment continues normally

### 5. Partial Refund

**Scenario:** Student wants partial refund

**Handling:**
- Amount validated (can't exceed original)
- Enrollment revoked (all-or-nothing)
- Refund processed via Paymob
- New payment needed for remainder

### 6. Clock Skew

**Scenario:** Server time doesn't match Paymob

**Handling:**
- HMAC validation time-independent
- Signature still validates correctly
- System continues normally

---

## Performance Characteristics

| Operation | Typical | P95 | Notes |
|-----------|---------|-----|-------|
| Load packages | 50ms | 150ms | Cached |
| Validate coupon | 30ms | 100ms | Cached, DB query |
| Create payment | 150ms | 400ms | Multiple API calls |
| Process webhook | 50ms | 200ms | DB write only |
| Get payment history | 200ms | 500ms | Paginated, cached |

---

## Security Measures

1. **Authentication:** JWT token required (except webhooks)
2. **HTTPS:** All communication encrypted
3. **HMAC:** Webhook signature validation
4. **Rate Limiting:** Max 20 checkouts/min per student
5. **Coupon Locking:** Concurrent modifications prevented
6. **Idempotency:** Duplicate webhooks ignored
7. **Data Protection:** Sensitive fields redacted from logs
8. **CORS:** Only allowed origins can access

---

## Related Documentation

- [API Documentation](./API.md)
- [Database Schema](./SCHEMA.md)
- [Error Codes](./ERROR_CODES.md)
- [Testing Guide](./TESTING.md)
