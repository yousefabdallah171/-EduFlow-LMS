# EduFlow LMS — API Reference

> **Update rule:** Any time you add, remove, or change an API endpoint, update this doc.

---

## Base URL

```
Development:  http://localhost:3000/api/v1
Production:   https://yourdomain.com/api/v1
```

## Authentication

All protected endpoints require:
```
Authorization: Bearer <access_token>
```

Access tokens expire in **15 minutes**. Refresh via `POST /api/v1/auth/refresh` (uses httpOnly cookie).

## API Version Header

Every response includes:
```
API-Version: 1.0.0
```

---

## Authentication Endpoints (`/api/v1/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | — | Register new user |
| POST | `/login` | — | Login (email + password) |
| POST | `/refresh` | — (cookie) | Refresh access token |
| POST | `/logout` | Required | Logout + revoke tokens |
| GET | `/oauth/google` | — | Start Google OAuth |
| GET | `/oauth/google/callback` | — | Google OAuth callback |
| POST | `/forgot-password` | — | Send password reset email |
| POST | `/reset-password` | — | Reset password with token |
| GET | `/verify-email` | — | Verify email with token |
| POST | `/resend-verification` | — | Resend verification email |
| GET | `/health` | — | Auth health check |

---

## Public Endpoints (`/api/v1`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/course` | — | Public course info (title, description, packages, lessons preview) |
| POST | `/contact` | — | Submit contact form |
| GET | `/api/v1/health` | — | API health check |
| GET | `/api/v1/version` | — | API version info |

---

## Student Endpoints

All require: `Authorization: Bearer <token>` (any authenticated user)

### Enrollment & Checkout

| Method | Path | Description |
|--------|------|-------------|
| GET | `/enrollment` | Get enrollment status (ACTIVE / REVOKED / NONE) |
| POST | `/checkout` | Initiate Paymob checkout, returns `{ iframeUrl, paymentId }` |
| POST | `/checkout/validate-coupon` | Validate coupon code, returns discount info |

### Lessons & Video

| Method | Path | Description |
|--------|------|-------------|
| GET | `/lessons/grouped` | All published lessons grouped by section |
| GET | `/lessons` | All published lessons (flat list) |
| GET | `/lessons/preview` | Preview lesson (no enrollment needed, rate-limited) |
| GET | `/lessons/:id/detail` | Single lesson detail with video token |
| POST | `/lessons/:id/detail/refresh-token` | Refresh expired video token |
| POST | `/lessons/:id/progress` | Update watch time + completion status |
| GET | `/video/:id/playlist.m3u8` | HLS playlist (requires valid video token) |
| GET | `/video/:id/key` | AES-128 decryption key (requires valid token) |
| GET | `/video/:id/segment` | HLS segment file (requires valid token) |
| GET | `/lessons/:id/resources` | Downloadable resources for lesson |

### Dashboard & Profile

| Method | Path | Description |
|--------|------|-------------|
| GET | `/student/dashboard` | Full dashboard: enrollment, progress, last lesson |
| GET | `/student/dashboard/summary` | Lightweight dashboard summary |
| GET | `/student/profile` | User profile |
| PATCH | `/student/profile` | Update name, locale, theme, avatar |
| PATCH | `/student/profile/password` | Change password (rate limited: 3/hour) |

### Notes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/student/notes` | List all notes (with lessonId filter) |
| POST | `/student/notes` | Create note with `{ lessonId, content, positionSeconds }` |
| PATCH | `/student/notes/:id` | Update note content |
| DELETE | `/student/notes/:id` | Delete note |
| GET | `/student/notes/export` | Export all notes as plain text |

### Orders & Refunds

| Method | Path | Description |
|--------|------|-------------|
| GET | `/student/orders` | Payment history |
| POST | `/refunds/initiate` | Request refund `{ paymentId, amount?, reason }` |
| GET | `/refunds/:paymentId/status` | Refund status |
| POST | `/refunds/:paymentId/cancel` | Cancel pending refund |
| GET | `/refunds/:paymentId/history` | Refund history for payment |

### Support

| Method | Path | Description |
|--------|------|-------------|
| GET | `/student/tickets` | List my support tickets |
| POST | `/student/tickets` | Create support ticket |

### Webhooks (called by Paymob, not by users)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/webhooks/paymob` | Payment result webhook (HMAC validated) |
| POST | `/webhooks/paymob/refund` | Refund confirmation webhook |

---

## Admin Endpoints

All require: `Authorization: Bearer <admin_token>` (ADMIN role)

### Dashboard & Analytics

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/dashboard` | KPIs: revenue, students, completion, engagement |
| GET | `/admin/analytics` | Detailed analytics |
| GET | `/admin/analytics/course/:courseId` | Per-course analytics |

### Student Management

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/students` | List students (paginated) |
| GET | `/admin/students/search` | Search students by name/email |
| GET | `/admin/students/:studentId` | Student detail + progress |
| POST | `/admin/students/:studentId/enroll` | Manually enroll student |
| POST | `/admin/students/:studentId/revoke` | Revoke enrollment |

### Payment Management

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/payments` | List payments (filter: status, userId, date, amount) |
| GET | `/admin/payments/stats` | Revenue stats, conversion rates |
| GET | `/admin/payments/search` | Search payments |
| GET | `/admin/payments/status/:status` | Filter by status |
| GET | `/admin/payments/:id` | Payment detail |
| POST | `/admin/payments/manual` | Create manual/free payment |
| POST | `/admin/payments/:id/override` | Override payment status |
| POST | `/admin/payments/:id/revoke` | Revoke payment + enrollment |
| POST | `/admin/payments/:id/mark-paid` | Mark as paid |
| GET | `/admin/payments/:id/recovery/status` | Recovery job status |
| POST | `/admin/payments/:id/recovery/override` | Override recovery |
| POST | `/admin/payments/:id/recovery/retry` | Retry failed payment |
| POST | `/admin/payments/:id/recovery/reconcile` | Reconcile with Paymob |
| GET | `/admin/payments/:id/recovery/audit-log` | Recovery audit log |

### Orders

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/orders` | All orders |
| GET | `/admin/orders/:id` | Order detail |
| PATCH | `/admin/orders/:id/mark-paid` | Mark order paid |
| GET | `/admin/orders/export-csv` | Export to CSV |

### Refunds (Admin)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/refunds` | All refunds |
| POST | `/admin/refunds/initiate` | Initiate refund for any payment |
| GET | `/admin/refunds/:id/history` | Refund history |

### Content Management

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/sections` | List sections |
| POST | `/admin/sections` | Create section |
| GET | `/admin/sections/:id` | Section detail |
| PUT | `/admin/sections/:id` | Update section |
| DELETE | `/admin/sections/:id` | Delete section |
| POST | `/admin/sections/reorder` | Reorder sections |
| GET | `/admin/lessons` | List all lessons |
| POST | `/admin/lessons` | Create lesson |
| GET | `/admin/lessons/:id` | Lesson detail |
| PUT | `/admin/lessons/:id` | Update lesson |
| PATCH | `/admin/lessons/:id` | Partial update |
| DELETE | `/admin/lessons/:id` | Delete lesson |
| POST | `/admin/lessons/reorder` | Reorder lessons |
| PATCH | `/admin/lessons/:id/preview` | Toggle preview status |
| GET | `/admin/lessons/:id/resources` | List resources |
| POST | `/admin/lessons/:id/resources` | Add resource |
| DELETE | `/admin/lessons/:id/resources/:rid` | Delete resource |

### Video Uploads (TUS protocol)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/uploads` | List uploads |
| POST | `/admin/uploads` | Start chunked upload |
| HEAD | `/admin/uploads/:id` | Check upload offset |
| PATCH | `/admin/uploads/:id` | Upload next chunk |
| DELETE | `/admin/uploads/:id` | Cancel upload |

### Pricing & Coupons

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/pricing` | Get pricing config |
| PATCH | `/admin/pricing` | Update pricing |
| POST | `/admin/pricing/packages` | Create package |
| PATCH | `/admin/pricing/packages/:id` | Update package |
| GET | `/admin/coupons` | List coupons |
| POST | `/admin/coupons` | Create coupon |
| PATCH | `/admin/coupons/:couponId` | Update coupon |
| DELETE | `/admin/coupons/:couponId` | Delete coupon |

### Settings & Notifications

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/settings/course` | Course settings |
| PATCH | `/admin/settings/course` | Update course settings |
| GET | `/admin/settings/system` | System settings |
| GET | `/admin/notifications/templates` | Email templates |
| PATCH | `/admin/notifications/templates/:id` | Edit template |
| POST | `/admin/notifications/broadcast` | Send broadcast |

### Audit & Security

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/audit` | Admin audit log |
| GET | `/admin/video-security/events` | Video security events |
| GET | `/admin/tickets` | Support tickets |
| PATCH | `/admin/tickets/:id/status` | Update ticket status |
| POST | `/admin/tickets/:id/reply` | Reply to ticket |

---

## Standard Response Format

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Paginated:**
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "total": 100,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

**Error:**
```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable description"
}
```

---

## Common Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `SESSION_INVALIDATED` | 401 | Session was invalidated (new login elsewhere) |
| `INSUFFICIENT_ROLE` | 403 | Wrong role (e.g. student accessing admin) |
| `EMAIL_NOT_VERIFIED` | 403 | Login before verifying email |
| `PAYMENT_NOT_FOUND` | 404 | Payment ID doesn't exist |
| `PACKAGE_NOT_FOUND` | 404 | Package ID doesn't exist |
| `ALREADY_ENROLLED` | 409 | Student already enrolled |
| `CHECKOUT_IN_PROGRESS` | 409 | Another checkout active for this user |
| `INVALID_COUPON` | 400 | Coupon code not found or expired |
| `COUPON_LIMIT_EXCEEDED` | 400 | Coupon max uses reached |
| `INVALID_WEBHOOK_HMAC` | 400 | Paymob webhook HMAC mismatch |
| `REFUND_FAILED` | 400 | Cannot refund (wrong state) |
| `REFUND_ALREADY_PROCESSED` | 409 | Refund already exists for payment |
| `REFUND_INVALID_AMOUNT` | 400 | Amount > original or ≤ 0 |
| `PAYMOB_API_ERROR` | 502 | Paymob upstream error |
| `DATABASE_ERROR` | 500 | DB unreachable |

---

## Development-Only Endpoints (`/api/v1/dev`)

Available only when `NODE_ENV=development`:

```
POST /api/v1/dev/payments/:id/webhook/success  Simulate Paymob success
POST /api/v1/dev/payments/:id/webhook/failure  Simulate Paymob failure
```

---

## Metrics Endpoints

```
GET /metrics          Prometheus metrics text format
                      (optional Bearer auth if PROMETHEUS_METRICS_TOKEN set)
GET /metrics/health   { status: "ok", timestamp }
```
