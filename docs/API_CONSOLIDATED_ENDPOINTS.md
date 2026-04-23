# EduFlow LMS — Consolidated Endpoints (Phase 3)

This document describes the Phase 3 “consolidated” API endpoints designed to reduce frontend round-trips and prevent request stampedes.

## Student

### GET `/api/v1/student/dashboard`

Returns a consolidated student dashboard payload.

- Auth: Student (`STUDENT`)
- Cache: Redis (`student:dashboard:{userId}` via `dashboardService`, TTL 5 minutes)
- Deduplication: in-flight request dedupe (same user + endpoint)

Response includes the legacy fields used by the current UI:

- `lastLessonId`
- `completionPercent`
- `enrolled`
- `status`
- `enrolledAt`

And adds consolidated fields:

- `user`
- `course`
- `enrollments`
- `progress`
- `stats`

### GET `/api/v1/student/dashboard/summary`

Legacy summary-only dashboard payload (kept for backward compatibility).

## Lessons

### GET `/api/v1/lessons/:id/detail`

Consolidated lesson detail + playback payload.

- Auth: Student (`STUDENT`)
- Includes: video token + HLS URL, lesson metadata, resources, progress, notes, enrollment status
- Deduplication: in-flight request dedupe (same user + lesson)

### GET `/api/v1/lessons/:id`

Legacy lesson playback endpoint.

- Response includes header `Deprecation: true`
- Use `/api/v1/lessons/:id/detail` instead.

## Admin

### GET `/api/v1/admin/dashboard`

Consolidated admin dashboard payload (KPIs + charts + recent enrollments).

- Auth: Admin (`ADMIN`)
- Deduplication: in-flight request dedupe

### GET `/api/v1/admin/analytics/course/:courseId`

Course analytics endpoint (currently backed by global KPI calculations).

- Auth: Admin (`ADMIN`)
- Deduplication: in-flight request dedupe

## Request deduplication

These endpoints use an in-flight request deduplication middleware to prevent “stampedes” when many identical requests arrive concurrently.

- Keyed by user + route (and lesson id where applicable)
- Only applies to `GET` requests
- Replays captured responses to concurrent callers

