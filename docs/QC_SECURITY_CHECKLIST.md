# QC Security Checklist (Attacker-style)

Use this checklist for manual QC and scripted verification before opening testing to large groups.

## Quick Commands (Dev)

### Run the automated attacker-style checks (Playwright)

```bash
cd frontend
pnpm test:e2e
node scripts/playwright-manual-check.cjs
node scripts/qc-evidence-capture.cjs
```

## Video Security Checks (HLS)

- Capture playlist URL from Network and try opening in a fresh browser context (Incognito) → must fail (401/403).
- Capture key URL and try opening in a fresh context → must fail.
- Capture segment URL and try opening in a fresh context → must fail.
- Logout then retry captured playlist/key/segment → must fail.
- Attempt high-rate segment scraping (repeat segment URLs quickly) → must throttle (429) and log anomaly events.
- Confirm headers on playlist/key/segment:
  - `Cache-Control: private, no-store, max-age=0`
  - `Pragma: no-cache`
  - `Expires: 0`
  - `X-Content-Type-Options: nosniff`
  - `Cross-Origin-Resource-Policy: same-origin`

## Admin / RBAC Checks

- Student token cannot access any `/api/v1/admin/*` endpoint (403).
- Guest cannot access any admin endpoint (401).
- Admin can access admin endpoints (200).

## Session Security Checks

- Login from device A, then login from device B (same user).
  - Device A access token must start failing with `SESSION_INVALIDATED`.
  - Device B must continue to work.

## Abuse / Rate Limit Checks (Video)

- Burst playlist requests → throttled.
- Burst key requests → throttled.
- Burst segment requests → throttled.
- Multi-context playback attempt in parallel for same session → blocked by concurrency lease.

## Data Isolation Checks

- Student A cannot read Student B notes/progress.
- Student A cannot access Student B orders.

## Reporting Template

For each test case:

```
Test Case:
Goal:
Steps:
Expected Result:
Actual Result:
Status: PASS / FAIL
Notes:
```
