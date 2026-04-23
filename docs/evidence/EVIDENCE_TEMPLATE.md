# Evidence Capture Template (Append-only)

Create a folder per run: `docs/evidence/YYYY-MM-DD/` and copy this file into it.  
Keep artifacts small and reproducible (commands + outputs), avoid storing secrets.

## Metadata

- Date/time (local):
- Environment:
  - `NODE_ENV`:
  - Docker compose file(s):
  - Docker resource limits (if any):
  - Machine specs (CPU/RAM):
- Git:
  - Branch:
  - Commit:

## Backend Verification

### Lint

Command:
Output:

### Build

Command:
Output:

### Tests (Vitest)

Command:
Output:

## Frontend Verification

### Lint

Command:
Output:

### Build

Command:
Output:

### E2E (Playwright)

Command:
Output:
Report path (if generated):

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

- Incognito replay (playlist/key/segment) results:
- Logout replay results:
- Segment burst throttling result:
- `VideoSecurityEvent` anomalies captured:

