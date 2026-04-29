# Tasks — Progressive Auth Protection System

**Feature**: 003-progressive-auth-protection
**Branch**: `003-progressive-auth-protection`
**Total Tasks**: 52
**Status**: Ready for implementation

---

> **Instructions for implementing AI:**
> - Work through tasks in order. Each task lists its dependencies.
> - Each task MUST pass its acceptance criteria before being marked `[X]`.
> - File paths are relative to the project root unless stated otherwise.
> - When a task says "add to existing file", read the full file first before editing.
> - Never skip error handling. Never use `any` in TypeScript.
> - All new backend code must export types. All new services must be injectable (class-based).

---

## Phase 1 — Database Schema

### T001 — Add new enums to Prisma schema
**Status**: [X]
**Depends on**: none
**Files**: `backend/prisma/schema.prisma`

Add the following enums to `schema.prisma` (after existing enums):

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
  AUTO_PROGRESSIVE
  AUTO_REGISTRATION_FLOOD
  MANUAL_ADMIN
}
```

**Acceptance criteria:**
- [ ] `npx prisma validate` passes with no errors
- [ ] All 4 enums appear in the schema file

---

### T002 — Add BrowserFingerprint model to Prisma schema
**Status**: [X]
**Depends on**: T001
**Files**: `backend/prisma/schema.prisma`

Add this model to `schema.prisma`:

```prisma
model BrowserFingerprint {
  id          String   @id @default(uuid())
  hash        String   @unique
  firstSeenAt DateTime @default(now())
  lastSeenAt  DateTime @updatedAt
  seenCount   Int      @default(1)
  userId      String?
  user        User?    @relation("UserFingerprints", fields: [userId], references: [id])

  attempts    AuthAttemptLog[]
  bans        SecurityBan[]

  @@index([hash])
  @@index([userId])
}
```

**Acceptance criteria:**
- [ ] `npx prisma validate` passes

---

### T003 — Add AuthAttemptLog model to Prisma schema
**Status**: [X]
**Depends on**: T001, T002
**Files**: `backend/prisma/schema.prisma`

Add this model to `schema.prisma`:

```prisma
model AuthAttemptLog {
  id              String              @id @default(uuid())
  type            AttemptType
  result          AttemptResult
  ipAddress       String
  emailAttempted  String?
  fingerprintId   String?
  fingerprint     BrowserFingerprint? @relation(fields: [fingerprintId], references: [id])
  userId          String?
  user            User?               @relation("UserAttempts", fields: [userId], references: [id])
  attemptNumber   Int                 @default(1)
  lockoutApplied  Boolean             @default(false)
  banApplied      Boolean             @default(false)
  captchaRequired Boolean             @default(false)
  captchaPassed   Boolean?
  delayApplied    Int                 @default(0)
  userAgent       String?
  metadata        Json?
  createdAt       DateTime            @default(now())

  @@index([ipAddress, createdAt])
  @@index([emailAttempted, createdAt])
  @@index([fingerprintId, createdAt])
  @@index([result, createdAt])
  @@index([type, result, createdAt])
  @@index([createdAt])
}
```

**Acceptance criteria:**
- [ ] `npx prisma validate` passes

---

### T004 — Add SecurityBan model to Prisma schema
**Status**: [X]
**Depends on**: T001, T002
**Files**: `backend/prisma/schema.prisma`

Add this model:

```prisma
model SecurityBan {
  id            String              @id @default(uuid())
  banType       BanType
  reason        BanReason
  notes         String?
  ipAddress     String?
  email         String?
  fingerprintId String?
  fingerprint   BrowserFingerprint? @relation(fields: [fingerprintId], references: [id])
  attemptCount  Int?
  isPermanent   Boolean             @default(false)
  expiresAt     DateTime?
  isActive      Boolean             @default(true)
  createdAt     DateTime            @default(now())
  liftedAt      DateTime?
  liftedById    String?
  liftedBy      User?               @relation("BanLiftedBy", fields: [liftedById], references: [id])
  createdById   String?
  createdBy     User?               @relation("BanCreatedBy", fields: [createdById], references: [id])
  liftReason    String?

  @@index([ipAddress, isActive])
  @@index([email, isActive])
  @@index([fingerprintId, isActive])
  @@index([isActive, expiresAt])
  @@index([createdAt])
  @@index([banType, isActive])
}
```

**Acceptance criteria:**
- [ ] `npx prisma validate` passes

---

### T005 — Add SecurityWhitelist model to Prisma schema
**Status**: [X]
**Depends on**: T001
**Files**: `backend/prisma/schema.prisma`

Add this model:

```prisma
model SecurityWhitelist {
  id          String   @id @default(uuid())
  ipAddress   String   @unique
  reason      String?
  addedById   String
  addedBy     User     @relation("WhitelistAddedBy", fields: [addedById], references: [id])
  createdAt   DateTime @default(now())

  @@index([ipAddress])
}
```

**Acceptance criteria:**
- [ ] `npx prisma validate` passes

---

### T006 — Add new relations to User model
**Status**: [X]
**Depends on**: T002, T003, T004, T005
**Files**: `backend/prisma/schema.prisma`

Find the existing `User` model in schema.prisma and add these relations inside it (after existing relations):

```prisma
// Security relations
fingerprints       BrowserFingerprint[] @relation("UserFingerprints")
authAttempts       AuthAttemptLog[]     @relation("UserAttempts")
bansCreated        SecurityBan[]        @relation("BanCreatedBy")
bansLifted         SecurityBan[]        @relation("BanLiftedBy")
whitelistEntries   SecurityWhitelist[]  @relation("WhitelistAddedBy")
```

**Acceptance criteria:**
- [ ] `npx prisma validate` passes with no errors
- [ ] `npx prisma generate` runs without errors

---

### T007 — Create and run Prisma migration
**Status**: [X]
**Depends on**: T001, T002, T003, T004, T005, T006
**Files**: `backend/prisma/migrations/20260428000000_add_auth_protection/migration.sql` (auto-generated)

Run:
```bash
cd backend
npx prisma migrate dev --name add_auth_protection
```

If running in Docker:
```bash
docker exec eduflow-lms-backend-1 sh -c "cd /app/backend && npx prisma migrate dev --name add_auth_protection"
```

**Acceptance criteria:**
- [ ] Migration file created at `backend/prisma/migrations/20260428000000_add_auth_protection/migration.sql`
- [ ] All 4 tables exist in the database: `BrowserFingerprint`, `AuthAttemptLog`, `SecurityBan`, `SecurityWhitelist`
- [ ] `npx prisma studio` shows all tables with correct columns

---

### T008 — Add notification templates to seed
**Status**: [X]
**Depends on**: T007
**Files**: `backend/prisma/seed.ts`

In `seed.ts`, find where `NotificationTemplate` rows are created (or add after existing seeds) and add:

```typescript
await prisma.notificationTemplate.upsert({
  where: { name: 'SECURITY_SUSPICIOUS_ACTIVITY' },
  update: {},
  create: {
    name: 'SECURITY_SUSPICIOUS_ACTIVITY',
    subject: 'Unusual login activity on your EduFlow account',
    body: `Hello {{fullName}},\n\nWe detected unusual login attempts on your account from IP {{ipAddress}} at {{timestamp}}.\n\nIf this was you: {{wasMe}}\nIf this was NOT you: {{wasNotMe}}\n\nFor your security, we recommend changing your password if you did not attempt to log in.`,
    isActive: true,
  },
});

await prisma.notificationTemplate.upsert({
  where: { name: 'ADMIN_SECURITY_ALERT' },
  update: {},
  create: {
    name: 'ADMIN_SECURITY_ALERT',
    subject: '⚠️ EduFlow Security: Permanent ban triggered',
    body: `A permanent ban has been triggered.\n\nIP: {{ipAddress}}\nEmail: {{email}}\nFingerprint: {{fingerprintHash}}\nAttempt count: {{attemptCount}}\nTime: {{timestamp}}\n\nManage at: {{adminSecurityUrl}}`,
    isActive: true,
  },
});
```

Run seed: `npx prisma db seed`

**Acceptance criteria:**
- [ ] Seed runs without error
- [ ] Both templates exist in `NotificationTemplate` table

---

## Phase 2 — Core Backend Services

### T009 — Create IpExtractor utility
**Status**: [X]
**Depends on**: T007
**Files**: `backend/src/utils/ip-extractor.ts` (new file)

Create the file:

```typescript
import { Request } from 'express';

const IPV4_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;
const IPV6_REGEX = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;

export function extractIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)
      .split(',')[0]
      .trim();
    if (isValidIp(first)) return first;
  }
  const realIp = req.headers['x-real-ip'];
  if (realIp && typeof realIp === 'string' && isValidIp(realIp)) {
    return realIp;
  }
  return req.socket?.remoteAddress ?? '0.0.0.0';
}

function isValidIp(ip: string): boolean {
  return IPV4_REGEX.test(ip) || IPV6_REGEX.test(ip);
}
```

**Acceptance criteria:**
- [ ] File created with no TypeScript errors
- [ ] Function handles: X-Forwarded-For with multiple IPs, missing headers, IPv6 addresses
- [ ] Never throws — always returns a string

---

### T010 — Create FingerprintService
**Status**: [X]
**Depends on**: T007
**Files**: `backend/src/services/fingerprint.service.ts` (new file)

```typescript
import { PrismaClient, BrowserFingerprint } from '@prisma/client';
import { Request } from 'express';

const FINGERPRINT_HEADER = 'x-device-fingerprint';
const VALID_HASH_REGEX = /^[a-f0-9]{64}$/; // SHA-256 hex

export class FingerprintService {
  constructor(private prisma: PrismaClient) {}

  extractFromRequest(req: Request): string | null {
    const raw = req.headers[FINGERPRINT_HEADER];
    if (!raw || typeof raw !== 'string') return null;
    if (!VALID_HASH_REGEX.test(raw)) return null;
    return raw;
  }

  async upsertFingerprint(hash: string, userId?: string): Promise<BrowserFingerprint> {
    return this.prisma.browserFingerprint.upsert({
      where: { hash },
      update: {
        seenCount: { increment: 1 },
        lastSeenAt: new Date(),
        ...(userId ? { userId } : {}),
      },
      create: {
        hash,
        seenCount: 1,
        ...(userId ? { userId } : {}),
      },
    });
  }

  async getByHash(hash: string): Promise<BrowserFingerprint | null> {
    return this.prisma.browserFingerprint.findUnique({ where: { hash } });
  }
}
```

**Acceptance criteria:**
- [ ] `extractFromRequest` returns null for missing/malformed header
- [ ] `extractFromRequest` returns null if hash is not exactly 64 hex chars
- [ ] `upsertFingerprint` creates a new record on first call and increments `seenCount` on subsequent calls

---

### T011 — Create AttemptCounterService
**Status**: [X]
**Depends on**: T007
**Files**: `backend/src/services/attempt-counter.service.ts` (new file)

```typescript
import Redis from 'ioredis';

export type IdentifierType = 'ip' | 'email' | 'fp';

const COUNTER_TTL = 86400; // 24 hours

export class AttemptCounterService {
  constructor(private redis: Redis) {}

  private key(type: IdentifierType, identifier: string): string {
    return `auth:fail:${type}:${identifier.toLowerCase()}`;
  }

  private captchaKey(type: IdentifierType, identifier: string): string {
    return `auth:captcha:${type}:${identifier.toLowerCase()}`;
  }

  private emailIpsKey(email: string): string {
    return `auth:email:ips:${email.toLowerCase()}`;
  }

  async getCount(type: IdentifierType, identifier: string): Promise<number> {
    try {
      const val = await this.redis.get(this.key(type, identifier));
      return val ? parseInt(val, 10) : 0;
    } catch {
      return 0;
    }
  }

  async increment(type: IdentifierType, identifier: string): Promise<number> {
    try {
      const k = this.key(type, identifier);
      const count = await this.redis.incr(k);
      if (count === 1) {
        await this.redis.expire(k, COUNTER_TTL);
      }
      return count;
    } catch {
      return 0;
    }
  }

  async reset(type: IdentifierType, identifier: string, toValue = 0): Promise<void> {
    try {
      const k = this.key(type, identifier);
      if (toValue === 0) {
        await this.redis.del(k);
      } else {
        await this.redis.set(k, toValue.toString(), 'EX', COUNTER_TTL);
      }
    } catch { /* silent */ }
  }

  async setCaptchaRequired(type: IdentifierType, identifier: string): Promise<void> {
    try {
      await this.redis.set(this.captchaKey(type, identifier), '1', 'EX', COUNTER_TTL);
    } catch { /* silent */ }
  }

  async isCaptchaRequired(type: IdentifierType, identifier: string): Promise<boolean> {
    try {
      return (await this.redis.get(this.captchaKey(type, identifier))) === '1';
    } catch {
      return false;
    }
  }

  async clearCaptchaRequired(type: IdentifierType, identifier: string): Promise<void> {
    try {
      await this.redis.del(this.captchaKey(type, identifier));
    } catch { /* silent */ }
  }

  async trackEmailIp(email: string, ip: string): Promise<number> {
    try {
      const k = this.emailIpsKey(email);
      await this.redis.sadd(k, ip);
      await this.redis.expire(k, COUNTER_TTL);
      return await this.redis.scard(k);
    } catch {
      return 1;
    }
  }

  async getRegistrationCount(type: 'ip' | 'fp', identifier: string): Promise<number> {
    try {
      const k = `reg:count:${type}:${identifier.toLowerCase()}`;
      const val = await this.redis.get(k);
      return val ? parseInt(val, 10) : 0;
    } catch {
      return 0;
    }
  }

  async incrementRegistrationCount(type: 'ip' | 'fp', identifier: string): Promise<number> {
    try {
      const k = `reg:count:${type}:${identifier.toLowerCase()}`;
      const count = await this.redis.incr(k);
      if (count === 1) await this.redis.expire(k, 86400);
      return count;
    } catch {
      return 0;
    }
  }
}
```

**Acceptance criteria:**
- [ ] All Redis errors caught silently (never throws)
- [ ] `increment` sets TTL on first increment only
- [ ] `reset(type, id, 11)` sets value to 11, `reset(type, id, 0)` deletes the key

---

### T012 — Create LockoutService
**Status**: [X]
**Depends on**: T011
**Files**: `backend/src/services/lockout.service.ts` (new file)

```typescript
import Redis from 'ioredis';

export type LockoutLevel = 1 | 2 | 3;

export interface LockoutState {
  expiresAt: Date;
  level: LockoutLevel;
  retryAfterSeconds: number;
}

// Bottom threshold per level — counter resets to this on expiry
export const LOCKOUT_RESET_VALUES: Record<LockoutLevel, number> = {
  1: 11,
  2: 16,
  3: 21,
};

export const LOCKOUT_DURATIONS: Record<LockoutLevel, number> = {
  1: parseInt(process.env.AUTH_LOCKOUT_L1_SECONDS ?? '300', 10),
  2: parseInt(process.env.AUTH_LOCKOUT_L2_SECONDS ?? '1800', 10),
  3: parseInt(process.env.AUTH_LOCKOUT_L3_SECONDS ?? '3600', 10),
};

export class LockoutService {
  constructor(private redis: Redis) {}

  private key(type: string, identifier: string): string {
    return `auth:lockout:${type}:${identifier.toLowerCase()}`;
  }

  async check(type: string, identifier: string): Promise<LockoutState | null> {
    try {
      const raw = await this.redis.get(this.key(type, identifier));
      if (!raw) return null;
      const data = JSON.parse(raw) as { expiresAt: string; level: LockoutLevel };
      const expiresAt = new Date(data.expiresAt);
      if (expiresAt <= new Date()) {
        await this.redis.del(this.key(type, identifier));
        return null;
      }
      const retryAfterSeconds = Math.ceil((expiresAt.getTime() - Date.now()) / 1000);
      return { expiresAt, level: data.level, retryAfterSeconds };
    } catch {
      return null;
    }
  }

  async apply(type: string, identifier: string, level: LockoutLevel): Promise<void> {
    try {
      const durationSeconds = LOCKOUT_DURATIONS[level];
      const expiresAt = new Date(Date.now() + durationSeconds * 1000);
      await this.redis.set(
        this.key(type, identifier),
        JSON.stringify({ expiresAt: expiresAt.toISOString(), level }),
        'EX',
        durationSeconds,
      );
    } catch { /* silent */ }
  }

  async clear(type: string, identifier: string): Promise<void> {
    try {
      await this.redis.del(this.key(type, identifier));
    } catch { /* silent */ }
  }
}
```

**Acceptance criteria:**
- [ ] `check` returns null when no lockout or when expired
- [ ] `apply` sets TTL equal to lockout duration
- [ ] All Redis errors caught silently

---

### T013 — Create BanService
**Status**: [X]
**Depends on**: T007, T012
**Files**: `backend/src/services/ban.service.ts` (new file)

The BanService handles reading and writing `SecurityBan` records and syncing bans to Redis.

```typescript
import { PrismaClient, SecurityBan, BanType, BanReason } from '@prisma/client';
import Redis from 'ioredis';

export interface CreateBanInput {
  banType: BanType;
  reason: BanReason;
  notes?: string;
  ipAddress?: string;
  email?: string;
  fingerprintId?: string;
  attemptCount?: number;
  isPermanent?: boolean;
  expiresAt?: Date;
  createdById?: string;
}

export interface BanFilters {
  isActive?: boolean;
  banType?: BanType;
  limit?: number;
  offset?: number;
}

export class BanService {
  constructor(
    private prisma: PrismaClient,
    private redis: Redis,
  ) {}

  private redisBanKey(type: string, identifier: string): string {
    return `auth:ban:${type}:${identifier.toLowerCase()}`;
  }

  async checkActiveBan(
    ip: string,
    email: string | null,
    fpHash: string | null,
  ): Promise<SecurityBan | null> {
    try {
      // Check Redis fast path first
      const ipBanned = await this.redis.get(this.redisBanKey('ip', ip));
      if (ipBanned === '1') {
        return this.prisma.securityBan.findFirst({
          where: { ipAddress: ip, isActive: true },
        });
      }
      // Fallback to DB check
      const where: any = {
        isActive: true,
        OR: [
          { ipAddress: ip },
          ...(email ? [{ email: email.toLowerCase() }] : []),
        ],
      };
      // check expired bans and deactivate them
      const ban = await this.prisma.securityBan.findFirst({ where });
      if (ban?.expiresAt && ban.expiresAt <= new Date()) {
        await this.prisma.securityBan.update({
          where: { id: ban.id },
          data: { isActive: false },
        });
        return null;
      }
      return ban ?? null;
    } catch {
      return null;
    }
  }

  async createBan(data: CreateBanInput): Promise<SecurityBan> {
    const ban = await this.prisma.securityBan.create({ data });
    // Write Redis flag
    if (data.ipAddress) {
      const ttl = data.isPermanent ? 86400 * 365 : data.expiresAt
        ? Math.ceil((data.expiresAt.getTime() - Date.now()) / 1000)
        : 3600;
      await this.redis.set(this.redisBanKey('ip', data.ipAddress), '1', 'EX', ttl).catch(() => {});
    }
    return ban;
  }

  async liftBan(banId: string, adminId: string, liftReason: string): Promise<void> {
    const ban = await this.prisma.securityBan.update({
      where: { id: banId },
      data: { isActive: false, liftedAt: new Date(), liftedById: adminId, liftReason },
    });
    // Clear Redis flag
    if (ban.ipAddress) {
      await this.redis.del(this.redisBanKey('ip', ban.ipAddress)).catch(() => {});
    }
  }

  async extendBan(banId: string, newExpiresAt: Date, adminId: string): Promise<SecurityBan> {
    return this.prisma.securityBan.update({
      where: { id: banId },
      data: { expiresAt: newExpiresAt, isPermanent: false },
    });
  }

  async listBans(filters: BanFilters = {}): Promise<{ data: SecurityBan[]; total: number }> {
    const where: any = {};
    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    if (filters.banType) where.banType = filters.banType;
    const [data, total] = await Promise.all([
      this.prisma.securityBan.findMany({
        where,
        include: { fingerprint: true, liftedBy: { select: { fullName: true } } },
        orderBy: { createdAt: 'desc' },
        take: filters.limit ?? 50,
        skip: filters.offset ?? 0,
      }),
      this.prisma.securityBan.count({ where }),
    ]);
    return { data, total };
  }

  async getStats(): Promise<{
    activeBans: number;
    bansToday: number;
    permanentBans: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [activeBans, bansToday, permanentBans] = await Promise.all([
      this.prisma.securityBan.count({ where: { isActive: true } }),
      this.prisma.securityBan.count({ where: { createdAt: { gte: today } } }),
      this.prisma.securityBan.count({ where: { isActive: true, isPermanent: true } }),
    ]);
    return { activeBans, bansToday, permanentBans };
  }
}
```

**Acceptance criteria:**
- [ ] `checkActiveBan` returns null when Redis is down (fail-open)
- [ ] `createBan` writes both DB and Redis
- [ ] `liftBan` sets `isActive=false` and clears Redis flag
- [ ] Expired bans are auto-deactivated when encountered

---

### T014 — Create WhitelistService
**Status**: [X]
**Depends on**: T007
**Files**: `backend/src/services/whitelist.service.ts` (new file)

```typescript
import { PrismaClient, SecurityWhitelist } from '@prisma/client';
import Redis from 'ioredis';

const WHITELIST_TTL = 300; // 5 minutes Redis cache

export class WhitelistService {
  constructor(
    private prisma: PrismaClient,
    private redis: Redis,
  ) {}

  private key(ip: string): string {
    return `auth:whitelist:ip:${ip}`;
  }

  async isWhitelisted(ip: string): Promise<boolean> {
    try {
      const cached = await this.redis.get(this.key(ip));
      if (cached !== null) return cached === '1';
      const record = await this.prisma.securityWhitelist.findUnique({
        where: { ipAddress: ip },
      });
      const result = record !== null;
      await this.redis.set(this.key(ip), result ? '1' : '0', 'EX', WHITELIST_TTL);
      return result;
    } catch {
      return false; // fail-open for whitelist check failure
    }
  }

  async add(ip: string, addedById: string, reason?: string): Promise<SecurityWhitelist> {
    const record = await this.prisma.securityWhitelist.upsert({
      where: { ipAddress: ip },
      update: { reason, addedById },
      create: { ipAddress: ip, reason, addedById },
    });
    await this.redis.set(this.key(ip), '1', 'EX', WHITELIST_TTL).catch(() => {});
    return record;
  }

  async remove(id: string): Promise<void> {
    const record = await this.prisma.securityWhitelist.delete({ where: { id } });
    await this.redis.del(this.key(record.ipAddress)).catch(() => {});
  }

  async list(): Promise<SecurityWhitelist[]> {
    return this.prisma.securityWhitelist.findMany({
      include: { addedBy: { select: { fullName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async syncToRedis(): Promise<void> {
    try {
      const all = await this.prisma.securityWhitelist.findMany();
      await Promise.all(
        all.map((w) => this.redis.set(this.key(w.ipAddress), '1', 'EX', WHITELIST_TTL)),
      );
    } catch { /* silent on startup */ }
  }
}
```

**Acceptance criteria:**
- [ ] `isWhitelisted` returns false (not true) when Redis AND DB are both unavailable
- [ ] `add` uses upsert — calling it twice for same IP doesn't throw
- [ ] `syncToRedis` called on server startup (add call to `server.ts` or `app.ts`)

---

### T015 — Create CaptchaService
**Status**: [X]
**Depends on**: none (pure HTTP call)
**Files**: `backend/src/services/captcha.service.ts` (new file)

```typescript
import axios from 'axios';
import { AttemptCounterService } from './attempt-counter.service';

const HCAPTCHA_VERIFY_URL = 'https://api.hcaptcha.com/siteverify';

export class CaptchaService {
  constructor(private counterService: AttemptCounterService) {}

  async isRequired(
    ip: string,
    email: string | null,
    fpHash: string | null,
  ): Promise<boolean> {
    const checks = await Promise.all([
      this.counterService.isCaptchaRequired('ip', ip),
      email ? this.counterService.isCaptchaRequired('email', email) : Promise.resolve(false),
      fpHash ? this.counterService.isCaptchaRequired('fp', fpHash) : Promise.resolve(false),
    ]);
    return checks.some(Boolean);
  }

  async verify(token: string | undefined, ip: string): Promise<boolean> {
    if (!token) return false;
    const secret = process.env.HCAPTCHA_SECRET_KEY;
    if (!secret) {
      // If no secret configured (dev), skip verification
      return process.env.NODE_ENV === 'development';
    }
    try {
      const { data } = await axios.post(
        HCAPTCHA_VERIFY_URL,
        new URLSearchParams({ secret, response: token, remoteip: ip }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 5000 },
      );
      return data.success === true;
    } catch {
      return false;
    }
  }
}
```

**Acceptance criteria:**
- [ ] Returns `false` when `HCAPTCHA_SECRET_KEY` not set in production
- [ ] Returns `true` in development when secret not set (dev bypass)
- [ ] Network errors return `false` without throwing
- [ ] Uses 5-second timeout on hCaptcha API call

---

### T016 — Create AttemptLogService
**Status**: [X]
**Depends on**: T007
**Files**: `backend/src/services/attempt-log.service.ts` (new file)

```typescript
import { PrismaClient, AttemptType, AttemptResult } from '@prisma/client';

export interface AttemptLogInput {
  type: AttemptType;
  result: AttemptResult;
  ipAddress: string;
  emailAttempted?: string;
  fingerprintId?: string;
  userId?: string;
  attemptNumber?: number;
  lockoutApplied?: boolean;
  banApplied?: boolean;
  captchaRequired?: boolean;
  captchaPassed?: boolean;
  delayApplied?: number;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface LogFilters {
  type?: AttemptType;
  result?: AttemptResult;
  ipAddress?: string;
  emailAttempted?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export class AttemptLogService {
  constructor(private prisma: PrismaClient) {}

  // Fire-and-forget: never awaited by callers, never throws
  log(data: AttemptLogInput): void {
    this.prisma.authAttemptLog
      .create({ data })
      .catch(() => { /* silently discard */ });
  }

  async listLogs(
    filters: LogFilters = {},
  ): Promise<{ data: unknown[]; total: number }> {
    const where: any = {};
    if (filters.type) where.type = filters.type;
    if (filters.result) where.result = filters.result;
    if (filters.ipAddress) where.ipAddress = { contains: filters.ipAddress };
    if (filters.emailAttempted) where.emailAttempted = { contains: filters.emailAttempted };
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }
    const [data, total] = await Promise.all([
      this.prisma.authAttemptLog.findMany({
        where,
        include: { fingerprint: { select: { hash: true } }, user: { select: { fullName: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        take: Math.min(filters.limit ?? 50, 200),
        skip: filters.offset ?? 0,
      }),
      this.prisma.authAttemptLog.count({ where }),
    ]);
    return { data, total };
  }
}
```

**Acceptance criteria:**
- [ ] `log()` is void — callers must NOT await it
- [ ] `log()` silently discards DB errors
- [ ] `listLogs` caps at 200 rows max per call

---

### T017 — Create ProtectionNotificationService
**Status**: [X]
**Depends on**: T007, T008
**Files**: `backend/src/services/protection-notification.service.ts` (new file)

Create the notification service. It generates signed tokens and sends emails using the existing email infrastructure (the `EmailQueue` table and existing email sending pattern used in `payment.service.ts`).

The service must:
1. Import `jsonwebtoken` (already installed in project)
2. Generate signed acknowledge tokens with 48h expiry using `JWT_ACCESS_SECRET`
3. Queue emails via `prisma.emailQueue.create()` using templates `SECURITY_SUSPICIOUS_ACTIVITY` and `ADMIN_SECURITY_ALERT`

```typescript
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

export type AcknowledgeType = 'was-me' | 'was-not-me';

export class ProtectionNotificationService {
  constructor(private prisma: PrismaClient) {}

  generateAcknowledgeToken(email: string, type: AcknowledgeType): string {
    return jwt.sign(
      { email: email.toLowerCase(), type, purpose: 'security-acknowledge' },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: '48h' },
    );
  }

  verifyAcknowledgeToken(token: string): { email: string; type: AcknowledgeType } | null {
    try {
      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as any;
      if (payload.purpose !== 'security-acknowledge') return null;
      return { email: payload.email, type: payload.type };
    } catch {
      return null;
    }
  }

  async notifyStudentSuspiciousActivity(
    userId: string,
    email: string,
    ipAddress: string,
  ): Promise<void> {
    try {
      const wasMe = this.generateAcknowledgeToken(email, 'was-me');
      const wasNotMe = this.generateAcknowledgeToken(email, 'was-not-me');
      const frontendUrl = process.env.FRONTEND_URL ?? '';
      await this.prisma.emailQueue.create({
        data: {
          userId,
          templateName: 'SECURITY_SUSPICIOUS_ACTIVITY',
          to: email,
          variables: JSON.stringify({
            ipAddress,
            timestamp: new Date().toISOString(),
            wasMe: `${frontendUrl}/security/acknowledge?token=${wasMe}`,
            wasNotMe: `${frontendUrl}/security/acknowledge?token=${wasNotMe}`,
          }),
          status: 'PENDING',
          maxRetries: 3,
        },
      });
    } catch { /* silent */ }
  }

  async notifyAdminPermanentBan(
    ip: string,
    email: string | null,
    fpHash: string | null,
    attemptCount: number,
  ): Promise<void> {
    try {
      const admin = await this.prisma.user.findFirst({ where: { role: 'ADMIN' } });
      if (!admin) return;
      await this.prisma.emailQueue.create({
        data: {
          userId: admin.id,
          templateName: 'ADMIN_SECURITY_ALERT',
          to: admin.email,
          variables: JSON.stringify({
            ipAddress: ip,
            email: email ?? 'unknown',
            fingerprintHash: fpHash ?? 'unknown',
            attemptCount,
            timestamp: new Date().toISOString(),
            adminSecurityUrl: `${process.env.FRONTEND_URL}/admin/security`,
          }),
          status: 'PENDING',
          maxRetries: 3,
        },
      });
    } catch { /* silent */ }
  }
}
```

**Acceptance criteria:**
- [ ] `generateAcknowledgeToken` returns a valid JWT
- [ ] `verifyAcknowledgeToken` returns null for expired or tampered tokens
- [ ] All `prisma` calls wrapped in try/catch — notification failure never crashes the main flow

---

### T018 — Create ProtectionOrchestrator
**Status**: [X]
**Depends on**: T009, T010, T011, T012, T013, T014, T015, T016, T017
**Files**: `backend/src/services/protection-orchestrator.service.ts` (new file)

This is the central coordination service. It implements the full progressive lockout algorithm.

```typescript
import { Request } from 'express';
import { AttemptType, AttemptResult } from '@prisma/client';
import { AttemptCounterService } from './attempt-counter.service';
import { LockoutService } from './lockout.service';
import { BanService } from './ban.service';
import { WhitelistService } from './whitelist.service';
import { CaptchaService } from './captcha.service';
import { AttemptLogService } from './attempt-log.service';
import { FingerprintService } from './fingerprint.service';
import { ProtectionNotificationService } from './protection-notification.service';

export interface ProtectionContext {
  ip: string;
  email: string | null;
  fingerprintHash: string | null;
  attemptType: AttemptType;
  captchaToken?: string;
  userAgent?: string;
}

export interface ProtectionDecision {
  allowed: boolean;
  errorCode?: string;
  retryAfterSeconds?: number;
  captchaRequired?: boolean;
  delayMs?: number;
}

// Configuration — reads from env with defaults
const CONFIG = {
  captchaThreshold:   parseInt(process.env.AUTH_CAPTCHA_THRESHOLD ?? '5', 10),
  l1Threshold:        parseInt(process.env.AUTH_LOCKOUT_L1_THRESHOLD ?? '11', 10),
  l2Threshold:        parseInt(process.env.AUTH_LOCKOUT_L2_THRESHOLD ?? '16', 10),
  l3Threshold:        parseInt(process.env.AUTH_LOCKOUT_L3_THRESHOLD ?? '21', 10),
  banThreshold:       parseInt(process.env.AUTH_PERMANENT_BAN_THRESHOLD ?? '26', 10),
  delayMs:            parseInt(process.env.AUTH_DELAY_MS ?? '2000', 10),
  emailIpThreshold:   parseInt(process.env.AUTH_EMAIL_DISTINCT_IP_THRESHOLD ?? '3', 10),
  regSoftThreshold:   parseInt(process.env.REG_FLOOD_SOFT_THRESHOLD ?? '5', 10),
  regMediumThreshold: parseInt(process.env.REG_FLOOD_MEDIUM_THRESHOLD ?? '11', 10),
  regHardThreshold:   parseInt(process.env.REG_FLOOD_HARD_THRESHOLD ?? '15', 10),
};

export class ProtectionOrchestrator {
  constructor(
    private counter: AttemptCounterService,
    private lockout: LockoutService,
    private ban: BanService,
    private whitelist: WhitelistService,
    private captcha: CaptchaService,
    private logService: AttemptLogService,
    private fpService: FingerprintService,
    private notification: ProtectionNotificationService,
  ) {}

  async checkIncoming(ctx: ProtectionContext): Promise<ProtectionDecision> {
    // Step 1: Whitelist check (fast path)
    if (await this.whitelist.isWhitelisted(ctx.ip)) {
      return { allowed: true };
    }

    // Step 2: Active ban check
    const ban = await this.ban.checkActiveBan(ctx.ip, ctx.email, ctx.fingerprintHash);
    if (ban) {
      return { allowed: false, errorCode: 'BAN_ACTIVE' };
    }

    // Step 3: Lockout check (IP, email, fingerprint — use most restrictive)
    const lockouts = await Promise.all([
      this.lockout.check('ip', ctx.ip),
      ctx.email ? this.lockout.check('email', ctx.email) : null,
      ctx.fingerprintHash ? this.lockout.check('fp', ctx.fingerprintHash) : null,
    ]);
    const activeLockout = lockouts.find((l) => l !== null) ?? null;
    if (activeLockout) {
      return {
        allowed: false,
        errorCode: 'ACCOUNT_LOCKED',
        retryAfterSeconds: activeLockout.retryAfterSeconds,
      };
    }

    // Step 4: CAPTCHA check
    const captchaRequired = await this.captcha.isRequired(
      ctx.ip,
      ctx.email,
      ctx.fingerprintHash,
    );
    if (captchaRequired) {
      if (!ctx.captchaToken) {
        return { allowed: false, errorCode: 'CAPTCHA_REQUIRED', captchaRequired: true };
      }
      const captchaValid = await this.captcha.verify(ctx.captchaToken, ctx.ip);
      if (!captchaValid) {
        return { allowed: false, errorCode: 'CAPTCHA_INVALID' };
      }
    }

    // Step 5: Registration flood check
    if (ctx.attemptType === 'REGISTER') {
      const regDecision = await this.checkRegistrationFlood(ctx);
      if (!regDecision.allowed) return regDecision;
    }

    // Step 6: Get current attempt counts for delay decision
    const ipCount = await this.counter.getCount('ip', ctx.ip);
    const delayMs = ipCount >= CONFIG.captchaThreshold ? CONFIG.delayMs : 0;

    return { allowed: true, delayMs };
  }

  async recordOutcome(
    ctx: ProtectionContext,
    outcome: 'success' | 'failure',
    userId?: string,
    fingerprintId?: string,
  ): Promise<void> {
    if (outcome === 'success') {
      // Clear counters on success
      await Promise.all([
        this.counter.reset('ip', ctx.ip),
        ctx.email ? this.counter.reset('email', ctx.email) : Promise.resolve(),
        ctx.fingerprintHash ? this.counter.reset('fp', ctx.fingerprintHash) : Promise.resolve(),
        ctx.email ? this.counter.clearCaptchaRequired('email', ctx.email) : Promise.resolve(),
        this.counter.clearCaptchaRequired('ip', ctx.ip),
      ]);
      this.logService.log({
        type: ctx.attemptType,
        result: AttemptResult.SUCCESS,
        ipAddress: ctx.ip,
        emailAttempted: ctx.email ?? undefined,
        fingerprintId,
        userId,
        userAgent: ctx.userAgent,
      });
      return;
    }

    // Failure — increment counters
    const [ipCount, emailCount, fpCount] = await Promise.all([
      this.counter.increment('ip', ctx.ip),
      ctx.email ? this.counter.increment('email', ctx.email) : Promise.resolve(0),
      ctx.fingerprintHash ? this.counter.increment('fp', ctx.fingerprintHash) : Promise.resolve(0),
    ]);

    // Track distinct IPs per email for email lockout rule
    let distinctIpCount = 1;
    if (ctx.email) {
      distinctIpCount = await this.counter.trackEmailIp(ctx.email, ctx.ip);
    }

    // Check thresholds and apply lockout/ban
    const maxCount = Math.max(ipCount, fpCount as number);
    let lockoutApplied = false;
    let banApplied = false;
    let captchaRequired = false;

    if (maxCount >= CONFIG.banThreshold) {
      banApplied = true;
      await this.ban.createBan({
        banType: 'IP',
        reason: 'AUTO_PROGRESSIVE',
        ipAddress: ctx.ip,
        attemptCount: maxCount,
        isPermanent: true,
      });
      await this.notification.notifyAdminPermanentBan(
        ctx.ip,
        ctx.email,
        ctx.fingerprintHash,
        maxCount,
      );
    } else if (maxCount >= CONFIG.l3Threshold) {
      lockoutApplied = true;
      await Promise.all([
        this.lockout.apply('ip', ctx.ip, 3),
        ctx.fingerprintHash ? this.lockout.apply('fp', ctx.fingerprintHash, 3) : Promise.resolve(),
      ]);
    } else if (maxCount >= CONFIG.l2Threshold) {
      lockoutApplied = true;
      await Promise.all([
        this.lockout.apply('ip', ctx.ip, 2),
        ctx.fingerprintHash ? this.lockout.apply('fp', ctx.fingerprintHash, 2) : Promise.resolve(),
      ]);
      // Send warning to student if email-level rule triggered
      if (ctx.email && distinctIpCount >= CONFIG.emailIpThreshold && emailCount >= CONFIG.l2Threshold && userId) {
        await this.notification.notifyStudentSuspiciousActivity(userId, ctx.email, ctx.ip);
      }
    } else if (maxCount >= CONFIG.l1Threshold) {
      lockoutApplied = true;
      await Promise.all([
        this.lockout.apply('ip', ctx.ip, 1),
        ctx.fingerprintHash ? this.lockout.apply('fp', ctx.fingerprintHash, 1) : Promise.resolve(),
      ]);
    } else if (maxCount >= CONFIG.captchaThreshold) {
      captchaRequired = true;
      await Promise.all([
        this.counter.setCaptchaRequired('ip', ctx.ip),
        ctx.email ? this.counter.setCaptchaRequired('email', ctx.email) : Promise.resolve(),
        ctx.fingerprintHash ? this.counter.setCaptchaRequired('fp', ctx.fingerprintHash) : Promise.resolve(),
      ]);
    }

    this.logService.log({
      type: ctx.attemptType,
      result: banApplied ? AttemptResult.BLOCKED_BAN
        : lockoutApplied ? AttemptResult.LOCKED_OUT
        : captchaRequired ? AttemptResult.CAPTCHA_REQUIRED
        : AttemptResult.FAIL_CREDENTIALS,
      ipAddress: ctx.ip,
      emailAttempted: ctx.email ?? undefined,
      fingerprintId,
      userId,
      attemptNumber: maxCount,
      lockoutApplied,
      banApplied,
      captchaRequired,
      userAgent: ctx.userAgent,
    });
  }

  private async checkRegistrationFlood(ctx: ProtectionContext): Promise<ProtectionDecision> {
    const [ipCount, fpCount] = await Promise.all([
      this.counter.getRegistrationCount('ip', ctx.ip),
      ctx.fingerprintHash
        ? this.counter.getRegistrationCount('fp', ctx.fingerprintHash)
        : Promise.resolve(0),
    ]);
    const maxCount = Math.max(ipCount, fpCount as number);
    if (maxCount >= CONFIG.regHardThreshold) {
      return { allowed: false, errorCode: 'REG_FLOOD_HARD', retryAfterSeconds: 3600 };
    }
    if (maxCount >= CONFIG.regMediumThreshold) {
      return { allowed: false, errorCode: 'REG_FLOOD_MEDIUM', retryAfterSeconds: 1800 };
    }
    return { allowed: true };
  }

  async recordRegistrationSuccess(ctx: ProtectionContext): Promise<void> {
    await Promise.all([
      this.counter.incrementRegistrationCount('ip', ctx.ip),
      ctx.fingerprintHash
        ? this.counter.incrementRegistrationCount('fp', ctx.fingerprintHash)
        : Promise.resolve(),
    ]);
  }
}
```

**Acceptance criteria:**
- [ ] Whitelist check exits early (no further checks run)
- [ ] Active ban returns `BAN_ACTIVE` without running lockout/captcha checks
- [ ] CAPTCHA required but no token provided → `CAPTCHA_REQUIRED` (not `ACCOUNT_LOCKED`)
- [ ] Success clears all counters for all identifiers
- [ ] Failure at count 26 creates DB ban AND notifies admin
- [ ] All operations wrapped in try/catch — service never throws to caller

---

### T019 — Register all security services in DI container
**Status**: [X]
**Depends on**: T009–T018
**Files**: `backend/src/config/container.ts` OR wherever services are instantiated (check how existing services like `payment.service.ts` are wired — follow same pattern)

Instantiate and export:
- `fingerprintService`
- `attemptCounterService`
- `lockoutService`
- `banService`
- `whitelistService`
- `captchaService`
- `attemptLogService`
- `protectionNotificationService`
- `protectionOrchestrator`

Call `whitelistService.syncToRedis()` during server startup (add to wherever `server.ts` or `app.ts` initializes).

Add new env vars to `backend/src/config/env.ts` Zod schema (all optional with defaults):
```
HCAPTCHA_SECRET_KEY: z.string().optional()
AUTH_CAPTCHA_THRESHOLD: z.string().optional()
AUTH_LOCKOUT_L1_THRESHOLD: z.string().optional()
AUTH_LOCKOUT_L2_THRESHOLD: z.string().optional()
AUTH_LOCKOUT_L3_THRESHOLD: z.string().optional()
AUTH_LOCKOUT_L1_SECONDS: z.string().optional()
AUTH_LOCKOUT_L2_SECONDS: z.string().optional()
AUTH_LOCKOUT_L3_SECONDS: z.string().optional()
AUTH_PERMANENT_BAN_THRESHOLD: z.string().optional()
AUTH_DELAY_MS: z.string().optional()
AUTH_EMAIL_DISTINCT_IP_THRESHOLD: z.string().optional()
REG_FLOOD_SOFT_THRESHOLD: z.string().optional()
REG_FLOOD_MEDIUM_THRESHOLD: z.string().optional()
REG_FLOOD_HARD_THRESHOLD: z.string().optional()
```

**Acceptance criteria:**
- [ ] Server starts without error after this change
- [ ] `whitelistService.syncToRedis()` is called once on startup

---

## Phase 3 — Middleware

### T020 — Create authProtection middleware
**Status**: [X]
**Depends on**: T018, T019
**Files**: `backend/src/middleware/auth-protection.middleware.ts` (new file)

```typescript
import { Request, Response, NextFunction } from 'express';
import { extractIp } from '../utils/ip-extractor';
import { protectionOrchestrator, fingerprintService } from '../config/container';
import { AttemptType } from '@prisma/client';

// Maps route paths to AttemptType
function getAttemptType(path: string): AttemptType {
  if (path.includes('/register')) return 'REGISTER';
  if (path.includes('/forgot-password')) return 'PASSWORD_RESET';
  if (path.includes('/resend-verification')) return 'RESEND_VERIFICATION';
  return 'LOGIN';
}

export function authProtectionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const ip = extractIp(req);
  const fpHash = fingerprintService.extractFromRequest(req);
  const email = req.body?.email ? String(req.body.email).toLowerCase().trim() : null;
  const attemptType = getAttemptType(req.path);
  const captchaToken = req.body?.captchaToken as string | undefined;
  const userAgent = req.headers['user-agent'];

  const ctx = { ip, email, fingerprintHash: fpHash, attemptType, captchaToken, userAgent };

  // Store context on req for post-handler use
  (req as any).__protectionCtx = ctx;

  protectionOrchestrator
    .checkIncoming(ctx)
    .then(async (decision) => {
      if (!decision.allowed) {
        const status = decision.errorCode === 'BAN_ACTIVE' ? 403 : 429;
        res.status(status).json({
          success: false,
          error: decision.errorCode,
          ...(decision.retryAfterSeconds !== undefined && {
            retryAfter: decision.retryAfterSeconds,
          }),
          ...(decision.captchaRequired !== undefined && {
            captchaRequired: decision.captchaRequired,
          }),
        });
        if (decision.retryAfterSeconds !== undefined) {
          res.setHeader('Retry-After', decision.retryAfterSeconds.toString());
        }
        return;
      }

      // Apply delay if needed (captcha tier, attempts 6-10)
      if (decision.delayMs && decision.delayMs > 0) {
        await new Promise((r) => setTimeout(r, decision.delayMs));
      }

      // Hook into response finish to record outcome
      const originalJson = res.json.bind(res);
      res.json = function (body: any) {
        const outcome = res.statusCode < 400 ? 'success' : 'failure';
        const userId = body?.data?.user?.id ?? body?.data?.id ?? undefined;
        const fpId = (req as any).__fingerprintId ?? undefined;
        protectionOrchestrator.recordOutcome(ctx, outcome, userId, fpId).catch(() => {});
        if (outcome === 'success' && attemptType === 'REGISTER') {
          protectionOrchestrator.recordRegistrationSuccess(ctx).catch(() => {});
        }
        return originalJson(body);
      };

      next();
    })
    .catch(() => next()); // fail-open on orchestrator error
}
```

**Acceptance criteria:**
- [ ] Returns 403 with `BAN_ACTIVE` for banned IP
- [ ] Returns 429 with `ACCOUNT_LOCKED` and `Retry-After` header for locked out IP
- [ ] Returns 422 with `CAPTCHA_REQUIRED` when captcha needed but token missing
- [ ] Returns 422 with `CAPTCHA_INVALID` when token fails verification
- [ ] `next()` called on orchestrator error (fail-open)
- [ ] No blocking await in middleware — async errors handled gracefully

---

### T021 — Apply middleware to auth routes
**Status**: [X]
**Depends on**: T020
**Files**: `backend/src/routes/auth.routes.ts` (existing file — modify)

Open `auth.routes.ts` and apply `authProtectionMiddleware` to these routes:

```typescript
import { authProtectionMiddleware } from '../middleware/auth-protection.middleware';

// Apply to:
router.post('/login', authProtectionMiddleware, authController.login);
router.post('/register', authProtectionMiddleware, authController.register);
router.post('/forgot-password', authProtectionMiddleware, authController.forgotPassword);
router.post('/resend-verification', authProtectionMiddleware, authController.resendVerification);
```

**Note:** Do NOT apply to `/refresh`, `/logout`, `/verify-email`, `/reset-password`, or OAuth routes.

**Acceptance criteria:**
- [ ] Server starts without error
- [ ] Calling `POST /api/v1/auth/login` 26 times from the same IP returns 403 on the 26th call
- [ ] Calling `POST /api/v1/auth/refresh` is NOT affected by protection middleware

---

### T022 — Auto-whitelist admin IP on successful login
**Status**: [X]
**Depends on**: T021, T014
**Files**: `backend/src/controllers/auth.controller.ts` (existing — modify)

In `auth.controller.ts`, find the `login` method. After a successful login where `user.role === 'ADMIN'`, add:

```typescript
import { whitelistService } from '../config/container';
import { extractIp } from '../utils/ip-extractor';

// Inside login success path, after issuing tokens:
if (user.role === 'ADMIN') {
  const ip = extractIp(req);
  whitelistService.add(ip, user.id, 'Admin auto-whitelist').catch(() => {});
}
```

**Acceptance criteria:**
- [ ] Admin logs in → their IP appears in `SecurityWhitelist` table
- [ ] Non-admin login does NOT add IP to whitelist
- [ ] Whitelist add failure does not break the login response

---

## Phase 4 — Admin API Endpoints

### T023 — Create security controller (admin)
**Status**: [X]
**Depends on**: T013, T014, T016
**Files**: `backend/src/controllers/admin/security.controller.ts` (new file)

Create a controller with these handlers:

```typescript
import { Request, Response } from 'express';
import { banService, whitelistService, attemptLogService } from '../../config/container';
import { auditService } from '../../config/container'; // existing audit service
import { AttemptType, AttemptResult, BanType, BanReason } from '@prisma/client';

export const securityController = {
  // GET /admin/security/logs
  async getLogs(req: Request, res: Response) {
    const { type, result, ipAddress, emailAttempted, startDate, endDate, limit, offset } = req.query;
    const data = await attemptLogService.listLogs({
      type: type as AttemptType | undefined,
      result: result as AttemptResult | undefined,
      ipAddress: ipAddress as string | undefined,
      emailAttempted: emailAttempted as string | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: limit ? parseInt(limit as string, 10) : 50,
      offset: offset ? parseInt(offset as string, 10) : 0,
    });
    res.json({ success: true, ...data });
  },

  // GET /admin/security/stats
  async getStats(req: Request, res: Response) {
    const stats = await banService.getStats();
    // Also get attempt stats for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const attemptsBlocked = await attemptLogService.listLogs({
      result: AttemptResult.BLOCKED_BAN,
      startDate: today,
      limit: 1,
    });
    res.json({ success: true, data: { ...stats, attemptsBlockedToday: attemptsBlocked.total } });
  },

  // GET /admin/security/bans
  async getBans(req: Request, res: Response) {
    const { isActive, banType, limit, offset } = req.query;
    const data = await banService.listBans({
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      banType: banType as BanType | undefined,
      limit: limit ? parseInt(limit as string, 10) : 50,
      offset: offset ? parseInt(offset as string, 10) : 0,
    });
    res.json({ success: true, ...data });
  },

  // POST /admin/security/bans
  async createBan(req: Request, res: Response) {
    const { banType, ipAddress, email, fingerprintHash, durationMinutes, notes, isPermanent } = req.body;
    const expiresAt = isPermanent ? undefined : new Date(Date.now() + (durationMinutes ?? 60) * 60000);
    const ban = await banService.createBan({
      banType,
      reason: BanReason.MANUAL_ADMIN,
      ipAddress,
      email,
      notes,
      isPermanent: isPermanent ?? false,
      expiresAt,
      createdById: req.user!.id,
    });
    auditService.log({
      actorId: req.user!.id,
      action: 'CREATE_SECURITY_BAN',
      targetType: 'SecurityBan',
      targetId: ban.id,
      metadata: { banType, ipAddress, email, isPermanent },
    }).catch(() => {});
    res.json({ success: true, data: ban });
  },

  // DELETE /admin/security/bans/:id
  async liftBan(req: Request, res: Response) {
    const { reason } = req.body;
    await banService.liftBan(req.params.id, req.user!.id, reason ?? 'Admin lifted');
    auditService.log({
      actorId: req.user!.id,
      action: 'LIFT_SECURITY_BAN',
      targetType: 'SecurityBan',
      targetId: req.params.id,
      metadata: { reason },
    }).catch(() => {});
    res.json({ success: true });
  },

  // PATCH /admin/security/bans/:id
  async extendBan(req: Request, res: Response) {
    const { additionalMinutes } = req.body;
    const ban = await banService.extendBan(
      req.params.id,
      new Date(Date.now() + (additionalMinutes ?? 60) * 60000),
      req.user!.id,
    );
    res.json({ success: true, data: ban });
  },

  // GET /admin/security/whitelist
  async getWhitelist(req: Request, res: Response) {
    const data = await whitelistService.list();
    res.json({ success: true, data });
  },

  // POST /admin/security/whitelist
  async addWhitelist(req: Request, res: Response) {
    const { ipAddress, reason } = req.body;
    const entry = await whitelistService.add(ipAddress, req.user!.id, reason);
    res.json({ success: true, data: entry });
  },

  // DELETE /admin/security/whitelist/:id
  async removeWhitelist(req: Request, res: Response) {
    await whitelistService.remove(req.params.id);
    res.json({ success: true });
  },
};
```

**Acceptance criteria:**
- [ ] All handlers return `{ success: true }` on success
- [ ] `createBan` logs to AuditLog
- [ ] `liftBan` logs to AuditLog
- [ ] TypeScript compiles with no errors

---

### T024 — Create security admin routes
**Status**: [X]
**Depends on**: T023
**Files**: `backend/src/routes/admin/security.routes.ts` (new file), `backend/src/routes/admin.routes.ts` (existing — modify)

Create new file `backend/src/routes/admin/security.routes.ts`:

```typescript
import { Router } from 'express';
import { securityController } from '../../controllers/admin/security.controller';

const router = Router();

router.get('/logs', securityController.getLogs);
router.get('/stats', securityController.getStats);
router.get('/bans', securityController.getBans);
router.post('/bans', securityController.createBan);
router.delete('/bans/:id', securityController.liftBan);
router.patch('/bans/:id', securityController.extendBan);
router.get('/whitelist', securityController.getWhitelist);
router.post('/whitelist', securityController.addWhitelist);
router.delete('/whitelist/:id', securityController.removeWhitelist);

export default router;
```

In `backend/src/routes/admin.routes.ts`, add:
```typescript
import securityRoutes from './admin/security.routes';
// Inside the admin router (already protected by ADMIN role middleware):
router.use('/security', securityRoutes);
```

**Acceptance criteria:**
- [ ] `GET /api/v1/admin/security/logs` returns 200 for admin token
- [ ] `GET /api/v1/admin/security/logs` returns 403 for student token
- [ ] All 9 routes respond without 404

---

## Phase 5 — Student Acknowledge Endpoint

### T025 — Create security acknowledge endpoint
**Status**: [X]
**Depends on**: T017
**Files**: `backend/src/controllers/auth.controller.ts` (existing — add method), `backend/src/routes/auth.routes.ts` (existing — add route)

Add to `auth.controller.ts`:

```typescript
async acknowledgeSecurityAlert(req: Request, res: Response) {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ success: false, error: 'MISSING_TOKEN' });
  }
  const payload = protectionNotificationService.verifyAcknowledgeToken(token);
  if (!payload) {
    return res.status(400).json({ success: false, error: 'INVALID_TOKEN' });
  }
  if (payload.type === 'was-me') {
    // Clear email counter — this was the legitimate user
    await attemptCounterService.reset('email', payload.email);
    await attemptCounterService.clearCaptchaRequired('email', payload.email);
    attemptLogService.log({
      type: AttemptType.LOGIN,
      result: AttemptResult.SUCCESS,
      ipAddress: '0.0.0.0',
      emailAttempted: payload.email,
      metadata: { acknowledgeType: 'was-me' },
    });
    return res.json({ success: true, data: { type: 'was-me', message: 'Email counter cleared.' } });
  }
  // was-not-me — log event and prompt password change
  attemptLogService.log({
    type: AttemptType.LOGIN,
    result: AttemptResult.SUCCESS,
    ipAddress: '0.0.0.0',
    emailAttempted: payload.email,
    metadata: { acknowledgeType: 'was-not-me' },
  });
  return res.json({
    success: true,
    data: { type: 'was-not-me', promptPasswordChange: true },
  });
}
```

Add to `auth.routes.ts`:
```typescript
router.post('/security/acknowledge', authController.acknowledgeSecurityAlert);
```

**Acceptance criteria:**
- [ ] Valid `was-me` token clears email counter
- [ ] Valid `was-not-me` token returns `{ promptPasswordChange: true }`
- [ ] Expired/invalid token returns 400 `INVALID_TOKEN`
- [ ] Route is public (no auth middleware)

---

## Phase 6 — Frontend: Fingerprinting + CAPTCHA

### T026 — Install frontend packages and add env vars
**Status**: [X]
**Depends on**: none
**Files**: `frontend/package.json`, `frontend/.env.example`

```bash
cd frontend
npm install @fingerprintjs/fingerprintjs @hcaptcha/react-hcaptcha
```

Add to `frontend/.env.example`:
```
VITE_HCAPTCHA_SITE_KEY=your_hcaptcha_site_key_here
```

Add to `backend/.env.example`:
```
HCAPTCHA_SECRET_KEY=your_hcaptcha_secret_key_here
```

**Acceptance criteria:**
- [ ] `npm run build` in frontend passes with no errors after installing packages

---

### T027 — Create useDeviceFingerprint hook
**Status**: [X]
**Depends on**: T026
**Files**: `frontend/src/hooks/useDeviceFingerprint.ts` (new file)

```typescript
import { useState, useEffect } from 'react';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

let cachedHash: string | null = null;

export function useDeviceFingerprint(): { fingerprintHash: string | null; isLoading: boolean } {
  const [fingerprintHash, setFingerprintHash] = useState<string | null>(
    () => sessionStorage.getItem('__fp_hash'),
  );
  const [isLoading, setIsLoading] = useState(!fingerprintHash);

  useEffect(() => {
    if (fingerprintHash) {
      setIsLoading(false);
      return;
    }
    if (cachedHash) {
      setFingerprintHash(cachedHash);
      setIsLoading(false);
      return;
    }
    FingerprintJS.load()
      .then((fp) => fp.get())
      .then(async (result) => {
        const combined = result.visitorId + navigator.userAgent;
        const hash = await sha256(combined);
        cachedHash = hash;
        sessionStorage.setItem('__fp_hash', hash);
        setFingerprintHash(hash);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, []);

  return { fingerprintHash, isLoading };
}
```

**Acceptance criteria:**
- [ ] Hook returns `{ fingerprintHash: string, isLoading: false }` within 500ms on modern browser
- [ ] Result is cached in `sessionStorage` — subsequent calls return same value without re-computing
- [ ] Hook returns `{ fingerprintHash: null, isLoading: false }` on error (graceful degradation)

---

### T028 — Create HCaptchaWidget component
**Status**: [X]
**Depends on**: T026
**Files**: `frontend/src/components/shared/HCaptchaWidget.tsx` (new file)

```tsx
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { useRef } from 'react';

interface HCaptchaWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
}

export function HCaptchaWidget({ onVerify, onExpire }: HCaptchaWidgetProps) {
  const captchaRef = useRef<HCaptcha>(null);
  const siteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY as string;

  if (!siteKey) {
    // Dev fallback — auto-pass with placeholder token
    return (
      <div className="rounded-lg border border-amber-400 bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
        CAPTCHA disabled (no site key configured)
        <button
          type="button"
          className="ml-2 text-amber-600 underline"
          onClick={() => onVerify('dev-bypass-token')}
        >
          Continue
        </button>
      </div>
    );
  }

  return (
    <HCaptcha
      ref={captchaRef}
      sitekey={siteKey}
      onVerify={onVerify}
      onExpire={onExpire}
      theme="auto"
    />
  );
}
```

**Acceptance criteria:**
- [ ] Component renders hCaptcha widget when `VITE_HCAPTCHA_SITE_KEY` is set
- [ ] Shows dev bypass button when site key is not set (never breaks dev flow)
- [ ] Calls `onVerify(token)` after successful human verification

---

### T029 — Create API client helper for auth with fingerprint header
**Status**: [X]
**Depends on**: T027
**Files**: `frontend/src/lib/auth-api.ts` (new file) OR modify existing `frontend/src/lib/api.ts`

If an existing `api.ts` exists with axios interceptors, add a request interceptor that:
1. Reads fingerprint hash from `sessionStorage.getItem('__fp_hash')`
2. If present, adds `X-Device-Fingerprint: {hash}` header to all requests to `/api/v1/auth/*`

If no interceptor exists, create a helper:
```typescript
export function getAuthHeaders(): Record<string, string> {
  const fp = sessionStorage.getItem('__fp_hash');
  return fp ? { 'X-Device-Fingerprint': fp } : {};
}
```

**Acceptance criteria:**
- [ ] Every auth API call (login, register) includes `X-Device-Fingerprint` header when fingerprint is available
- [ ] Non-auth API calls are NOT affected

---

## Phase 7 — Frontend: Updated Auth Pages

### T030 — Update Login page with CAPTCHA + progressive error messages
**Status**: [X]
**Depends on**: T027, T028, T029
**Files**: `frontend/src/pages/Login.tsx` (existing — modify)

Changes to make in `Login.tsx`:

1. Import `useDeviceFingerprint` and `HCaptchaWidget`
2. Add state: `const [captchaRequired, setCaptchaRequired] = useState(false)`
3. Add state: `const [captchaToken, setCaptchaToken] = useState<string | null>(null)`
4. Initialize fingerprint hook: `const { fingerprintHash } = useDeviceFingerprint()`
5. In the login API call, add `captchaToken` to request body and `X-Device-Fingerprint` header
6. Parse error responses:
   - `CAPTCHA_REQUIRED` → set `captchaRequired = true`, show widget
   - `CAPTCHA_INVALID` → toast "CAPTCHA verification failed. Please try again.", reset widget
   - `ACCOUNT_LOCKED` → show inline message "Too many attempts. Please wait X minutes." using `retryAfter` from response
   - `BAN_ACTIVE` → show inline message "Access to this account has been suspended. Please contact support."
7. Render `<HCaptchaWidget>` below the submit button when `captchaRequired = true`
8. Disable submit button if `captchaRequired && !captchaToken`

**Acceptance criteria:**
- [ ] First 5 failed logins: no CAPTCHA shown, only standard "Invalid credentials" error
- [ ] 6th failed login: CAPTCHA widget appears
- [ ] After passing CAPTCHA: submit button re-enables
- [ ] Lockout response: shows human-readable countdown message

---

### T031 — Update Register page with CAPTCHA + flood protection messages
**Status**: [X]
**Depends on**: T027, T028, T029
**Files**: `frontend/src/pages/Register.tsx` (existing — modify)

Same pattern as T030 (Login page). Additionally handle:
- `REG_FLOOD_MEDIUM` → "Too many registrations from your network. Please wait 30 minutes."
- `REG_FLOOD_HARD` → "Registration limit reached from your network. Please try again in 1 hour."

**Acceptance criteria:**
- [ ] Registration works normally for first 5 attempts
- [ ] Error messages are clear and user-friendly (no raw error codes shown)
- [ ] CAPTCHA integrates same way as login

---

## Phase 8 — Frontend: Admin Security Pages

### T032 — Create SecurityLogs admin page
**Status**: [X]
**Depends on**: T024
**Files**: `frontend/src/pages/admin/SecurityLogs.tsx` (new file)

Create the page with:

**Layout:** Full-width table with filter bar at top

**Filter bar** (all inline, no separate filter panel):
- Date range picker (Floating UI popover, two date inputs)
- Type dropdown: All / LOGIN / REGISTER / PASSWORD_RESET
- Result dropdown: All / SUCCESS / FAIL / BLOCKED / LOCKED / CAPTCHA
- Search input: searches IP address or email (debounced 300ms)
- Export CSV button → `GET /api/v1/admin/security/logs?export=csv` (add this to controller in T023)

**Table columns** (shadcn Table):
| Column | Notes |
|---|---|
| Timestamp | Relative time + absolute on hover (Floating UI Tooltip) |
| Type | Badge (LOGIN=blue, REGISTER=purple, PASSWORD_RESET=orange) |
| Result | Badge (SUCCESS=green, FAIL=red, BLOCKED=red filled, LOCKED=orange, CAPTCHA=yellow) |
| IP Address | Monospace, clickable → filters table by this IP |
| Email | Truncated, clickable → filters table |
| Fingerprint | First 12 chars + `...`, copy button |
| Attempt # | Number |
| Action | Small text: "5-min lockout", "Permanent ban", "CAPTCHA", or "—" |

**Pagination:** 50 rows/page, prev/next buttons, total count shown

**Empty state:** Illustration + "No security events found"

**API:** `GET /api/v1/admin/security/logs`

**Acceptance criteria:**
- [ ] Page loads with data from API
- [ ] Filters work (each filter triggers new API call)
- [ ] Clicking IP address populates IP filter
- [ ] Pagination works correctly
- [ ] All result badges have correct colors

---

### T033 — Create Security admin page (ban management)
**Status**: [X]
**Depends on**: T024
**Files**: `frontend/src/pages/admin/Security.tsx` (new file)

Create the page with 4 sections:

**Section 1 — Stats Cards** (4 shadcn Cards in a row):
- Active Bans (count, red)
- Bans Today (count, orange)
- Attempts Blocked Today (count, yellow)
- Whitelisted IPs (count, green)
- API: `GET /api/v1/admin/security/stats`

**Section 2 — Active Bans Table** (shadcn Table):

Columns: Type badge | Identifier (IP/email/fingerprint) | Reason | Attempts | Created | Expires | Actions

Actions per row:
- **Unban** button → shadcn Dialog ("Are you sure? Enter reason.") → `DELETE /api/v1/admin/security/bans/:id`
- **Extend** button → shadcn Sheet (duration select: +1hr/+6hr/+24hr/+7d) → `PATCH /api/v1/admin/security/bans/:id`
- **View Logs** button → navigates to `/admin/security/logs?ipAddress={ip}`

Filter: All bans / Active only / Expired only (tabs using shadcn Tabs)

**Section 3 — Add Manual Ban** (shadcn Sheet, opened by "Add Ban" button):

Form fields:
- Ban Type: select (IP / Email / Fingerprint)
- Identifier input: shows "IP Address", "Email", or "Fingerprint Hash" label based on type
- Duration: select (5 min / 30 min / 1 hour / 6 hours / 24 hours / 7 days / Permanent)
- Notes: textarea (optional)
- Submit → `POST /api/v1/admin/security/bans`

**Section 4 — IP Whitelist** (shadcn Card):

Shows list of whitelisted IPs:
- IP address
- Reason ("Admin auto-whitelist" or manual)
- Added by (admin name)
- Added at
- Remove button → `DELETE /api/v1/admin/security/whitelist/:id`

Add IP form inline: input + Add button → `POST /api/v1/admin/security/whitelist`

**Acceptance criteria:**
- [ ] All 4 stats cards show real data
- [ ] Unban dialog requires a reason and shows confirmation
- [ ] Add Ban sheet validates required fields
- [ ] Whitelist shows auto-whitelisted admin IPs
- [ ] All actions show success/error toast (shadcn Sonner)

---

### T034 — Add Security nav items to admin sidebar
**Status**: [X]
**Depends on**: T032, T033
**Files**: `frontend/src/components/layout/AdminShell.tsx` OR `NavBar.tsx` (find where admin nav items are defined)

Add two new nav items under "Audit Log":

```
Audit Log → /admin/audit        (existing)
Security Logs → /admin/security/logs   (new)
Security → /admin/security             (new)
```

Use a lock/shield icon from lucide-react (e.g., `ShieldAlert` for Security, `FileSearch` for Security Logs).

**Acceptance criteria:**
- [ ] Both nav items appear in the admin sidebar
- [ ] Both pages are accessible by navigating from sidebar
- [ ] Active state highlights the correct item per current route

---

## Phase 9 — Email Templates & Acknowledge Page

### T035 — Create SecurityAcknowledge page
**Status**: [X]
**Depends on**: T025
**Files**: `frontend/src/pages/SecurityAcknowledge.tsx` (new file)

This is a public page (no auth required). Route: `/security/acknowledge`.

Reads `token` from URL query string.

On mount, calls `POST /api/v1/auth/security/acknowledge` with `{ token }`.

**States to show:**

Loading: Spinner + "Verifying your response..."

Success `was-me`:
- Green checkmark icon
- "Thanks! We've verified it was you."
- "Your account is safe. No action needed."
- Button: "Back to login" → `/login`

Success `was-not-me` with `promptPasswordChange: true`:
- Orange warning icon
- "Your account security report has been received."
- "We recommend changing your password immediately."
- Button: "Change My Password" → `/forgot-password` (pre-fills email if available)
- Button: "I'll do it later" → `/login`

Error (invalid/expired token):
- Red X icon
- "This security link has expired or is invalid."
- "If you received a suspicious activity email, please log in and change your password."
- Button: "Go to login" → `/login`

Add route to `frontend/src/lib/router.tsx`:
```typescript
<Route path="/security/acknowledge" element={<SecurityAcknowledge />} />
```

**Acceptance criteria:**
- [ ] Valid `was-me` token shows success state
- [ ] Valid `was-not-me` token shows password change prompt
- [ ] Expired token shows error state
- [ ] Page works without being logged in

---

### T036 — Update docs/features/API.md with new endpoints
**Status**: [X]
**Depends on**: T024, T025
**Files**: `docs/features/API.md` (existing — modify)

Add new section **Security Endpoints (Admin)** with all 9 routes from T024.
Add `POST /api/v1/auth/security/acknowledge` to the Auth section.

**Acceptance criteria:**
- [ ] All new endpoints documented with method, path, auth requirement, description

---

### T037 — Update docs/features/AUTH.md with protection section
**Status**: [X]
**Depends on**: none (docs only)
**Files**: `docs/features/AUTH.md` (existing — modify)

Add a new `## Progressive Auth Protection` section documenting:
- The 7 layers
- Threshold table
- Redis key patterns
- How browser fingerprinting works
- Admin whitelist behavior
- What error codes mean

**Acceptance criteria:**
- [ ] Section added and accurate

---

### T038 — Update docs/features/SECURITY.md with new rate limit rows
**Status**: [X]
**Depends on**: none
**Files**: `docs/features/SECURITY.md` (existing — modify)

Add rows to the Rate Limiting table for all new protection lockout behaviors. Add section for "Progressive Auth Lockout" explaining tiers.

Update `.env.example` files (backend + frontend) with all new env vars added in this feature.

**Acceptance criteria:**
- [ ] SECURITY.md rate limit table is accurate
- [ ] Both `.env.example` files have all new vars

---

## Phase 10 — Tests

### T039 — Unit test: AttemptCounterService
**Status**: [X]
**Depends on**: T011
**Files**: `backend/tests/unit/security/attempt-counter.service.test.ts` (new file)

Test cases:
1. `increment` returns 1 on first call
2. `increment` returns 2 on second call for same identifier
3. `increment` for different type+identifier returns 1 (counters are independent)
4. `reset(type, id, 0)` makes next `getCount` return 0
5. `reset(type, id, 11)` makes next `getCount` return 11
6. `isCaptchaRequired` returns false before flag set, true after
7. `trackEmailIp` returns cardinality of distinct IPs
8. Redis errors are caught silently (mock Redis to throw, verify no exception propagates)

Use mocked Redis (`ioredis-mock` or vitest mock).

---

### T040 — Unit test: LockoutService
**Status**: [X]
**Depends on**: T012
**Files**: `backend/tests/unit/security/lockout.service.test.ts` (new file)

Test cases:
1. `check` returns null when no lockout key exists
2. `apply(type, id, 1)` sets key with 300s TTL
3. `check` after `apply` returns state with correct `retryAfterSeconds`
4. `check` returns null when TTL has expired (mock Date)
5. `clear` removes the lockout key
6. Redis errors return null/void without throwing

---

### T041 — Unit test: ProtectionOrchestrator decision tree
**Status**: [X]
**Depends on**: T018
**Files**: `backend/tests/unit/security/protection-orchestrator.test.ts` (new file)

Mock all 8 dependencies (counter, lockout, ban, whitelist, captcha, log, fp, notification).

Test cases:
1. Whitelisted IP → `{ allowed: true }` immediately, no other checks called
2. Active ban → `{ allowed: false, errorCode: 'BAN_ACTIVE' }`
3. Active lockout → `{ allowed: false, errorCode: 'ACCOUNT_LOCKED', retryAfterSeconds: N }`
4. CAPTCHA required + no token → `{ allowed: false, errorCode: 'CAPTCHA_REQUIRED' }`
5. CAPTCHA required + invalid token → `{ allowed: false, errorCode: 'CAPTCHA_INVALID' }`
6. CAPTCHA required + valid token → `{ allowed: true }`
7. Normal request (count < 5) → `{ allowed: true, delayMs: 0 }`
8. Count at 5 → `{ allowed: true, delayMs: 2000 }`
9. `recordOutcome('success')` clears all counters
10. `recordOutcome('failure')` at count 10 → sets CAPTCHA flag
11. `recordOutcome('failure')` at count 15 → applies L1 lockout
12. `recordOutcome('failure')` at count 26 → creates ban + calls `notifyAdminPermanentBan`

---

### T042 — Integration test: Login brute force sequence
**Status**: [X]
**Depends on**: T021, T007 (requires test DB)
**Files**: `backend/tests/integration/auth-brute-force.integration.test.ts` (new file)

Uses the full HTTP server (not mocked services) against the test DB.

Test cases:
1. **Happy path**: 4 failed + 1 success → success, no lockout
2. **CAPTCHA trigger**: 5 failed → 6th returns `CAPTCHA_REQUIRED`
3. **CAPTCHA bypass attempt**: 6th request with no token → `CAPTCHA_REQUIRED`
4. **Lockout trigger**: 10 failed (with CAPTCHA bypass) → 11th returns `ACCOUNT_LOCKED` + `Retry-After: 300`
5. **Counter persistence**: Counter survives between requests (not reset on each request)
6. **IP rotation**: Switch IP after lockout → fingerprint counter still applies (if same fingerprint header)
7. **Permanent ban**: 26 failed attempts → 26th returns 403 `BAN_ACTIVE`

Setup/teardown: clear Redis counters and ban DB rows between tests.

---

### T043 — Integration test: Registration flood
**Status**: [X]
**Depends on**: T021, T007
**Files**: `backend/tests/integration/register-flood.integration.test.ts` (new file)

Test cases:
1. 5 registrations from same IP → all succeed
2. 6th registration → succeeds but must wait (rate limited)
3. 11th registration → `REG_FLOOD_MEDIUM` (30-min lockout)
4. 15th registration → `REG_FLOOD_HARD` (1-hour lockout)
5. Same fingerprint, different IP → fingerprint count triggers lockout independently

---

### T044 — Integration test: Admin ban management
**Status**: [X]
**Depends on**: T024, T007
**Files**: `backend/tests/integration/admin-ban-management.integration.test.ts` (new file)

Test cases:
1. Admin creates manual ban → `GET /admin/security/bans` returns the ban
2. Banned IP tries to login → 403 `BAN_ACTIVE`
3. Admin lifts ban → `DELETE /admin/security/bans/:id` returns 200
4. Previously banned IP tries to login → no longer blocked
5. Admin lift ban is recorded in AuditLog
6. Non-admin cannot access `POST /admin/security/bans` → 403

---

### T045 — Security test: Bypass attempts
**Status**: [X]
**Depends on**: T021
**Files**: `backend/tests/security/auth-bypass.security.test.ts` (new file)

Test cases:
1. **CAPTCHA required, spoofed token**: send random string as `captchaToken` → `CAPTCHA_INVALID`
2. **Missing fingerprint header**: no `X-Device-Fingerprint` → protection still works (IP-only mode)
3. **Invalid fingerprint format**: send non-hex string as fingerprint → ignored, IP-only mode
4. **X-Forwarded-For spoofing**: send multiple IPs in header → first valid IP extracted, not attacker-controlled IP
5. **Timing attack**: 10 lockout checks should have similar response time (within 50ms of each other)
6. **Race condition**: 50 concurrent requests at attempt #25 → only ONE ban created (not 50)

For the race condition test, use `Promise.all(Array.from({ length: 50 }, () => sendRequest()))` and verify `SecurityBan` table has exactly 1 record.

---

### T046 — E2E test: Login CAPTCHA flow
**Status**: [X]
**Depends on**: T030
**Files**: `frontend/tests/e2e/auth-captcha.spec.ts` (new file)

Uses Playwright. Note: hCaptcha cannot be verified in automated tests. Use `VITE_HCAPTCHA_SITE_KEY=` (empty) to trigger the dev bypass button.

Test cases:
1. **Normal flow**: 4 failed logins → no CAPTCHA shown
2. **CAPTCHA appears**: After 5th failure, CAPTCHA widget (or dev bypass button) is visible
3. **Dev bypass**: Click dev bypass → submit succeeds (with dev token)
4. **Lockout message**: When API returns `ACCOUNT_LOCKED`, user sees "Please wait X minutes" message
5. **Ban message**: When API returns `BAN_ACTIVE`, user sees contact support message

---

### T047 — E2E test: Admin security pages
**Status**: [X]
**Depends on**: T032, T033
**Files**: `frontend/tests/e2e/admin-security.spec.ts` (new file)

Test cases:
1. Admin visits `/admin/security` → stats cards load with numbers
2. Admin creates manual ban (IP: "1.2.3.4", 1 hour) → ban appears in table
3. Admin unbans "1.2.3.4" → row disappears or shows expired
4. Admin visits `/admin/security/logs` → table loads
5. Admin filters by result "BLOCKED" → only blocked events shown
6. Admin navigates from sidebar → both security pages accessible

---

## Phase 11 — Final Checks

### T048 — Update ADMIN_DASHBOARD.md
**Status**: [X]
**Depends on**: T032, T033, T034
**Files**: `docs/features/ADMIN_DASHBOARD.md` (existing — modify)

Add two new route entries to the Route Map table:

| `/admin/security/logs` | `pages/admin/SecurityLogs.tsx` | Auth attempt event log |
| `/admin/security` | `pages/admin/Security.tsx` | Ban management + whitelist |

Add documentation sections for each page.

---

### T049 — Update .env.example files
**Status**: [X]
**Depends on**: T019, T026
**Files**: `backend/.env.example`, `frontend/.env.example`

Add ALL new environment variables from this feature to both example files with comments explaining each one.

Backend new vars:
```
# hCaptcha
HCAPTCHA_SECRET_KEY=

# Progressive auth protection thresholds (all optional - have defaults)
AUTH_CAPTCHA_THRESHOLD=5
AUTH_LOCKOUT_L1_THRESHOLD=11
AUTH_LOCKOUT_L1_SECONDS=300
AUTH_LOCKOUT_L2_THRESHOLD=16
AUTH_LOCKOUT_L2_SECONDS=1800
AUTH_LOCKOUT_L3_THRESHOLD=21
AUTH_LOCKOUT_L3_SECONDS=3600
AUTH_PERMANENT_BAN_THRESHOLD=26
AUTH_DELAY_MS=2000
AUTH_EMAIL_DISTINCT_IP_THRESHOLD=3
REG_FLOOD_SOFT_THRESHOLD=5
REG_FLOOD_MEDIUM_THRESHOLD=11
REG_FLOOD_HARD_THRESHOLD=15
```

Frontend new vars:
```
VITE_HCAPTCHA_SITE_KEY=
```

---

### T050 — End-to-end verification (manual QA checklist)
**Status**: [X]
**Depends on**: all previous tasks
**Files**: none (manual testing)

Run the following manual checks in development environment:

1. [ ] Fresh login with correct credentials → works, no protection triggered
2. [ ] Login with wrong password 5 times → CAPTCHA appears on 6th attempt
3. [ ] Login with wrong password 10 times (passing CAPTCHA each time) → 11th shows lockout message with countdown
4. [ ] Wait out 5-minute lockout → can attempt again
5. [ ] Admin logs in → their IP appears in whitelist table at `/admin/security`
6. [ ] Admin navigates to `/admin/security/logs` → sees all previous attempts with correct attempt numbers
7. [ ] Admin creates a manual ban for test IP → attempting login from that IP returns 403
8. [ ] Admin unbans the IP → login works again
9. [ ] Register 6 accounts from same browser in dev → 6th registration shows rate limit delay (check Redis key)
10. [ ] Send security acknowledge test email (manually call `notifyStudentSuspiciousActivity`) → email received with both buttons working

---

### T051 — Update feature memory
**Status**: [X]
**Depends on**: T050
**Files**: `C:\Users\youse\.claude\projects\c--Users-youse-OneDrive-Desktop-project--EduFlow-LMS\memory\features_completed.md`

Update the memory file to record that Feature 003 (Progressive Auth Protection) is complete.

Add entry:
```
**Feature 003 — Progressive Auth Protection (branch: 003-progressive-auth-protection)**
- 7-layer progressive protection: whitelist → ban → lockout → CAPTCHA → registration flood → auto-whitelist → notifications
- hCaptcha after attempt #5, lockouts at 11/16/21 attempts, permanent ban at 26
- Browser fingerprinting via FingerprintJS (X-Device-Fingerprint header)
- DB: BrowserFingerprint, AuthAttemptLog, SecurityBan, SecurityWhitelist tables
- Admin: /admin/security/logs (event log) + /admin/security (ban management + whitelist)
- Student: security acknowledge email with "was me / wasn't me" buttons
- 9 backend tests (unit + integration + security), 2 E2E test files
- All thresholds configurable via env vars (no code change needed to tune)
```

---

## Summary

| Phase | Tasks | Description |
|---|---|---|
| 1 — Database | T001–T008 | Schema, migration, seed templates |
| 2 — Services | T009–T019 | All backend protection services |
| 3 — Middleware | T020–T022 | Protection middleware + route integration |
| 4 — Admin API | T023–T024 | 9 admin security endpoints |
| 5 — Student API | T025 | Security acknowledge endpoint |
| 6 — Frontend Infra | T026–T029 | Fingerprint hook, CAPTCHA component, API headers |
| 7 — Auth Pages | T030–T031 | Updated Login + Register |
| 8 — Admin Pages | T032–T034 | SecurityLogs + Security + nav items |
| 9 — Email + Ack | T035–T038 | Acknowledge page + docs |
| 10 — Tests | T039–T047 | Unit + integration + security + E2E |
| 11 — Final | T048–T051 | Docs + env + QA + memory |

**Total: 51 tasks**

**Implementation order**: T001 → T008 (DB first, then services, then middleware, then UI, then tests)
