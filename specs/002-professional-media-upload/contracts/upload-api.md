# API Contract: Upload & Media Reliability

## POST `/api/v1/admin/uploads/sessions`

Create a resumable upload session.

### Request

```json
{
  "fileName": "lesson-01.mp4",
  "fileSizeBytes": 1073741824,
  "mimeType": "video/mp4",
  "folderId": "module-1",
  "clientFingerprint": "sha1-..."
}
```

### Response `201`

```json
{
  "sessionId": "upl_123",
  "uploadUrl": "/api/v1/admin/uploads/sessions/upl_123/chunks",
  "protocol": "TUS",
  "initialChunkSizeBytes": 5242880,
  "resumeFromChunkIndex": 0,
  "status": "QUEUED"
}
```

---

## PATCH `/api/v1/admin/uploads/sessions/{sessionId}/chunks`

Upload one chunk with index and checksum.

### Headers

- `Upload-Chunk-Index`: integer
- `Upload-Chunk-Checksum`: checksum string
- `Content-Type`: `application/offset+octet-stream`

### Response `200`

```json
{
  "sessionId": "upl_123",
  "acknowledgedChunkIndex": 12,
  "nextChunkIndex": 13,
  "recommendedChunkSizeBytes": 2097152,
  "retryAdvice": {
    "shouldBackoff": false,
    "nextDelayMs": 0
  }
}
```

---

## GET `/api/v1/admin/uploads/sessions/{sessionId}`

Get authoritative resume state.

### Response `200`

```json
{
  "sessionId": "upl_123",
  "status": "UPLOADING",
  "maxAcknowledgedChunkIndex": 12,
  "nextChunkIndex": 13,
  "chunkSizeBytes": 2097152,
  "uploadedBytes": 27262976,
  "fileSizeBytes": 1073741824
}
```

---

## POST `/api/v1/admin/uploads/sessions/{sessionId}/complete`

Finalize upload and start processing.

### Response `202`

```json
{
  "sessionId": "upl_123",
  "mediaAssetId": "med_456",
  "status": "PROCESSING"
}
```

---

## GET `/api/v1/admin/media`

List media assets with filters.

### Query Params

- `status`, `folderId`, `search`, `page`, `pageSize`, `sortBy`, `sortDir`

### Response `200`

```json
{
  "items": [
    {
      "id": "med_456",
      "title": "Lesson 01",
      "originalFileName": "lesson-01.mp4",
      "status": "READY",
      "durationSeconds": 843,
      "sizeBytes": 1073741824,
      "createdAt": "2026-04-27T10:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "pageSize": 20, "total": 1 }
}
```

---

## POST `/api/v1/admin/uploads/retry-failed`

Retry all failed upload sessions/media processing items in scope.

### Request

```json
{
  "scope": "CURRENT_FILTER",
  "filter": { "status": "FAILED" }
}
```

### Response `202`

```json
{
  "batchReportId": "batch_789",
  "scheduledItems": 14
}
```
