# Load Testing (Dev Baseline)

This folder contains a reproducible **k6** load-test harness intended for **local Docker baseline only**.

It is **not** a “100k concurrent users certification”. Use staging/prod-like infra to validate that.

## Prerequisites

- Backend reachable from the machine running k6
- Student credentials for authenticated scenarios

## Run (recommended: k6 via Docker)

From repo root (PowerShell):

```powershell
$env:BASE_URL="http://host.docker.internal:3000"
$env:STUDENT_USERS_JSON='[{"email":"student@example.com","password":"Password123"}]'

docker run --rm -i `
  -v ${PWD}\loadtest\k6:/scripts `
  grafana/k6:latest run /scripts/eduflow-baseline.js `
  --summary-export /scripts/out-summary.json
```

If you have `k6` installed locally:

```bash
BASE_URL=http://localhost:3000 \
STUDENT_USERS_JSON='[{"email":"student@example.com","password":"Password123"}]' \
k6 run loadtest/k6/eduflow-baseline.js --summary-export loadtest/out-summary.json
```

## Report artifact

- Use `--summary-export` to write a JSON file.
- Optionally render a simple HTML summary:

```bash
node loadtest/render-k6-report.mjs loadtest/out-summary.json loadtest/out-summary.html
```

## Tuning

- `THRESHOLD_PROFILE=local` (default) vs `THRESHOLD_PROFILE=prod_like`
- `VIDEO_ITERATION_SEGMENTS=2` (default) controls how many segment URLs are fetched per iteration.

