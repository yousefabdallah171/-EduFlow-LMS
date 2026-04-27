# Quickstart: Professional Media Upload & Lesson Attachment

## Goal

Validate end-to-end behavior for large-batch resilient uploads and bulk lesson attachment.

## Prerequisites

- Backend, frontend, postgres, redis running
- Admin account access
- Test media set:
  - 100 valid videos (mixed sizes, include large files)
  - Invalid files (e.g., image/pdf for rejection checks)
  - Duplicate filename cases

## Scenario A: Large Batch Upload (Baseline)

1. Open admin uploader.
2. Drag-drop 100 videos.
3. Confirm queue builds and starts.
4. Verify:
   - Progress visible per item and overall batch
   - Speed + ETA shown and updating
   - Queue stays responsive

Expected:
- Accepted/rejected summary appears.
- Upload proceeds with bounded concurrency.

## Scenario B: Weak Internet Simulation

Simulate:
- Throughput ~100 KB/s
- Latency ~300ms
- Packet loss ~5%

Verify:
- Adaptive chunk size trends down.
- Retries follow backoff and do not loop forever.
- Completed chunks are not re-uploaded.

## Scenario C: Refresh / Reopen Recovery

1. Start batch upload.
2. At ~30%, refresh page.
3. Reopen uploader.

Verify:
- Queue restored from IndexedDB.
- Upload resumes from saved checkpoints.
- No restart from zero.

## Scenario D: Offline Pause / Auto Resume

1. Start uploads.
2. Disconnect network for ~5 minutes.
3. Reconnect.

Verify:
- Status changes to offline/paused during disconnect.
- Auto-resume on reconnect.
- Progress continuity is preserved.

## Scenario E: Server Error Handling

Simulate transient server errors: `500`, `502`, `503`, `504`.

Verify:
- Failed chunk retries only (not full file restart).
- Backoff intervals apply.
- After max retries, item is marked failed with clear error.
- Manual retry and retry-all-failed work.

## Scenario F: Integrity Validation

1. Upload valid video -> should become `READY`.
2. Upload intentionally corrupted/tampered file -> should become `FAILED`.

Verify:
- Integrity failure reason displayed.
- Failed item can be retried after corrective action.

## Scenario G: Bulk Lesson Attachment

1. Open bulk mapper with ready assets.
2. Run auto-map by filename.
3. Review unresolved/low-confidence rows.
4. Apply bulk attach.

Verify:
- Correct attachment counts in summary.
- Unmatched items stay pending for manual action.
- Lessons resolve to correct media asset.

---

## Validation Evidence (2026-04-27)

The following automated scenarios were added as implementation evidence for this feature:

- Backend contract/integration:
  - `backend/tests/contract/upload-session.contract.test.ts`
  - `backend/tests/integration/upload-resume.integration.test.ts`
  - `backend/tests/integration/upload-validation.integration.test.ts`
  - `backend/tests/integration/duplicate-handling.integration.test.ts`
  - `backend/tests/contract/lesson-attachment.contract.test.ts`
  - `backend/tests/integration/lesson-bulk-attach.integration.test.ts`
  - `backend/tests/integration/retry-all-failed.integration.test.ts`
  - `backend/tests/integration/upload-stuck-detection.integration.test.ts`

- Frontend unit/e2e:
  - `frontend/src/lib/__tests__/adaptive-chunking.test.ts`
  - `frontend/src/lib/__tests__/upload-eta.test.ts`
  - `frontend/src/components/admin/uploader/__tests__/UploadDropzone.test.tsx`
  - `frontend/tests/e2e/upload-refresh-resume.spec.ts`
  - `frontend/tests/e2e/upload-offline-resume.spec.ts`
  - `frontend/tests/e2e/upload-folder-mixed-files.spec.ts`
  - `frontend/tests/e2e/lesson-bulk-map.spec.ts`
  - `frontend/tests/e2e/upload-recovery-dashboard.spec.ts`
