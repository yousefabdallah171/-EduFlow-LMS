# Implementation Plan — Progressive Auth Protection

**Feature**: 003-progressive-auth-protection
**Branch**: `003-progressive-auth-protection`
**Estimated effort**: 8–10 days
**Target merge**: Before Phase 3 student experience work

---

## Architecture Overview

```
                      INCOMING REQUEST (login / register)
                               │
                      ┌────────▼─────────┐
                      │  IP Extractor     │  Extract real IP from X-Forwarded-For
                      │  Fingerprint Read │  Read X-Device-Fingerprint header
                      └────────┬─────────┘
                               │
                      ┌────────▼─────────┐
                      │  Whitelist Check  │  Redis: auth:whitelist:ip:{ip}
                      │  (Redis fast)     │  → PASS immediately if whitelisted
                      └────────┬─────────┘
                               │
                      ┌────────▼─────────┐
                      │  Ban Check        │  DB + Redis: SecurityBan table
                      │                  │  Check by IP, email, fingerprint
                      └────────┬─────────┘
                               │ active ban?
                      ┌────────▼─────────┐
                      │  Lockout Check    │  Redis: auth:lockout:{type}:{id}
                      │                  │  → 429 + Retry-After if locked
                      └────────┬─────────┘
                               │ locked out?
                      ┌────────▼─────────┐
                      │  CAPTCHA Check    │  Redis: auth:captcha:{type}:{id}
                      │                  │  → 422 CAPTCHA_REQUIRED if flag set
                      │                  │  → Verify hCaptcha token if provided
                      └────────┬─────────┘
                               │
                      ┌────────▼─────────┐
                      │  Route Handler   │  login / register logic (existing)
                      └────────┬─────────┘
                               │
                      ┌────────▼──────────────────────┐
                      │  Post-Handler Hook             │
                      │  (result: success | failure)   │
                      │  1. Log attempt to DB          │
                      │  2. If failure: increment      │
                      │     Redis counters             │
                      │  3. Check thresholds           │
                      │  4. Apply lockout/ban if hit   │
                      │  5. Send notifications if hit  │
                      └───────────────────────────────┘
```

---

## Implementation Phases

### Phase 1 — Database & Schema (Day 1)

**Goal:** All new DB tables exist and migrations run cleanly.

**Deliverables:**
- 4 new Prisma models: `AuthAttemptLog`, `BrowserFingerprint`, `SecurityBan`, `SecurityWhitelist`
- 4 new enums: `AttemptType`, `AttemptResult`, `BanType`, `BanReason`
- New relations added to `User`
- Migration file created and applied
- 2 new `NotificationTemplate` rows in seed

**Files:**
- `backend/prisma/schema.prisma` — add models + enums + User relations
- `backend/prisma/migrations/20260428000000_add_auth_protection/migration.sql`
- `backend/prisma/seed.ts` — add notification templates

---

### Phase 2 — Core Backend Services (Days 2–3)

**Goal:** All protection logic exists as standalone, testable services.

#### Service: `IpExtractor` (`backend/src/utils/ip-extractor.ts`)

Extracts the real client IP from Express `req` object.
- Read `X-Forwarded-For` header → take first entry
- Validate it's a valid IPv4 or IPv6 address
- Fallback to `req.socket.remoteAddress`
- Never throw — always return a string

#### Service: `FingerprintService` (`backend/src/services/fingerprint.service.ts`)

- `upsertFingerprint(hash: string, userId?: string): Promise<BrowserFingerprint>` — create or increment `seenCount`
- `getByHash(hash: string): Promise<BrowserFingerprint | null>`
- `extractFromRequest(req: Request): string | null` — reads `X-Device-Fingerprint` header, validates it's a 64-char hex string

#### Service: `AttemptCounterService` (`backend/src/services/attempt-counter.service.ts`)

Manages Redis counters for all three identifier types.
- `getCount(type: 'ip'|'email'|'fp', identifier: string): Promise<number>`
- `increment(type: 'ip'|'email'|'fp', identifier: string): Promise<number>` — INCR + set TTL 86400s if new key
- `reset(type: 'ip'|'email'|'fp', identifier: string, toValue?: number): Promise<void>` — SET to value (0 or tier bottom)
- `trackEmailIp(email: string, ip: string): Promise<number>` — SADD to `auth:email:ips:{email}`, return set cardinality

#### Service: `LockoutService` (`backend/src/services/lockout.service.ts`)

- `check(type: 'ip'|'email'|'fp', identifier: string): Promise<LockoutState | null>` — reads Redis, returns null if no lockout
- `apply(type: 'ip'|'email'|'fp', identifier: string, level: 1|2|3): Promise<void>` — writes `auth:lockout:*` key with correct TTL
- `clear(type: 'ip'|'email'|'fp', identifier: string): Promise<void>` — DEL key
- `getRetryAfterSeconds(lockout: LockoutState): number` — seconds until expiry

`LockoutState`: `{ expiresAt: Date, level: 1|2|3, retryAfterSeconds: number }`

#### Service: `CaptchaService` (`backend/src/services/captcha.service.ts`)

- `isRequired(ip: string, email: string | null, fpHash: string | null): Promise<boolean>` — checks any of the 3 Redis captcha flags
- `setRequired(type: 'ip'|'email'|'fp', identifier: string): Promise<void>` — SET flag TTL 86400s
- `verify(token: string, ip: string): Promise<boolean>` — POST to hCaptcha API `https://api.hcaptcha.com/siteverify`
- Uses env: `HCAPTCHA_SECRET_KEY`

#### Service: `BanService` (`backend/src/services/ban.service.ts`)

- `checkActiveBan(ip: string, email: string | null, fpHash: string | null): Promise<SecurityBan | null>`
- `createBan(data: CreateBanInput): Promise<SecurityBan>` — writes to DB + sets Redis flag
- `liftBan(banId: string, adminId: string, reason: string): Promise<void>` — sets `isActive=false`, clears Redis, resets counters
- `extendBan(banId: string, newExpiresAt: Date, adminId: string): Promise<void>`
- `listBans(filters: BanFilters): Promise<PaginatedResult<SecurityBan>>`
- `getStats(): Promise<SecurityStats>`

#### Service: `WhitelistService` (`backend/src/services/whitelist.service.ts`)

- `isWhitelisted(ip: string): Promise<boolean>` — check Redis first (`auth:whitelist:ip:{ip}`), fallback to DB
- `add(ip: string, addedById: string, reason?: string): Promise<SecurityWhitelist>` — DB + Redis
- `remove(id: string): Promise<void>` — DB + Redis
- `list(): Promise<SecurityWhitelist[]>`
- `syncToRedis(): Promise<void>` — called on server startup, loads all whitelist IPs into Redis

#### Service: `ProtectionNotificationService` (`backend/src/services/protection-notification.service.ts`)

- `notifyStudentSuspiciousActivity(userId: string, email: string, ipAddress: string): Promise<void>` — sends email with signed acknowledge tokens
- `notifyAdminPermanentBan(ip: string, email: string | null, fpHash: string | null, attemptCount: number): Promise<void>`
- `generateAcknowledgeToken(email: string, type: 'was-me'|'was-not-me'): string` — JWT signed with `JWT_ACCESS_SECRET`, 48h TTL
- `verifyAcknowledgeToken(token: string): { email: string, type: string } | null`

#### Service: `AttemptLogService` (`backend/src/services/attempt-log.service.ts`)

- `log(data: AttemptLogInput): void` — fire-and-forget, never throws, writes to `AuthAttemptLog`
- `listLogs(filters: LogFilters): Promise<PaginatedResult<AuthAttemptLog>>`
- `getAttemptCountFromDB(identifier: string, type: 'ip'|'email'|'fp', since: Date): Promise<number>` — fallback count from DB if Redis is cold

#### Orchestrator: `ProtectionOrchestrator` (`backend/src/services/protection-orchestrator.service.ts`)

Single entry point called by middleware. Coordinates all services above.

```typescript
class ProtectionOrchestrator {
  // Called BEFORE the route handler
  async checkIncoming(context: ProtectionContext): Promise<ProtectionDecision>

  // Called AFTER the route handler resolves (success or failure)
  async recordOutcome(context: ProtectionContext, outcome: 'success' | 'failure'): Promise<void>
}

type ProtectionContext = {
  ip: string
  email: string | null
  fingerprintHash: string | null
  fingerprintId: string | null
  attemptType: AttemptType
  captchaToken?: string
  req: Request
}

type ProtectionDecision = {
  allowed: boolean
  reason?: string          // error code if not allowed
  retryAfter?: number      // seconds
  captchaRequired?: boolean
}
```

---

### Phase 3 — Middleware (Day 3)

**Goal:** Middleware wires protection into the existing auth router.

#### Middleware: `authProtection.middleware.ts` (`backend/src/middleware/auth-protection.middleware.ts`)

```typescript
export const authProtectionMiddleware = async (req, res, next) => {
  // 1. Extract IP + fingerprint
  // 2. Build ProtectionContext
  // 3. Call orchestrator.checkIncoming()
  // 4. If not allowed: return early with correct HTTP status
  // 5. If allowed: attach context to req, hook res.on('finish') for recordOutcome
  // 6. next()
}
```

Applied to:
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/resend-verification`

**Auto-whitelist hook**: Add to `POST /api/v1/auth/login` success path:
- After successful login: if `req.user.role === 'ADMIN'` → `whitelistService.add(ip, req.user.id, 'Admin auto-whitelist')`

---

### Phase 4 — Admin API Endpoints (Day 4)

**Goal:** All admin security endpoints exist and are protected by ADMIN role.

New router: `backend/src/routes/admin/security.routes.ts`

```
GET    /api/v1/admin/security/logs                  List auth attempt logs
GET    /api/v1/admin/security/stats                 Security stats KPIs
GET    /api/v1/admin/security/bans                  List all bans (paginated)
POST   /api/v1/admin/security/bans                  Create manual ban
DELETE /api/v1/admin/security/bans/:id              Lift a ban
PATCH  /api/v1/admin/security/bans/:id              Extend a ban
GET    /api/v1/admin/security/whitelist              List whitelist
POST   /api/v1/admin/security/whitelist              Add to whitelist
DELETE /api/v1/admin/security/whitelist/:id          Remove from whitelist
```

New controller: `backend/src/controllers/admin/security.controller.ts`

---

### Phase 5 — Student Acknowledge Endpoint (Day 4)

```
POST   /api/v1/auth/security/acknowledge             Handle was-me / was-not-me
```

- Validates signed token from email
- `type=was-me` → clears email counter
- `type=was-not-me` → logs event, prompts password change (returns `PROMPT_PASSWORD_CHANGE` flag)
- Both: log to `AuthAttemptLog` with result `SUCCESS` and metadata `{ acknowledgeType }`

---

### Phase 6 — Frontend: Fingerprinting + CAPTCHA (Day 5)

**Goal:** Every auth request sends a fingerprint header and CAPTCHA when required.

**Install packages:**
```bash
cd frontend
npm install @fingerprintjs/fingerprintjs @hcaptcha/react-hcaptcha
```

**New hook**: `frontend/src/hooks/useDeviceFingerprint.ts`
- Loads FingerprintJS on mount (lazy)
- Returns `{ fingerprintHash, isLoading }`
- Hash = SHA-256 of `visitorId + navigator.userAgent`
- Cached in `sessionStorage` so it doesn't recompute on every page

**New component**: `frontend/src/components/shared/HCaptchaWidget.tsx`
- Wrapper around `@hcaptcha/react-hcaptcha`
- Shows only when `captchaRequired` prop = true
- Calls `onVerify(token)` callback when user passes
- Uses env var `VITE_HCAPTCHA_SITE_KEY`

**ENV vars to add** (frontend `.env.example`):
```
VITE_HCAPTCHA_SITE_KEY=your_hcaptcha_site_key
```

**ENV vars to add** (backend `.env.example`):
```
HCAPTCHA_SECRET_KEY=your_hcaptcha_secret_key
```

---

### Phase 7 — Frontend: Updated Auth Pages (Day 5)

**Login page** (`frontend/src/pages/Login.tsx`):
- Add `useDeviceFingerprint` hook
- Inject `X-Device-Fingerprint` header in all login API calls
- Parse `captchaRequired: true` from 422 response
- Show `HCaptchaWidget` when required
- Show progressive error messages:
  - Attempt 6–10: "Too many attempts. Please complete the verification below."
  - Attempt 11+: "Account temporarily locked. Try again in X minutes." (use `Retry-After` header)
  - Permanent ban: "Access to this account has been blocked. Contact support."

**Register page** (`frontend/src/pages/Register.tsx`):
- Same fingerprint + CAPTCHA integration
- Progressive messages for registration flood

---

### Phase 8 — Frontend: Admin Security Pages (Days 6–7)

**Page 1: Security Logs** (`frontend/src/pages/admin/SecurityLogs.tsx`)

Columns:
- Timestamp
- Type (LOGIN / REGISTER badge)
- Result (SUCCESS green / FAIL red / BLOCKED red / LOCKED_OUT orange / CAPTCHA_FAIL yellow)
- IP address (clickable → filter by IP)
- Email attempted
- Fingerprint hash (truncated, copyable)
- Attempt # at time
- Action taken (lockout level, ban, none)

Features:
- Date range filter (Floating UI popover date picker)
- Result filter (multi-select)
- Type filter
- IP / email search input
- Pagination (50 rows/page)
- Export CSV: `GET /admin/security/logs?export=csv`

**Page 2: Security Management** (`frontend/src/pages/admin/Security.tsx`)

Top section — Stats cards (shadcn Card):
- Active bans count
- Bans triggered today
- Attempts blocked today
- Whitelisted IPs count

Middle section — Active Bans table (shadcn Table):

Columns: Type badge | Identifier | Reason | Attempts | Created At | Expires At | Actions

Actions per row:
- **Unban** → Dialog confirmation → `DELETE /admin/security/bans/:id`
- **Extend** → Sheet with duration picker → `PATCH /admin/security/bans/:id`
- **View Logs** → navigates to SecurityLogs filtered by identifier

Bottom-left — Add Manual Ban (shadcn Sheet):
- Fields: Ban Type (select), IP / Email / Fingerprint Hash input, Duration (select: 5min / 30min / 1hr / 6hr / 24hr / 7d / permanent), Reason text
- Submit → `POST /admin/security/bans`

Bottom-right — Whitelist (shadcn Card):
- List of whitelisted IPs
- Add IP form
- Remove button per IP

**Nav**: Add "Security" nav item to admin sidebar under Audit Log.

---

### Phase 9 — Email Templates (Day 7)

**Template 1: `SECURITY_SUSPICIOUS_ACTIVITY`**
- Subject (EN): "Unusual login activity on your EduFlow account"
- Subject (AR): "نشاط تسجيل دخول غير عادي على حسابك"
- Body: Shows IP, time, location (if available), two buttons:
  - "This was me" → `/security/acknowledge?token={wasMe}`
  - "This wasn't me — Secure my account" → `/security/acknowledge?token={wasNotMe}`

**Template 2: `ADMIN_SECURITY_ALERT`**
- Subject: "⚠️ EduFlow: Permanent ban triggered — {IP}"
- Body: Shows IP, email, fingerprint hash, attempt count, timestamp, link to `/admin/security`

**Acknowledge Page** (`frontend/src/pages/SecurityAcknowledge.tsx`):
- Route: `/security/acknowledge?token=...`
- Public page (no auth required)
- Calls `POST /api/v1/auth/security/acknowledge` with token
- On `was-me`: shows "Thanks! Your account is safe. Continue learning." with link to `/login`
- On `was-not-me`: shows "Password change recommended" form (optional), then "Your account is secure."

---

### Phase 10 — Tests (Days 8–9)

**Backend Unit Tests** (`backend/tests/unit/security/`)
- `attempt-counter.service.test.ts` — increment, reset, threshold detection
- `lockout.service.test.ts` — apply lockout, check lockout, retry-after calculation
- `ban.service.test.ts` — create ban, check ban, lift ban
- `captcha.service.test.ts` — mock hCaptcha API, success/failure
- `protection-orchestrator.test.ts` — full decision tree scenarios

**Backend Integration Tests** (`backend/tests/integration/`)
- `auth-brute-force.integration.test.ts` — 30-attempt login sequence against real endpoints
- `register-flood.integration.test.ts` — 15-account creation sequence
- `admin-ban-management.integration.test.ts` — create ban, check ban, lift ban, re-attempt

**Backend Security Tests** (`backend/tests/security/`)
- `auth-bypass.security.test.ts` — IP spoofing, missing fingerprint, CAPTCHA bypass attempts, timing attack resistance

**Frontend E2E** (`frontend/tests/e2e/`)
- `auth-captcha.spec.ts` — login with CAPTCHA flow after 5 failures
- `auth-lockout.spec.ts` — locked out user message + retry-after display
- `admin-security.spec.ts` — admin ban/unban/logs flow

---

### Phase 11 — Documentation Update (Day 9)

- Update `docs/features/AUTH.md` — add protection section
- Update `docs/features/SECURITY.md` — add rate limit table rows
- Update `docs/features/API.md` — add new endpoints
- Update `.env.example` (backend + frontend) — add new env vars
- Update `docs/features/ADMIN_DASHBOARD.md` — add new pages

---

## Configuration Reference

All thresholds configurable via env vars (add to `backend/src/config/env.ts`):

```env
# hCaptcha
HCAPTCHA_SECRET_KEY=                    # required

# Progressive lockout thresholds
AUTH_CAPTCHA_THRESHOLD=5                # attempts before CAPTCHA required (default: 5)
AUTH_LOCKOUT_L1_THRESHOLD=11            # attempts before 5-min lockout (default: 11)
AUTH_LOCKOUT_L1_SECONDS=300             # 5 minutes
AUTH_LOCKOUT_L2_THRESHOLD=16            # attempts before 30-min lockout (default: 16)
AUTH_LOCKOUT_L2_SECONDS=1800            # 30 minutes
AUTH_LOCKOUT_L3_THRESHOLD=21            # attempts before 1-hour lockout (default: 21)
AUTH_LOCKOUT_L3_SECONDS=3600            # 1 hour
AUTH_PERMANENT_BAN_THRESHOLD=26         # attempts before permanent ban (default: 26)
AUTH_DELAY_MS=2000                      # server delay on captcha-tier attempts (default: 2000)

# Registration flood
REG_FLOOD_SOFT_THRESHOLD=5             # accounts/day before rate limiting (default: 5)
REG_FLOOD_SOFT_INTERVAL_SECONDS=600    # 10 min between accounts at soft limit
REG_FLOOD_MEDIUM_THRESHOLD=11          # accounts/day before 30-min lockout (default: 11)
REG_FLOOD_HARD_THRESHOLD=15            # accounts/day before 1-hour lockout (default: 15)

# Email lockout multi-IP threshold
AUTH_EMAIL_DISTINCT_IP_THRESHOLD=3     # distinct IPs before email lockout (default: 3)
```

---

## Dependency Map

```
Phase 1 (DB)
  └─► Phase 2 (Services)
        └─► Phase 3 (Middleware)
              └─► Phase 4 (Admin API)
              └─► Phase 5 (Acknowledge API)
Phase 6 (Frontend: Fingerprint+CAPTCHA)
  └─► Phase 7 (Frontend: Auth Pages)
  └─► Phase 8 (Frontend: Admin Pages)  ─depends on─►  Phase 4
Phase 9 (Email Templates)  ─depends on─►  Phase 2 (notification service)
Phase 10 (Tests)  ─depends on─►  All phases
Phase 11 (Docs)  ─depends on─►  All phases
```
