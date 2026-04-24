# Phase 7: Monitoring System - Manual Test Cases

## Prerequisites

- [ ] Docker and Docker Compose installed
- [ ] Backend running on http://localhost:3000
- [ ] Monitoring stack configuration ready

## Test Environment Setup

### 1. Start Monitoring Stack

```bash
cd monitoring
docker-compose up -d

# Verify containers are running
docker-compose ps
```

### 2. Verify Services are Accessible

- [ ] Prometheus: http://localhost:9090
- [ ] Grafana: http://localhost:3001 (admin/admin123)
- [ ] Alertmanager: http://localhost:9093
- [ ] Node Exporter: http://localhost:9100/metrics

### 3. Backend Metrics Endpoint

```bash
curl http://localhost:3000/metrics | head -20
```

Expected: Returns Prometheus format metrics (HELP, TYPE, metric lines)

---

## Test Cases

### TC-1: Prometheus Metrics Collection

**Test**: Verify Prometheus is scraping metrics from backend

**Steps**:
1. Go to http://localhost:9090
2. Go to Status → Targets
3. Look for `eduflow-backend` target
4. Verify state is "UP"
5. Click on target to see detailed status

**Expected Results**:
- [ ] Target shows "UP" status
- [ ] Last scrape time is recent (< 1 minute ago)
- [ ] Scrape duration < 100ms
- [ ] No errors in scrape output

---

### TC-2: Metrics Data in Prometheus

**Test**: Verify metrics are being collected

**Steps**:
1. Go to http://localhost:9090/graph
2. Enter query: `eduflow_payments_total`
3. Click "Execute"
4. Check "Graph" tab

**Expected Results**:
- [ ] Query returns results
- [ ] Graph shows metric with labels
- [ ] Data points visible on timeline
- [ ] Query returns no errors

**Additional Queries to Test**:
- [ ] `eduflow_payment_processing_time_ms`
- [ ] `eduflow_paymob_api_request_time_ms_bucket`
- [ ] `eduflow_active_payments`
- [ ] `up{job="eduflow-backend"}`

---

### TC-3: Grafana Dashboard Access

**Test**: Verify Grafana dashboard is accessible

**Steps**:
1. Go to http://localhost:3001
2. Login with admin/admin123
3. Go to Dashboards → EduFlow Payment Monitoring
4. Verify dashboard loads without errors

**Expected Results**:
- [ ] Login successful
- [ ] Dashboard list shows "EduFlow Payment Monitoring"
- [ ] Dashboard loads completely
- [ ] All panels render
- [ ] No "No data" messages (if Prometheus has data)

---

### TC-4: Prometheus Data Source in Grafana

**Test**: Verify Grafana can connect to Prometheus

**Steps**:
1. Go to Settings → Data Sources
2. Click "Prometheus"
3. Scroll down to "Save & Test" button
4. Click "Save & Test"

**Expected Results**:
- [ ] Green checkmark "Data source is working"
- [ ] No errors in logs
- [ ] Connection test succeeds

---

### TC-5: Dashboard Panels

**Test**: Verify all dashboard panels display correctly

**Steps**:
1. Open dashboard: EduFlow Payment Monitoring
2. Check each panel:
   - Payment Success Rate
   - Payment Failure Rate
   - Payments by Status
   - P95 Payment Processing Time
   - Total Payments (24h)
   - Paymob API Response Time
   - Active Payments by Status
   - Webhook Processing Failures
   - Refunds by Type
   - Database Query Performance
   - Enrollment Operations
   - API Requests (5m Rate)

**Expected Results for Each Panel**:
- [ ] Panel title visible
- [ ] Query executes without errors
- [ ] Visualization loads
- [ ] Legend (if applicable) shows correctly
- [ ] Axes and labels are readable

---

### TC-6: Alerting Rules

**Test**: Verify Prometheus alerting rules are loaded

**Steps**:
1. Go to http://localhost:9090/alerts
2. Check for alert rules under "payment_alerts"
3. Verify each alert shows rule details

**Expected Results**:
- [ ] Rules section shows alert groups
- [ ] "payment_alerts" group appears
- [ ] Individual alerts listed (HighPaymentFailureRate, SlowPaymentProcessing, etc.)
- [ ] Alert state shows (Firing, Pending, or Inactive)
- [ ] Evaluation timestamp is recent

---

### TC-7: Alertmanager Setup

**Test**: Verify Alertmanager is configured correctly

**Steps**:
1. Go to http://localhost:9093
2. Check Alerts section
3. Verify configuration is loaded

**Expected Results**:
- [ ] Alertmanager UI loads
- [ ] Shows "Alerts" and "Silences" tabs
- [ ] No errors in page
- [ ] Configuration shows routes defined

---

### TC-8: Simulate Payment Operation

**Test**: Generate metrics by creating a payment

**Steps**:
1. Trigger payment operation via API:
   ```bash
   curl -X POST http://localhost:3000/api/v1/checkout \
     -H "Content-Type: application/json" \
     -d '{...}'
   ```
2. Wait 30 seconds for Prometheus to scrape
3. Go to Prometheus and query: `rate(eduflow_payments_total[1m])`
4. View Grafana dashboard for new data

**Expected Results**:
- [ ] Payment API call succeeds
- [ ] New metric data appears in Prometheus
- [ ] Grafana dashboard updates (may need refresh)
- [ ] Counters increment
- [ ] Histograms show new datapoints

---

### TC-9: Performance Metrics

**Test**: Verify performance/timing metrics are recorded

**Steps**:
1. Generate multiple payment requests
2. Query performance histogram:
   ```promql
   histogram_quantile(0.95, rate(eduflow_payment_processing_time_ms_bucket[5m]))
   ```
3. Query Paymob API time:
   ```promql
   histogram_quantile(0.50, rate(eduflow_paymob_api_request_time_ms_bucket[5m]))
   ```
4. Check Grafana "Paymob API Response Time" panel

**Expected Results**:
- [ ] P95 processing time visible
- [ ] P50/P95/P99 API times show
- [ ] Values reasonable (hundreds of milliseconds)
- [ ] Graph shows latency trends over time

---

### TC-10: Error Rate Tracking

**Test**: Verify error metrics are collected

**Steps**:
1. Trigger failed payments (invalid card, timeout, etc.)
2. Query failure counter:
   ```promql
   rate(eduflow_payments_failure_total[5m])
   ```
3. Calculate failure rate:
   ```promql
   rate(eduflow_payments_failure_total[5m]) / rate(eduflow_payments_total[5m])
   ```
4. Check Grafana "Payment Failure Rate" panel

**Expected Results**:
- [ ] Failure counter increments
- [ ] Failure rate calculation succeeds
- [ ] Different error codes show in labels
- [ ] Grafana shows failure trend

---

### TC-11: Webhook Metrics

**Test**: Verify webhook processing is tracked

**Steps**:
1. Trigger webhook processing (via payment success)
2. Query webhook metrics:
   ```promql
   rate(eduflow_webhook_processing_time_ms_bucket[5m])
   ```
3. View "Webhook Processing Failures" panel

**Expected Results**:
- [ ] Webhook processing times recorded
- [ ] Success/failure status tracked
- [ ] Processing time < 500ms (typical)
- [ ] Panel shows trend

---

### TC-12: Database Performance

**Test**: Verify database query metrics

**Steps**:
1. Generate database queries (list payments, create enrollment, etc.)
2. Query database metrics:
   ```promql
   histogram_quantile(0.95, rate(eduflow_db_query_time_ms_bucket[5m])) by (operation)
   ```
3. Check "Database Query Performance" panel

**Expected Results**:
- [ ] Query times recorded
- [ ] Separated by operation type
- [ ] P95 time < 1 second (normal)
- [ ] Grafana panel updates

---

### TC-13: Alert Firing (Simulated)

**Test**: Verify alerts fire when thresholds exceeded

**Steps**:
1. Modify alert threshold temporarily (for testing):
   - Edit `config/alerts.yml`
   - Change HighPaymentFailureRate threshold from 0.1 to 0.01 (1%)
2. Trigger one failed payment in 5 minute window
3. Wait 5-10 minutes
4. Check Prometheus Alerts page
5. Check Alertmanager

**Expected Results**:
- [ ] Alert state changes to "Firing" in Prometheus
- [ ] Alert appears in Alertmanager
- [ ] Alert shows correct labels (severity, etc.)
- [ ] Timestamp is recent
- [ ] Email/Slack notification sent (if configured)

---

### TC-14: Metric Labels

**Test**: Verify metrics have correct labels

**Steps**:
1. Query with label filtering:
   ```promql
   eduflow_payments_total{status="success"}
   eduflow_payments_total{method="paymob"}
   eduflow_paymob_api_request_time_ms{endpoint="/auth/tokens"}
   ```
2. Verify label combinations are sensible

**Expected Results**:
- [ ] Queries with label filters return results
- [ ] Labels are consistent
- [ ] Label values match expected values
- [ ] No unexpected label combinations

---

### TC-15: Metrics Retention

**Test**: Verify metrics are retained and queryable

**Steps**:
1. Generate metrics now
2. Check value in Prometheus graph
3. Wait 5 minutes
4. Query same metric again
5. Verify data from 5 minutes ago is still available

**Expected Results**:
- [ ] Historical data is queryable
- [ ] Data doesn't disappear prematurely
- [ ] Can zoom out to see trends over time
- [ ] 30-day retention configured

---

### TC-16: Grafana Refresh

**Test**: Verify Grafana auto-refresh works

**Steps**:
1. Open Grafana dashboard
2. Set refresh to 30 seconds (top right)
3. Generate payment operation
4. Observe dashboard updates without manual refresh

**Expected Results**:
- [ ] Dashboard auto-refreshes every 30 seconds
- [ ] New data appears on graph
- [ ] Timestamps update
- [ ] No manual refresh needed

---

### TC-17: Alertmanager Routes

**Test**: Verify alerts route to correct receivers

**Steps**:
1. Configure test receivers in `alertmanager.yml`:
   - Slack channel or webhook
   - Email address
2. Restart Alertmanager
3. Trigger critical alert
4. Check Slack/Email

**Expected Results**:
- [ ] Critical alerts go to critical receiver
- [ ] Warning alerts go to warning receiver
- [ ] Correct channel/email receives notification
- [ ] Message format is readable
- [ ] Alert details included in message

---

### TC-18: Node Exporter Metrics

**Test**: Verify system metrics are collected

**Steps**:
1. Go to http://localhost:9100/metrics
2. Look for system metrics (node_cpu, node_memory, etc.)
3. Query in Prometheus:
   ```promql
   node_cpu_seconds_total
   node_memory_MemAvailable_bytes
   ```

**Expected Results**:
- [ ] Node exporter metrics endpoint responds
- [ ] CPU and memory metrics available
- [ ] Prometheus scrapes node metrics
- [ ] System metrics visible in dashboards (if added)

---

## Verification Checklist

### Prometheus
- [ ] All targets UP
- [ ] No scrape errors
- [ ] Metrics queryable
- [ ] 30-day retention configured
- [ ] Alert rules loaded

### Grafana
- [ ] Login works
- [ ] Dashboard loads
- [ ] Datasource connected
- [ ] Panels render
- [ ] Auto-refresh works
- [ ] Time ranges work

### Alertmanager
- [ ] Service running
- [ ] Configuration loaded
- [ ] Routes configured
- [ ] Receivers working
- [ ] Notifications sending

### Metrics
- [ ] Payment metrics collected
- [ ] API metrics tracked
- [ ] Database metrics recorded
- [ ] Webhook metrics logged
- [ ] Error rates calculated
- [ ] Labels correct

### Documentation
- [ ] Guide is complete
- [ ] Runbooks documented
- [ ] Troubleshooting section helpful
- [ ] Examples work

---

## Sign-Off

- [ ] All test cases passed
- [ ] No errors in logs
- [ ] Metrics data is flowing
- [ ] Dashboards are readable
- [ ] Alerts can fire
- [ ] Notifications work
- [ ] Documentation complete
- [ ] Ready for production monitoring
