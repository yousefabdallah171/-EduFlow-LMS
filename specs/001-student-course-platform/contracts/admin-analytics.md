# API Contract: Admin — Analytics & Reporting

**Base path**: `/api/v1/admin`
**Auth required**: Bearer access token
**Role required**: `ADMIN` only

---

## GET /api/v1/admin/analytics

Get dashboard KPI summary. Results cached in Redis for 60 minutes.

**Query params**:
- `period` — `7d` | `30d` | `90d` | `all` (default: `30d`)

**Response 200**
```json
{
  "period": "30d",
  "generatedAt": "2026-04-12T14:00:00Z",
  "kpis": {
    "totalRevenue": {
      "amountEgp": 24451,
      "currency": "EGP",
      "changePercent": 12.5
    },
    "enrolledStudents": {
      "total": 87,
      "active": 80,
      "revoked": 7,
      "newThisPeriod": 23
    },
    "courseCompletion": {
      "averagePercent": 42.1,
      "fullyCompleted": 14
    },
    "videoEngagement": {
      "averageWatchTimeSeconds": 9800,
      "totalWatchTimeSeconds": 852600
    }
  },
  "revenueTimeseries": [
    { "date": "2026-03-13", "revenueEgp": 499 },
    { "date": "2026-03-14", "revenueEgp": 1497 }
  ],
  "enrollmentTimeseries": [
    { "date": "2026-03-13", "newEnrollments": 1 },
    { "date": "2026-03-14", "newEnrollments": 3 }
  ],
  "topLessons": [
    {
      "lessonId": "uuid",
      "titleEn": "Introduction",
      "titleAr": "مقدمة",
      "completionRate": 89.7,
      "averageWatchTimeSeconds": 560
    }
  ],
  "dropOffLessons": [
    {
      "lessonId": "uuid",
      "titleEn": "Advanced Techniques",
      "titleAr": "تقنيات متقدمة",
      "dropOffRate": 34.2,
      "averageExitPositionSeconds": 240
    }
  ]
}
```

---

## GET /api/v1/admin/payments

List all payment records with filtering.

**Query params**:
- `page` (default: 1), `limit` (default: 20, max: 100)
- `status` — `PENDING` | `COMPLETED` | `FAILED` | `REFUNDED`
- `from` — ISO date filter start
- `to` — ISO date filter end

**Response 200**
```json
{
  "data": [
    {
      "id": "uuid",
      "student": {
        "id": "uuid",
        "fullName": "Ahmed Al-Rashid",
        "email": "ahmed@example.com"
      },
      "amountEgp": 399,
      "discountEgp": 100,
      "couponCode": "SAVE20",
      "paymobTransactionId": "TXN123456",
      "status": "COMPLETED",
      "createdAt": "2026-04-12T09:55:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 87,
    "totalPages": 5
  },
  "summary": {
    "totalRevenue": 24451,
    "completedCount": 87,
    "failedCount": 3
  }
}
```

---

## POST /api/v1/admin/payments/:paymentId/mark-paid

Manually mark a pending payment as completed (out-of-band enrollment for webhook failures).
Requires Dialog confirmation on frontend.

**Request**
```json
{ "reason": "Webhook delivery failed; payment confirmed via Paymob dashboard" }
```

**Response 200**
```json
{
  "payment": { "id": "uuid", "status": "COMPLETED" },
  "enrollment": { "status": "ACTIVE", "enrollmentType": "PAID" },
  "message": "Payment marked as completed. Student enrolled."
}
```

**Response 409** — student already enrolled
```json
{ "error": "ALREADY_ENROLLED" }
```

**Response 409** — payment already completed
```json
{ "error": "PAYMENT_ALREADY_COMPLETED" }
```
