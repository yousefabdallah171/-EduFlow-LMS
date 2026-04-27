# EduFlow LMS — Video Security

> **Update rule:** Any time you change token TTL, risk scoring, HLS config, or download prevention, update this doc.

---

## Overview

Video content is protected by a multi-layer system:
1. **Short-lived JWT tokens** — all HLS requests require a fresh token
2. **IP + User-Agent risk scoring** — suspect requests are blocked
3. **AES-128 HLS encryption** — stream is encrypted at rest and in transit
4. **Concurrency enforcement** — only one stream per session
5. **Client-side download prevention** — controls disabled on video element

---

## Token Lifecycle

### Authenticated Users (Enrolled Students)

| Property | Value |
|----------|-------|
| Type | JWT signed with `VIDEO_TOKEN_SECRET` |
| TTL | **5 minutes** (300s) |
| Redis cache TTL | 330s (5:30 — 30s buffer) |
| Payload | `{ userId, lessonId, sessionId }` |
| Storage | SHA-256 hash in `VideoToken` DB table + Redis |

### Preview Users (Not Enrolled)

| Property | Value |
|----------|-------|
| Type | JWT signed with `VIDEO_TOKEN_SECRET` |
| TTL | **15 minutes** (900s) |
| Redis cache TTL | 930s (15:30 — 30s buffer) |
| Payload | `{ lessonId, previewSessionId, isPreview: true }` |
| Storage | Redis only (not persisted in DB) |

### Token Refresh

Frontend (`VideoPlayer.tsx`) fires `onTokenExpired` callback **1 minute before expiry**.  
Player pauses, calls `POST /api/v1/lessons/:id/detail/refresh-token`, resumes from saved position.

---

## HLS Playlist Rewriting

When a student requests a playlist, the backend rewrites every segment URL to inject the token:

```
# Original (on disk)
segment-000.ts
segment-001.ts

# Rewritten in response
/api/v1/video/{lessonId}/segment?file=segment-000.ts&token={encodedToken}
/api/v1/video/{lessonId}/segment?file=segment-001.ts&token={encodedToken}

# Encryption key URL rewritten to
/api/v1/video/{lessonId}/key?token={encodedToken}
```

This means:
- No segment URL can be used without a valid fresh token
- Tokens are per-session, per-user — sharing a URL doesn't work

---

## AES-128 Encryption

HLS streams are encrypted with **AES-128** before storage.  
Encryption key served at `/api/v1/video/:id/key?token=...`.  
Without a valid token, the key endpoint returns 401 — stream cannot be decrypted.

---

## Risk Scoring

Every token validation computes a risk score:

| Signal | Points Added |
|--------|-------------|
| User-Agent changed since token was issued | +2 |
| User-Agent is missing | +1 |
| IP address changed since token was issued | +1 |
| IP address is missing | +1 |

**Thresholds:**
- Score **≥ 2** → request **REJECTED** (401), `VIDEO_TOKEN_REJECTED_RISK` event logged with severity `HIGH`
- Score **< 2** → request allowed, warning logged if score > 0

IP changes are allowed a small tolerance for mobile users / proxies (score 1 < threshold 2).  
UA changes are treated more strictly (score 2 = immediate rejection).

---

## Access Control Checks (before serving any video)

All enforced in `backend/src/controllers/lesson.controller.ts`:

1. ✅ Valid video token (signature + expiry)
2. ✅ Enrollment status = `ACTIVE` (not revoked, not expired)
3. ✅ Lesson `isPublished = true`
4. ✅ Drip-feed: `enrolledAt + dripDays * 86400s <= now` (lesson not yet released)
5. ✅ Session is still active (`sessionId` matches Redis active session)
6. ✅ Concurrency: `videoAbuseService.enforceConcurrency()` — only 1 active stream per session

---

## Rate Limits on Video Endpoints

| Endpoint | Window | Limit (authenticated) | Limit (preview) |
|----------|--------|----------------------|----------------|
| Playlist (`playlist.m3u8`) | — | 30 req/window | 10 req/window |
| Key (`/key`) | — | 30 req/window | 10 req/window |
| Segment (`/segment`) | — | 600 req/window | 200 req/window |

All keyed by `sessionId`.

---

## Response Headers for Video Endpoints

```
Cache-Control:                private, no-store, max-age=0
Pragma:                       no-cache
Expires:                      0
X-Content-Type-Options:       nosniff
Cross-Origin-Resource-Policy: same-origin
```

Prevents CDN or browser caching of video content.

---

## Path Traversal Prevention

Segment filename validated before reading from disk:

1. **Allowlist regex:**
   ```
   /^(segment-\d{3}(\.ts|\.m4s)|segment\.aac|enc\.key|init\.mp4|[a-zA-Z0-9_-]+\.m3u8)$/
   ```
2. **Max filename length:** 255 chars
3. **`isWithinDir()` check:** Resolved path must start with `baseVideoDir + path.sep`
4. **`fs.realpath()`:** Resolves all symlinks, then verifies real path is within base dir

---

## Client-Side Download Prevention

`frontend/src/components/shared/VideoPlayer.tsx`:

```html
<video
  controlsList="nodownload"
  disablePictureInPicture
  onContextMenu={e => e.preventDefault()}
  /* noremoteplayback disabled */
>
```

HLS.js configured with `withCredentials: true` so segment requests include the session cookie.

**Watermark overlay:**
- User's **full name** displayed
- **Masked email** (`us***@example.com`)
- Rendered as a DOM overlay (not embedded in video stream)

Note: Client-side measures can be bypassed by determined users. The primary protection is server-side token + AES encryption.

---

## VideoPlayer Features (`frontend/src/components/shared/VideoPlayer.tsx`)

- **Player:** Native HTML5 `<video>` + HLS.js 1.6.2
- **Progress reporting:** Every 5 seconds sends `{ watchTimeSeconds, lastPositionSeconds }` to backend
- **Completion threshold:** 90% of `durationSeconds` watched = lesson marked complete
- **Position resumption:** On token refresh, video resumes from `lastPositionSeconds`
- **Demo video:** Non-enrolled visitors see `/demo-video.m3u8` (no token required)
- **Token expiry:** `onTokenExpired` fires 60 seconds before expiry for seamless refresh

---

## Security Event Logging

All video security events written to `VideoSecurityEvent` table:

| Event Type | Severity | Trigger |
|-----------|----------|---------|
| `VIDEO_TOKEN_REJECTED_RISK` | HIGH | Risk score ≥ 2 |
| `VIDEO_TOKEN_EXPIRED` | MEDIUM | Token past expiry |
| `VIDEO_CONCURRENT_STREAM` | HIGH | Concurrency limit hit |
| `VIDEO_INVALID_TOKEN` | HIGH | Bad signature |
| `VIDEO_ENROLLMENT_REQUIRED` | LOW | Non-enrolled access attempt |

Indexed by `userId`, `lessonId`, `sessionId`, `eventType`, `createdAt`.
