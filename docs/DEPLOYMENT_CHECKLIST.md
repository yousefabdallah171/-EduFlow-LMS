# EduFlow LMS — Deployment Checklist

This checklist is for staging/prod deployments. It complements the security evidence under `docs/evidence/`.

## Secrets & config

- [ ] Set strong `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `VIDEO_TOKEN_SECRET` (32+ chars).
- [ ] Set `FRONTEND_URL` exactly to the deployed origin.
- [ ] Configure SMTP secrets.
- [ ] Configure Paymob secrets (if payments enabled).
- [ ] Configure Google OAuth secrets + redirect URIs (if enabled).
- [ ] Ensure `.env` and `backend/.env` are not committed to git.

## Security

- [ ] Confirm admin routes gated by auth + role.
- [ ] Confirm refresh token rotation + reuse detection.
- [ ] Confirm video endpoints no-store headers + cookie-bound preview.
- [ ] Confirm rate limits/concurrency lease enabled on video endpoints.
- [ ] Confirm `/metrics` is restricted (token or private network).

## Observability

- [ ] Prometheus scrape working in staging/prod.
- [ ] Grafana dashboards imported.
- [ ] Sentry DSNs configured and test events received.
- [ ] Alerts configured and verified (controlled test).

## Performance

- [ ] Run staging load tests with production-like resources.
- [ ] Verify p95/p99 and error rate thresholds.

## QC sign-off

- [ ] Execute `docs/QC_SECURITY_CHECKLIST.md` with screenshots and attach evidence.
- [ ] Produce a final report based on `docs/QC_SECURITY_REPORT_TEMPLATE.md`.

