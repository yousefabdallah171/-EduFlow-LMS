# QC Security Report Template (PASS/FAIL + Evidence)

Use this template to produce a final QA/security sign-off report.  
Store the completed report in `docs/evidence/YYYY-MM-DD/QC_SECURITY_REPORT.md`.

## Scope

- Environment (dev/staging/prod-like):
- Git commit:
- Tester(s):
- Date/time:

## Automated Checks

### Backend (Vitest)

- Status: PASS / FAIL
- Evidence:
  - Command:
  - Output snippet:

### Frontend (Build + Playwright)

- Status: PASS / FAIL
- Evidence:
  - Command:
  - Output snippet:
  - Playwright report path:

## Video Security Checks (Attacker-style)

- Incognito playlist replay: PASS / FAIL
- Incognito key replay: PASS / FAIL
- Incognito segment replay: PASS / FAIL
- Logout replay: PASS / FAIL
- Rate-limit burst throttle: PASS / FAIL
- Concurrency lease enforced: PASS / FAIL

Evidence:
- Screenshots/notes:
- `VideoSecurityEvent` events (admin endpoint response snippet):

## Admin / RBAC

- Guest cannot access admin endpoints: PASS / FAIL
- Student cannot access admin endpoints: PASS / FAIL
- Admin can access admin endpoints: PASS / FAIL

## Session Security

- Single-session enforcement (`SESSION_INVALIDATED`): PASS / FAIL

## Monitoring Baseline

### Prometheus

- Scrape works: PASS / FAIL
- Targets page screenshot:

### Grafana

- Dashboard renders: PASS / FAIL
- Screenshot(s):

### Sentry

- Backend event received: PASS / FAIL
- Frontend event received: PASS / FAIL
- Environment/release tags correct: PASS / FAIL

## Load Testing (Local Baseline Only)

- Scenarios executed: PASS / FAIL
- Error rate threshold met: PASS / FAIL
- Latency threshold met: PASS / FAIL

Artifacts:
- Summary JSON:
- Optional HTML:

## Final Result

- READY FOR STAGING SIGN-OFF: YES / NO
- READY FOR PRODUCTION LAUNCH: YES / NO

Notes / Follow-ups:

