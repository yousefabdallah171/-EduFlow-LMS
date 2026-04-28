# E2E + Checklist Run (2026-04-28)

## Scope
- New E2E: Admin orders Seller/From/To filters
- Quick production smoke checklist

## Results
- [PASS] Backend health endpoint: `GET /api/v1/health` returned `{"status":"ok"}`
- [PASS] Frontend container health check (`http://127.0.0.1:5173`)
- [PASS] E2E `frontend/tests/e2e/admin-orders-filters.spec.ts`
- [FAIL] Existing smoke test `frontend/tests/e2e/smoke.spec.ts` (admin flow)
  - Error: `500 http://localhost:5173/api/v1/admin/media-library?status=READY&page=1&pageSize=200`
  - Public + student smoke scenarios passed

## Notes
- Seller/date-range behavior is now covered by automated E2E.
- Remaining blocker for full smoke green is the backend `admin/media-library` 500 in the admin smoke flow.
