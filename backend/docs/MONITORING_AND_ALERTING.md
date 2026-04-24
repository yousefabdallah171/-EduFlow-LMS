# Monitoring and Alerting Setup Guide

## Overview

EduFlow LMS uses Prometheus for metrics collection and Sentry for error tracking. This guide covers setup, configuration, and best practices.

## Prometheus Metrics

### Available Metrics

The application exports metrics at `/metrics` (Prometheus format):

```
# HTTP Requests
http_requests_total{method="GET",status="200",route="/api/v1/lessons"}
http_request_duration_seconds{method="POST",route="/api/v1/auth/login"}

# Cache Performance
cache_hits_total{cache="lesson_metadata"}
cache_misses_total{cache="lesson_metadata"}

# Database
db_query_duration_seconds{operation="SELECT"}
db_errors_total

# Authentication
auth_attempts_total{type="login",status="success"}
auth_attempts_total{type="register",status="failure"}

# Video Streaming
video_segment_requests_total
video_concurrent_streams

# Business Metrics
enrolled_users_total
revenue_piasters_total
lesson_completion_rate
average_watch_time_seconds
```

### Prometheus Configuration

Add to your Prometheus `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'eduflow-api'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    scrape_interval: 10s
    scrape_timeout: 5s
```

### Grafana Dashboards

Create dashboards to visualize:

1. **API Performance Dashboard**
   - Request rate (req/s)
   - Response times (p50, p95, p99)
   - Error rate (%)
   - Status code distribution

2. **Cache Effectiveness Dashboard**
   - Cache hit rate (%)
   - Cache miss rate
   - Cache eviction count
   - Memory usage

3. **Business Metrics Dashboard**
   - New enrollments (daily)
   - Lesson completion rate (%)
   - Average session duration
   - Revenue (EGP)

4. **System Health Dashboard**
   - CPU usage
   - Memory usage
   - Disk I/O
   - Database connection pool

## Sentry Error Tracking

### Sentry Configuration

Sentry is configured in `src/observability/sentry.ts`:

```typescript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // Sample 10% of transactions
  beforeSend(event, hint) {
    // Filter out certain errors
    if (event.exception) {
      const error = hint.originalException;
      if (error instanceof TypeError && error.message.includes("fetch")) {
        return null; // Ignore network errors
      }
    }
    return event;
  }
});
```

### Error Reporting

Errors are automatically captured by:

1. **Central Error Handler** - All unhandled exceptions
2. **Manual Capture** - For monitored operations

```typescript
// Automatic (central handler)
throw new Error("Something failed");

// Manual
import { sentry } from "../observability/sentry.js";
sentry.captureException(error, req);
```

### Sentry Alerts

Configure alerts for:

1. **High Error Rate** - Triggers when error rate > 5%
2. **New Issue** - New error type appears for first time
3. **Regression** - Error count increases significantly
4. **Resolved Issues** - Issues marked as resolved but still occurring

## Key Metrics to Monitor

### Performance SLOs

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| API Response Time (p95) | <500ms | >400ms | >800ms |
| Error Rate | <0.5% | >1% | >5% |
| Cache Hit Rate | >90% | <80% | <60% |
| Availability | >99.9% | <99.5% | <99% |
| Authentication Success | >98% | <97% | <95% |

### Business Metrics

| Metric | Frequency | Alert If |
|--------|-----------|----------|
| Daily Active Users | Daily | Down >20% from previous day |
| Lesson Completion Rate | Weekly | Down >10% from previous week |
| Payment Success Rate | Daily | Below 95% |
| Support Ticket Response | Every 2 hours | >50 unresponded |

### System Metrics

| Metric | Alert Threshold |
|--------|-----------------|
| CPU Usage | >80% |
| Memory Usage | >85% |
| Disk Usage | >90% |
| Database Connections | >80% of max |
| Redis Memory | >85% of max |

## Alerting Rules

### Prometheus Alerting Rules

Create `prometheus-rules.yml`:

```yaml
groups:
  - name: api_alerts
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate on {{ $labels.instance }}"
          description: "Error rate is {{ $value }} (threshold: 5%)"

      - alert: SlowAPI
        expr: histogram_quantile(0.95, http_request_duration_seconds) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow API response on {{ $labels.method }} {{ $labels.route }}"
          description: "p95 response time is {{ $value }}s"

      - alert: LowCacheHitRate
        expr: |
          (sum(rate(cache_hits_total[5m])) / 
           (sum(rate(cache_hits_total[5m])) + sum(rate(cache_misses_total[5m])))) < 0.8
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Low cache hit rate"
          description: "Cache hit rate is {{ $value | humanizePercentage }}"
```

## Logging Best Practices

### Structured Logging

Use JSON structured logging for easy parsing:

```typescript
console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  level: "INFO",
  service: "eduflow-api",
  event: "user_enrolled",
  userId: user.id,
  courseId: course.id,
  duration_ms: 1234
}));
```

### Log Levels

- **DEBUG**: Development information
- **INFO**: Important business events (enrollment, payment, etc.)
- **WARN**: Recoverable issues (retries, fallbacks)
- **ERROR**: Errors caught and handled
- **CRITICAL**: System failures

### Structured Logging Aggregation

Send logs to ELK Stack or similar:

```typescript
// In production environment
// Configure log shipping to Elasticsearch/Splunk/etc
const logger = createLogger({
  transports: [
    new winston.transports.File({ filename: 'combined.log' }),
    new ElasticsearchTransport({ // Or similar)
      level: 'info',
      clientOpts: { hosts: ['localhost:9200'] }
    })
  ]
});
```

## Health Checks

### Liveness Probe

Endpoint: `GET /health`
Returns 200 if the application is running.

```typescript
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});
```

### Readiness Probe

Endpoint: `GET /api/v1/health`
Returns 200 if dependencies are healthy.

```typescript
app.get("/api/v1/health", async (_req, res) => {
  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`;
    
    // Check Redis
    await redis.ping();
    
    res.json({ status: "ready" });
  } catch {
    res.status(503).json({ status: "not ready" });
  }
});
```

## Deployment Monitoring

### Kubernetes Integration

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: eduflow-api
spec:
  containers:
  - name: api
    image: eduflow-api:1.0.0
    ports:
    - containerPort: 3000
    
    # Liveness probe
    livenessProbe:
      httpGet:
        path: /health
        port: 3000
      initialDelaySeconds: 10
      periodSeconds: 10
    
    # Readiness probe
    readinessProbe:
      httpGet:
        path: /api/v1/health
        port: 3000
      initialDelaySeconds: 5
      periodSeconds: 5
```

### Cloud Provider Monitoring

**AWS CloudWatch:**
```typescript
const cloudwatch = new AWS.CloudWatch();
cloudwatch.putMetricData({
  Namespace: 'EduFlow',
  MetricData: [
    {
      MetricName: 'EnrolledUsers',
      Value: 1234,
      Unit: 'Count'
    }
  ]
});
```

**Google Cloud Monitoring:**
```typescript
const monitoring = require('@google-cloud/monitoring');
const client = new monitoring.MetricServiceClient();
// Report custom metrics
```

## Incident Response

### Runbook for Common Issues

**High Error Rate (>5%)**
1. Check Sentry for new error types
2. Review recent deployments
3. Check database and Redis connectivity
4. Review rate limiting status
5. Check disk space

**Slow API (p95 > 1s)**
1. Check database query performance
2. Verify cache hit rate
3. Review CPU/memory usage
4. Check for N+1 queries
5. Review recent schema changes

**Low Cache Hit Rate (<60%)**
1. Verify Redis is running
2. Check Redis memory usage
3. Review cache invalidation logic
4. Check for cache key misses

---

## Dashboard Template

```yaml
# Grafana Dashboard JSON
{
  "dashboard": {
    "title": "EduFlow API Monitoring",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])"
          }
        ]
      },
      {
        "title": "Response Time (p95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, http_request_duration_seconds)"
          }
        ]
      },
      {
        "title": "Cache Hit Rate",
        "targets": [
          {
            "expr": "sum(rate(cache_hits_total[5m])) / (sum(rate(cache_hits_total[5m])) + sum(rate(cache_misses_total[5m])))"
          }
        ]
      }
    ]
  }
}
```

---

For support or questions, contact: devops@eduflow.com
