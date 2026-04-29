# Data Model — Progressive Auth Protection

**Feature**: 003-progressive-auth-protection
**Migration name**: `20260428000000_add_auth_protection`

---

## New Enums

```prisma
enum AttemptType {
  LOGIN
  REGISTER
  PASSWORD_RESET
  RESEND_VERIFICATION
}

enum AttemptResult {
  SUCCESS
  FAIL_CREDENTIALS
  FAIL_NOT_VERIFIED
  BLOCKED_BAN
  LOCKED_OUT
  CAPTCHA_REQUIRED
  CAPTCHA_FAIL
  RATE_LIMITED
  FLOOD_LIMIT
}

enum BanType {
  IP
  EMAIL
  FINGERPRINT
  IP_EMAIL
  IP_FINGERPRINT
  ALL
}

enum BanReason {
  AUTO_PROGRESSIVE        // triggered by attempt counter
  AUTO_REGISTRATION_FLOOD // triggered by registration count
  MANUAL_ADMIN            // admin created manually
}
```

---

## New Models

### BrowserFingerprint

Stores hashed browser fingerprints for device-level tracking. One record per unique device.

```prisma
model BrowserFingerprint {
  id          String   @id @default(uuid())
  hash        String   @unique  // SHA-256(fingerprintjs_visitorId + userAgent)
  firstSeenAt DateTime @default(now())
  lastSeenAt  DateTime @updatedAt
  seenCount   Int      @default(1)
  userId      String?  // last user ID seen using this fingerprint (nullable)
  user        User?    @relation("UserFingerprints", fields: [userId], references: [id])

  attempts    AuthAttemptLog[]
  bans        SecurityBan[]

  @@index([hash])
  @@index([userId])
}
```

---

### AuthAttemptLog

Permanent log of every auth attempt — both successes and failures. Used for the admin logs page and for persisting attempt counts across Redis restarts.

```prisma
model AuthAttemptLog {
  id              String         @id @default(uuid())
  type            AttemptType                            // LOGIN | REGISTER | etc.
  result          AttemptResult                          // SUCCESS | FAIL_CREDENTIALS | etc.
  ipAddress       String
  emailAttempted  String?                                // email used in attempt (may be null for malformed requests)
  fingerprintId   String?
  fingerprint     BrowserFingerprint? @relation(fields: [fingerprintId], references: [id])
  userId          String?                                // resolved user ID (if account exists)
  user            User?           @relation("UserAttempts", fields: [userId], references: [id])
  attemptNumber   Int             @default(1)            // cumulative attempt # for this identifier at time of attempt
  lockoutApplied  Boolean         @default(false)        // did this attempt trigger a lockout?
  banApplied      Boolean         @default(false)        // did this attempt trigger a permanent ban?
  captchaRequired Boolean         @default(false)        // was CAPTCHA required for this attempt?
  captchaPassed   Boolean?                               // null = not required, true/false = result
  delayApplied    Int             @default(0)            // artificial delay in ms added server-side
  userAgent       String?
  metadata        Json?                                  // extra context: error codes, paymob IDs, etc.
  createdAt       DateTime        @default(now())

  @@index([ipAddress, createdAt])
  @@index([emailAttempted, createdAt])
  @@index([fingerprintId, createdAt])
  @@index([result, createdAt])
  @@index([type, result, createdAt])
  @@index([createdAt])
}
```

---

### SecurityBan

Active and historical bans. Soft-deleted on unban (`isActive = false`) so history is preserved.

```prisma
model SecurityBan {
  id            String    @id @default(uuid())
  banType       BanType                         // IP | EMAIL | FINGERPRINT | combined
  reason        BanReason                       // AUTO_PROGRESSIVE | AUTO_REGISTRATION_FLOOD | MANUAL_ADMIN
  notes         String?                         // admin notes (for manual bans)

  // Identifiers (at least one must be set)
  ipAddress     String?
  email         String?
  fingerprintId String?
  fingerprint   BrowserFingerprint? @relation(fields: [fingerprintId], references: [id])

  attemptCount  Int?      // attempt count at time of ban
  isPermanent   Boolean   @default(false)
  expiresAt     DateTime?                       // null = permanent
  isActive      Boolean   @default(true)

  createdAt     DateTime  @default(now())
  liftedAt      DateTime?
  liftedById    String?                         // admin user ID
  liftedBy      User?     @relation("BanLiftedBy", fields: [liftedById], references: [id])
  createdById   String?                         // null = auto, admin ID = manual
  createdBy     User?     @relation("BanCreatedBy", fields: [createdById], references: [id])
  liftReason    String?                         // reason admin gave for unbanning

  @@index([ipAddress, isActive])
  @@index([email, isActive])
  @@index([fingerprintId, isActive])
  @@index([isActive, expiresAt])
  @@index([createdAt])
  @@index([banType, isActive])
}
```

---

### SecurityWhitelist

Trusted IPs that bypass all protection checks. Admin IPs are auto-added on login.

```prisma
model SecurityWhitelist {
  id          String    @id @default(uuid())
  ipAddress   String    @unique
  reason      String?                           // "Admin auto-whitelist" or admin note
  addedById   String
  addedBy     User      @relation("WhitelistAddedBy", fields: [addedById], references: [id])
  createdAt   DateTime  @default(now())

  @@index([ipAddress])
}
```

---

## Existing Model Changes

### User (add relations)

```prisma
model User {
  // ... existing fields ...

  // New relations
  fingerprints         BrowserFingerprint[] @relation("UserFingerprints")
  authAttempts         AuthAttemptLog[]     @relation("UserAttempts")
  bansCreated          SecurityBan[]        @relation("BanCreatedBy")
  bansLifted           SecurityBan[]        @relation("BanLiftedBy")
  whitelistEntries     SecurityWhitelist[]  @relation("WhitelistAddedBy")
}
```

---

## Redis Key Patterns

All Redis keys use the prefix defined in `REDIS_KEY_PREFIX` env var (default: empty).

### Attempt Counters (expire after 24h inactivity)

```
auth:fail:ip:{ipAddress}               INTEGER   TTL: 86400s
auth:fail:email:{emailNormalized}      INTEGER   TTL: 86400s
auth:fail:fp:{fingerprintHash}         INTEGER   TTL: 86400s
```

### CAPTCHA Requirement Flags (set when counter ≥ 5)

```
auth:captcha:ip:{ipAddress}            "1"       TTL: 86400s
auth:captcha:email:{emailNormalized}   "1"       TTL: 86400s
auth:captcha:fp:{fingerprintHash}      "1"       TTL: 86400s
```

### Active Lockouts (TTL = lockout duration)

```
auth:lockout:ip:{ipAddress}            JSON: { expiresAt: ISO, level: 1|2|3 }
auth:lockout:email:{emailNormalized}   JSON: { expiresAt: ISO, level: 1|2|3 }
auth:lockout:fp:{fingerprintHash}      JSON: { expiresAt: ISO, level: 1|2|3 }
```

Lockout levels: `1` = 5 min, `2` = 30 min, `3` = 1 hour

### Registration Flood Counters (per day)

```
reg:count:ip:{ipAddress}               INTEGER   TTL: 86400s (resets at midnight UTC)
reg:count:fp:{fingerprintHash}         INTEGER   TTL: 86400s
```

### Whitelist Cache (sync from DB, 5-min TTL)

```
auth:whitelist:ip:{ipAddress}          "1"       TTL: 300s
```

### IP Distinct Counter for Email (for email-level lockout rule)

```
auth:email:ips:{emailNormalized}       SET of IPs   TTL: 86400s
```

---

## Progressive Lockout Algorithm

```
function getApplicableLockout(attemptCount: number): LockoutConfig | null {
  if (attemptCount >= 26) return { type: 'PERMANENT_BAN' }
  if (attemptCount >= 21) return { type: 'LOCKOUT', durationSeconds: 3600,  level: 3 }
  if (attemptCount >= 16) return { type: 'LOCKOUT', durationSeconds: 1800,  level: 2 }
  if (attemptCount >= 11) return { type: 'LOCKOUT', durationSeconds: 300,   level: 1 }
  if (attemptCount >= 6)  return { type: 'CAPTCHA_REQUIRED', delay: 2000 }
  return null
}
```

On lockout expiry, counter is reset to the bottom of the current tier (not zero):
- After 5-min lockout expires → counter reset to 11
- After 30-min lockout expires → counter reset to 16
- After 1-hour lockout expires → counter reset to 21
- After permanent ban is lifted by admin → counter reset to 0

---

## Migration Strategy

1. Create new migration file: `20260428000000_add_auth_protection`
2. Adds 4 new tables: `BrowserFingerprint`, `AuthAttemptLog`, `SecurityBan`, `SecurityWhitelist`
3. Adds 4 new enums: `AttemptType`, `AttemptResult`, `BanType`, `BanReason`
4. Adds relations to existing `User` model
5. No changes to existing columns — non-breaking migration
6. Add 2 new `NotificationTemplate` rows in seed: `SECURITY_SUSPICIOUS_ACTIVITY`, `ADMIN_SECURITY_ALERT`
