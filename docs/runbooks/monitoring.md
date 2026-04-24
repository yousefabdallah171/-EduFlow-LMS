# Monitoring & Health Check Guide

## System Health Dashboard

**Access Dashboard:**
- Grafana: http://monitoring.internal/grafana
- Datadog: https://app.datadoghq.com
- CloudWatch: https://console.aws.amazon.com/cloudwatch

---

## Key Metrics to Monitor

### Payment Processing Metrics

| Metric | Alert Threshold | Description |
|--------|-----------------|-------------|
| Payment success rate | < 95% | % of payments completing successfully |
| Avg checkout latency | > 2000ms | Average time to create payment |
| P95 checkout latency | > 5000ms | 95th percentile response time |
| Failed payment count | > 10/min | Payments failing per minute |
| Pending payment age | > 10min | Webhooks not received within 10 min |

### System Performance Metrics

| Metric | Alert Threshold | Description |
|--------|-----------------|-------------|
| CPU usage | > 80% | Application CPU utilization |
| Memory usage | > 85% | Node.js heap usage |
| Disk usage | > 90% | Disk space available |
| Database connections | > 80% of pool | Active connections to database |
| Redis memory | > 80% of limit | Redis cache memory usage |

### Webhook Metrics

| Metric | Alert Threshold | Description |
|--------|-----------------|-------------|
| Webhook delivery time | > 5min | Time from payment to webhook received |
| Failed webhooks | > 1/min | Webhooks failing HMAC validation |
| Webhook processing latency | > 1000ms | Time to process webhook |
| Duplicate webhooks | > 5/day | Same webhook processed multiple times |

### Availability Metrics

| Metric | Alert Threshold | Description |
|--------|-----------------|-------------|
| API availability | < 99.9% | Uptime of payment API |
| Database availability | < 99.95% | Database connection pool available |
| Paymob API availability | < 95% | Can reach Paymob API |
| Email delivery rate | < 95% | Emails successfully sent |

---

## Health Check Endpoints

### Application Health

```bash
# Overall health
curl http://localhost:3000/api/health

# Response example:
{
  "status": "healthy",
  "timestamp": "2026-04-24T10:30:00Z",
  "uptime": 86400,
  "environment": "production"
}
```

### Database Health

```bash
# Check database connectivity
curl http://localhost:3000/api/health/db

# Response example:
{
  "status": "healthy",
  "database": "postgresql",
  "responseTime": 15,
  "connectionsActive": 12,
  "connectionsMax": 20
}
```

### Redis Health

```bash
# Check Redis connectivity
curl http://localhost:3000/api/health/redis

# Response example:
{
  "status": "healthy",
  "memoryUsage": "256MB",
  "memoryMax": "512MB",
  "responseTime": 2,
  "keysCount": 1234
}
```

### Paymob Health

```bash
# Check Paymob API connectivity
curl http://localhost:3000/api/health/paymob

# Response example:
{
  "status": "healthy",
  "apiReachable": true,
  "responseTime": 234,
  "authTokenValid": true
}
```

### Email Service Health

```bash
# Check email service connectivity
curl http://localhost:3000/api/health/email

# Response example:
{
  "status": "healthy",
  "smtpReachable": true,
  "queueLength": 5,
  "failureRate": 0.02
}
```

---

## Monitoring Queries

### Payment Success Rate

**Prometheus Query:**
```promql
rate(payments_total{status="completed"}[5m]) / rate(payments_total[5m])
```

**Expected:** > 95%
**Alert if:** < 95%

### Payment Processing Latency

**Prometheus Query:**
```promql
histogram_quantile(0.95, rate(payment_latency_seconds_bucket[5m]))
```

**Expected:** < 2 seconds (P95)
**Alert if:** > 5 seconds

### Error Rate

**Prometheus Query:**
```promql
rate(errors_total[5m])
```

**Expected:** < 0.1%
**Alert if:** > 1%

### Webhook Delivery Time

**Prometheus Query:**
```promql
rate(webhook_delivery_seconds_bucket[5m])
```

**Expected:** < 1 minute (P95)
**Alert if:** > 10 minutes

### Database Connection Pool

**SQL Query:**
```sql
SELECT 
  sum(numbackends) as active_connections,
  max(max_conn) as max_connections,
  ROUND(100.0 * sum(numbackends) / max(max_conn), 2) as usage_percent
FROM pg_stat_database;
```

**Expected:** < 70% utilization
**Alert if:** > 80%

### Redis Memory Usage

**Redis Command:**
```bash
redis-cli info memory | grep used_memory_human
```

**Expected:** < 70% of max memory
**Alert if:** > 85%

---

## Dashboard Setup (Example: Grafana)

### Payment Success Rate Dashboard

**Panels:**
1. Payment success rate (gauge - green if > 95%)
2. Failed payments (counter - red if rising)
3. Avg latency (gauge - green if < 2s)
4. P95 latency (gauge - yellow if > 2s, red if > 5s)

### System Health Dashboard

**Panels:**
1. CPU usage (graph)
2. Memory usage (graph)
3. Disk usage (gauge)
4. Database connections (gauge)
5. Redis memory (gauge)

### Webhook Health Dashboard

**Panels:**
1. Webhook arrival rate (counter)
2. Webhook processing time (histogram)
3. Failed webhooks (counter)
4. Processing latency (graph)

---

## Alert Rules

### Critical Alerts (P1)

```yaml
- alert: PaymentSystemDown
  condition: api_health != "healthy"
  duration: 1 minute
  action: PagerDuty page on-call engineer immediately

- alert: DatabaseDown
  condition: db_health != "healthy"
  duration: 30 seconds
  action: PagerDuty page on-call + DBA immediately

- alert: PaymentSuccessRateCritical
  condition: payment_success_rate < 0.90
  duration: 5 minutes
  action: PagerDuty page on-call engineer
```

### High Priority Alerts (P2)

```yaml
- alert: HighErrorRate
  condition: error_rate > 0.01
  duration: 10 minutes
  action: PagerDuty page on-call engineer

- alert: HighLatency
  condition: p95_latency_ms > 5000
  duration: 15 minutes
  action: PagerDuty page on-call engineer

- alert: WebhookDelayed
  condition: webhook_age_minutes > 10
  duration: 5 minutes
  action: Slack notification to #incidents
```

### Medium Priority Alerts (P3)

```yaml
- alert: HighMemoryUsage
  condition: memory_usage_percent > 85
  duration: 10 minutes
  action: Slack notification to #engineering

- alert: HighDiskUsage
  condition: disk_usage_percent > 90
  duration: 30 minutes
  action: Slack notification to #operations

- alert: HighDatabaseConnections
  condition: db_connections_percent > 80
  duration: 5 minutes
  action: Slack notification to #database
```

---

## Monitoring Checklist

**Daily (Start of Day):**
- [ ] Check dashboard for any alerts
- [ ] Review error rate from yesterday
- [ ] Check payment success rate
- [ ] Verify all health endpoints returning green

**Weekly:**
- [ ] Review performance trends
- [ ] Check database query performance
- [ ] Verify backup completion
- [ ] Review log storage usage

**Monthly:**
- [ ] Analyze payment success/failure trends
- [ ] Review cost metrics
- [ ] Update alert thresholds if needed
- [ ] Review and optimize slow queries

---

## Performance Baselines

**Updated:** April 24, 2026

### API Response Times

| Endpoint | P50 | P95 | P99 |
|----------|-----|-----|-----|
| POST /checkout | 150ms | 250ms | 400ms |
| POST /webhooks/paymob | 50ms | 100ms | 200ms |
| GET /student/orders | 200ms | 400ms | 600ms |
| GET /student/order/:id | 100ms | 150ms | 250ms |

### Database Query Times

| Query | P50 | P95 |
|-------|-----|-----|
| Get payment by ID | 15ms | 50ms |
| List student payments | 100ms | 300ms |
| Create payment | 80ms | 200ms |
| Update payment status | 50ms | 150ms |

### System Resources

| Resource | Expected | Warning | Critical |
|----------|----------|---------|----------|
| CPU | 20-30% | > 70% | > 90% |
| Memory | 40-50% | > 75% | > 90% |
| Disk | 30-40% | > 80% | > 95% |
| DB Connections | 5-10 | > 15 | > 18 |

---

## Troubleshooting Common Alerts

### Alert: Payment Success Rate < 95%

**Investigation:**
```bash
# Check error types
grep "ERROR" logs/combined.log | jq '.errorCode' | sort | uniq -c

# Check Paymob status
curl -s https://status.paymob.com/api/v2/status.json

# Check database load
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"
```

**Common Causes & Fixes:**
- Paymob API down → Wait for recovery or enable fallback
- Database load high → Scale up connections, optimize queries
- Rate limit exceeded → Reduce incoming traffic temporarily

### Alert: High Latency (P95 > 5s)

**Investigation:**
```bash
# Slow logs
grep "duration_ms" logs/combined.log | jq '.duration_ms' | sort -nr | head -10

# Check database queries
psql $DATABASE_URL -c "SELECT query, calls, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# Check Redis
redis-cli --stat
```

**Common Causes & Fixes:**
- Slow database query → Add index, optimize query
- Redis down → Restart Redis
- High load → Scale up application servers

### Alert: High Memory Usage

**Investigation:**
```bash
# Check heap usage
node --inspect app.js
# Then open chrome://inspect

# Check logs for memory leaks
grep "heap\|memory" logs/combined.log | jq '.usage'
```

**Common Causes & Fixes:**
- Memory leak → Identify and fix in code, restart app
- Large cache → Increase Redis memory limit or eviction policy
- Many connections → Close idle connections

---

## Related Docs
- [Payment Issues](./payment-issues.md)
- [Debugging Guide](./debugging-guide.md)
- [Incident Response](./incident-response.md)
