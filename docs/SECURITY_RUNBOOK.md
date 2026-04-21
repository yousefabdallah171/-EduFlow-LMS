# EduFlow LMS — Security Runbook

This runbook is used by engineering + QC to validate the platform in dev/staging and to respond to security incidents in production.

## Quick validation (dev)

From repo root:

- Backend tests: `docker compose exec -T backend sh -lc "cd /app/backend && pnpm test"`
- Frontend E2E: `docker compose exec -T frontend sh -lc "cd /app/frontend && pnpm exec playwright test --reporter=line"`
- Attacker-style checks: `docker compose exec -T frontend sh -lc "cd /app/frontend && node scripts/playwright-manual-check.cjs"`

Evidence output lives under:

- `docs/evidence/YYYY-MM-DD/`

## Video security manual checklist

Follow:

- `docs/QC_SECURITY_CHECKLIST.md`

Required evidence for human sign-off:

- Incognito replay screenshots (playlist/key/segment).
- Logout replay proof.
- Rate limit burst proof (429) + exported `VideoSecurityEvent` anomalies.

## Admin security

- Verify student cannot access any `/api/v1/admin/*` endpoint.
- Verify admin can access and mutations write audit logs.

## Refresh/session security

- Refresh token rotation must revoke reused token families.
- Single-session enforcement must invalidate old access tokens on new login.

## Incident response (high-level)

1) Contain
- Disable/enforce single session: `ENFORCE_SINGLE_SESSION=true`
- Reduce video token TTL if needed (code-level)
- Temporarily increase video throttles (code-level)

2) Investigate
- Review `VideoSecurityEvent` list in admin UI.
- Review Prometheus API metrics (5xx, latency, 401/429).
- Review Sentry (when DSNs configured).

3) Remediate
- Revoke enrollments if needed.
- Rotate JWT secrets if compromised (requires forced logout of all sessions).

4) Postmortem
- Write a short incident report: what happened, impact, root cause, permanent fix, follow-up tasks.

