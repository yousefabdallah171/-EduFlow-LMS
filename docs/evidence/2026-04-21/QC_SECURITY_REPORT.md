# QC Security Report (2026-04-21)

This file is created from `docs/QC_SECURITY_REPORT_TEMPLATE.md`.

## Scope

- Environment (dev/staging/prod-like): dev (Docker Compose)
- Git commit: `86dddfc257554c8d716d5145bcc3eeeea82219ba` (branch `phase-1`)
- Tester(s): automated (Codex run); human DevTools screenshots not captured
- Date/time: 2026-04-21 (Africa/Cairo)

### Rerun (dev)

- Git commit: `07fe597e5ceb0ba6c5f2d06a861b47e6a2ae112b`
- Date/time: 2026-04-21 18:20 (Africa/Cairo)
- Added artifacts: screenshots + rerun logs in `docs/evidence/2026-04-21/`

## Automated Checks

### Backend (Vitest)

- Status: PASS
- Evidence:
  - Command: `docker compose exec -T backend sh -lc "cd /app/backend && pnpm test"`
  - Output: `docs/evidence/2026-04-21/backend-test.txt` (original), `docs/evidence/2026-04-21/backend-test-2.txt` (rerun)

### Frontend (Build + Playwright)

- Status: PASS
- Evidence:
  - Build command: `docker compose exec -T frontend sh -lc "cd /app/frontend && pnpm build"`
  - E2E command: `docker compose exec -T frontend sh -lc "cd /app/frontend && pnpm exec playwright test --reporter=line"`
  - Output: `docs/evidence/2026-04-21/frontend-build.txt`, `docs/evidence/2026-04-21/frontend-e2e.txt` (original)
  - Rerun output: `docs/evidence/2026-04-21/frontend-build-2.txt`, `docs/evidence/2026-04-21/frontend-e2e-2.txt`
  - Playwright report path: `frontend/test-results/`

## Video Security Checks (Attacker-style)

- Incognito playlist replay: PASS (API simulation: `401` without cookies)
- Incognito key replay: PASS (API simulation: `401` without cookies)
- Incognito segment replay: PASS (API simulation: `401` without cookies)
- Logout replay: PASS (API simulation: `401` after logout)
- Rate-limit burst throttle: PASS (`429` after burst)
- Concurrency lease enforced: PASS (`429` on different fingerprint within same session)

Evidence:
- Attacker checks JSON: `docs/evidence/2026-04-21/qc-attacker-checks.json`
- `VideoSecurityEvent` anomalies: `docs/evidence/2026-04-21/qc-events.json`
- Playwright attacker helper output: `docs/evidence/2026-04-21/playwright-manual-check.json`
- Screenshot evidence: `docs/evidence/2026-04-21/qc-screenshots.json`, `docs/evidence/2026-04-21/screenshots/`

## Admin / RBAC

- Guest cannot access admin endpoints: PASS (backend integration tests)
- Student cannot access admin endpoints: PASS (backend integration tests)
- Admin can access admin endpoints: PASS (frontend E2E + backend integration tests)

## Session Security

- Single-session enforcement (`SESSION_INVALIDATED`): PASS (backend integration tests + frontend E2E coverage)

## Monitoring Baseline

### Prometheus

- Scrape works: PASS (dev monitoring overlay)
- Targets export: `docs/evidence/2026-04-21/prom-targets-after.json`
- Metrics sample: `docs/evidence/2026-04-21/prom-metrics-sample.txt`

### Grafana

- Dashboard renders: PARTIAL (Grafana up; dashboards not manually reviewed)
- Grafana health: `docs/evidence/2026-04-21/grafana-health.json`

### Sentry

- Backend event received: NOT RUN (DSN not configured)
- Frontend event received: NOT RUN (DSN not configured)
- Environment/release tags correct: NOT RUN

## Load Testing (Local Baseline Only)

- Scenarios executed: PASS (k6 local baseline)
- Error rate threshold met: PASS
- Latency threshold met: PASS

Artifacts:
- Summary JSON: `docs/evidence/2026-04-21/k6-summary.json`
- Optional HTML: `docs/evidence/2026-04-21/k6-report.html`

Rerun artifacts:
- Summary JSON: `docs/evidence/2026-04-21/k6-summary-2.json`
- Optional HTML: `docs/evidence/2026-04-21/k6-report-2.html`

## Final Result

- READY FOR STAGING SIGN-OFF: YES (dev evidence captured; staging still recommended)
- READY FOR PRODUCTION LAUNCH: NO

Notes / Follow-ups:
- Optional: capture real DevTools/Incognito screenshots to satisfy “human sign-off” requirements.
