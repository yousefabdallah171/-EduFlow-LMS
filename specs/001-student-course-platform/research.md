# Research: EduFlow — Student Course Platform

**Phase**: 0 — Research & Decision Log
**Date**: 2026-04-12
**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

---

## 1. Paymob Payment Integration

**Decision**: Use Paymob Accept API (hosted payment page flow) with HMAC-SHA512 webhook validation.

**Rationale**:
Paymob's standard integration for e-commerce in the MENA region uses a three-step flow:
1. Authenticate → obtain API token
2. Create order → obtain `order_id`
3. Obtain payment key → redirect student to Paymob-hosted checkout iframe or page

Webhooks (transaction callbacks) deliver `HMAC_secret` in the payload. Validation is performed by
concatenating specific fields in a defined order and comparing against `HMAC_SHA512(secret, concatenated)`.
The HMAC secret is configured in the Paymob merchant dashboard.

**Enrollment trigger**: Webhook with `success: true` AND `obj.order.merchant_order_id` matching EduFlow's
internal `payment.id`. HMAC validated server-side before any DB write.

**Retry strategy**: Paymob retries webhooks up to 3 times on 5xx responses. EduFlow should return `200 OK`
immediately after HMAC validation (even if enrollment is queued async) to avoid duplicate retries.

**Alternatives considered**:
- Stripe: Not available in Egypt/MENA for direct card processing.
- Fawry: Limited API docs; Paymob is preferred for the target market.

---

## 2. tus Resumable Upload Protocol

**Decision**: Use `@tus-io/server` (Node.js) on the backend with `tus-js-client` on the frontend.

**Rationale**:
The tus open protocol defines a standard for resumable uploads over HTTP. The server exposes:
- `POST /api/v1/admin/uploads` — create upload (returns `Location` header with upload URL)
- `PATCH /api/v1/admin/uploads/:id` — send chunk (Content-Range based)
- `HEAD /api/v1/admin/uploads/:id` — query current offset for resume

`@tus-io/server` integrates with Express via `server.handle(req, res)`. Upload state (offset, total size,
metadata) is persisted in Redis so uploads survive server restarts and can be resumed from any node in a
multi-server deployment.

Upload metadata carries: `lessonId`, `filename`, `contentType`, `userId`. After upload completion, a
background job (or synchronous callback) moves the raw video to the HLS processing pipeline.

**Frontend**: `tus-js-client` provides `Upload` class with `onProgress`, `onSuccess`, `onError` hooks.
The shadcn/ui `Progress` bar receives real-time percentage updates via `onProgress`.

**Alternatives considered**:
- AWS S3 multipart upload: Good for cloud-native but adds AWS dependency and vendor lock-in; tus is
  protocol-agnostic and self-hostable.
- Custom chunked upload: Reinventing tus; rejected per constitution principle I (no unnecessary complexity).

---

## 3. HLS Signed URL Pattern

**Decision**: HMAC-SHA256 signed tokens embedded in HLS playlist URL query parameters. Token encodes
`userId`, `lessonId`, `expiresAt`, signed with a server-side secret.

**Rationale**:
HLS delivery works as:
1. Student requests video → backend generates signed token (15–30 min TTL)
2. Token embedded in `.m3u8` playlist URL as `?token=<signed_jwt>`
3. CDN/server validates token on every `.m3u8` and `.ts` segment request
4. On token expiry or session invalidation (logout), all segment requests return `401`

Token payload: `{ userId, lessonId, sessionId, iat, exp }`, signed with `HS256`. Token stored in Redis
(keyed by `sessionId`) for server-side revocation on logout.

**Segment-level protection**: If using a CDN (e.g., Cloudflare), signed URLs can be enforced at the
CDN edge. For self-hosted, an Express middleware intercepts all `.m3u8`/`.ts` requests and validates.

**Alternatives considered**:
- URL-per-segment signing: More secure but generates thousands of signed URLs per video; latency
  prohibitive for HLS segments (~10s chunks).
- Cookie-based auth for CDN: CDN cookie support is vendor-specific; signed URL tokens are universal.

---

## 4. Video Watermarking

**Decision**: Client-side CSS/canvas overlay rendered on top of the `hls.js` video player.

**Rationale**:
Server-side watermarking (burning text into video frames) requires re-encoding per student — computationally
expensive and not feasible for a small platform. Client-side overlay is the pragmatic choice:
- A semi-transparent `<div>` positioned over the video element displays `{fullName} | j***@example.com`
- Position changes every 30–60 seconds (moves diagonally) to prevent simple crop-based removal
- Color adapts to video brightness (light text + dark shadow, or inverse) for readability

**Traceability**: The watermark text is rendered from the authenticated user's session data, fetched
server-side with the video token. If a screen recording leaks, the visible name/email identifies the source.

**Alternatives considered**:
- FFmpeg server-side burn-in: Requires per-student video encoding; impractical at this scale.
- HLS manifest manipulation (invisible metadata): Not visible in screen recordings; does not meet the
  traceability requirement.

---

## 5. JWT Refresh Token Rotation

**Decision**: Access token (15 min, in-memory/JS variable) + Refresh token (7 days, httpOnly Secure cookie)
with single-use rotation. Refresh token family tracking to detect token reuse attacks.

**Rationale**:
- Access token is stored in JS memory (not localStorage, not a cookie). Sent as `Authorization: Bearer`
  header on API requests. Lost on page refresh → user calls `/auth/refresh` on load.
- Refresh token is stored in httpOnly cookie, preventing XSS-based theft.
- On `/auth/refresh`: old refresh token is invalidated, a new one issued. The old token's `family_id` is
  retained. If a previously used token is presented (reuse attack), the entire family is revoked.
- Session invalidation on logout: refresh token deleted from DB and cookie cleared.
- Video tokens are also invalidated on logout via Redis key deletion.

**Token family tracking**: Each refresh token has a `family_id` (UUID). On rotation, old token is marked
`revoked`; new token inherits same `family_id`. If `revoked` token is presented → revoke all tokens
with same `family_id` (stolen token scenario).

**Alternatives considered**:
- Long-lived access tokens: Insecure; if intercepted, attacker has prolonged access.
- Session cookies (server-side sessions): Simpler but doesn't scale horizontally without sticky sessions or
  a shared session store; JWT is stateless for access tokens.

---

## 6. i18n Library for React

**Decision**: `react-i18next` (i18next ecosystem) for EN/AR bilingual support.

**Rationale**:
- Mature library with 11M+ weekly npm downloads; strong community and TypeScript support.
- Supports RTL-aware formatting (numbers, dates, currencies) via `Intl` API integration.
- Namespace-based translation files: `en.json` and `ar.json` per feature domain.
- `Trans` component for JSX-embedded translations with variables.
- Works well with Vite (lazy loading translations per route via dynamic imports).
- `i18next-browser-languagedetector` to detect locale from browser settings or localStorage.

**RTL implementation**: `dir` attribute on `<html>` is set by a React effect when locale changes.
All CSS uses logical properties — no directional classes. `lang` attribute also set for correct
font rendering (triggers Noto Kufi Arabic via CSS `font-family` based on `:lang(ar)` selector).

**Alternatives considered**:
- `next-intl`: Optimized for Next.js; EduFlow uses Vite SPA, not Next.js.
- `lingui`: Compile-time i18n with excellent TypeScript support but smaller ecosystem; complexity
  not justified for a two-locale system.
- `react-intl` (FormatJS): Good but heavier API surface than needed for EN/AR-only.

---

## 7. State Management: Client Side

**Decision**: Zustand for global client state (auth, theme, locale); TanStack Query v5 for server state.

**Rationale**:
- **Zustand**: Minimal boilerplate for three small stores (auth, theme, locale). Stores persist to
  `localStorage` for theme and locale preference. Auth store holds the in-memory access token and
  user profile fetched from `/api/v1/me`.
- **TanStack Query**: Handles all API data fetching with automatic caching, background refetching,
  and stale-while-revalidate. Pairs with `axios` for the HTTP layer. Invalidates queries on mutation
  (e.g., after enrollment, invalidate student list and enrollment status queries).

**Alternatives considered**:
- Redux Toolkit: Overkill for two roles and a single course; too much boilerplate.
- Context API only: Insufficient for server state caching and background sync.
- SWR: Good alternative to TanStack Query; TanStack Query chosen for richer mutation support and
  devtools ecosystem.

---

## 8. PostgreSQL Full-Text Search for Student Combobox

**Decision**: PostgreSQL `ILIKE` with `%query%` pattern for live student search (combobox). Upgrade to
`tsvector` GIN index if student count exceeds 50,000.

**Rationale**:
The admin student search (Headless UI combobox) performs a live query on student name and email as the
admin types. With ~1000 students initially:
- `WHERE full_name ILIKE $1 OR email ILIKE $1` with a `LIMIT 20` is sub-50ms.
- A `GIN` index on `to_tsvector` is the right choice above ~50k rows but adds schema complexity now.
- The search is debounced 300ms on the frontend before firing the API request, limiting query frequency.

**API endpoint**: `GET /api/v1/admin/students/search?q=<term>` — paginated, max 20 results, cached
in Redis for 5 minutes per query term to reduce DB load.

---

## 9. Google OAuth 2.0 Integration

**Decision**: `passport-google-oauth20` strategy with `passport-jwt` for subsequent JWT auth.

**Rationale**:
- `passport-google-oauth20` handles the OAuth redirect flow (authorization code → token exchange →
  user profile fetch) with minimal boilerplate.
- On successful OAuth callback: look up user by `googleId` or `email`. If new user → create account.
  If existing user with same email but no `googleId` → link accounts (merge).
- After OAuth, issue EduFlow JWT access + refresh token pair (same flow as email login).
- No dependency on passport sessions — Passport is used only for the OAuth exchange; JWT takes over.

**Google OAuth scopes**: `profile email` only. No additional scopes needed.

---

## 10. Video Processing Pipeline (Post-Upload)

**Decision**: FFmpeg-based background processing triggered by tus upload completion. Output: HLS segments
+ `.m3u8` playlist stored at `storage/hls/{lessonId}/`. Processing status tracked in `video_uploads` table.

**Rationale**:
After tus upload completes:
1. `upload.service.ts` receives `onUploadFinish` callback
2. Queues an FFmpeg job: `ffmpeg -i input.mp4 -codec: copy -start_number 0 -hls_time 10 -hls_list_size 0 -f hls output.m3u8`
3. Updates `lessons.video_status = 'PROCESSING'`
4. On FFmpeg completion: updates `lessons.video_status = 'READY'`, sets `video_hls_path`
5. Admin sees status update via polling or WebSocket (polling with 5s interval is simpler for v1)

**HLS encryption**: AES-128 per-session key, generated by the backend on each video token issuance.
The key URL in the `.m3u8` manifest points to `/api/v1/video-token/:lessonId/key` which validates
the token before returning the decryption key.

**Storage**: Local filesystem for v1 (configurable path via env var). S3/R2 migration path preserved
via an abstracted `storage.service.ts` interface.

---

## Resolved Unknowns

| Item | Was Unknown | Resolution |
|------|-------------|------------|
| Paymob HMAC algorithm | HMAC-SHA512 vs SHA256 | SHA512 — confirmed by Paymob docs |
| Refresh token storage | Cookie vs DB vs Redis | PostgreSQL DB for family tracking + Redis for fast revocation lookup |
| Video watermark approach | Server vs client | Client-side CSS overlay — practical and traceable |
| i18n library | Multiple candidates | react-i18next — best fit for Vite SPA + EN/AR |
| Student search implementation | ILIKE vs full-text | ILIKE for v1 (scale-appropriate), GIN index path documented |
| tus server library | @tus-io/server vs custom | @tus-io/server — official, Express-compatible |
| Video processing | Cloud service vs local FFmpeg | Local FFmpeg for v1; abstracted for cloud migration |
