# Payment Monitoring & Alerting Guide

## Overview

This guide covers the monitoring system for the EduFlow payment processing infrastructure using Prometheus, Grafana, and Alertmanager.

## Architecture

```
Payment System → Prometheus Client Library → Metrics Endpoint (/metrics)
                        ↓
                 Prometheus Server
                        ↓
         ┌──────────────┬──────────────┐
         ↓              ↓              ↓
      Grafana      AlertManager     Rules Engine
         ↓              ↓              ↓
      Dashboards    Email/Slack    Escalation
```

## Components

### Prometheus
- **Purpose**: Time-series database for metrics collection
- **Port**: 9090
- **Retention**: 30 days
- **Scrape Interval**: 15s (payments), 30s (database)

### Grafana
- **Purpose**: Visualization and alerting dashboard
- **Port**: 3001 (mapped to 3000 inside container)
- **Default Credentials**: admin/admin123
- **Dashboards**: Payment Monitoring (included)

### Alertmanager
- **Purpose**: Alert management and notification routing
- **Port**: 9093
- **Receivers**: Email, Slack

### Node Exporter
- **Purpose**: System-level metrics
- **Port**: 9100

## Metrics

### Payment Metrics

#### `eduflow_payments_total`
Total number of payment operations by status and method.
```
Type: Counter
Labels: status, method
Example: eduflow_payments_total{status="success", method="paymob"}
```

#### `eduflow_payments_success_total`
Total successful payments.
```
Type: Counter
Labels: method
Example: eduflow_payments_success_total{method="paymob"}
```

#### `eduflow_payments_failure_total`
Total failed payments by error code.
```
Type: Counter
Labels: error_code, method
Example: eduflow_payments_failure_total{error_code="CARD_DECLINED", method="paymob"}
```

#### `eduflow_payment_amount_piasters`
Distribution of payment amounts in piasters.
```
Type: Histogram
Labels: method
Buckets: 1k, 5k, 10k, 25k, 50k, 100k, 250k, 500k piasters
```

#### `eduflow_payment_processing_time_ms`
Payment processing time in milliseconds.
```
Type: Histogram
Labels: operation, status
Operations: payment, refund, enrollment
Buckets: 100ms, 250ms, 500ms, 1s, 2.5s, 5s, 10s
```

### Paymob API Metrics

#### `eduflow_paymob_api_request_time_ms`
API request latency to Paymob.
```
Type: Histogram
Labels: endpoint, status_code
Buckets: 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s
```

### Infrastructure Metrics

#### `eduflow_db_query_time_ms`
Database query performance.
```
Type: Histogram
Labels: operation, table
Operations: select, insert, update, delete
Buckets: 1ms, 5ms, 10ms, 50ms, 100ms, 500ms, 1s
```

#### `eduflow_api_requests_total`
API endpoint request count.
```
Type: Counter
Labels: endpoint, method, status_code
```

#### `eduflow_active_payments`
Current number of active payments by status.
```
Type: Gauge
Labels: status
Statuses: PENDING, COMPLETED, FAILED, REFUND_REQUESTED, REFUNDED
```

## Alerts

### Critical Alerts

#### HighPaymentFailureRate
**Condition**: Payment failure rate > 10% for 5 minutes
**Action**: Immediate investigation required
**Recipient**: Payment critical channel
**Typical Causes**:
- Paymob API outage
- Network connectivity issues
- Database connection problems
- Invalid payment data

#### PaymobApiErrors
**Condition**: Paymob API error rate > 5% for 5 minutes
**Action**: Check Paymob status page and API logs
**Recipient**: Payment critical channel

### Warning Alerts

#### SlowPaymentProcessing
**Condition**: P95 processing time > 5 seconds for 5 minutes
**Action**: Monitor performance, check database metrics
**Recipient**: Payment warning channel

#### NoPaymentsProcessed
**Condition**: No payments for 15 minutes
**Action**: Check if system is receiving payment requests
**Recipient**: Payment warning channel

#### PaymobApiTimeout
**Condition**: P99 response time > 10 seconds for 5 minutes
**Action**: Check network connectivity, Paymob status
**Recipient**: Payment warning channel

#### HighRefundVolume
**Condition**: More than 5 refunds per hour
**Action**: Investigate customer issues
**Recipient**: Payment warning channel

#### SlowDatabaseQueries
**Condition**: P95 query time > 1 second for 5 minutes
**Action**: Check database load, consider indexing
**Recipient**: Infrastructure channel

#### WebhookProcessingErrors
**Condition**: Webhook failure rate > 1% for 5 minutes
**Action**: Check webhook handler logs
**Recipient**: Webhook alerts channel

#### EnrollmentFailures
**Condition**: Enrollment failure rate > 5% for 5 minutes
**Action**: Check enrollment service and database
**Recipient**: Payment warning channel

## Getting Started

### 1. Start Monitoring Stack

```bash
# Navigate to monitoring directory
cd monitoring

# Start Prometheus, Grafana, and Alertmanager
docker-compose up -d

# Verify containers are running
docker-compose ps
```

### 2. Access Dashboards

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin123)
- **Alertmanager**: http://localhost:9093

### 3. Configure Alerts

Edit `config/alertmanager.yml` to set:
- `SLACK_WEBHOOK_URL`: Slack incoming webhook
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`: Email configuration
- `ALERT_EMAIL`, `ALERT_EMAIL_FROM`: Recipient and sender

Restart Alertmanager:
```bash
docker-compose restart alertmanager
```

### 4. View Metrics in Backend

The backend exposes metrics at:
```
GET /metrics
```

## Monitoring Runbooks

### Payment Failure Rate High

**Alert**: HighPaymentFailureRate
**Severity**: CRITICAL

**Steps**:
1. Check Paymob status page: https://status.paymob.com
2. Review error logs: `grep "CARD_DECLINED\|TIMEOUT" logs/combined.log`
3. Check database connectivity:
   ```sql
   SELECT 1; -- Test connection
   SELECT COUNT(*) FROM "Payment" WHERE status = 'FAILED' AND createdAt > NOW() - INTERVAL '1 hour';
   ```
4. If Paymob is down, set `PAYMOB_MAINTENANCE_MODE=true` in env to show user-friendly error
5. Contact Paymob support if outage persists > 30 minutes

### Payment Processing Slow

**Alert**: SlowPaymentProcessing
**Severity**: WARNING

**Steps**:
1. Check payment processing time histogram in Grafana
2. Check Paymob API response time:
   ```
   histogram_quantile(0.95, rate(eduflow_paymob_api_request_time_ms_bucket[5m]))
   ```
3. Check database query performance:
   ```sql
   SELECT query, calls, total_time, mean_time FROM pg_stat_statements
   WHERE query LIKE '%payment%' ORDER BY mean_time DESC LIMIT 5;
   ```
4. If Paymob is slow, optimize request batching
5. If database is slow, add indexes or scale up resources

### No Payments for Extended Period

**Alert**: NoPaymentsProcessed
**Severity**: WARNING

**Steps**:
1. Check if backend is receiving checkout requests:
   ```bash
   grep "POST /checkout" logs/combined.log | tail -10
   ```
2. Check if frontend is making requests:
   ```bash
   curl http://localhost:3000/api/v1/admin/payments/stats
   ```
3. Check if there are errors in checkout flow:
   ```bash
   grep "ERROR\|error" logs/error.log | tail -20
   ```
4. Verify authentication is working
5. Check if rate limiting is blocking requests

### Webhook Processing Failing

**Alert**: WebhookProcessingErrors
**Severity**: WARNING

**Steps**:
1. Check webhook logs:
   ```bash
   grep "webhook\|Webhook" logs/combined.log | tail -20
   ```
2. Verify webhook handler is processing Paymob events:
   ```bash
   grep "paymob.*webhook\|status.*update" logs/combined.log | wc -l
   ```
3. Check if webhooks are being called by Paymob:
   - Go to Paymob dashboard → Webhooks
   - Verify endpoint URL is correct
   - Check recent webhook deliveries
4. Verify HMAC validation:
   ```bash
   grep "HMAC.*invalid\|unauthorized" logs/error.log
   ```

### Database Performance Degraded

**Alert**: SlowDatabaseQueries
**Severity**: WARNING

**Steps**:
1. Check database connection count:
   ```sql
   SELECT count(*) FROM pg_stat_activity;
   ```
2. Identify slow queries:
   ```sql
   SELECT query, calls, mean_time FROM pg_stat_statements 
   ORDER BY mean_time DESC LIMIT 5;
   ```
3. Check for missing indexes:
   ```sql
   SELECT schemaname, tablename FROM pg_tables 
   WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
   ORDER BY tablename;
   ```
4. Monitor active queries:
   ```sql
   SELECT pid, usename, application_name, state, query 
   FROM pg_stat_activity WHERE state != 'idle';
   ```
5. Consider:
   - Adding indexes
   - Optimizing queries
   - Increasing connection pool
   - Scaling database resources

## Useful Queries

### Payment Success Rate (Last Hour)
```promql
rate(eduflow_payments_success_total[1h]) / rate(eduflow_payments_total[1h])
```

### Top Payment Error Codes
```promql
topk(5, rate(eduflow_payments_failure_total[1h]))
```

### Average Payment Amount
```promql
avg(eduflow_payment_amount_piasters)
```

### Payment Processing SLO (95th percentile < 5 seconds)
```promql
histogram_quantile(0.95, rate(eduflow_payment_processing_time_ms_bucket[5m])) < 5000
```

### Paymob API Availability
```promql
rate(eduflow_paymob_api_request_time_ms_bucket{status_code=~"2.."}[5m]) / 
rate(eduflow_paymob_api_request_time_ms_count[5m])
```

## Integration with Backend

### Recording Metrics

In your service code:
```typescript
import { metricsService } from "./services/metrics.service.js";

// Record payment operation
metricsService.recordPaymentOperation(
  "success",      // status
  "paymob",       // method
  1234,           // processing time in ms
  10000,          // amount in piasters
  undefined       // error code (only for failures)
);

// Record Paymob API call
metricsService.recordPaymobApiCall(
  "/ecommerce/orders",  // endpoint
  201,                  // status code
  456                   // time in ms
);

// Record webhook processing
metricsService.recordWebhookProcessing(
  "paymob_transaction_update",  // webhook type
  "success",                     // status
  123                            // time in ms
);
```

## Troubleshooting

### Metrics Endpoint Not Responding

```bash
# Check if metrics endpoint is registered
curl http://localhost:3000/metrics

# Check if prom-client is installed
npm list prom-client

# Verify metricsRoutes is imported in server.ts
grep "metricsRoutes" backend/src/server.ts
```

### Prometheus Not Scraping Metrics

```bash
# Check Prometheus configuration
cat config/prometheus.yml

# Verify backend is running
curl http://localhost:3000/metrics

# Check Prometheus targets
# Go to: http://localhost:9090/targets

# Check logs
docker logs prometheus
```

### Grafana Dashboard Empty

```bash
# Verify Prometheus data is being collected
# Go to: http://localhost:9090/graph
# Try a simple query: up

# Check Grafana datasource
# Go to: http://localhost:3001/settings/datasources
# Click Prometheus and test connection

# Verify queries in dashboard panels
# Edit dashboard panel and check PromQL query
```

### Alerts Not Firing

```bash
# Check Prometheus rules
docker exec prometheus cat /etc/prometheus/alerts.yml

# Check alert status in Prometheus
# Go to: http://localhost:9090/alerts

# Check Alertmanager configuration
docker exec alertmanager cat /etc/alertmanager/alertmanager.yml

# Verify webhook endpoints
# Go to: http://localhost:9093/#/alerts
```

## Best Practices

1. **Set SLOs (Service Level Objectives)**
   - Payment processing: P95 < 5 seconds
   - Success rate: > 99%
   - Paymob API availability: > 99.9%

2. **Alert on Outcomes, Not Symptoms**
   - Alert on high failure rate, not individual errors
   - Alert on customer impact, not internal metrics

3. **Escalation Policy**
   - Warning: Slack notification
   - Critical: Email + Slack + Page on-call engineer

4. **On-Call Runbooks**
   - Document each alert with steps to resolve
   - Keep runbooks up-to-date
   - Practice runbook procedures

5. **Regular Reviews**
   - Review alert effectiveness monthly
   - Adjust thresholds based on baseline
   - Remove noisy alerts

## Support & Resources

- Prometheus Docs: https://prometheus.io/docs
- Grafana Docs: https://grafana.com/docs
- Alertmanager Docs: https://prometheus.io/docs/alerting/latest/overview
- PromQL Guide: https://prometheus.io/docs/prometheus/latest/querying/basics
