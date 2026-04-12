# API Contract: Student (Course & Enrollment)

**Base path**: `/api/v1`
**Auth required**: Bearer access token (except webhook)
**Role required**: `STUDENT` (unless noted)

---

## GET /api/v1/me

Get current user's profile.

**Response 200**
```json
{
  "id": "uuid",
  "email": "student@example.com",
  "fullName": "Ahmed Al-Rashid",
  "avatarUrl": "https://...",
  "role": "STUDENT",
  "locale": "ar",
  "theme": "dark",
  "oauthProvider": "google",
  "emailVerified": true,
  "createdAt": "2026-04-12T10:00:00Z"
}
```

---

## PATCH /api/v1/me

Update profile preferences.

**Request** (all fields optional)
```json
{
  "fullName": "Ahmed Al-Rashid Updated",
  "locale": "ar",
  "theme": "dark",
  "avatarUrl": "https://..."
}
```

**Response 200** — returns updated user object (same shape as GET /me)

**Validation**:
- `locale`: one of `"en"` | `"ar"`
- `theme`: one of `"light"` | `"dark"`

---

## GET /api/v1/course

Get course details. Returns lesson list only for enrolled students.

**Response 200 — non-enrolled student**
```json
{
  "title": "EduFlow Course Title",
  "descriptionHtml": "...",
  "priceEgp": 499,
  "currency": "EGP",
  "lessonCount": 12,
  "totalDurationSeconds": 18000,
  "isEnrollmentOpen": true,
  "enrolled": false
}
```

**Response 200 — enrolled student**
```json
{
  "title": "...",
  "enrolled": true,
  "completionPercentage": 33.3,
  "lessons": [
    {
      "id": "uuid",
      "title": "Introduction",
      "durationSeconds": 600,
      "isUnlocked": true,
      "completedAt": null,
      "lastPositionSeconds": 120
    }
  ]
}
```

---

## GET /api/v1/enrollment

Check current student's enrollment status.

**Response 200**
```json
{
  "enrolled": true,
  "status": "ACTIVE",
  "enrollmentType": "PAID",
  "enrolledAt": "2026-04-12T10:00:00Z"
}
```

**Response 200 — not enrolled**
```json
{ "enrolled": false }
```

---

## POST /api/v1/checkout

Initiate a Paymob payment for course purchase.

**Request** (optional)
```json
{ "couponCode": "SAVE20" }
```

**Response 200** — Paymob payment key for hosted checkout
```json
{
  "paymentKey": "<paymob_payment_key>",
  "orderId": "uuid",
  "amount": 39920,
  "currency": "EGP",
  "discountApplied": 9980,
  "iframeId": "12345"
}
```

**Response 409** — already enrolled
```json
{ "error": "ALREADY_ENROLLED" }
```

**Response 400** — invalid coupon
```json
{ "error": "INVALID_COUPON", "message": "This coupon is expired or has reached its usage limit." }
```

---

## POST /api/v1/checkout/validate-coupon

Validate a coupon code and preview discount without creating an order.

**Request**
```json
{ "couponCode": "SAVE20" }
```

**Response 200**
```json
{
  "valid": true,
  "discountType": "PERCENTAGE",
  "discountValue": 20,
  "originalAmountEgp": 499,
  "discountedAmountEgp": 399.2
}
```

**Response 200 — invalid**
```json
{ "valid": false, "reason": "EXPIRED" }
```

---

## POST /api/v1/webhooks/paymob

Receive Paymob payment webhook. **Public endpoint** (no auth). HMAC validated.

**Request**: Paymob webhook body (as documented by Paymob API).

**HMAC validation**: Performed in `hmac.middleware.ts` before controller. Returns 400 if invalid.

**Response 200** — always returned after HMAC validation to prevent Paymob retries
```json
{ "received": true }
```

**Side effects on success webhook**:
1. Mark payment as `COMPLETED`
2. Create/update enrollment to `ACTIVE`
3. Increment coupon `uses_count` if coupon was applied

---

## GET /api/v1/lessons

Get all published lessons for enrolled student. Respects drip schedule.

**Response 200**
```json
{
  "lessons": [
    {
      "id": "uuid",
      "title": "Introduction to Arabic Calligraphy",
      "durationSeconds": 600,
      "sortOrder": 1,
      "isUnlocked": true,
      "unlocksAt": null,
      "completedAt": "2026-04-12T11:00:00Z",
      "lastPositionSeconds": 0
    },
    {
      "id": "uuid",
      "title": "Advanced Techniques",
      "durationSeconds": 900,
      "sortOrder": 2,
      "isUnlocked": false,
      "unlocksAt": "2026-04-19T10:00:00Z",
      "completedAt": null,
      "lastPositionSeconds": 0
    }
  ]
}
```

**Response 403** — not enrolled
```json
{ "error": "NOT_ENROLLED" }
```

---

## GET /api/v1/lessons/:lessonId

Get lesson details. Issues a video playback token.

**Response 200**
```json
{
  "id": "uuid",
  "title": "Introduction",
  "descriptionHtml": "...",
  "durationSeconds": 600,
  "videoToken": "<signed_jwt>",
  "hlsUrl": "/api/v1/video/:lessonId/playlist.m3u8?token=<signed_jwt>",
  "watermark": {
    "name": "Ahmed Al-Rashid",
    "maskedEmail": "a***@example.com"
  },
  "progress": {
    "lastPositionSeconds": 120,
    "completedAt": null
  }
}
```

**Response 403** — lesson locked by drip schedule
```json
{ "error": "LESSON_LOCKED", "unlocksAt": "2026-04-19T10:00:00Z" }
```

---

## POST /api/v1/lessons/:lessonId/progress

Update lesson progress (watch time, position, completion).

**Request**
```json
{
  "lastPositionSeconds": 350,
  "watchTimeSeconds": 230,
  "completed": false
}
```

**Response 200**
```json
{
  "lastPositionSeconds": 350,
  "watchTimeSeconds": 230,
  "completedAt": null,
  "courseCompletionPercentage": 16.7
}
```

---

## GET /api/v1/video/:lessonId/playlist.m3u8

Serve HLS playlist. Token validated on every request.

**Query params**: `?token=<video_jwt>`

**Response 200** — HLS `.m3u8` playlist content (`Content-Type: application/vnd.apple.mpegurl`)

**Response 401** — token expired, missing, or revoked
```json
{ "error": "INVALID_VIDEO_TOKEN" }
```

---

## GET /api/v1/video/:lessonId/key

Return HLS AES-128 decryption key. Token validated.

**Query params**: `?token=<video_jwt>`

**Response 200** — binary AES-128 key (`Content-Type: application/octet-stream`)

**Response 401** — as above
