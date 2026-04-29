# EduFlow LMS — Authentication & Authorization

> **Update rule:** Any time you change auth flow, token config, OAuth scopes, or cookie settings, update this doc.

---

## Overview

EduFlow supports two authentication methods:
1. **Email / Password** — with email verification + password reset
2. **Google OAuth** — via Google Consent screen

Both issue the same JWT access + refresh token pair.

---

## User Model (auth-relevant fields)

```prisma
model User {
  id                   String        @id @default(uuid())
  email                String        @unique
  passwordHash         String?       // null for Google-only accounts
  fullName             String
  avatarUrl            String?
  role                 Role          @default(STUDENT)   // ADMIN | STUDENT
  locale               Locale        @default(en)        // en | ar
  theme                Theme         @default(light)     // light | dark
  oauthProvider        OAuthProvider @default(email)     // email | google
  oauthId              String?       @unique             // Google sub
  emailVerified        Boolean       @default(false)
  emailVerifyToken     String?
  emailVerifyExpires   DateTime?
  passwordResetToken   String?
  passwordResetExpires DateTime?
}
```

---

## Email / Password Flow

### Registration (`POST /api/v1/auth/register`)
1. Normalize email (lowercase + trim)
2. Hash password with **bcrypt, 12 salt rounds**
3. Generate 64-char email verify token (`crypto.randomBytes(32).hex()`), TTL 24h
4. Store user, send verification email
5. In `NODE_ENV=development`: email auto-verified (skip email step)

### Login (`POST /api/v1/auth/login`)
1. Lookup user by email
2. `emailVerified` must be `true` → else 403 "Email not verified"
3. `bcrypt.compare(password, passwordHash)` → else 401
4. Create session, issue access + refresh tokens

### Email Verification (`GET /api/v1/auth/verify-email?token=`)
- Token matched against `emailVerifyToken`, checked against `emailVerifyExpires`
- On success: sets `emailVerified = true`, clears token fields

### Password Reset
1. `POST /api/v1/auth/forgot-password` — generate 64-char token, TTL **1 hour**, send email
2. `POST /api/v1/auth/reset-password` — validate token, hash new password, clear token
3. Password change while logged in: `PATCH /api/v1/student/profile/password` — rate limited (3/hour)
4. **Google accounts cannot change password** (passwordHash is null, locked)

### Resend Verification (`POST /api/v1/auth/resend-verification`)
- Generates a new token, overwrites old one, resends email

---

## Google OAuth Flow

### Start (`GET /api/v1/auth/oauth/google`)
1. Generate random `state` string
2. Store state in **httpOnly cookie** `google_oauth_state` (10-min TTL, SameSite=Lax)
3. Redirect browser to Google consent URL
4. Scopes requested: `profile`, `email`

### Callback (`GET /api/v1/auth/oauth/google/callback`)
1. Validate `state` param matches cookie (CSRF protection)
2. Exchange code for tokens with Google
3. Extract from Google profile:
   - `id` → `oauthId`
   - `emails[0].value` → email
   - `displayName` → fullName (fallback: email prefix)
   - `photos[0].value` → avatarUrl
4. Check if user with this email already exists:
   - **Yes** → link `oauthId` + set `emailVerified = true`
   - **No** → create new user, role=STUDENT, `emailVerified = true`
5. Issue session (same as email login)

---

## Token System

### Access Token
- **Expiry:** 15 minutes
- **Algorithm:** HS256
- **Secret:** `JWT_ACCESS_SECRET` (min 32 chars)
- **Claims:** `sub`, `iss="eduflow-api"`, `aud="eduflow-app"`, `jti`, `userId`, `role`, `sessionId`
- Sent in `Authorization: Bearer <token>` header

### Refresh Token
- **Expiry (JWT):** 365 days
- **Session window:** 30 days (Redis + DB)
- **Algorithm:** HS256
- **Secret:** `JWT_REFRESH_SECRET` (min 32 chars)
- **Extra claims:** `familyId`, `tokenId`
- Sent in **httpOnly** `refresh_token` cookie (SameSite=Strict, path `/api/v1`)
- Raw token never stored — only SHA-256 hash in DB

### Token Rotation
- Each refresh issues a new access + refresh token pair
- `familyId` tracks the token family — if old token is reused, **entire family is revoked** (replay detection)
- Session window resets on every successful refresh

### Refresh Endpoint (`POST /api/v1/auth/refresh`)
- Reads `refresh_token` cookie
- Verifies JWT signature + family + session validity
- Rotates tokens, returns new access token in body
- Sets new refresh_token cookie

---

## Session Management

`backend/src/services/session.service.ts`

Active session stored: `active-session:{userId}` in Redis (TTL = 30 days).

**`ENFORCE_SINGLE_SESSION=true` (default):**
- On new login: previous session revoked
  - All refresh tokens for old session invalidated in DB
  - Video tokens for old session revoked
  - Redis session key overwritten
- Every authenticated request: `sessionService.ensureActiveSession()` validates `req.user.sessionId` against Redis
- Mismatch → 401 `SESSION_INVALIDATED`

**Logout (`POST /api/v1/auth/logout`):**
- Revokes current refresh token
- Clears `refresh_token` cookie
- Removes active session from Redis

---

## Cookies

| Cookie | httpOnly | Secure | SameSite | Path | MaxAge |
|--------|----------|--------|----------|------|--------|
| `refresh_token` | ✅ | Based on HTTPS | Strict | `/api/v1` | 30 days |
| `eduflow_refresh_present` | ❌ (JS-readable) | Based on HTTPS | Strict | `/` | 30 days |
| `google_oauth_state` | ✅ | Based on HTTPS | Lax | `/api/v1/auth/oauth/google` | 10 min |

`eduflow_refresh_present` is a non-httpOnly flag that frontend JavaScript reads to know if a refresh token exists, so it can attempt silent token refresh without exposing the actual token.

---

## Role-Based Access

Two roles: `ADMIN` and `STUDENT`.

| Route Prefix | Required Role | Middleware |
|-------------|---------------|-----------|
| `/api/v1/admin/*` | `ADMIN` | `authenticate` + `requireRole("ADMIN")` |
| `/api/v1/student/*` | any logged-in | `authenticate` |
| `/api/v1/lessons/*` | `STUDENT` | `authenticate` |
| `/api/v1/auth/*` | none | public |
| `/api/v1` (public routes) | none | public |

`requireRole` returns 401 if unauthenticated, 403 if wrong role.

---

## Frontend Auth State

`frontend/src/stores/auth.store.ts` (Zustand)

Stores in memory only: `{ user: { id, email, fullName, role }, isLoading }`.  
No PII in `localStorage` (XSS prevention).

**Session recovery:** On app load + tab focus, silently calls `/api/v1/auth/refresh`.  
**Bootstrap flow:**
1. App mounts → check `eduflow_refresh_present` cookie
2. If present → call refresh → get new access token → set user in store
3. If absent → user is logged out
4. All API calls use access token from memory

---

## Auth Endpoints Reference

```
POST   /api/v1/auth/register              Register new user
POST   /api/v1/auth/login                 Login with email/password
POST   /api/v1/auth/refresh               Refresh access token (via cookie)
POST   /api/v1/auth/logout                Logout
POST   /api/v1/auth/forgot-password       Request password reset email
POST   /api/v1/auth/reset-password        Reset password with token
GET    /api/v1/auth/verify-email          Verify email with token
POST   /api/v1/auth/resend-verification   Resend verification email
GET    /api/v1/auth/oauth/google          Start Google OAuth
GET    /api/v1/auth/oauth/google/callback Google OAuth callback
GET    /api/v1/auth/health                Auth service health check
```

---

## Email System

Emails are sent via SMTP (configured via `SMTP_*` env vars).

| Event | Template |
|-------|---------|
| Registration | Email verification link |
| Payment success | Receipt with amount |
| Payment failure | Retry prompt |
| Refund initiated | Refund confirmation |
| Password reset | Reset link |
| Admin broadcast | Custom notification template |

Templates stored in `NotificationTemplate` DB table (editable by admin at `/admin/notifications`).  
Email delivery queued via `EmailQueue` table with retry logic (3 attempts: 2min → 10min → 30min).

---

## Progressive Auth Protection

EduFlow now applies layered auth protection for login/register/password reset/resend-verification:

1. Whitelist bypass (`auth:whitelist:ip:*`)
2. Active ban check (`SecurityBan` + Redis)
3. Active lockout check (`auth:lockout:*`)
4. CAPTCHA requirement/verification (`auth:captcha:*` + hCaptcha)
5. Progressive delay + escalation + logging (`AuthAttemptLog`)
6. Auto-whitelist on successful admin login
7. Security notifications + acknowledge flow

### Thresholds

- Attempts 1-5: normal
- 6-10: CAPTCHA + 2s delay
- 11-15: 5m lockout
- 16-20: 30m lockout
- 21-25: 1h lockout
- 26+: permanent ban

### Key Redis Patterns

- `auth:fail:ip:{ip}` / `auth:fail:email:{email}` / `auth:fail:fp:{hash}`
- `auth:captcha:*`
- `auth:lockout:*`
- `auth:ban:*`
- `auth:email:ips:{email}`

### Error Codes

- `CAPTCHA_REQUIRED`, `CAPTCHA_INVALID`
- `ACCOUNT_LOCKED` (+ `Retry-After`)
- `BAN_ACTIVE`
