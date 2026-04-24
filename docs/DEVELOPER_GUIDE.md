# Developer Onboarding Guide

Welcome to the EduFlow LMS payment system! This guide will help you understand the codebase and get up to speed in < 1 hour.

---

## Table of Contents
1. [Project Structure](#project-structure)
2. [Local Setup](#local-setup)
3. [Architecture Overview](#architecture-overview)
4. [Key Code Locations](#key-code-locations)
5. [Payment Flow](#payment-flow)
6. [Common Tasks](#common-tasks)
7. [Testing](#testing)
8. [Debugging](#debugging)

---

## Project Structure

```
backend/
├── src/
│   ├── controllers/      # API endpoint handlers
│   │   └── checkout.controller.ts   # Payment checkout logic
│   ├── services/         # Business logic
│   │   ├── payment.service.ts       # Core payment logic
│   │   ├── coupon.service.ts        # Coupon validation
│   │   └── enrollment.service.ts    # Course enrollment
│   ├── repositories/     # Database access
│   │   └── payment.repository.ts    # Payment queries
│   ├── middleware/       # Request processing
│   │   ├── auth.middleware.ts       # JWT verification
│   │   └── rate-limit.middleware.ts # Rate limiting
│   ├── models/           # TypeScript interfaces
│   ├── routes/           # API route definitions
│   └── config/           # Configuration
├── tests/
│   ├── unit/            # Unit tests
│   ├── integration/      # Integration tests
│   └── e2e/             # End-to-end tests
└── prisma/
    └── schema.prisma    # Database schema

frontend/
├── src/
│   ├── pages/
│   │   ├── Checkout.tsx         # Checkout page
│   │   ├── PaymentSuccess.tsx   # Success page
│   │   └── PaymentHistory.tsx   # Payment list
│   ├── components/
│   │   ├── PaymentForm.tsx      # Form component
│   │   └── PaymentStatus.tsx    # Status display
│   ├── services/
│   │   └── payment-api.ts       # API calls
│   └── hooks/
│       └── usePayment.ts        # Custom hook
└── tests/
    ├── unit/            # Component tests
    └── e2e/             # End-to-end tests

tests/
├── load/                # Load tests (k6)
├── security/            # Security tests
└── chaos/               # Chaos testing docs
```

---

## Local Setup

### Prerequisites
- Node.js 20 LTS
- Docker (for PostgreSQL, Redis)
- npm 10+

### Step 1: Clone & Install

```bash
# Clone repository
git clone https://github.com/eduflow/lms.git
cd lms

# Install dependencies
npm install

# Install backend dependencies
cd backend && npm install && cd ..

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### Step 2: Environment Setup

```bash
# Copy env template
cp .env.example .env

# Get Paymob sandbox keys from:
# https://dashboard.paymobsolutions.com/settings/api
# Update .env with:
PAYMOB_API_KEY=your_key_here
PAYMOB_WEBHOOK_SECRET=your_secret_here

# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Add to .env: JWT_SECRET=<generated_value>
```

### Step 3: Database Setup

```bash
# Start PostgreSQL in Docker
docker run --name postgres \
  -e POSTGRES_USER=eduflow \
  -e POSTGRES_PASSWORD=dev123 \
  -e POSTGRES_DB=eduflow_lms \
  -p 5432:5432 \
  -d postgres:15

# Set DATABASE_URL in .env
DATABASE_URL="postgresql://eduflow:dev123@localhost:5432/eduflow_lms"

# Run migrations
npx prisma migrate dev

# Seed test data
npx prisma db seed
```

### Step 4: Redis Setup

```bash
# Start Redis in Docker
docker run --name redis \
  -p 6379:6379 \
  -d redis:7

# Verify connection
redis-cli ping  # Should return PONG
```

### Step 5: Start Development

```bash
# Terminal 1: Backend
cd backend
npm run dev
# Listens on http://localhost:3000

# Terminal 2: Frontend
cd frontend
npm run dev
# Opens http://localhost:5173
```

### Step 6: Test Payment Flow

1. Open http://localhost:5173
2. Click "Enroll in Course"
3. You'll be redirected to checkout
4. Fill form with test card: `4111111111111111`
5. Click "Pay"
6. Should redirect to success page

---

## Architecture Overview

### Payment Flow (High Level)

```
┌─────────────┐
│   Student   │
│  (Frontend) │
└──────┬──────┘
       │
       │ Clicks "Enroll"
       │
       ▼
┌─────────────────┐
│  Checkout Page  │ ◄── Validates auth
│  - Select pkg   │     Loads coupon
│  - Apply coupon │     Generates payment key
└────────┬────────┘
         │
         │ Submit payment form
         │
         ▼
┌──────────────────────┐
│   Paymob Iframe      │ ◄── Card payment
│   (Secure Payment)   │     (PCI compliant)
└────────┬─────────────┘
         │
         │ Payment processed
         │ (Success or Fail)
         │
         ▼
┌──────────────────────┐
│  Success/Fail Page   │
└────────┬─────────────┘
         │
         │ Webhook delivered
         │ (from Paymob)
         │
         ▼
┌──────────────────────┐
│  Backend Webhook     │ ◄── Validate HMAC
│  Handler             │     Update payment
└────────┬─────────────┘     Create enrollment
         │
         ▼
┌──────────────────────┐
│  Student Enrolled!   │ ◄── Can access course
└──────────────────────┘     Email sent
```

### Key Components

**Frontend (React):**
- Checkout.tsx - Main payment form
- usePayment hook - State management
- payment-api.ts - API communication

**Backend (Node.js/Express):**
- checkout.controller.ts - HTTP endpoint
- payment.service.ts - Core logic
- payment.repository.ts - Database access

**Database (PostgreSQL):**
- payments table - Payment records
- enrollments table - Course access
- coupons table - Discount codes

**External (Paymob):**
- API for creating orders
- Iframe for card payment
- Webhooks for status updates

---

## Key Code Locations

### Payment Creation Endpoint

```
File: backend/src/routes/checkout.ts
Method: POST /api/v1/checkout
Handler: backend/src/controllers/checkout.controller.ts
Service: backend/src/services/payment.service.ts -> createPaymobOrder()
```

### Error Codes

```
File: backend/src/models/payment-error.ts
All custom error codes defined here
- CARD_DECLINED
- COUPON_EXPIRED
- ALREADY_ENROLLED
- etc.
```

### Coupon Validation

```
File: backend/src/services/coupon.service.ts
Method: validateCoupon()
- Checks expiry
- Checks max uses
- Calculates discount
```

### Webhook Processing

```
File: backend/src/routes/webhooks.ts
Method: POST /api/v1/webhooks/paymob
Handler: Validates HMAC signature
Updates payment status
Creates enrollment
```

### Payment State Machine

```
File: backend/src/models/payment.ts
State transitions:
PENDING → PROCESSING → COMPLETED/FAILED/REFUNDED
       ↓                      ↓
WEBHOOK_PENDING        WEBHOOK_TIMEOUT
       ↓
   (retried)
```

### Database Schema

```
File: backend/prisma/schema.prisma
Models:
- Payment (status, amount, errorCode)
- Enrollment (studentId, courseId)
- Coupon (code, discount, expiresAt)
- PaymentEvent (for event sourcing)
```

---

## Payment Flow (Detailed)

### 1. Frontend Initiates

```typescript
// frontend/src/pages/Checkout.tsx
const handleSubmit = async (formData) => {
  // 1. Validate form
  // 2. Apply coupon (if any)
  // 3. Call backend to get payment key
  const response = await fetch('/api/v1/checkout', {
    method: 'POST',
    body: JSON.stringify({
      packageId: formData.packageId,
      couponCode: formData.couponCode
    })
  });
  
  const { paymentKey, iframeId } = await response.json();
  
  // 4. Show Paymob iframe
  // 5. User enters card details
  // 6. Paymob handles payment
  // 7. Redirects to success/failure
};
```

### 2. Backend Creates Payment

```typescript
// backend/src/services/payment.service.ts
async createPaymobOrder(userId, packageId, couponCode) {
  // 1. Validate student enrolled status
  const enrollment = await enrollmentService.getStatus(userId);
  if (enrollment) throw new PaymentError('ALREADY_ENROLLED');
  
  // 2. Get package details
  const package = await packageService.get(packageId);
  if (!package) throw new PaymentError('PACKAGE_NOT_FOUND');
  
  // 3. Validate & apply coupon
  let discount = 0;
  if (couponCode) {
    discount = await couponService.validateAndApply(couponCode);
  }
  
  // 4. Create payment record
  const payment = await paymentRepo.create({
    studentId: userId,
    packageId,
    amount: package.price - discount,
    status: 'PENDING'
  });
  
  // 5. Call Paymob API
  const paymobOrder = await paymobService.createOrder({
    merchantOrderId: payment.id,
    amount: payment.amount,
    currency: 'EGP'
  });
  
  // 6. Generate payment key (iframe token)
  const paymentKey = await paymobService.generatePaymentKey({
    orderId: paymobOrder.id,
    amount: payment.amount
  });
  
  // 7. Return to frontend
  return { paymentKey, iframeId: paymobOrder.id };
}
```

### 3. Paymob Processes Payment

User enters card in Paymob iframe → Paymob charges card → Returns result

### 4. Webhook Notification

```typescript
// backend/src/routes/webhooks.ts
POST /api/v1/webhooks/paymob
Body: {
  "obj": {
    "id": "paymob-order-123",
    "order": {
      "id": "payment-123"  // Our payment ID
    },
    "success": true,
    "amount_cents": 1000
  }
}

// Handler:
async handlePaymobWebhook(req) {
  // 1. Validate HMAC signature
  if (!validateHMAC(req.body, req.headers['hmac'])) {
    throw new Error('Invalid signature');
  }
  
  // 2. Update payment status
  const payment = await paymentRepo.updateStatus(
    orderId,
    req.body.success ? 'COMPLETED' : 'FAILED'
  );
  
  // 3. Create enrollment if successful
  if (payment.status === 'COMPLETED') {
    await enrollmentService.create({
      studentId: payment.studentId,
      courseId: payment.packageId
    });
    
    // Send confirmation email
    await emailService.sendConfirmation(payment.studentId);
  }
  
  // 4. Log event
  await eventService.log({
    type: 'PAYMENT_COMPLETED',
    paymentId: payment.id,
    timestamp: new Date()
  });
}
```

---

## Common Tasks

### Adding a New Error Code

1. Edit `backend/src/models/payment-error.ts`:
```typescript
export enum PaymentErrorCode {
  EXISTING_ERRORS,
  NEW_ERROR_CODE = 'NEW_ERROR_CODE'
}
```

2. Use in service:
```typescript
throw new PaymentError('NEW_ERROR_CODE', 400, 'User-friendly message');
```

3. Add test in `backend/tests/unit/payment.test.ts`

### Modifying Payment Logic

1. Edit `backend/src/services/payment.service.ts`
2. Update tests: `npm run test:unit payment`
3. Update integration tests if API changed
4. Run full test suite: `npm test`

### Adding a New Database Field

1. Edit `backend/prisma/schema.prisma`
2. Create migration: `npx prisma migrate dev --name add_new_field`
3. Update repository: `backend/src/repositories/payment.repository.ts`
4. Update service to use new field
5. Add tests

### Debugging a Payment Issue

1. Get payment ID
2. Check logs: `grep <payment_id> logs/combined.log`
3. Check database: `SELECT * FROM payments WHERE id = '<payment_id>';`
4. Follow guide: [Debugging Guide](./runbooks/debugging-guide.md)

---

## Testing

### Run All Tests

```bash
npm test
```

### Unit Tests Only

```bash
npm run test:unit

# Test specific file
npm run test:unit payment.service

# Watch mode (rerun on file change)
npm run test:unit -- --watch
```

### Integration Tests

```bash
npm run test:integration

# Requires database running
```

### E2E Tests

```bash
npm run test:e2e

# Run specific test
npm run test:e2e checkout.spec.ts

# Run headed (see browser)
npm run test:e2e -- --headed
```

### Coverage Report

```bash
npm run test:coverage

# View report
open coverage/index.html
```

---

## Debugging

### View Application Logs

```bash
# All logs (realtime)
tail -f logs/combined.log

# Error logs
tail -f logs/error.log

# Filter by payment ID
grep "payment-123" logs/combined.log | jq '.'
```

### Enable Debug Mode

```bash
LOG_LEVEL=debug npm run dev
```

### Browser Developer Tools

1. Open DevTools (F12)
2. Network tab - see API calls
3. Console tab - access debug helper:
```javascript
window.__debugPayment.getCurrentPayment()
window.__debugPayment.logs
```

### Test Payment Card

```
Card Number: 4111111111111111
Expiry: Any future date
CVV: Any 3 digits
```

### Database Queries

```bash
psql $DATABASE_URL

# List payments
SELECT * FROM payments ORDER BY created_at DESC LIMIT 10;

# Check enrollment
SELECT * FROM enrollments WHERE student_id = 'user-123';

# Search by payment ID
SELECT * FROM payments WHERE id = 'pay-123';
```

---

## Performance Tips

1. **Use Indexes:** Add database indexes for frequently queried fields
2. **Cache Results:** Use Redis for coupon validation, package lists
3. **Batch Operations:** Process webhooks in batches
4. **Monitor Logs:** Keep an eye on slow queries in logs

---

## Code Style

- Use TypeScript types (no `any`)
- Follow eslint rules: `npm run lint`
- Add JSDoc comments to public functions
- Write tests for new code
- Keep functions small and focused

---

## Questions?

- Check [FAQ](./FAQ.md)
- Read [Payment Flow Deep Dive](./PAYMENT_FLOW.md)
- Ask in #dev-general Slack channel
- Message on-call engineer

---

## Next Steps

1. ✅ Set up local environment
2. ✅ Test payment flow locally
3. ✅ Read PAYMENT_FLOW.md
4. ✅ Write a small feature
5. ✅ Run full test suite
6. ✅ Submit first PR

Welcome to the team! 🎉
