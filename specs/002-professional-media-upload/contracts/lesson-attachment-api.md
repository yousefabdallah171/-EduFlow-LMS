# API Contract: Bulk Lesson Attachment

## POST `/api/v1/admin/lessons/media/auto-map`

Propose media-to-lesson matches based on naming heuristics.

### Request

```json
{
  "lessonIds": ["lesson-01", "lesson-02"],
  "mediaAssetIds": ["med_101", "med_102"],
  "strategy": "FILENAME_NORMALIZED"
}
```

### Response `200`

```json
{
  "matches": [
    {
      "lessonId": "lesson-01",
      "mediaAssetId": "med_101",
      "confidence": 0.93,
      "reason": "normalized-name-exact"
    }
  ],
  "unmatchedLessonIds": ["lesson-02"],
  "unmatchedMediaAssetIds": ["med_102"]
}
```

---

## POST `/api/v1/admin/lessons/media/bulk-attach`

Apply reviewed mapping atomically.

### Request

```json
{
  "attachments": [
    {
      "lessonId": "lesson-01",
      "mediaAssetId": "med_101",
      "mappingSource": "BULK_REVIEWED"
    }
  ],
  "replaceExistingPrimaryVideo": true
}
```

### Response `200`

```json
{
  "batchReportId": "batch_attach_001",
  "applied": 1,
  "skipped": 0,
  "failed": 0
}
```

---

## PUT `/api/v1/admin/lessons/{lessonId}/media/{mediaAssetId}`

Attach one media item to a lesson.

### Response `200`

```json
{
  "lessonId": "lesson-01",
  "mediaAssetId": "med_101",
  "status": "ATTACHED",
  "updatedAt": "2026-04-27T11:22:00.000Z"
}
```

---

## GET `/api/v1/admin/lessons/{lessonId}/media`

Read lesson media mapping.

### Response `200`

```json
{
  "lessonId": "lesson-01",
  "attachments": [
    {
      "id": "lam_123",
      "mediaAssetId": "med_101",
      "role": "PRIMARY_VIDEO",
      "isActive": true,
      "mappingSource": "MANUAL"
    }
  ]
}
```
