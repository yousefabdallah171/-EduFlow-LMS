# EduFlow LMS — Security

> **Update rule:** Any time you change security headers, rate limits, JWT config, or add/remove validation, update this doc.

---

## HTTP Security Headers (Helmet)

Configured in `backend/src/config/security.ts`:

```
Content-Security-Policy:
  default-src 'self'
  script-src  'self'
  style-src   'self' 'unsafe-inline'
  img-src     'self' data: https:
  font-src    'self'
  connect-src 'self' {FRONTEND_URL}
  frame-src   'none'
  object-src  'none'
  media-src   'self'
  upgrade-insecure-requests (production only)

X-Frame-Options:            DENY
X-Content-Type-Options:     nosniff
X-XSS-Protection:           1; mode=block
Referrer-Policy:            strict-origin-when-cross-origin
Strict-Transport-Security:  max-age=31536000; includeSubDomains; preload (prod)
X-DNS-Prefetch-Control:     off
X-Powered-By:               removed
Permissions-Policy:         geolocation=(), microphone=(), camera=(), payment=(),
                            usb=(), magnetometer=(), gyroscope=(), accelerometer=()
```

Video endpoints additionally set:
```
Cache-Control:                private, no-store, max-age=0
Pragma:                       no-cache
Expires:                      0
Cross-Origin-Resource-Policy: same-origin
```

---

## CORS

```
Origin:          {FRONTEND_URL} only
Credentials:     true
Methods:         GET, POST, PUT, PATCH, DELETE, OPTIONS
Allowed headers: Content-Type, Authorization
Exposed headers: X-Total-Count, X-Page-Count, RateLimit-Limit, RateLimit-Remaining
MaxAge:          86400 (24 hours preflight cache)
```

---

## Rate Limiting (`backend/src/middleware/rate-limit.middleware.ts`)

All limiters use `standardHeaders: true, legacyHeaders: false`.

| Limiter | Window | Prod Limit | Key |
|---------|--------|-----------|-----|
| `authRateLimit` | 60s | 10 | IP |
| `refreshRateLimit` | 60s | 120 | IP |
| `paymentRateLimit` | 60s | 20 | IP |
| `contactRateLimit` | 15 min | 5 | IP |
| `videoIpRateLimit` | 60s | 300 | IP / x-forwarded-for |
| `passwordChangeRateLimit` | 60 min | 3 | userId or IP |
| `adminSearchRateLimit` | 15 min | 50 | userId or IP |
| `videoPreviewRateLimit` | 10 min | 30 | IP |
| `uploadRateLimit` | 60 min | 5 | userId or IP |
| `listRateLimit` | 60s | 60 | userId or IP |
| `enrollmentRateLimit` | 24 h | 10 | IP |

Dev limits are set to 1000–10000 to avoid blocking local testing.

---

## JWT (`backend/src/utils/jwt.ts`)

| Token | Expiry | Algorithm | Secret |
|-------|--------|-----------|--------|
| Access token | 15 minutes | HS256 | `JWT_ACCESS_SECRET` (min 32 chars) |
| Refresh token (JWT) | 365 days | HS256 | `JWT_REFRESH_SECRET` (min 32 chars) |
| Refresh session window | 30 days | — stored in Redis/DB | — |

**Claims on every token:**
```
sub        = userId
iss        = "eduflow-api"
aud        = "eduflow-app"
jti        = crypto.randomBytes(16).hex()   ← unique per token
userId     = string (custom)
role       = "ADMIN" | "STUDENT" (custom)
sessionId  = string (custom)
```

Refresh tokens also carry `familyId` and `tokenId` for rotation detection.  
Both secrets are validated at startup — app refuses to start if < 32 chars.

---

## RBAC (`backend/src/middleware/rbac.middleware.ts`)

```typescript
requireRole(...roles: Role[])
```
- Returns **401** if `req.user` is absent (unauthenticated)
- Returns **403** if `req.user.role` is not in the required list
- Applied to all `/api/v1/admin/*` routes (requires `ADMIN`)
- Student routes use `authenticate` middleware only (any logged-in user)

---

## Password & Hashing

| Operation | Method |
|-----------|--------|
| Password hashing | bcrypt, **12 salt rounds** |
| Refresh token storage | SHA-256 hash stored in DB (raw token only in cookie) |
| Video token storage | SHA-256 hash in DB + Redis |
| Email verify token | 64-char hex (crypto.randomBytes(32)), 24h TTL |
| Password reset token | 64-char hex (crypto.randomBytes(32)), 1h TTL |

---

## Webhook HMAC Validation (`backend/src/utils/hmac.ts`)

Algorithm: **SHA-512**

Concatenated fields (in order):
```
amount_cents, created_at, currency, error_occured, has_parent_transaction,
id, integration_id, is_3d_secure, is_auth, is_capture, is_refunded,
is_standalone_payment, is_voided, order.id, merchant_order_id, owner,
pending, source_data.pan, source_data.sub_type, source_data.type, success
```

Comparison uses `crypto.timingSafeEqual` — prevents timing attacks.  
HMAC sourced from `req.query.hmac` or `req.body.hmac`.  
Returns **400 INVALID_WEBHOOK_HMAC** on mismatch.

---

## Path Traversal Prevention

Video segment endpoint (`backend/src/controllers/lesson.controller.ts`):

1. **Filename allowlist regex:**
   ```
   /^(segment-\d{3}(\.ts|\.m4s)|segment\.aac|enc\.key|init\.mp4|[a-zA-Z0-9_-]+\.m3u8)$/
   ```
2. **Max length:** 255 chars
3. **isWithinDir():** Resolves both paths, checks `relativePath` doesn't start with `..` and isn't absolute
4. **fs.realpath():** Resolves symlinks, then verifies result starts with `baseDir + path.sep`

---

## Input Validation

- All request bodies validated with **Zod** schemas before handler runs
- Progress schema: `lastPositionSeconds` and `watchTimeSeconds` must be integers ≥ 0
- Admin payment query params validated (date format ISO 8601, amount must be int ≥ 0)
- Env vars validated at startup with Zod — missing required vars crash the process immediately

---

## Cookie Security

| Cookie | httpOnly | Secure | SameSite | MaxAge |
|--------|----------|--------|----------|--------|
| `refresh_token` | ✅ | Based on FRONTEND_URL | Strict | 30 days |
| `eduflow_refresh_present` | ❌ (JS-readable flag) | Based on FRONTEND_URL | Strict | 30 days |
| `google_oauth_state` | ✅ | Based on FRONTEND_URL | Lax | 10 minutes |

---

## Single Session Enforcement

Controlled by `ENFORCE_SINGLE_SESSION=true` (default: true).

- Active session stored in Redis: `active-session:{userId}`
- On new login: previous session revoked (refresh tokens + video tokens invalidated)
- Every authenticated request validates session via `sessionService.ensureActiveSession()`
- Returns `SESSION_INVALIDATED` (401) on mismatch

---

## Audit Logging

`backend/src/services/audit.service.ts` logs all sensitive admin actions.

Tracked actions:
```
ENROLL_STUDENT, REVOKE_STUDENT, UPDATE_COURSE_SETTINGS,
EXPORT_STUDENT_DATA, UPDATE_ENROLLMENT_STATUS, DELETE_STUDENT,
OVERRIDE_PAYMENT, CANCEL_PAYMENT, RETRY_PAYMENT, MARK_PAID
```

Stored in `AuditLog` and `AdminAuditLog` DB tables.  
Audit middleware auto-logs POST/PATCH/DELETE requests where response status is 200–399.  
Logging is non-blocking (failures are swallowed to avoid breaking the main operation).

---

## Environment Variable Validation

Required secrets (all validated with Zod at startup — empty string = crash):

```
JWT_ACCESS_SECRET        min 32 chars
JWT_REFRESH_SECRET       min 32 chars
VIDEO_TOKEN_SECRET       min 32 chars
PAYMOB_HMAC_SECRET       min 1 char
PAYMOB_API_KEY           min 1 char
PAYMOB_INTEGRATION_ID    min 1 char
PAYMOB_IFRAME_ID         min 1 char
GOOGLE_CLIENT_ID         min 1 char
GOOGLE_CLIENT_SECRET     min 1 char
DATABASE_URL             min 1 char
REDIS_URL                min 1 char
SMTP_HOST/PORT/USER/PASS min 1 char each
FRONTEND_URL             must be valid URL
```

---

## Security Test Coverage

| Test File | Covers |
|-----------|--------|
| `tests/security/owasp-top-10.test.ts` | OWASP A1–A10 |
| `tests/security/injection-prevention.test.ts` | SQL, XSS, path traversal payloads |
| `tests/security/authorization.test.ts` | RBAC (student/admin/guest) |
| `tests/security/rate-limiting.test.ts` | Rate limit enforcement |
| `tests/security/webhook-hmac.test.ts` | HMAC validation, replay prevention |
| `tests/security/data-protection.test.ts` | PII masking, field exposure |

---

## Progressive Auth Lockout

### Auth Lockout Tiers

| Tier | Attempt Range | Behavior |
|------|---------------|----------|
| Normal | 1-5 | No CAPTCHA or lockout |
| CAPTCHA Tier | 6-10 | CAPTCHA required + server delay |
| Lockout L1 | 11-15 | 5-minute lockout |
| Lockout L2 | 16-20 | 30-minute lockout |
| Lockout L3 | 21-25 | 1-hour lockout |
| Permanent | 26+ | Manual admin unban required |

### Additional Security Rate Limits

| Flow | Threshold | Behavior |
|------|-----------|----------|
| Registration flood soft | >5/day | controlled pacing |
| Registration flood medium | >=11/day | temporary lockout |
| Registration flood hard | >=15/day | longer lockout + admin alert |
