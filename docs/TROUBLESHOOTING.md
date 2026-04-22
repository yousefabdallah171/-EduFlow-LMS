# EduFlow LMS — Troubleshooting Guide

## Video playback issues

### “This browser cannot play protected HLS”

- Confirm the HLS endpoints return `401` without cookies/tokens and `200` with a valid session.
- Confirm the student is enrolled and refresh cookie is present.
- Confirm `/api/v1/lessons/:id` returns `hlsUrl`.

Helpful artifacts:
- `docs/evidence/2026-04-21/playwright-manual-check-3.txt`

### Playback works in the page but copied URL fails

- This is expected for preview and for enrolled playback: the system is designed to prevent URL sharing.

## Login loops / redirected to /login after reload

- Check whether the refresh marker cookie is present: `eduflow_refresh_present=1`.
- Confirm `/api/v1/auth/refresh` returns 200 in the same browser context.
- If single-session enforcement is enabled, make sure you are not logged in from another device.

## Prometheus/Grafana not showing data

- Ensure monitoring overlay is running:
  - `docker compose -f docker-compose.yml -f docker-compose.monitoring.yml --profile monitoring up -d`
- Confirm Prometheus targets are up: `http://localhost:9090/targets`
- Confirm backend `/metrics` is reachable from Prometheus network.

## Sentry not receiving events

- DSNs are required. In dev, integrations can be present but will not send events without:
  - backend: `SENTRY_DSN`
  - frontend build-time DSN / config (depends on your setup)

