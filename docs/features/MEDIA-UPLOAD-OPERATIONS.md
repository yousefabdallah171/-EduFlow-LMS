# Media Upload Operations Runbook

## Purpose

This runbook explains how to monitor, recover, and safely operate the professional media upload system in production.

## Main Dashboards

- **Admin Media Library** (`/admin/media`)
  - Upload status counters (uploading, processing, ready, failed)
  - Upload Recovery Panel (`Retry All Failed`)
  - Batch Summary Card (latest retry/bulk reports)

- **Metrics endpoint** (`/metrics`)
  - `upload_retry_events_total`
  - `upload_resume_events_total`
  - `upload_throughput_bytes_total`
  - Existing HTTP/cache/video-security metrics

## Common Incidents and Responses

### 1) High failed uploads

1. Open `/admin/media` and check `failed` counter and telemetry.
2. Trigger **Retry All Failed**.
3. Confirm new entry in Batch Summary.
4. If failures persist:
   - verify object storage health
   - verify DB and Redis connectivity
   - review backend logs for upload error codes

### 2) Stuck uploads

1. Check `stuckItems` and `stuckSessionIds` in recovery telemetry.
2. Confirm threshold using `UPLOAD_QUEUE_STUCK_THRESHOLD_SECONDS`.
3. Retry failed sessions if applicable.
4. If still stuck:
   - inspect storage write permissions
   - inspect worker/transcoding queue

### 3) Slow throughput

1. Check `upload_throughput_bytes_total` growth rate.
2. Validate network conditions.
3. Temporarily reduce:
   - `UPLOAD_MAX_CONCURRENCY`
   - `UPLOAD_DEFAULT_CHUNK_SIZE_BYTES`
4. Re-test with 5-10 sample videos before bulk runs.

## Operational Config (Safe Defaults)

- `UPLOAD_DEFAULT_CHUNK_SIZE_BYTES=2097152` (2MB)
- `UPLOAD_MAX_CONCURRENCY=2`
- `UPLOAD_MAX_RETRY_ATTEMPTS=3`
- `UPLOAD_RETRY_INITIAL_DELAY_SECONDS=5`
- `UPLOAD_RETRY_MAX_DELAY_SECONDS=30`

## Verification Checklist After Deploy

1. Create upload session for valid video.
2. Confirm chunk ack and session resume endpoints respond.
3. Force one failed session, run retry-all, verify batch report created.
4. Confirm `/admin/media-library/telemetry` returns queue + stuck metrics.
5. Confirm lesson bulk map and bulk attach still work.
