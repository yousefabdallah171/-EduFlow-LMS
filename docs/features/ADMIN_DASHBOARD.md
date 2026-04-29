# EduFlow LMS — Admin Dashboard & Pages

> **Update rule:** Any time you add/change an admin page, feature, or analytics metric, update this doc.

---

## Route Map (Admin)

All admin routes require `ADMIN` role. Access via `/admin/*`.

| Route | File | Description |
|-------|------|-------------|
| `/admin/dashboard` | `pages/admin/Dashboard.tsx` | KPI analytics hub |
| `/admin/analytics` | `pages/admin/Analytics.tsx` | Detailed analytics |
| `/admin/students` | `pages/admin/Students.tsx` | Student list + management |
| `/admin/students/:id` | `pages/admin/StudentDetail.tsx` | Individual student profile |
| `/admin/lessons` | `pages/admin/Lessons.tsx` | Lesson management |
| `/admin/pricing` | `pages/admin/Pricing.tsx` | Course packages + pricing |
| `/admin/orders` | `pages/admin/Orders.tsx` | Payment/order history |
| `/admin/media` | `pages/admin/MediaLibrary.tsx` | Video upload + management |
| `/admin/tickets` | `pages/admin/Tickets.tsx` | Support ticket management |
| `/admin/notifications` | `pages/admin/Notifications.tsx` | Email template management |
| `/admin/audit` | `pages/admin/AuditLog.tsx` | Admin action audit trail |
| `/admin/settings` | `pages/admin/Settings.tsx` | System settings |

`/admin` redirects to `/admin/dashboard`.

---

## Admin Dashboard (`/admin/dashboard`)

**File:** `frontend/src/pages/admin/Dashboard.tsx`  
**API:** `GET /api/v1/admin/dashboard`  
**Cache:** Redis `analytics:{period}` — 1 hour

### KPI Cards

| KPI | Value | Change | Source |
|-----|-------|--------|--------|
| Total Revenue | EGP amount | % vs previous period | `Payment.amountPiasters` (COMPLETED only) |
| Enrolled Students | count (active / revoked / new) | new this period | `Enrollment` table |
| Course Completion | average % + fully completed count | — | `LessonProgress` vs total lessons |
| Video Engagement | avg watch time + total watch seconds | — | `LessonProgress.watchTimeSeconds` |

### Charts

- **Revenue timeseries** — 30-day bar/line chart, daily aggregation
- **Enrollment timeseries** — 30-day enrollment count
- **Top lessons** — highest completion rate, most watch time
- **Drop-off lessons** — where students stop watching (lowest completion)

Period selector: `7d`, `30d`, `90d`, `all`

---

## Analytics Page (`/admin/analytics`)

**File:** `frontend/src/pages/admin/Analytics.tsx`

Detailed version of dashboard metrics:
- Student performance distribution
- Lesson-by-lesson completion breakdown
- Revenue breakdown by package + coupon
- Cohort completion rates

---

## Students Page (`/admin/students`)

**File:** `frontend/src/pages/admin/Students.tsx`  
**API:** `GET /api/v1/admin/students`, `GET /api/v1/admin/students/search`

### Features

- **Search:** by name or email (debounced, cache-versioned with atomic Redis INCR)
- **Filter:** enrollment status (ACTIVE / REVOKED / all)
- **Sort:** by enrolled date, name
- **Pagination:** 50 per page, with next/prev controls
- **Bulk actions:** enroll or revoke multiple students
- **Export CSV:** downloads student data

### Per-student actions

- View detailed profile → `/admin/students/:id`
- Enroll → `POST /admin/students/:id/enroll`
- Revoke → `POST /admin/students/:id/revoke`

---

## Student Detail Page (`/admin/students/:id`)

**File:** `frontend/src/pages/admin/StudentDetail.tsx`  
**API:** `GET /api/v1/admin/students/:studentId`

### Shows

- User info: name, email, role, joined date, locale, theme
- Enrollment history: status, enrolled at, revoked at
- Payment history: all payments with status
- Progress breakdown: per-lesson completion %, watch time
- Notes count
- Audit log entries involving this student

---

## Lessons Management (`/admin/lessons`)

**File:** `frontend/src/pages/admin/Lessons.tsx`  
**API:** CRUD on `/api/v1/admin/lessons`, `/api/v1/admin/sections`

### Features

- **Create/edit lesson** — title (EN + AR), description (EN + AR), video, drip days, publish toggle
- **Sections** — group lessons into sections, reorder drag-and-drop
- **Reorder lessons** — within section, drag-and-drop
- **Toggle preview** — mark lesson as freely previewable without enrollment
- **Resources** — attach downloadable files per lesson
- **Video status** — NONE / PROCESSING / READY / ERROR (shown with progress indicator)

---

## Media Library (`/admin/media`)

**File:** `frontend/src/pages/admin/MediaLibrary.tsx`  
**API:** TUS protocol at `/api/v1/admin/uploads`

### Video Upload Flow

1. Admin selects video file
2. Frontend starts TUS chunked upload (`tus-js-client 4.2.3`)
3. `POST /admin/uploads` — create upload record, get upload URL
4. Chunks sent via `PATCH /admin/uploads/:id`
5. `VideoUpload` record tracks: `offsetBytes`, `sizeBytes`, `status`
6. On completion: backend triggers video processing (HLS encoding with ffmpeg)
7. `VideoStatus` transitions: `UPLOADING` → `COMPLETE` → `PROCESSING` → `READY`

Upload rate limit: **5 uploads/hour** per user.  
No body size limit on upload endpoint (nginx: `client_max_body_size 0`).  
Nginx timeout for uploads: `3600s`.

---

## Pricing Management (`/admin/pricing`)

**File:** `frontend/src/pages/admin/Pricing.tsx`  
**API:** `GET/PATCH /api/v1/admin/pricing`, `POST/PATCH /api/v1/admin/pricing/packages`, `CRUD /api/v1/admin/coupons`

### Course Packages (`CoursePackage` table)

- Title and description in EN + AR
- Price in piasters (EGP × 100)
- Active toggle
- Sort order

### Coupons (`Coupon` table)

- Discount type: `PERCENTAGE` or `FIXED` (piasters)
- Max uses count
- Expiry date
- Enable/disable

---

## Orders Page (`/admin/orders`)

**File:** `frontend/src/pages/admin/Orders.tsx`  
**API:** `GET /api/v1/admin/orders`, `GET /api/v1/admin/payments`

- Full payment history with user info
- Filter by status: COMPLETED, PENDING, FAILED, REFUNDED, WEBHOOK_PENDING, REFUND_REQUESTED
- Date range filter
- Amount range filter
- Export to CSV: `GET /admin/orders/export-csv`
- Mark as paid, override status

---

## Support Tickets (`/admin/tickets`)

**File:** `frontend/src/pages/admin/Tickets.tsx`  
**API:** `GET /admin/tickets`, `PATCH /admin/tickets/:id/status`, `POST /admin/tickets/:id/reply`

- List all tickets: OPEN / RESOLVED
- Read full conversation thread (`TicketMessage` table)
- Reply as admin
- Close/reopen ticket

---

## Notifications (`/admin/notifications`)

**File:** `frontend/src/pages/admin/Notifications.tsx`  
**API:** `GET/PATCH /admin/notifications/templates`, `POST /admin/notifications/broadcast`

- Edit email templates stored in `NotificationTemplate` table
- Templates: registration verification, payment receipt, payment failure, refund, etc.
- Send broadcast notification to all enrolled students

---

## Audit Log (`/admin/audit`)

**File:** `frontend/src/pages/admin/AuditLog.tsx`  
**API:** `GET /api/v1/admin/audit`

- Lists all admin actions: ENROLL_STUDENT, REVOKE_STUDENT, OVERRIDE_PAYMENT, etc.
- Shows: admin who did it, target user/payment, reason, timestamp
- Indexed by `[adminId, createdAt]` for fast queries
- Read-only — no modifications allowed on audit trail

---

## Settings (`/admin/settings`)

**File:** `frontend/src/pages/admin/Settings.tsx`  
**API:** `GET/PATCH /admin/settings/course`, `GET /admin/settings/system`

### Course Settings (`CourseSettings` table — singleton, id always = "1")

- Course title (EN + AR)
- Course description (EN + AR)
- Base price in piasters
- `isEnrollmentOpen` toggle (disable new enrollments)

### System Settings

- Read-only system info (version, environment)

---

## Admin Shell & Layout

**`components/layout/AdminShell.tsx`** — sidebar + header wrapper  
**`components/layout/NavBar.tsx`** — nav items for admin:

```
Dashboard | Lessons | Students
```

Admin-only nav; students never see admin routes.

---

## Database Tables Used by Admin Pages

| Page | Primary Table(s) |
|------|-----------------|
| Dashboard | Payment, Enrollment, LessonProgress, Lesson |
| Students | User, Enrollment |
| Student Detail | User, Enrollment, Payment, LessonProgress |
| Lessons | Lesson, Section, LessonResource, VideoUpload |
| Media | VideoUpload, Lesson |
| Pricing | CoursePackage, Coupon |
| Orders | Payment, User |
| Tickets | SupportTicket, TicketMessage, User |
| Notifications | NotificationTemplate |
| Audit | AuditLog, AdminAuditLog |
| Settings | CourseSettings |

| `/admin/security/logs` | `pages/admin/SecurityLogs.tsx` | Auth attempt event log |
| `/admin/security` | `pages/admin/Security.tsx` | Ban management + whitelist |

## Security Logs Page

Shows attempt timeline, filters, and pagination for auth security events.

## Security Management Page

Shows security KPIs, active bans, manual ban actions, and IP whitelist management.
