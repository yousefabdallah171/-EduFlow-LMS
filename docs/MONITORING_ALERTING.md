# Monitoring & Alerting (Dev + Production Guidance)

This repo includes a lightweight, **dependency-free** metrics endpoint intended for **dev/staging verification** and basic operational visibility.

## Built-in Metrics Endpoint (Dev-friendly)

- Endpoint: `GET /health/metrics`
- Output: JSON snapshot (uptime, memory, event-loop delay, request counters by status class, slow request count).

### Example

```bash
curl -s http://localhost/health/metrics | jq .
```

If you run via Docker Compose (frontend mapped to port 80, backend internal):

```bash
# From host (if backend is published on a port in your deployment)
curl -s http://localhost:3000/health/metrics | jq .

# Or from inside the backend container
docker compose exec backend sh -lc "wget -qO- http://localhost:3000/health/metrics"
```

## Production Monitoring (Recommended)

When deploying for real traffic, use one of:

- Managed APM (Datadog / New Relic / Sentry Performance)
- Prometheus + Grafana (self-hosted or managed)

## Prometheus Metrics (Optional)

The backend can expose Prometheus metrics at:

- `GET /metrics`

Enable via env:

- `PROMETHEUS_METRICS_ENABLED=true`

To keep `/metrics` non-public in production, set a token:

- `PROMETHEUS_METRICS_TOKEN=...`
- Scrape with `Authorization: Bearer <token>`

In dev/test, if `PROMETHEUS_METRICS_TOKEN` is not set, `/metrics` is allowed when enabled.

### Run Prometheus + Grafana (Dev)

```bash
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml --profile monitoring up -d
```

- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001` (admin/admin in dev; change in real deployments)

### Minimum Alerts to Configure

- **HTTP error rate**: 5xx > 1% for 5 minutes
- **Latency**: p95 > 500ms for 5 minutes (key endpoints: `/api/v1/course`, `/api/v1/lessons/grouped`, video playlist/key/segment)
- **Redis**: memory > 75%, evictions > 0, replication/persistence errors
- **Postgres**: connections near max, slow queries, replication/backup failures
- **Disk**: storage volume nearing capacity (HLS output, uploads)
- **Container restarts**: crash loops / OOM kills

### Video Abuse Visibility

- Anomalies are persisted to `VideoSecurityEvent` and exposed via the admin endpoint:
  - `GET /api/v1/admin/video-security/events`
