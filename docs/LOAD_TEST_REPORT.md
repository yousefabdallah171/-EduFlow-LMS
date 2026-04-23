# Load Test Report (Dev Baseline)

**Updated**: 2026-04-21  
**Scope**: Development environment (Docker Compose). This is a baseline sanity check, not a 100k-user certification.

## What We Ran

These scripts are dependency-free and use Node’s built-in `fetch`:

- `pnpm --dir backend load:course`
- `pnpm --dir backend load:student`

## Results (Captured)

### Public `/api/v1/course`

- Duration: 30s
- Concurrency: 25

```json
{
  "target": "http://localhost:3000/api/v1/course",
  "durationSeconds": 30,
  "concurrency": 25,
  "total": 3951,
  "ok": 3951,
  "fail": 0,
  "rps": 131.7,
  "latencyMs": { "p50": 185.61, "p95": 241.28, "p99": 286.75, "max": 494.79 }
}
```

### Authenticated student mix (`/student/dashboard`, `/lessons/grouped`, `/lessons`)

- Duration: 30s
- Concurrency: 10

```json
{
  "target": "http://localhost:3000/api/v1",
  "durationSeconds": 30,
  "concurrency": 10,
  "total": 3119,
  "ok": 3119,
  "fail": 0,
  "rps": 103.97,
  "latencyMs": { "p50": 80.56, "p95": 130.24, "p99": 147.97, "max": 188.91 }
}
```

## How To Re-run

```bash
# Inside backend container
docker compose exec backend sh -lc "cd /app/backend && pnpm load:course"
docker compose exec backend sh -lc "cd /app/backend && pnpm load:student"
```

Tune with env vars:

```bash
docker compose exec backend sh -lc "cd /app/backend && LOAD_DURATION_SECONDS=60 LOAD_CONCURRENCY=50 pnpm load:course"
docker compose exec backend sh -lc "cd /app/backend && LOAD_DURATION_SECONDS=60 LOAD_CONCURRENCY=20 pnpm load:student"
```

## Next Step (Production-Like)

To validate “100k users” claims, you still need a production-like test plan:

- Run on separate machines (generator vs API) to avoid local bottlenecks.
- Use a real load tool (k6/Artillery/Locust) with ramping phases.
- Track p95/p99, error rate, DB connections, Redis memory/evictions, and event-loop delay.
- Confirm rate limits don’t block legitimate playback behavior under load.

