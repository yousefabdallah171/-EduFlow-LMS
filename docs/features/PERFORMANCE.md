# EduFlow LMS — Performance

> **Update rule:** Any time you add/change a cache key, TTL, DB index, or bundle chunk, update this doc.

---

## Caching Architecture (3 layers)

```
Request
  └─► React Query (client, 1–30 min)
        └─► Redis (server, 1 min – 2 hours)
              └─► PostgreSQL (with 50+ indexes)
```

---

## Redis Cache Keys & TTLs

All TTLs are configurable via env vars (see `backend/src/config/env.ts`).

| Key Pattern | Default TTL | Env Var | What's Cached |
|-------------|------------|---------|--------------|
| `student:dashboard:{userId}` | 300s (5 min) | `CACHE_TTL_DASHBOARD_SECONDS` | Full dashboard payload |
| `enrollment:status:{userId}:{courseId}` | 120s (2 min) | `CACHE_TTL_ENROLLMENT_SECONDS` | Enrollment status |
| `lesson:metadata:{lessonId}` | 7200s (2 hr) | `CACHE_TTL_LESSON_METADATA_SECONDS` | Single lesson detail |
| `lessons:published:v1` | 7200s (2 hr) | `CACHE_TTL_LESSON_METADATA_SECONDS` | All published lessons |
| `lessons:published-grouped:v1` | 7200s (2 hr) | `CACHE_TTL_LESSON_METADATA_SECONDS` | Lessons grouped by section |
| `lessons:admin:v1` | 7200s (2 hr) | — | Admin lesson list |
| `lesson:published-count` | 7200s (2 hr) | `CACHE_TTL_PUBLISHED_LESSON_COUNT_SECONDS` | Lesson count for admin header |
| `student:notes:{userId}` | 600s (10 min) | — | User notes list |
| `student:progress:{userId}` | 300s (5 min) | — | User lesson progress |
| `student:payments:{userId}` | 3600s (1 hr) | `CACHE_TTL_PAYMENTS_SECONDS` | Payment history |
| `video-token:{tokenHash}` | 330s (5:30 min) | `CACHE_TTL_VIDEO_TOKEN_SECONDS` | Video token validity |
| `video-token-ctx:{tokenHash}` | 330s | — | Token IP/UA security context |
| `video-preview:{previewSessionId}` | 930s (15:30 min) | `CACHE_TTL_VIDEO_PREVIEW_SECONDS` | Preview session |
| `course:settings:v1` | 7200s (2 hr) | — | Course settings/pricing |
| `course:packages:v1` | 3600s (1 hr) | — | Course package list |
| `course:public:v1` | 60s | — | Public course page |
| `coupon:valid:{code}` | 3600s valid / 300s invalid | — | Coupon validation (negative caching) |
| `analytics:{period}` | 3600s (1 hr) | — | Admin KPIs (7d/30d/90d/all) |
| `session:{userId}:{sessionId}` | 30 days | — | Active session tracking |
| `uploadState:{uploadId}` | 7 days | — | Resumable upload state |

**Write patterns used:**
- `SET key value EX ttl` — standard write with expiry
- `SET key value EX ttl NX` — write only if not exists (prevents cache stampede, used for dashboard)
- `DEL key1 key2 ...` — explicit invalidation on mutation

All Redis errors are caught silently — a Redis miss falls through to the DB without breaking the request.

---

## React Query (Frontend)

Config: `frontend/src/lib/query-config.ts`

```typescript
CACHE_TIME = {
  SHORT:  60_000,       // 1 minute
  MEDIUM: 300_000,      // 5 minutes
  LONG:   1_800_000,    // 30 minutes
  NEVER:  Infinity,     // No auto-invalidation
}

// GC time is always 2× staleTime
getGCTime(staleTime) => staleTime === Infinity ? Infinity : staleTime * 2
```

**Global defaults:**
```typescript
refetchOnWindowFocus: false   // No refetch on tab focus
refetchOnReconnect:   true    // Refetch on internet reconnect
refetchOnMount:       false   // No refetch if data is still fresh
retry:                1       // Single retry with exponential backoff
```

**`useQueryWithCache` hook** (`frontend/src/hooks/useQueryWithCache.ts`):  
Factory wrapping `useQuery` that auto-computes `gcTime = staleTime × 2`. All data fetching in the app uses this hook.

---

## Database Indexes

All defined in `backend/prisma/schema.prisma`:

**User / Auth:**
- `RefreshToken`: `[userId, sessionId]`, `[userId, revokedAt]`, `[familyId]`, `[expiresAt]`

**Enrollment:**
- `Enrollment`: `[status]`, `[enrolledAt]`, `[revokedAt]`

**Payment (most indexed — high query volume):**
- `Payment`: `[userId]`, `[status]`, `[createdAt]`, `[userId, createdAt]`, `[status, createdAt]`, `[paymobOrderId]`, `[paymobTransactionId]`, `[paymobIdempotencyKey]`, `[refundStatus]`, `[paymobRefundId]`

**Queue Tables:**
- `RefundQueue`: `[paymentId]`, `[nextRetry]`, `[resolution]`
- `PaymentEvent`: `[paymentId]`, `[paymentId, createdAt]`, `[eventType]`, `[eventType, createdAt]`, `[createdAt]`
- `FailedPaymentQueue`: `[resolvedAt]`, `[nextRetry]`, `[failureType]`
- `EmailQueue`: `[status]`, `[nextRetry]`, `[paymentId]`, `[status, createdAt]`
- `WebhookRetryQueue`: `[nextRetry]`, `[resolvedAt]`
- `AdminAuditLog`: `[adminId]`, `[paymentId]`, `[createdAt]`, `[action, createdAt]`

**Content:**
- `CoursePackage`: `[isActive, sortOrder]`
- `Section`: `[sortOrder]`
- `Lesson`: `[isPublished, sortOrder]`, `[sectionId, isPublished, sortOrder]`, `[isPreview, isPublished]`
- `LessonProgress`: UNIQUE `[userId, lessonId]`, `[lessonId]`
- `VideoToken`: `[sessionId]`, `[userId, sessionId]`, `[lessonId, expiresAt]`, `[expiresAt]`
- `VideoSecurityEvent`: `[createdAt]`, `[eventType]`, `[userId]`, `[sessionId]`, `[lessonId]`
- `Note`: `[userId, lessonId]`

---

## N+1 Query Prevention

**Lessons grouped by section** — single query with nested select:
```typescript
prisma.section.findMany({
  select: {
    id, titleEn, titleAr, sortOrder,
    lessons: { where: { isPublished: true }, select: { ... } }
  }
})
```

**Dashboard** — 3 parallel queries with `Promise.all`:
```typescript
const [enrollment, lessons, progress] = await Promise.all([
  prisma.enrollment.findUnique(...),
  prisma.lesson.findMany({ select: { id, ... } }),  // SELECT only needed fields
  prisma.lessonProgress.findMany(...)
])
```

**Public course page** — 3 parallel queries:
```typescript
const [settings, lessons, packages] = await Promise.all([
  courseService.getCourseSettingsCached(),
  prisma.lesson.findMany({ select: { id, titleEn, titleAr, durationSeconds, sortOrder } }),
  courseService.getCoursePackagesCached()
])
```

---

## Frontend Bundle Strategy

Config: `frontend/vite.config.ts`

Manual chunks:
```
react   → react, react-dom, react-router-dom
query   → @tanstack/react-query, axios, zustand
i18n    → i18next, react-i18next, i18next-browser-languagedetector
ui      → @headlessui/react, @floating-ui/react, lucide-react
hls     → hls.js
```

Chunk size warning threshold: **600KB**.

---

## Service Worker & Offline

`frontend/src/service-worker.ts` — registered in **production only**.  
On network failure, `frontend/public/offline.html` is shown.  
Strategy: cache-first for static assets; network-first for API.

---

## Fonts (Performance)

`frontend/index.html` uses `<link rel="preconnect">` to Google Fonts for faster DNS resolution.  
Fonts loaded: Cairo, Noto Kufi Arabic (Arabic), JetBrains Mono, Manrope, Sora.  
Invisible `impeccable-font-probe` element pre-renders fonts to prevent FOIT (Flash of Invisible Text).

---

## Prometheus Performance Metrics

Collected by `backend/src/services/metrics.service.ts`:

| Metric | Type | Buckets (ms) |
|--------|------|-------------|
| `http_request_duration_ms` | Histogram | 25, 50, 100, 200, 300, 500, 800, 1200, 2000, 5000 |
| `eduflow_payment_processing_time_ms` | Histogram | 100, 500, 1000, 2000, 5000, 10000 |
| `eduflow_db_query_time_ms` | Histogram | 1, 5, 10, 25, 50, 100, 250, 500 |
| `eduflow_paymob_api_request_time_ms` | Histogram | 100, 250, 500, 1000, 2000, 5000 |
| `redis_cache_hits_total` | Counter | — |
| `redis_cache_misses_total` | Counter | — |

Enable metrics: set `PROMETHEUS_METRICS_ENABLED=true` in env.  
Endpoint: `GET /metrics` (optional Bearer token auth with `PROMETHEUS_METRICS_TOKEN`).

---

## SLAs (from load testing)

| Metric | Target | Measured |
|--------|--------|---------|
| Checkout P95 latency | < 2s | 1.8s |
| Webhook P95 latency | < 500ms | 380ms |
| Dashboard load | < 500ms | — |
| Uptime | 99.9% | 99.95% |
| Concurrent users | 50+ | 100+ |
