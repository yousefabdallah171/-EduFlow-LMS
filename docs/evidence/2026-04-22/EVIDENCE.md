# Evidence Capture Template (Append-only)

Create a folder per run: `docs/evidence/YYYY-MM-DD/` and copy this file into it.  
Keep artifacts small and reproducible (commands + outputs), avoid storing secrets.

## Metadata

- Date/time (local): 2026-04-22 (Africa/Cairo)
- Environment:
  - `NODE_ENV`: development (Docker dev)
  - Docker compose file(s): `docker-compose.yml` + `docker-compose.dev.yml`
  - Docker resource limits (if any): none
  - Machine specs (CPU/RAM): (fill in if needed)
- Git:
  - Branch: `phase-1`
  - Commit: `4ff6413`

## Backend Verification

### Lint

Command:
- `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T backend sh -lc "cd /app/backend && pnpm lint"`
Output:
- `backend-lint.txt`

### Build

Command:
- `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T backend sh -lc "cd /app/backend && pnpm build"`
Output:
- `backend-build.txt`

### Tests (Vitest)

Command:
- `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T backend sh -lc "cd /app/backend && pnpm test"`
Output:
- `backend-test.txt`

## Frontend Verification

### Lint

Command:
- `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T frontend-dev sh -lc "cd /app/frontend && pnpm lint"`
Output:
- `frontend-lint.txt`

### Build

Command:
- `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T frontend-dev sh -lc "cd /app/frontend && pnpm build"`
Output:
- `frontend-build.txt`

### E2E (Playwright)

Command:
- `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T frontend-dev sh -lc "cd /app/frontend && pnpm test:e2e"`
Output:
- `frontend-e2e.txt`
Report path (if generated): not persisted in this run

## Load Test (Local Baseline Only)

Tool:
Scenario(s):
Command:
Artifacts:
- Summary JSON:
- Optional HTML:
Notes (p95/error rate):

## Monitoring Baseline (Dev/Staging)

### Prometheus scrape

- Targets OK (screenshot):
- `/metrics` reachable (curl output snippet):

### Grafana dashboards

- Dashboard screenshot(s):

### Sentry test events

- Backend event received (screenshot):
- Frontend event received (screenshot):

## Manual Security / Attacker-Style Checks

Use `docs/QC_SECURITY_CHECKLIST.md`.

- Attacker-style automated checks (Playwright helper):
  - Script output: `qc-attacker-checks.json`
- QC screenshots capture:
  - Script output: `qc-evidence-capture.txt`
  - Artifacts: `qc-screenshots.json`, `screenshots/*.png`
