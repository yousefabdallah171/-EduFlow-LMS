# Data Model: EduFlow — Student Course Platform

**Phase**: 1 — Design
**Date**: 2026-04-12
**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Research**: [research.md](research.md)

---

## Entity Overview

```
users ──────────────────────────────────────────────────────────┐
  │                                                             │
  ├── enrollments (1:many) ─── payments (1:1, optional)        │
  │                                                             │
  ├── refresh_tokens (1:many)                                   │
  │                                                             │
  ├── lesson_progress (1:many) ──── lessons (many:1)           │
  │                                                             │
  └── video_tokens (1:many) ──────── lessons (many:1)          │
                                                                │
lessons ──────── video_uploads (1:many)                        │
                                                                │
coupons ──────── payments (1:many, optional)                   │
                                                                │
course_settings (singleton — single course config)             │
```

---

## Tables

### `users`

Core user account. Two roles: `ADMIN` and `STUDENT`.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK, default `gen_random_uuid()` | |
| `email` | `VARCHAR(255)` | UNIQUE, NOT NULL | Indexed |
| `password_hash` | `VARCHAR(255)` | NULLABLE | NULL for OAuth-only accounts |
| `full_name` | `VARCHAR(255)` | NOT NULL | |
| `avatar_url` | `TEXT` | NULLABLE | URL to profile image |
| `role` | `ENUM('ADMIN','STUDENT')` | NOT NULL, default `'STUDENT'` | |
| `locale` | `ENUM('en','ar')` | NOT NULL, default `'en'` | |
| `theme` | `ENUM('light','dark')` | NOT NULL, default `'light'` | |
| `oauth_provider` | `ENUM('email','google')` | NOT NULL, default `'email'` | |
| `oauth_id` | `VARCHAR(255)` | NULLABLE, UNIQUE | Google sub ID |
| `email_verified` | `BOOLEAN` | NOT NULL, default `false` | |
| `email_verify_token` | `VARCHAR(255)` | NULLABLE | 1-hour expiry token |
| `email_verify_expires` | `TIMESTAMPTZ` | NULLABLE | |
| `password_reset_token` | `VARCHAR(255)` | NULLABLE | 1-hour expiry token |
| `password_reset_expires` | `TIMESTAMPTZ` | NULLABLE | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |

**Indexes**: `email` (unique), `oauth_id` (unique sparse), `role` (for admin queries)

**Validation rules**:
- `email`: valid RFC 5321 format, lowercase normalized on write
- `password_hash`: bcrypt hash at cost ≥ 12
- `full_name`: 1–100 characters, trimmed

---

### `refresh_tokens`

Single-use rotating refresh tokens with family-based revocation for token reuse detection.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `user_id` | `UUID` | FK → users.id, ON DELETE CASCADE | Indexed |
| `token_hash` | `VARCHAR(255)` | UNIQUE, NOT NULL | SHA-256 hash of raw token |
| `family_id` | `UUID` | NOT NULL | Groups tokens for reuse detection |
| `expires_at` | `TIMESTAMPTZ` | NOT NULL | 7 days from issuance |
| `revoked_at` | `TIMESTAMPTZ` | NULLABLE | NULL = active |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |

**Indexes**: `token_hash` (unique lookup), `family_id` (for family revocation), `user_id`

**State transitions**:
- Active: `revoked_at IS NULL AND expires_at > now()`
- Rotated: `revoked_at IS NOT NULL` (used once, replaced by new token in same family)
- Compromised: entire family revoked when a revoked token is presented

---

### `enrollments`

Student's access record for the single course.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `user_id` | `UUID` | FK → users.id, UNIQUE, ON DELETE CASCADE | One enrollment per student |
| `status` | `ENUM('ACTIVE','REVOKED','EXPIRED')` | NOT NULL, default `'ACTIVE'` | |
| `enrollment_type` | `ENUM('PAID','ADMIN_ENROLLED')` | NOT NULL | |
| `payment_id` | `UUID` | FK → payments.id, NULLABLE | NULL for ADMIN_ENROLLED |
| `enrolled_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |
| `revoked_at` | `TIMESTAMPTZ` | NULLABLE | Set when admin revokes |
| `revoked_by` | `UUID` | FK → users.id, NULLABLE | Admin user ID |

**Indexes**: `user_id` (unique), `status` (for active enrollments query)

**Business rules**:
- A student can only have ONE enrollment record (UNIQUE on `user_id`)
- Re-enrollment after revocation: update existing record (status → ACTIVE, update type + payment_id)
- `payment_id` MUST be set when `enrollment_type = 'PAID'`

---

### `payments`

Paymob transaction records. Created on checkout initiation, updated on webhook.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | Sent to Paymob as `merchant_order_id` |
| `user_id` | `UUID` | FK → users.id, ON DELETE RESTRICT | |
| `amount_piasters` | `INTEGER` | NOT NULL | Amount in smallest currency unit (piasters for EGP) |
| `currency` | `VARCHAR(3)` | NOT NULL, default `'EGP'` | |
| `paymob_order_id` | `VARCHAR(255)` | NULLABLE | Set after order creation |
| `paymob_transaction_id` | `VARCHAR(255)` | NULLABLE, UNIQUE | Set on webhook |
| `coupon_id` | `UUID` | FK → coupons.id, NULLABLE | If coupon applied |
| `discount_piasters` | `INTEGER` | NOT NULL, default `0` | Discount amount |
| `status` | `ENUM('PENDING','COMPLETED','FAILED','REFUNDED')` | NOT NULL, default `'PENDING'` | |
| `webhook_received_at` | `TIMESTAMPTZ` | NULLABLE | |
| `webhook_hmac` | `VARCHAR(255)` | NULLABLE | Stored for audit trail |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |

**Indexes**: `user_id`, `status`, `paymob_transaction_id` (unique)

**Business rules**:
- `status` transitions: `PENDING → COMPLETED` (on valid webhook) or `PENDING → FAILED`
- Only `COMPLETED` payments trigger enrollment
- Duplicate webhook protection: check `paymob_transaction_id` uniqueness before processing

---

### `coupons`

Discount codes for course purchase.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `code` | `VARCHAR(50)` | UNIQUE, NOT NULL | Uppercase normalized |
| `discount_type` | `ENUM('PERCENTAGE','FIXED')` | NOT NULL | |
| `discount_value` | `NUMERIC(10,2)` | NOT NULL | % for PERCENTAGE, piasters for FIXED |
| `max_uses` | `INTEGER` | NULLABLE | NULL = unlimited |
| `uses_count` | `INTEGER` | NOT NULL, default `0` | Incremented on use |
| `expiry_date` | `TIMESTAMPTZ` | NULLABLE | NULL = never expires |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |
| `deleted_at` | `TIMESTAMPTZ` | NULLABLE | Soft delete |

**Indexes**: `code` (unique), `deleted_at` (for active coupon filter)

**Validation rules**:
- `discount_value`: 1–100 for PERCENTAGE; > 0 for FIXED
- `max_uses`: NULL or positive integer
- `uses_count < max_uses` must hold when applying (with row-level lock to prevent race conditions)

---

### `lessons`

Course content units, each with an associated HLS video.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `title_en` | `VARCHAR(255)` | NOT NULL | English title |
| `title_ar` | `VARCHAR(255)` | NOT NULL | Arabic title |
| `description_en` | `TEXT` | NULLABLE | |
| `description_ar` | `TEXT` | NULLABLE | |
| `video_hls_path` | `TEXT` | NULLABLE | Relative path to `.m3u8` file; NULL before processing |
| `video_status` | `ENUM('NONE','PROCESSING','READY','ERROR')` | NOT NULL, default `'NONE'` | |
| `duration_seconds` | `INTEGER` | NULLABLE | Set after video processing |
| `sort_order` | `INTEGER` | NOT NULL, default `0` | Display order |
| `is_published` | `BOOLEAN` | NOT NULL, default `false` | Students can only access published lessons |
| `drip_days` | `INTEGER` | NULLABLE | Days after enrollment before lesson unlocks; NULL = immediate |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |

**Indexes**: `sort_order`, `is_published`

**Business rules**:
- Students can only access lessons where `is_published = true` AND enrollment is `ACTIVE`
- Drip: `lesson.drip_days IS NULL OR enrollment.enrolled_at + interval '${drip_days} days' <= now()`

---

### `lesson_progress`

Tracks individual student progress per lesson.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `user_id` | `UUID` | FK → users.id, ON DELETE CASCADE | |
| `lesson_id` | `UUID` | FK → lessons.id, ON DELETE CASCADE | |
| `completed_at` | `TIMESTAMPTZ` | NULLABLE | NULL = in progress |
| `watch_time_seconds` | `INTEGER` | NOT NULL, default `0` | Cumulative watch time |
| `last_position_seconds` | `INTEGER` | NOT NULL, default `0` | Last playback position for resume |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |

**Constraints**: UNIQUE(`user_id`, `lesson_id`)

**Indexes**: `user_id`, `lesson_id`, `(user_id, lesson_id)` composite

**Business rules**:
- A lesson is "completed" when `watch_time_seconds >= lesson.duration_seconds * 0.9` (90% watched)
  OR when explicitly marked complete by student
- Course completion % = `COUNT(completed_at IS NOT NULL) / COUNT(*) * 100` across all published lessons
- `last_position_seconds` enables video resume-from-position on page revisit

---

### `video_tokens`

Short-lived signed tokens authorizing HLS segment access for a specific student+lesson.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `user_id` | `UUID` | FK → users.id, ON DELETE CASCADE | |
| `lesson_id` | `UUID` | FK → lessons.id, ON DELETE CASCADE | |
| `token_hash` | `VARCHAR(255)` | UNIQUE, NOT NULL | SHA-256 of raw JWT |
| `session_id` | `UUID` | NOT NULL | Links to refresh token family (for revocation) |
| `expires_at` | `TIMESTAMPTZ` | NOT NULL | 30 minutes from issuance |
| `revoked_at` | `TIMESTAMPTZ` | NULLABLE | Set on logout or session invalidation |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |

**Indexes**: `token_hash` (unique), `(user_id, lesson_id)`, `session_id` (for bulk revocation on logout)

**Business rules**:
- One active token per student per lesson (revoke previous on new issuance)
- On logout: `UPDATE video_tokens SET revoked_at = now() WHERE user_id = $1 AND session_id = $2`
- Validation: token not expired AND not revoked AND enrollment still ACTIVE

---

### `video_uploads`

tus upload session tracking.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | Used as tus upload ID |
| `lesson_id` | `UUID` | FK → lessons.id, NULLABLE | NULL until admin links to lesson |
| `uploaded_by` | `UUID` | FK → users.id, NOT NULL | Must be ADMIN |
| `filename` | `VARCHAR(255)` | NOT NULL | Original filename from tus metadata |
| `size_bytes` | `BIGINT` | NOT NULL | Total file size |
| `offset_bytes` | `BIGINT` | NOT NULL, default `0` | tus upload offset |
| `status` | `ENUM('UPLOADING','COMPLETE','PROCESSING','READY','CANCELLED','ERROR')` | NOT NULL, default `'UPLOADING'` | |
| `storage_path` | `TEXT` | NULLABLE | Final path after processing |
| `error_message` | `TEXT` | NULLABLE | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |
| `completed_at` | `TIMESTAMPTZ` | NULLABLE | |

**Indexes**: `lesson_id`, `uploaded_by`, `status`

---

### `course_settings`

Singleton table (enforced by CHECK or application logic) for global course configuration.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `INTEGER` | PK, default `1`, CHECK(`id = 1`) | Enforces singleton |
| `title_en` | `VARCHAR(255)` | NOT NULL | |
| `title_ar` | `VARCHAR(255)` | NOT NULL | |
| `description_en` | `TEXT` | NULLABLE | |
| `description_ar` | `TEXT` | NULLABLE | |
| `price_piasters` | `INTEGER` | NOT NULL | Course price in piasters |
| `currency` | `VARCHAR(3)` | NOT NULL, default `'EGP'` | |
| `is_enrollment_open` | `BOOLEAN` | NOT NULL, default `true` | Admin can close enrollment |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |
| `updated_by` | `UUID` | FK → users.id | |

---

## State Transitions

### Enrollment Status

```
[none] ──→ ACTIVE   (via Paymob webhook or admin manual enrollment)
ACTIVE ──→ REVOKED  (admin revokes access)
REVOKED ──→ ACTIVE  (admin re-enrolls)
ACTIVE ──→ EXPIRED  (future: enrollment expiry feature)
```

### Payment Status

```
PENDING ──→ COMPLETED  (valid HMAC webhook with success=true)
PENDING ──→ FAILED     (webhook with success=false OR timeout)
COMPLETED ──→ REFUNDED (future: admin initiates refund)
```

### Video Upload / Lesson Video Status

```
NONE ──→ UPLOADING  (tus session created)
UPLOADING ──→ COMPLETE  (tus all chunks received)
COMPLETE ──→ PROCESSING (FFmpeg job started)
PROCESSING ──→ READY    (FFmpeg complete, HLS segments available)
PROCESSING ──→ ERROR    (FFmpeg failed)
UPLOADING ──→ CANCELLED (admin cancels)
```

---

## Prisma Schema (abbreviated)

```prisma
// Key relations shown — full schema in backend/prisma/schema.prisma

model User {
  id            String       @id @default(uuid())
  email         String       @unique
  role          Role         @default(STUDENT)
  enrollments   Enrollment[]
  payments      Payment[]
  refreshTokens RefreshToken[]
  progress      LessonProgress[]
  videoTokens   VideoToken[]
}

model Enrollment {
  id             String         @id @default(uuid())
  user           User           @relation(fields: [userId], references: [id])
  userId         String         @unique
  status         EnrollStatus   @default(ACTIVE)
  enrollmentType EnrollType
  payment        Payment?       @relation(fields: [paymentId], references: [id])
  paymentId      String?
}

model Payment {
  id                  String        @id @default(uuid())
  user                User          @relation(fields: [userId], references: [id])
  userId              String
  coupon              Coupon?       @relation(fields: [couponId], references: [id])
  couponId            String?
  status              PaymentStatus @default(PENDING)
  paymobTransactionId String?       @unique
}

model Lesson {
  id          String          @id @default(uuid())
  titleEn     String
  titleAr     String
  videoStatus VideoStatus     @default(NONE)
  sortOrder   Int             @default(0)
  progress    LessonProgress[]
  videoTokens VideoToken[]
  uploads     VideoUpload[]
}
```

---

## Redis Key Patterns

| Key Pattern | TTL | Purpose |
|-------------|-----|---------|
| `session:{userId}:{sessionId}` | 7 days | Active refresh token session marker (for fast revocation check) |
| `enrollment:{userId}` | 5 min | Cached enrollment status (ACTIVE/REVOKED/none) |
| `video-token:{tokenHash}` | 30 min | Video token validation cache |
| `student-search:{queryHash}` | 5 min | Admin student search result cache |
| `analytics:kpis` | 60 min | Cached analytics KPIs |
| `tus-upload:{uploadId}` | 7 days | tus upload state (offset, metadata) |
