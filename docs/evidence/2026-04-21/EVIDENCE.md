# Evidence Capture (2026-04-21)

This file is created from `docs/evidence/EVIDENCE_TEMPLATE.md`.

## Metadata

- Date/time (local): 2026-04-21 09:12 (Africa/Cairo)
- Environment:
  - `NODE_ENV`: `development`
  - Docker compose file(s): `docker-compose.yml`
  - Docker resource limits (if any): none (default Docker Desktop)
  - Machine specs (CPU/RAM): not captured (local dev machine)
- Git:
  - Branch: `phase-1`
  - Commit: `86dddfc257554c8d716d5145bcc3eeeea82219ba`

## Backend Verification

### Lint

Command: `docker compose exec -T backend sh -lc "cd /app/backend && pnpm lint"`
Output: `docs/evidence/2026-04-21/backend-lint.txt`

### Build

Command: `docker compose exec -T backend sh -lc "cd /app/backend && pnpm build"`
Output: `docs/evidence/2026-04-21/backend-build.txt`

### Tests (Vitest)

Command: `docker compose exec -T backend sh -lc "cd /app/backend && pnpm test"`
Output: `docs/evidence/2026-04-21/backend-test.txt`

## Frontend Verification

### Lint

Command: `docker compose exec -T frontend sh -lc "cd /app/frontend && pnpm lint"`
Output: `docs/evidence/2026-04-21/frontend-lint.txt`

### Build

Command: `docker compose exec -T frontend sh -lc "cd /app/frontend && pnpm build"`
Output: `docs/evidence/2026-04-21/frontend-build.txt`

### E2E (Playwright)

Command: `docker compose exec -T frontend sh -lc "cd /app/frontend && pnpm exec playwright test --reporter=line"`
Output: `docs/evidence/2026-04-21/frontend-e2e.txt`
Report path (if generated): `frontend/test-results/` (screenshots on failure; none for PASS)

## Load Test (Local Baseline Only)

Tool: k6 (via Docker)
Scenario(s): public browsing + student browsing + low-rate video path
Command: `docker run --rm --network eduflow-lms_eduflow_net -e BASE_URL=http://backend:3000 -e STUDENT_EMAIL=student@eduflow.com -e STUDENT_PASSWORD=*** -e THRESHOLD_PROFILE=local -v ${PWD}\\loadtest\\k6:/scripts -v ${PWD}\\docs\\evidence\\2026-04-21:/out grafana/k6:latest run /scripts/eduflow-baseline.js --summary-export /out/k6-summary.json`
Artifacts:
- Summary JSON: `docs/evidence/2026-04-21/k6-summary.json`
- Optional HTML: `docs/evidence/2026-04-21/k6-report.html`
- Console output: `docs/evidence/2026-04-21/k6-console.txt`
Notes (p95/error rate): see report; local baseline only (not a 100k certification).

## Monitoring Baseline (Dev/Staging)

### Prometheus scrape

- Targets OK (json export): `docs/evidence/2026-04-21/prom-targets-after.json`
- `/metrics` reachable (sample): `docs/evidence/2026-04-21/prom-metrics-sample.txt`

### Grafana dashboards

- Grafana health: `docs/evidence/2026-04-21/grafana-health.json`

### Sentry test events

- Backend event received (screenshot):
- Frontend event received (screenshot):

## Manual Security / Attacker-Style Checks

Use `docs/QC_SECURITY_CHECKLIST.md`.

- Automated attacker-style run (Playwright helper): `docs/evidence/2026-04-21/playwright-manual-check.json`
- API-based attacker checks (no secrets logged): `docs/evidence/2026-04-21/qc-attacker-checks.json`
- Security anomalies (admin API export): `docs/evidence/2026-04-21/qc-events.json`
