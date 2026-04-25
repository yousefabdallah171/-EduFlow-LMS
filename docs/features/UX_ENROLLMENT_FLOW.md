# EduFlow LMS — UX: Logged-In Student Enrollment Flow

> **Update rule:** Any time the checkout, payment, or enrollment flow changes, update this doc.

This doc covers the full journey for a user who **already has an account** and wants to enroll in the course.

---

## Flow Overview

```
Login → Browse Course → See Pricing → Checkout → Pay via Paymob → Success → Access Lessons
```

---

## Step 1: Login

**Page:** `/login`  
**File:** `frontend/src/pages/Login.tsx`

- User enters email + password (or clicks "Continue with Google")
- On success: access token stored in memory, `refresh_token` httpOnly cookie set
- Redirected to previous page or `/dashboard`

If email not verified → error shown: "Please verify your email before logging in"

---

## Step 2: Browse the Course

**Page:** `/course`  
**API:** `GET /api/v1/course` (public, cached)

Student sees:
- Course title and description
- Preview lessons (free, no enrollment needed)
- Pricing packages (e.g. Full Course — X EGP)
- "Enroll Now" CTA button

Clicking **Preview** on a free lesson → `/preview?lessonId=...` (opens VideoPlayer with demo token, no enrollment needed)

---

## Step 3: Click "Enroll Now" → Checkout

**Page:** `/checkout`  
**File:** `frontend/src/pages/Checkout.tsx`

System checks enrollment status first:
- `GET /api/v1/enrollment` → if `ACTIVE`: redirect to `/lessons` (already enrolled)
- If `NONE`: proceed to checkout

**Form:**
- Selected package shown (name, price)
- Coupon code input → `POST /checkout/validate-coupon` on Apply
  - Valid: shows discount, new price
  - Invalid: shows error "Coupon not found" or "Coupon expired"
- "Proceed to Payment" button

On **Proceed:**
- `POST /api/v1/checkout` with `{ packageId, couponCode? }`

**Backend:**
1. Validates student not already enrolled (409 if yes)
2. Validates no in-progress checkout (409 with `CHECKOUT_IN_PROGRESS`)
3. Creates Payment record (status: `INITIATED`)
4. Calls Paymob API: auth → create order → get payment key
5. Returns `{ iframeUrl, paymentId }`

**Frontend** redirects to Paymob iframe URL.

---

## Step 4: Pay via Paymob Iframe

Student enters card details (or mobile wallet) in Paymob's hosted page.

Paymob handles:
- Card validation
- 3D Secure if needed
- Processing

---

## Step 5: Paymob Sends Webhook

After payment attempt, Paymob immediately calls:
```
POST https://yourdomain.com/api/v1/webhooks/paymob
```

**Backend processes webhook:**
1. Validates HMAC signature → rejects if invalid
2. Checks idempotency key → skips if already processed (prevents duplicate enrollment)
3. Looks up Payment by `paymobOrderId`

**If `success = true`:**
- Payment status → `COMPLETED`
- Creates/activates `Enrollment` (status: `ACTIVE`)
- Increments coupon usage (if coupon used)
- Sends receipt email (queued in `EmailQueue`)
- Clears dashboard cache for this user
- Metrics recorded: `eduflow_payments_total{status="success"}`

**If `success = false`:**
- Payment status → `FAILED`
- Sends failure notification email
- Stores error code from Paymob response

---

## Step 6: Paymob Redirects Student Back

Paymob redirects browser to:
- `success = true` → `/payment/success`
- `success = false` → `/payment/failure`
- Pending/processing → `/payment/pending`

### Success Page (`/payment/success`)

**File:** `frontend/src/pages/PaymentSuccess.tsx`

Shows:
- ✅ "Payment successful!" with amount
- Student's name and enrolled package
- "Start Learning" CTA → `/lessons`

### Failure Page (`/payment/failure`)

**File:** `frontend/src/pages/PaymentFailure.tsx`

Shows:
- ❌ Error message (e.g. "Card declined")
- Reason from Paymob (INSUFFICIENT_FUNDS, CARD_EXPIRED, etc.)
- "Try Again" button → back to `/checkout`
- Contact support link

### Pending Page (`/payment/pending`)

**File:** `frontend/src/pages/PaymentPending.tsx`

Shows:
- ⏳ "Processing your payment..."
- Auto-polls `GET /api/v1/enrollment` every 3–5 seconds
- When status becomes `ACTIVE` → redirect to `/payment/success`
- Timeout after 5 minutes → show "Contact support" message

---

## Step 7: Access Course

**Page:** `/lessons`  
**File:** `frontend/src/pages/Lessons.tsx`

Student now sees all published lessons organized by section.

First visit after enrollment:
- Dashboard shows completion 0%, last lesson = null
- All lessons unlocked (unless drip-feed is configured)
- Start with the first section

---

## Drip-Feed (if configured)

If a lesson has `dripDays > 0`:
- Lesson is locked until `enrolledAt + dripDays * 86400s <= now`
- Locked lessons show a countdown
- Unlocked lessons open normally

---

## Error Scenarios & Recovery

| Error | What Student Sees | Recovery |
|-------|------------------|----------|
| Already enrolled | "You're already enrolled" | Redirect to `/lessons` |
| Checkout in progress | "Another checkout is active" | Wait 15 min or contact support |
| Payment declined | PaymentFailure page with reason | Try different card |
| Webhook delayed | PaymentPending page, auto-polls | Resolves within 30 min |
| Network error during checkout | `PaymentErrorBoundary` catches, shows retry | Click "Try again" |

---

## Key Files

| File | Purpose |
|------|---------|
| `frontend/src/pages/Checkout.tsx` | Checkout form + coupon |
| `frontend/src/pages/PaymentSuccess.tsx` | Success page |
| `frontend/src/pages/PaymentFailure.tsx` | Failure page |
| `frontend/src/pages/PaymentPending.tsx` | Polling page |
| `frontend/src/hooks/usePaymentStatus.ts` | Hook for polling payment/enrollment status |
| `frontend/src/utils/paymentErrorHandler.ts` | Maps error codes to messages |
| `frontend/src/components/PaymentErrorBoundary.tsx` | React error boundary |
| `backend/src/services/payment.service.ts` | Paymob API + checkout logic |
| `backend/src/controllers/webhook.controller.ts` | Webhook handler |
| `backend/src/services/enrollment.service.ts` | Enrollment creation |
