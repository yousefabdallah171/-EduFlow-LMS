# Phase 7: Metrics Integration Guide

**Date:** 2026-04-24  
**Status:** Integration Complete  
**Scope:** Adding metrics to EduFlow services and controllers

---

## Overview

This guide explains how to integrate Prometheus metrics into EduFlow services. Metrics are automatically recorded in the Prometheus time-series database and visualized in Grafana dashboards.

### How It Works

1. **Metrics Service** - Defines all metrics (counters, gauges, histograms)
2. **Metrics Middleware** - Automatically tracks API requests
3. **Service Integration** - Services call metricsService functions to record operations
4. **Prometheus Collection** - Metrics are scraped at /metrics endpoint
5. **Grafana Visualization** - Dashboards display metrics in real-time

---

## Quick Start

### 1. Import metricsService

```typescript
import { metricsService } from "../services/metrics.service.js";
```

### 2. Record Metrics

```typescript
// Record payment operations
metricsService.recordPaymentOperation(
  status: "success" | "failure" | "pending",
  method: string,
  processingTimeMs: number,
  amountPiasters: number,
  errorCode?: string
);

// Record API requests (done automatically by middleware)
metricsService.recordApiRequest(endpoint, method, statusCode);

// Record database operations (done automatically by Prisma middleware)
metricsService.recordDatabaseQuery(operation, table, timeMs);
```

---

## Service Integration Examples

### Payment Service

**Location:** `backend/src/services/payment.service.ts`

**Metrics to Record:**

1. **When Payment is Initiated:**
```typescript
metricsService.recordPaymentOperation("pending", "paymob", 0, payment.amountPiasters);
```

2. **When Payment Succeeds:**
```typescript
const processingTimeMs = Date.now() - startTime;
metricsService.recordPaymentOperation("success", "paymob", processingTimeMs, payment.amountPiasters);
```

3. **When Payment Fails:**
```typescript
metricsService.recordPaymentOperation("failure", "paymob", processingTimeMs, payment.amountPiasters, errorCode);
```

4. **For Paymob API Calls:**
```typescript
const startTime = Date.now();
const response = await fetch(apiEndpoint, options);
const elapsedMs = Date.now() - startTime;
metricsService.recordPaymobApiCall(path, response.status, elapsedMs);
```

**Code Location Examples:**
- Line 213: Record pending payment when created
- Line 265: Record failure when Paymob API returns error
- Line 335: Record success when webhook received

---

### Enrollment Service

**Location:** `backend/src/services/enrollment.service.ts`

**Metrics to Record:**

1. **When User Enrolls:**
```typescript
metricsService.recordEnrollment("create", "success");
```

2. **When Enrollment is Revoked:**
```typescript
metricsService.recordEnrollment("revoke", "success");
```

3. **On Error (optional):**
```typescript
metricsService.recordEnrollment("create", "failure");
```

**Code Location Examples:**
- Line 46: Record enrollment creation
- Line 57: Record enrollment revocation

---

### Database Queries

**Location:** `backend/src/config/database.ts`

Database query metrics are **automatically tracked** using Prisma middleware:

```typescript
client.$use(async (params, next) => {
  const startTime = Date.now();
  const result = await next(params);
  const elapsedMs = Date.now() - startTime;
  metricsService.recordDatabaseQuery(params.action, params.model, elapsedMs);
  return result;
});
```

**No manual changes needed** - all Prisma queries are automatically tracked.

---

### API Requests

**Location:** `backend/src/middleware/metrics.middleware.ts`

API request metrics are **automatically tracked** using Express middleware:

```typescript
app.use(metricsMiddleware);
```

**Automatically tracks:**
- Endpoint (request path)
- HTTP method (GET, POST, etc.)
- Response status code
- Response time (calculated via `res.send`)

**No manual changes needed** in route handlers.

---

## Available Metrics

### Payment Metrics

| Metric Name | Type | Labels | Description |
|-------------|------|--------|-------------|
| `eduflow_payments_total` | Counter | status, method | Total payments by status |
| `eduflow_payments_success_total` | Counter | method | Successful payments |
| `eduflow_payments_failure_total` | Counter | error_code, method | Failed payments by error |
| `eduflow_payment_amount_piasters` | Histogram | method | Payment amount distribution |
| `eduflow_payment_processing_time_ms` | Histogram | operation, status | Payment processing time |
| `eduflow_paymob_api_request_time_ms` | Histogram | endpoint, status_code | Paymob API latency |
| `eduflow_active_payments` | Gauge | status | Current active payments |

### Enrollment Metrics

| Metric Name | Type | Labels | Description |
|-------------|------|--------|-------------|
| `eduflow_enrollments_total` | Counter | operation, status | Total enrollment operations |

### Database Metrics

| Metric Name | Type | Labels | Description |
|-------------|------|--------|-------------|
| `eduflow_db_query_time_ms` | Histogram | operation, table | Database query latency |

### API Metrics

| Metric Name | Type | Labels | Description |
|-------------|------|--------|-------------|
| `eduflow_api_requests_total` | Counter | endpoint, method, status_code | API request count |

### Error Metrics

| Metric Name | Type | Labels | Description |
|-------------|------|--------|-------------|
| `eduflow_error_rate` | Gauge | operation, time_window | Error rate percentage |

---

## Implementation Checklist

### Backend Services

- [x] **payment.service.ts** - Payment operation metrics
- [x] **enrollment.service.ts** - Enrollment operation metrics
- [x] **webhook.controller.ts** - Webhook processing (metrics in payment service)
- [x] **database.ts** - Database query tracking (Prisma middleware)
- [x] **app.ts** - Register metricsMiddleware for API tracking

### Frontend (Optional)

If frontend metrics are needed, use window.fetch or axios interceptors to report to backend metric endpoints.

### Testing

- [x] Unit tests verify metricsService functions
- [x] Integration tests verify metrics are recorded in actual flows
- [x] E2E tests verify full payment flow produces metrics

---

## Prometheus Queries

### Common Queries

**Payment Success Rate (5 minute window):**
```promql
rate(eduflow_payments_success_total[5m]) / rate(eduflow_payments_total[5m])
```

**P95 Payment Processing Time:**
```promql
histogram_quantile(0.95, rate(eduflow_payment_processing_time_ms_bucket[5m]))
```

**Average Paymob API Response Time:**
```promql
rate(eduflow_paymob_api_request_time_ms_sum[5m]) / rate(eduflow_paymob_api_request_time_ms_count[5m])
```

**Database Query Performance (by operation):**
```promql
histogram_quantile(0.95, rate(eduflow_db_query_time_ms_bucket[5m])) by (operation)
```

**API Request Rate (5 minute):**
```promql
rate(eduflow_api_requests_total[5m]) by (endpoint, method)
```

---

## Troubleshooting

### Metrics Not Appearing in Prometheus

**Problem:** No data in Prometheus despite running metrics recording code

**Diagnosis:**
1. Check /metrics endpoint returns data: `curl http://localhost:3000/metrics | head -20`
2. Verify Prometheus is scraping: http://localhost:9090/targets
3. Verify target status is "UP" (not "DOWN")
4. Check Prometheus logs for scrape errors

**Solution:**
- Ensure metricsMiddleware is registered in app.ts
- Verify metrics.service.ts import in your service
- Check that metricsService functions are being called
- Verify Prometheus scrape interval (default 15s)

### Metrics Appearing But Empty

**Problem:** Metrics exist but show no data

**Diagnosis:**
1. Trigger operation (e.g., create a payment)
2. Wait for Prometheus scrape (default 15 seconds)
3. Query metric: `eduflow_payments_total`
4. Check for errors in metric recording

**Solution:**
- Verify operation completed without errors
- Check backend logs for exceptions
- Ensure correct label values are used
- Wait longer for metric to be scraped

### High Database Query Times

**Problem:** Database query times unusually high

**Diagnosis:**
1. Query: `histogram_quantile(0.95, rate(eduflow_db_query_time_ms_bucket[5m])) by (operation)`
2. Check which operations are slow
3. Look at database performance separately

**Solution:**
- Add database indexes on frequently queried columns
- Optimize Prisma queries (avoid N+1 queries)
- Consider caching frequently accessed data
- Profile slow operations separately

---

## Performance Considerations

### Metric Recording Overhead

- **API Middleware:** ~1-2ms per request
- **Database Middleware:** ~0-1ms per query (overhead minimal)
- **Service Metrics:** <1ms per recording

### Prometheus Storage

- **Retention:** 30 days (configurable)
- **Storage:** ~1 week = ~5-10GB at 1000 req/sec
- **Query Performance:** O(log n) for time-series lookups

### Best Practices

1. **Use Labels Carefully** - Each label combination creates separate metric
2. **Avoid High-Cardinality Labels** - Don't use user IDs as labels
3. **Aggregate in Prometheus** - Sum/rate/histogram queries, not application-side
4. **Monitor Prometheus Size** - Check disk usage regularly

---

## Advanced Topics

### Custom Metrics

To add new metrics:

1. Define in `metrics.service.ts`:
```typescript
export const customCounter = new Counter({
  name: "eduflow_custom_total",
  help: "Description of metric",
  labelNames: ["label1", "label2"],
  registers: [registry]
});
```

2. Add recording function:
```typescript
recordCustomMetric(label1: string, label2: string) {
  customCounter.inc({ label1, label2 });
}
```

3. Call from service:
```typescript
metricsService.recordCustomMetric("value1", "value2");
```

### Alerting Rules

Alert rules are defined in `monitoring/config/alerts.yml`:

```yaml
- alert: HighPaymentFailureRate
  expr: |
    (rate(eduflow_payments_failure_total[5m]) / 
     rate(eduflow_payments_total[5m])) > 0.1
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "Payment failure rate is {{ $value | humanizePercentage }}"
```

---

## Sign-Off

**Integration Status:** ✅ Complete

**Components Integrated:**
- [x] Payment service metrics
- [x] Enrollment service metrics
- [x] API request tracking (middleware)
- [x] Database query tracking (Prisma middleware)
- [x] Webhook processing metrics
- [x] Prometheus scraping
- [x] Grafana dashboards
- [x] Alert rules

**Ready for:** Production monitoring and alerting

---

## References

- [Prometheus Documentation](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [prom-client JavaScript Client](https://github.com/siimon/prom-client)
- [Grafana Dashboard Guide](https://grafana.com/docs/grafana/latest/dashboards/)
- [Prometheus Alerting](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
