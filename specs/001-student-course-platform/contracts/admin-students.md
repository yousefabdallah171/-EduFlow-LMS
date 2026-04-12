# API Contract: Admin — Student Management

**Base path**: `/api/v1/admin`
**Auth required**: Bearer access token
**Role required**: `ADMIN` only (enforced server-side by `rbac.middleware.ts`)
**Rate limiting**: 60 req/min per admin session

---

## GET /api/v1/admin/students

List all students with pagination and filtering.

**Query params**:
- `page` (default: 1)
- `limit` (default: 20, max: 100)
- `status` — filter by enrollment status: `ACTIVE` | `REVOKED` | `NONE`
- `sort` — `name_asc` | `name_desc` | `enrolled_at_desc` (default: `enrolled_at_desc`)

**Response 200**
```json
{
  "data": [
    {
      "id": "uuid",
      "email": "student@example.com",
      "fullName": "Ahmed Al-Rashid",
      "avatarUrl": null,
      "enrollmentStatus": "ACTIVE",
      "enrollmentType": "PAID",
      "enrolledAt": "2026-04-12T10:00:00Z",
      "courseCompletion": 33.3,
      "lastActiveAt": "2026-04-12T15:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 87,
    "totalPages": 5
  }
}
```

---

## GET /api/v1/admin/students/search

Live search students by name or email. Used by Headless UI combobox.

**Query params**:
- `q` — search term (min 2 chars, max 100 chars)
- `limit` (default: 20, max: 20)

**Response 200**
```json
{
  "results": [
    {
      "id": "uuid",
      "email": "ahmed@example.com",
      "fullName": "Ahmed Al-Rashid",
      "enrollmentStatus": "ACTIVE"
    }
  ]
}
```

**Response 200 — no results**
```json
{ "results": [] }
```

**Caching**: Results cached in Redis for 5 minutes per query term hash.

---

## GET /api/v1/admin/students/:studentId

Get detailed student profile including full payment and progress history.

**Response 200**
```json
{
  "id": "uuid",
  "email": "student@example.com",
  "fullName": "Ahmed Al-Rashid",
  "avatarUrl": null,
  "locale": "ar",
  "oauthProvider": "email",
  "emailVerified": true,
  "createdAt": "2026-04-01T10:00:00Z",
  "enrollment": {
    "status": "ACTIVE",
    "enrollmentType": "PAID",
    "enrolledAt": "2026-04-12T10:00:00Z",
    "revokedAt": null
  },
  "payments": [
    {
      "id": "uuid",
      "amountEgp": 499,
      "status": "COMPLETED",
      "couponCode": "SAVE20",
      "createdAt": "2026-04-12T09:55:00Z"
    }
  ],
  "progress": {
    "completionPercentage": 33.3,
    "lessonsCompleted": 4,
    "totalLessons": 12,
    "totalWatchTimeSeconds": 3600
  }
}
```

---

## POST /api/v1/admin/students/:studentId/enroll

Manually enroll a student. Requires confirmation on the frontend (Dialog).

**Request**: No body required.

**Response 201**
```json
{
  "enrollment": {
    "id": "uuid",
    "userId": "uuid",
    "status": "ACTIVE",
    "enrollmentType": "ADMIN_ENROLLED",
    "enrolledAt": "2026-04-12T12:00:00Z"
  },
  "message": "Student enrolled successfully."
}
```

**Response 409** — already enrolled and ACTIVE
```json
{ "error": "ALREADY_ENROLLED", "message": "Student already has an active enrollment." }
```

---

## POST /api/v1/admin/students/:studentId/revoke

Revoke a student's course access. Requires Dialog confirmation on frontend.

**Request**: No body required.

**Response 200**
```json
{
  "enrollment": {
    "status": "REVOKED",
    "revokedAt": "2026-04-12T12:00:00Z"
  },
  "message": "Student access revoked."
}
```

**Side effects**: Invalidates all active video tokens for this student (`session_id` revocation).

**Response 404** — no active enrollment
```json
{ "error": "NO_ACTIVE_ENROLLMENT" }
```
