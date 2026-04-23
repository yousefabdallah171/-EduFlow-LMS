# API Contract: Admin — Content, Uploads & Pricing

**Base path**: `/api/v1/admin`
**Auth required**: Bearer access token
**Role required**: `ADMIN` only

---

## Lessons

### GET /api/v1/admin/lessons

List all lessons (published and unpublished), ordered by `sort_order`.

**Response 200**
```json
{
  "lessons": [
    {
      "id": "uuid",
      "titleEn": "Introduction",
      "titleAr": "مقدمة",
      "sortOrder": 1,
      "isPublished": true,
      "videoStatus": "READY",
      "durationSeconds": 600,
      "dripDays": null
    }
  ]
}
```

---

### POST /api/v1/admin/lessons

Create a new lesson (no video yet).

**Request**
```json
{
  "titleEn": "Advanced Techniques",
  "titleAr": "تقنيات متقدمة",
  "descriptionEn": "...",
  "descriptionAr": "...",
  "dripDays": null,
  "sortOrder": 2
}
```

**Response 201**
```json
{
  "id": "uuid",
  "titleEn": "Advanced Techniques",
  "titleAr": "تقنيات متقدمة",
  "videoStatus": "NONE",
  "isPublished": false,
  "sortOrder": 2
}
```

---

### PATCH /api/v1/admin/lessons/:lessonId

Update lesson metadata.

**Request** (all fields optional)
```json
{
  "titleEn": "Updated Title",
  "titleAr": "العنوان المحدث",
  "isPublished": true,
  "dripDays": 7,
  "sortOrder": 3
}
```

**Response 200** — returns updated lesson

---

### DELETE /api/v1/admin/lessons/:lessonId

Delete lesson and associated video. Requires Dialog confirmation on frontend.

**Response 200**
```json
{ "message": "Lesson deleted." }
```

**Response 409** — video upload in progress
```json
{ "error": "UPLOAD_IN_PROGRESS", "message": "Cancel the active video upload before deleting." }
```

---

### POST /api/v1/admin/lessons/reorder

Update sort order of multiple lessons in a single operation.

**Request**
```json
{
  "order": [
    { "id": "uuid-lesson-1", "sortOrder": 1 },
    { "id": "uuid-lesson-2", "sortOrder": 2 }
  ]
}
```

**Response 200**
```json
{ "message": "Lessons reordered." }
```

---

## Video Uploads (tus protocol)

tus endpoints follow the [tus.io](https://tus.io/protocols/resumable-upload) specification.

### POST /api/v1/admin/uploads

Create a new tus upload session.

**Request headers**:
- `Tus-Resumable: 1.0.0`
- `Upload-Length: <total_bytes>`
- `Upload-Metadata: filename <base64>, lessonId <base64>, contentType <base64>`

**Response 201**
- `Location: /api/v1/admin/uploads/<uploadId>`
- `Tus-Resumable: 1.0.0`

---

### HEAD /api/v1/admin/uploads/:uploadId

Query current upload offset (for resume).

**Response 200**
- `Upload-Offset: <current_bytes>`
- `Upload-Length: <total_bytes>`
- `Tus-Resumable: 1.0.0`

---

### PATCH /api/v1/admin/uploads/:uploadId

Send the next chunk.

**Request headers**:
- `Content-Type: application/offset+octet-stream`
- `Upload-Offset: <current_offset>`
- Body: binary chunk data

**Response 204** — chunk accepted, no body

---

### DELETE /api/v1/admin/uploads/:uploadId

Cancel and clean up an upload. Requires Dialog confirmation on frontend.

**Response 204** — no body

---

### GET /api/v1/admin/uploads

List recent upload sessions for the admin.

**Response 200**
```json
{
  "uploads": [
    {
      "id": "uuid",
      "filename": "lesson-01.mp4",
      "sizeBytes": 524288000,
      "offsetBytes": 262144000,
      "status": "UPLOADING",
      "lessonId": "uuid",
      "createdAt": "2026-04-12T10:00:00Z"
    }
  ]
}
```

---

## Pricing

### GET /api/v1/admin/pricing

Get current course pricing.

**Response 200**
```json
{
  "priceEgp": 499,
  "pricePiasters": 49900,
  "currency": "EGP",
  "updatedAt": "2026-04-01T10:00:00Z"
}
```

---

### PATCH /api/v1/admin/pricing

Update course price.

**Request**
```json
{ "priceEgp": 599 }
```

**Validation**: `priceEgp` must be a positive number, max 100,000.

**Response 200**
```json
{ "priceEgp": 599, "updatedAt": "2026-04-12T12:00:00Z" }
```

---

## Coupons

### GET /api/v1/admin/coupons

List all active coupons (excludes soft-deleted).

**Response 200**
```json
{
  "coupons": [
    {
      "id": "uuid",
      "code": "SAVE20",
      "discountType": "PERCENTAGE",
      "discountValue": 20,
      "maxUses": 100,
      "usesCount": 43,
      "expiryDate": "2026-06-30T23:59:59Z",
      "revenueGenerated": 215357
    }
  ]
}
```

---

### POST /api/v1/admin/coupons

Create a new coupon.

**Request**
```json
{
  "code": "RAMADAN50",
  "discountType": "PERCENTAGE",
  "discountValue": 50,
  "maxUses": 200,
  "expiryDate": "2026-04-20T23:59:59Z"
}
```

**Validation**:
- `code`: 3–50 chars, alphanumeric + dash, auto-uppercased
- `discountValue`: 1–100 for PERCENTAGE; > 0 for FIXED
- `expiryDate`: ISO 8601, must be in the future

**Response 201** — returns created coupon

**Response 409** — code already exists
```json
{ "error": "COUPON_CODE_EXISTS" }
```

---

### PATCH /api/v1/admin/coupons/:couponId

Update coupon (max_uses, expiry only — code and discount are immutable after creation).

**Request**
```json
{ "maxUses": 300, "expiryDate": "2026-05-01T23:59:59Z" }
```

**Response 200** — returns updated coupon

---

### DELETE /api/v1/admin/coupons/:couponId

Soft-delete a coupon. Requires Dialog confirmation on frontend.

**Response 200**
```json
{ "message": "Coupon deleted." }
```

**Note**: Soft-deleted coupons are no longer usable but historical payment records retain the reference.
