# Phase 7: Integration Guide - Adding Metrics to Services

**Last Updated:** April 24, 2026  
**Status:** Complete Integration Documentation  
**Audience:** Developers adding metrics to new services

---

## Overview

Phase 7 monitoring infrastructure is now fully integrated into the EduFlow LMS. This guide documents how metrics are recorded throughout the codebase and how to add metrics to new services.

## Metrics Architecture

### Three-Layer Architecture

```
Application Services
    ↓
metricsService (definitions & recording)
    ↓
Prometheus Registry (storage)
    ↓
Prometheus Server (collection)
    ↓
Grafana Dashboard (visualization)
```

### Registry Access

All metrics are registered with a single Prometheus registry defined in `metricsService.ts`:

```typescript
const registry = new client.Registry();
// All metrics registered with this registry
```

## Metric Recording Guide

### Available Metrics

#### Payment Metrics
- `eduflow_payments_total` - Total payment operations (status: pending/success/failure, method: paymob)
- `eduflow_payment_amount_piasters` - Payment amount distribution
- `eduflow_payment_processing_time_ms` - Payment processing latency
- `eduflow_active_payments` - Active/in-progress payment count

#### Refund Metrics
- `eduflow_refunds_total` - Total refund operations (type: full/partial, status: requested/processing/completed/failed/cancelled)
- `eduflow_refund_amount_piasters` - Refund amount distribution
- `eduflow_refund_processing_time_ms` - Refund processing latency

#### API Metrics
- `eduflow_paymob_api_request_time_ms` - External API latency (endpoint, status)
- `eduflow_paymob_api_errors_total` - API error count

#### Database Metrics
- `eduflow_db_query_time_ms` - Query execution time (operation, table)
- `eduflow_db_query_errors_total` - Query error count

#### Webhook Metrics
- `eduflow_webhook_processing_time_ms` - Webhook processing time (type: paymob/refund, status)
- `eduflow_webhook_errors_total` - Webhook error count

#### Enrollment Metrics
- `eduflow_enrollments_total` - Total enrollment operations (operation: create/revoke/activate, status)
- `eduflow_enrollment_processing_time_ms` - Enrollment operation latency

---

## Implementation Examples

### 1. Recording Payment Operations

**File:** `backend/src/services/payment.service.ts`

```typescript
import { metricsService } from "./metrics.service.js";

// When initiating a payment
metricsService.recordPaymentOperation("pending", "paymob", 0, paymentAmount);
metricsService.updateActivePayments("pending", 1);

// When payment completes
metricsService.recordPaymentOperation("success", "paymob", processingDurationMs, paymentAmount);
metricsService.updateActivePayments("pending", -1);

// When payment fails
metricsService.recordPaymentOperation("failure", "paymob", processingDurationMs, paymentAmount);
metricsService.updateActivePayments("pending", -1);
```

**Key Points:**
- Record pending status when payment is initiated
- Record success/failure when processing completes
- Always decrement active payments when transitioning from pending
- Include amount for amount-based metrics

---

### 2. Recording Paymob API Calls

**File:** `backend/src/services/payment.service.ts`

```typescript
const startTime = Date.now();
const response = await fetch(url, options);
const durationMs = Date.now() - startTime;

metricsService.recordPaymobApiCall(endpoint, response.status, durationMs);
```

**Key Points:**
- Record EVERY Paymob API call
- Include endpoint path for per-endpoint metrics
- Include HTTP status for error detection
- Always measure actual network time

---

### 3. Recording Refund Operations

**File:** `backend/src/services/refund.service.ts`

```typescript
import { metricsService } from "./metrics.service.js";

// When initiating refund
const isFullRefund = refundAmount === totalAmount;
metricsService.recordRefund(isFullRefund ? "full" : "partial", "requested", 0, refundAmount);

// When refund completes
metricsService.recordRefund(isFullRefund ? "full" : "partial", "completed", durationMs, refundAmount);

// When refund fails
metricsService.recordRefund(isFullRefund ? "full" : "partial", "failed", durationMs, refundAmount);
```

**Key Points:**
- Distinguish between full and partial refunds (affects enrollment revocation logic)
- Status values must match: requested, processing, completed, failed, cancelled
- Include refund amount for distribution tracking

---

### 4. Recording Enrollment Operations

**File:** `backend/src/services/enrollment.service.ts`

```typescript
import { metricsService } from "./metrics.service.js";

const startTime = Date.now();
try {
  const enrollment = await enrollmentRepository.create(...);
  const durationMs = Date.now() - startTime;
  metricsService.recordEnrollment("create", "success", durationMs);
  return enrollment;
} catch (error) {
  const durationMs = Date.now() - startTime;
  metricsService.recordEnrollment("create", "failure", durationMs);
  throw error;
}
```

**Key Points:**
- Operations: create, revoke, activate
- Always record both success and failure paths
- Include timing for performance monitoring
- Failures help identify enrollment system issues

---

### 5. Recording Webhook Processing

**File:** `backend/src/controllers/webhook.controller.ts`

```typescript
import { metricsService } from "../services/metrics.service.js";

const startTime = Date.now();
try {
  await processWebhook(payload);
  metricsService.recordWebhookProcessing("paymob", "success", Date.now() - startTime);
} catch (error) {
  metricsService.recordWebhookProcessing("paymob", "failure", Date.now() - startTime, error.code);
}
```

**Key Points:**
- Types: paymob, refund
- Status: success, failure
- Include error code on failure (helps identify error patterns)
- Critical for async operation visibility

---

### 6. Database Query Metrics (Automatic)

**File:** `backend/src/config/database.ts` (Already configured)

The database middleware automatically tracks all Prisma operations:

```typescript
prisma.$use(async (params, next) => {
  const startTime = Date.now();
  const result = await next(params);
  const durationMs = Date.now() - startTime;
  metricsService.recordDatabaseQuery(params.action, params.model, durationMs);
  return result;
});
```

**Tracked Operations:**
- select: queries
- create: inserts
- update: updates
- delete: deletes

No additional code needed - automatically tracks all database operations with timing.

---

## Complete Example: Payment Flow with Metrics

```typescript
// In payment.service.ts
async createPaymobOrder(userId: string, couponCode?: string, packageId?: string) {
  const startTime = Date.now();
  
  // Validate user...
  // Create payment record...
  
  // Record payment initiated
  metricsService.recordPaymentOperation("pending", "paymob", 0, payment.amountPiasters);
  metricsService.updateActivePayments("pending", 1);
  
  try {
    // Call Paymob API
    const auth = await paymobRequest("/auth/tokens", {...});  // Metrics recorded in paymobRequest
    const order = await paymobRequest("/ecommerce/orders", {...});  // Metrics recorded
    
    return {paymentKey, orderId, ...};
  } catch (error) {
    // Record failure
    const durationMs = Date.now() - startTime;
    metricsService.recordPaymentOperation("failure", "paymob", durationMs, payment.amountPiasters);
    metricsService.updateActivePayments("pending", -1);
    
    // Update payment status...
    throw error;
  }
}

async processWebhook(payload, hmac) {
  const startTime = Date.now();
  
  // Find payment...
  // Update status...
  
  if (updatedPayment.status === "COMPLETED") {
    // Record success
    metricsService.recordPaymentOperation("success", "paymob", Date.now() - startTime, payment.amountPiasters);
    metricsService.updateActivePayments("pending", -1);
    
    // Enroll student (triggers enrollment metrics)
    await enrollmentService.enroll(payment.userId, "PAID", payment.id);
  }
  
  // Record webhook processing
  metricsService.recordWebhookProcessing("paymob", "success", Date.now() - startTime);
}
```

**Metrics Recorded in This Flow:**
1. `eduflow_payments_total{status="pending", method="paymob"}` - +1
2. `eduflow_active_payments{status="pending"}` - +1
3. `eduflow_paymob_api_request_time_ms{endpoint="/auth/tokens", status="200"}` - recorded
4. `eduflow_paymob_api_request_time_ms{endpoint="/ecommerce/orders", status="200"}` - recorded
5. `eduflow_payment_processing_time_ms{status="success"}` - recorded
6. `eduflow_payment_amount_piasters{method="paymob"}` - recorded
7. `eduflow_enrollments_total{operation="create", status="success"}` - recorded (from enrollmentService)
8. `eduflow_webhook_processing_time_ms{type="paymob", status="success"}` - recorded

---

## Adding Metrics to New Services

### Checklist

When adding a new service that needs monitoring:

- [ ] Import `metricsService`
- [ ] Identify key operations (create, update, delete, API calls)
- [ ] Add metric recording at operation start (pending/requested status)
- [ ] Add metric recording at operation completion (success/failure)
- [ ] Include timing for performance metrics
- [ ] Include relevant labels (amount, type, operation)
- [ ] Record both success AND failure paths
- [ ] Test metrics appear in Prometheus

### Template for New Service

```typescript
import { metricsService } from "./metrics.service.js";

export const myService = {
  async criticalOperation(params) {
    const startTime = Date.now();
    
    try {
      // Log start
      metricsService.recordOperation("requested", "success", 0);  // if applicable
      
      // Perform operation
      const result = await performWork();
      
      // Record success
      const durationMs = Date.now() - startTime;
      metricsService.recordOperation("completed", "success", durationMs);
      
      return result;
    } catch (error) {
      // Record failure
      const durationMs = Date.now() - startTime;
      metricsService.recordOperation("failed", "failure", durationMs);
      throw error;
    }
  }
};
```

---

## Testing Metrics

### 1. Verify Metrics Are Recorded

```bash
# Check /metrics endpoint
curl http://localhost:3000/metrics | grep eduflow_

# Should output metrics like:
# eduflow_payments_total{method="paymob",status="success"} 5
# eduflow_payment_processing_time_ms_sum{status="success"} 12345
```

### 2. Test in Grafana

1. Go to http://localhost:3001 (Grafana)
2. Open dashboard "EduFlow Payment Monitoring"
3. Execute payment flow and watch metrics update

### 3. Query in Prometheus

1. Go to http://localhost:9090 (Prometheus)
2. Execute queries:
   - `rate(eduflow_payments_total[1m])` - payment rate
   - `histogram_quantile(0.95, eduflow_payment_processing_time_ms)` - P95 latency
   - `increase(eduflow_paymob_api_errors_total[5m])` - recent errors

---

## Troubleshooting

### Metrics Not Appearing

1. Check `PROMETHEUS_METRICS_ENABLED` env var (default: true)
2. Verify metricsService import path
3. Check for circular dependencies in imports
4. Review error logs for metric recording failures

### High Latency in Metrics

1. Database middleware adds minimal overhead (~0.1ms per query)
2. If metrics cause performance issues, check Prometheus registry size
3. Consider sampling for high-volume operations (future enhancement)

### Metrics Gaps

If expected metrics don't appear:
1. Verify metric recording calls were added
2. Check both success AND failure paths are covered
3. Test with both positive and negative flows
4. Review service integration examples above

---

## Performance Considerations

### Overhead

- Metric recording adds ~0.1-0.5ms per operation
- Database middleware adds ~0.1ms per query
- Negligible impact on overall performance

### Best Practices

- Record metrics AFTER operation completes (success/failure determined)
- Use lazy imports in middleware to avoid circular dependencies
- Catch and ignore metric recording errors (don't fail business logic)
- Label metrics appropriately for aggregation

---

## Summary

Phase 7 provides complete monitoring across:
- ✅ Payment operations (pending → success/failure)
- ✅ Refund operations (requested → completed/failed)
- ✅ Paymob API calls (latency + error tracking)
- ✅ Database queries (automatic tracking via middleware)
- ✅ Webhook processing (async operation visibility)
- ✅ Enrollment operations (create/revoke success/failure)

All metrics flow to Prometheus → Grafana for real-time visualization and alerting.

---

**Next Steps:**
1. Deploy monitoring stack: `docker-compose up` in `monitoring/`
2. Configure alert recipients (email, Slack)
3. Set up on-call rotation based on alerts
4. Review SLOs and adjust thresholds as needed
5. Add metrics to any new services following patterns above
