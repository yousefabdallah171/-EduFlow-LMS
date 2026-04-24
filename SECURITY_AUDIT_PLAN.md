# EduFlow LMS Security & Performance Remediation Plan

**Date**: 2026-04-21  
**Version**: 1.0  
**Author**: Security Audit Team  
**Status**: ✅ Engineering Implemented (Validation Pending)  
**Target Completion**: 2026-05-17 (4 weeks)

---

## EXECUTIVE SUMMARY

**Implementation Update (2026-04-23)**:
- The core engineering remediations are implemented on `main`.
- Remaining work is production/staging validation: monitoring wiring (Sentry/Prom/Grafana), load evidence (10k→50k→100k), and **human QC sign-off**.
- Source of truth for completion status: `SECURITY_STATUS_REPORT.md` and `SECURITY_REMEDIATION_TASKS_REORGANIZED.md`.

During the comprehensive security audit of the EduFlow LMS platform, **10 critical and high-priority vulnerabilities** were identified that pose immediate risk to the platform's security, especially given the incoming 100,000+ developer/QC testers who will actively attempt to breach the system.

**Most Critical Finding**: Admin routes are completely unprotected - any authenticated STUDENT user can access all admin endpoints (enroll/revoke students, modify pricing, create coupons, access all student data). This is a complete platform bypass.

**Timeline**: 4-week remediation sprint with 3 phases, starting immediately.

---

## CURRENT SITUATION ASSESSMENT

### System Overview

**Architecture**:
- Backend: Node.js 20 + Express + TypeScript + Prisma + PostgreSQL + Redis
- Frontend: React 18 + TypeScript + Vite
- Infrastructure: Docker Compose (local), will scale to VPS
- Target Users: 1 million+ students, starting with 100k QC testers (developers/security engineers)

**Deployment Status**:
- Phase 1 branch (phase-1): All core features implemented
- About to merge to main
- No production deployment yet
- No real users yet

### What's Currently Working (Strengths)

✅ **Video Security Foundation**:
- HLS.js integration with signed tokens (5-minute TTL)
- Token includes userId, lessonId, sessionId binding
- Path traversal protection on video segments (/api/v1/video/:id/segment)
- No direct MP4 access enforced
- Rate limiting on video endpoints (30 requests/min per user for playlist, 600 for segments)
- AES-128 encryption on segments via HLS key file

✅ **Authentication & Authorization**:
- JWT access tokens (15-min) + refresh token rotation (7-day)
- HTTP-only, Secure, SameSite cookies for refresh tokens
- bcrypt password hashing (cost ≥ 12)
- HMAC-SHA512 validation on Paymob webhooks
- Zod validation on all inputs
- Frontend RequireRole guards prevent accidental navigation

✅ **Data Protection**:
- Student enrollment checked before lesson access
- Progress data scoped to requesting user
- Payment records tied to user
- Audit logging on all admin actions

### What's Broken (Critical Vulnerabilities)

🔴 **Issue #1-2: Admin Route Bypass (CRITICAL)**
- Admin routes have NO `authenticate` middleware
- Admin routes have NO `requireRole("ADMIN")` check
- ANY STUDENT can access: /api/v1/admin/students, /api/v1/admin/coupons, etc.
- **Impact**: Complete platform compromise - privilege escalation to admin
- **Files**: backend/src/routes/admin.routes.ts (line 1-50)
- **Exploited By**: Any developer/QC tester in 30 seconds

🔴 **Issue #3: Video Token Reuse After Revocation (HIGH)**
- Video segment endpoint (/api/v1/video/:id/segment) validates token but NOT enrollment status
- If enrollment revoked while token valid, student can continue watching
- 5-minute token TTL = 5-minute access window after revocation
- **Impact**: Revoked students can still access content
- **Files**: backend/src/controllers/lesson.controller.ts (line 576-704)

🟠 **Issue #4: Preview Token Weak Binding (MEDIUM)**
- Preview tokens only bind to IP prefix (first 3 octets) + User-Agent hash
- IP/UA easily spoofed, no device fingerprinting
- Multiple users on same WiFi can share preview tokens indefinitely
- **Impact**: Unlimited free course access for groups of students
- **Files**: backend/src/services/video-token.service.ts (line 108-140)

🟠 **Issue #5: Enrollment Cache Revocation Delay (MEDIUM)**
- Enrollment status cached for 300 seconds (5 minutes)
- When admin revokes student access, there's 5-minute window of stale cache hits
- Student can continue watching videos during cache TTL
- **Impact**: Delayed revocation enforcement
- **Files**: backend/src/services/enrollment.service.ts (line 37-55)

🟠 **Issue #6: N+1 Query Problem (HIGH - Performance)**
- Lesson listing queries lessons with progress relation (per-lesson query)
- With 100 lessons × 100k users = potential performance degradation
- At peak load (100k users fetching lessons), could cause DB bottleneck
- **Impact**: Slow lesson list loading, database overload
- **Files**: backend/src/controllers/lesson.controller.ts (line 148-215)

🟠 **Issue #7: Missing Database Indexes (HIGH - Performance)**
- No indexes on: Enrollment.userId, LessonProgress.userId, VideoToken.sessionId, Payment.userId
- Query plans will use full table scans at scale
- 100k users × multiple queries = database meltdown
- **Impact**: Unacceptable latency at production scale
- **Files**: backend/prisma/schema.prisma

🟠 **Issue #8: No Concurrent Session Limit (MEDIUM - Security)**
- Student can log in from unlimited devices simultaneously
- Single course purchase shared across family/friends = license violation
- No enforcement of "one session per user"
- **Impact**: Revenue loss, account sharing abuse
- **Files**: backend/src/middleware/auth.middleware.ts

🟡 **Issue #9: Course Settings Not Cached (MEDIUM - Performance)**
- /api/v1/course endpoint queries DB on every request
- With 100k users viewing course page = 100k DB hits per second during peak
- **Impact**: Unnecessary database load
- **Files**: backend/src/routes/student.routes.ts (line 21-34)

🟡 **Issue #10: Watermark Data Repeated Queries (LOW - Performance)**
- Each video play queries full User record just for name/email
- Unnecessary database call (data already in JWT)
- **Impact**: Minor performance overhead, not critical
- **Files**: backend/src/controllers/lesson.controller.ts (line 316)

---

## REMEDIATION ROADMAP

### Phase 1: Critical Security Fixes (Week 1 - April 22-28)
**Goal**: Fix complete platform bypasses and prevent immediate exploitation

**Issues to Fix**: #1, #2, #3, #5  
**Estimated Effort**: 20 developer-hours  
**Exit Criteria**: All 4 issues resolved with unit + integration tests  

**Why These First**:
- Issues #1-2 allow ANY student to become admin (total bypass)
- Issue #3 allows access after revocation
- Issue #5 affects revocation enforcement timing
- These must be fixed before ANY user testing can begin

**Expected Outcome**:
- Admin routes require authentication AND RBAC
- Video segments re-verify enrollment before serving
- Enrollment cache invalidated immediately on revocation
- All student-to-admin privilege escalation paths closed

---

### Phase 2: Performance & Scale Hardening (Week 2-3 - April 29 - May 10)
**Goal**: Ensure platform survives 100k concurrent QC testers without degradation

**Issues to Fix**: #6, #7, #9  
**Estimated Effort**: 25 developer-hours  
**Exit Criteria**: Load tests pass with 100k concurrent users, p95 latency < 500ms  

**Why Phase 2**:
- Can't test load properly until security issues fixed (wasted effort)
- Performance issues become obvious once testers arrive
- Database indexes critical for production readiness
- Caching essential to handle 100k concurrent requests

**Expected Outcome**:
- All critical queries have proper indexes
- Lesson list loads in < 1 second with 100 lessons
- Course page serves 1000s of concurrent requests without DB spike
- No N+1 queries in production

---

### Phase 3: Defense Hardening & Monitoring (Week 4 - May 11-17)
**Goal**: Implement defense mechanisms to prevent security testing from exposing additional vulnerabilities

**Issues to Fix**: #4, #8  
**Estimated Effort**: 30 developer-hours  
**Exit Criteria**: Concurrent session enforcement live, preview token binding strengthened  

**Why Phase 3**:
- Security testing will attempt to find additional bypasses
- Concurrent session limiting prevents account sharing abuse
- Stronger preview token binding prevents token reuse
- Monitoring/alerting catches exploitation attempts

**Expected Outcome**:
- Single active session per user (old sessions invalidated on new login)
- Preview tokens bind to device fingerprint (not just IP/UA)
- Rate limiting adaptive (tighten on detected abuse)
- All exploitation attempts logged and alertable
- Security checklist completed for QC team

---

## DETAILED BREAKDOWN BY SEVERITY

### 🔴 CRITICAL (Must Fix Before Any User Testing)

#### Issue #1: Admin Routes Missing Authentication
- **File**: backend/src/routes/admin.routes.ts
- **Current State**: No `authenticate` middleware on admin routes
- **Current Code** (Lines 1-25):
  ```typescript
  const router = Router();
  
  router.use(auditMiddleware);  // ONLY middleware - no auth!
  
  router.get("/health", (_req, res) => {
    res.json({ scope: "admin" });
  });
  router.get("/students", adminStudentsController.list);  // Guest can access!
  ```
- **Problem**: Guest user (not logged in) can GET /api/v1/admin/students
- **Test This Now**:
  ```bash
  curl -X GET http://localhost:3000/api/v1/admin/students
  # Should return 401 UNAUTHORIZED
  # Currently returns 200 with student list
  ```
- **Fix**: Add `authenticate` middleware before routes
- **Complexity**: LOW (5-line change)
- **Risk of Fix**: NONE (proper security practice)

#### Issue #2: Admin Routes Missing RBAC
- **File**: backend/src/routes/admin.routes.ts
- **Current State**: No `requireRole("ADMIN")` check
- **Current Code** (Lines 26-40):
  ```typescript
  router.get("/students", adminStudentsController.list);
  router.get("/students/:studentId", adminStudentsController.detail);
  router.post("/students/:studentId/enroll", adminStudentsController.enroll);
  // STUDENT role can access all of these!
  ```
- **Problem**: Any authenticated STUDENT can enroll/revoke other students
- **Exploit Scenario**:
  1. Developer logs in as STUDENT (purchases course)
  2. Calls POST /api/v1/admin/students/123/revoke
  3. Other student loses access to course
  4. Developer calls POST /api/v1/admin/students/456/enroll
  5. Random person gets free course access
- **Test This Now**:
  ```bash
  # Login as student
  curl -X POST http://localhost:3000/api/v1/auth/login \
    -d '{"email":"student@test.com","password":"password"}'
  
  # Try admin operation
  curl -X POST http://localhost:3000/api/v1/admin/students/123/revoke \
    -H "Authorization: Bearer $STUDENT_TOKEN"
  # Should return 403 FORBIDDEN
  # Currently returns 200 (success)
  ```
- **Fix**: Add `requireRole("ADMIN")` middleware
- **Complexity**: LOW (3-line change)
- **Risk of Fix**: NONE

#### Issue #3: Video Segment Access After Revocation
- **File**: backend/src/controllers/lesson.controller.ts
- **Current State**: segment() endpoint validates token but NOT enrollment
- **Current Code** (Lines 576-670):
  ```typescript
  async segment(req: Request, res: Response, next: NextFunction) {
    try {
      // ... token validation
      const payload = await videoTokenService.validateToken({
        token,
        lessonId,
        // ... validates token expiry, session, etc.
      });
      
      // MISSING: NO ENROLLMENT CHECK HERE!
      // If this line wasn't here in validateToken, we'd serve content
      
      // ... serve segment
    }
  }
  ```
- **Problem**: Token includes enrollment check in videoTokenService, BUT token can outlive revocation
- **Exploit Scenario**:
  1. Student enrolls (token issued, valid for 5 min)
  2. After 30 seconds, admin revokes access
  3. Student still has valid token until 5-min TTL expires
  4. All playlist/key/segment requests succeed during this window
- **Test This Now**:
  ```bash
  # Student gets video token
  curl -X GET http://localhost:3000/api/v1/lessons/lesson-123 \
    -H "Authorization: Bearer $STUDENT_TOKEN"
  # Returns { videoToken: "jwt...", hlsUrl: "..." }
  
  # Admin revokes access (in separate process)
  curl -X POST http://localhost:3000/api/v1/admin/students/student-id/revoke \
    -H "Authorization: Bearer $ADMIN_TOKEN"
  
  # Student STILL has the token and can use it for 5 minutes
  curl -X GET "http://localhost:3000/api/v1/video/lesson-123/segment?token=$VIDEO_TOKEN"
  # Should return 403 (revoked)
  # Currently returns 200 (segment served)
  ```
- **Root Cause**: `videoTokenService.validateToken()` calls `enrollmentService.getStatus()` which caches for 300s
- **Fix**: Add direct enrollment re-check before serving segment
- **Complexity**: MEDIUM (requires cache invalidation logic)
- **Risk of Fix**: LOW (adds 3-line check)

---

### 🟠 HIGH PRIORITY (Must Fix Before Load Testing)

#### Issue #6: N+1 Query Problem in Lesson Listing
- **File**: backend/src/controllers/lesson.controller.ts
- **Current State**: Lesson listing includes progress relation with WHERE clause
- **Current Code** (Lines 148-215):
  ```typescript
  async getAllLessonsGrouped(req: Request, res: Response) {
    const sections = await prisma.section.findMany({
      include: {
        lessons: {
          where: { isPublished: true },
          select: {
            id: true,
            progress: {
              where: { userId: req.user!.userId },  // <-- This is per-lesson
              select: { completedAt: true, lastPositionSeconds: true },
              take: 1
            }
          }
        }
      }
    });
  }
  ```
- **Problem**: For 100 lessons, generates 101 queries (1 for sections, 100 for lessons × 1 for progress)
- **At Scale**: 100k users × 100 lessons = 10 million progress queries per hour = DB overload
- **Test This Now**:
  ```bash
  # Enable query logging in Prisma
  # Add to .env: PRISMA_CLIENT_ENGINE_LOG=trace
  
  # Call lesson endpoint
  curl -X GET http://localhost:3000/api/v1/lessons/grouped \
    -H "Authorization: Bearer $TOKEN"
  
  # Check logs - should see 101 queries, not 1
  ```
- **Fix**: Batch load progress data separately
- **Complexity**: MEDIUM (requires refactoring query)
- **Risk of Fix**: LOW (better performance, same functionality)

#### Issue #7: Missing Database Indexes
- **File**: backend/prisma/schema.prisma
- **Current State**: No indexes on critical lookup columns
- **Problem Columns**:
  - `Enrollment.userId` (queried constantly to check access)
  - `LessonProgress.userId` (queried in lesson list)
  - `LessonProgress.lessonId` (queried per lesson)
  - `VideoToken.sessionId` (queried on video playback)
  - `Payment.userId` (queried on orders page)
- **Impact at Scale**: Full table scans for every query
- **Test This Now**:
  ```bash
  # Connect to PostgreSQL
  psql $DATABASE_URL
  
  # Check index usage
  SELECT * FROM pg_stat_user_indexes
  WHERE idx_scan < 1000 AND schemaname = 'public';
  # If enrollment.userId has 0 scans, it's not indexed
  ```
- **Fix**: Add @@index directives to schema
- **Complexity**: LOW (5-line schema change, 1 migration)
- **Risk of Fix**: NONE (only improves performance)

---

### 🟡 MEDIUM PRIORITY (High Value, Moderate Effort)

#### Issue #4: Preview Token Weak Binding
- **File**: backend/src/services/video-token.service.ts
- **Current State**: Binds only to IP prefix + User-Agent hash
- **Current Code** (Lines 108-140):
  ```typescript
  if (session.ipPrefix && currentIpPrefix && session.ipPrefix !== currentIpPrefix) {
    throw new VideoTokenError(...);  // IP changed
  }
  if (session.uaHash && currentUaHash && session.uaHash !== currentUaHash) {
    throw new VideoTokenError(...);  // UA changed
  }
  ```
- **Problem**: Both are easily spoofed or change legitimately
- **Exploit**: Share token with friends on same WiFi (same IP) using same browser (same UA)
- **Fix**: Add device fingerprinting using Canvas/WebGL
- **Complexity**: MEDIUM (requires frontend + backend changes)
- **Risk of Fix**: LOW (adds validation, doesn't break existing)

#### Issue #5: Enrollment Cache Revocation Delay
- **File**: backend/src/services/enrollment.service.ts
- **Current State**: Cache TTL = 300 seconds
- **Current Code** (Line 53):
  ```typescript
  await redis.set(enrollmentCacheKey(userId), JSON.stringify(value), "EX", 300);
  ```
- **Problem**: 5-minute delay between revocation and enforcement
- **Fix**: Reduce TTL + add cache invalidation webhook
- **Complexity**: MEDIUM (requires Redis pub/sub setup)
- **Risk of Fix**: LOW (improves security)

#### Issue #8: No Concurrent Session Limit
- **File**: backend/src/middleware/auth.middleware.ts
- **Current State**: Multiple sessions allowed per user
- **Problem**: One course license shared across unlimited devices
- **Fix**: Track active sessions, invalidate old ones on new login
- **Complexity**: MEDIUM (requires session management)
- **Risk of Fix**: LOW (doesn't affect normal users)

---

### 🟢 LOW PRIORITY (Nice to Have)

#### Issue #9: Course Settings Not Cached
- **File**: backend/src/routes/student.routes.ts
- **Complexity**: LOW (2-minute fix)

#### Issue #10: Watermark Data Query
- **File**: backend/src/controllers/lesson.controller.ts
- **Complexity**: LOW (1-minute fix)

---

## ACCEPTANCE CRITERIA FOR EACH PHASE

### Phase 1 Acceptance Criteria (Critical Fixes)

- [ ] Admin routes require `authenticate` middleware
- [ ] Admin routes require `requireRole("ADMIN")` middleware
- [ ] STUDENT cannot GET /api/v1/admin/students (returns 403)
- [ ] STUDENT cannot POST /api/v1/admin/students/:id/enroll (returns 403)
- [ ] STUDENT cannot DELETE /api/v1/admin/coupons/:id (returns 403)
- [ ] Video segment endpoint re-checks enrollment before serving
- [ ] After enrollment revocation, subsequent segment requests return 403 within 30 seconds
- [ ] Enrollment cache invalidation on revoke triggers immediately
- [ ] All changes tested with integration tests
- [ ] No breaking changes to admin functionality

### Phase 2 Acceptance Criteria (Performance)

- [ ] Lesson list endpoint uses batch queries (no N+1)
- [ ] Enrollment.userId index created and used
- [ ] LessonProgress indexes created and used
- [ ] VideoToken.sessionId index created and used
- [ ] Payment.userId index created and used
- [ ] Load test: 1000 concurrent users can fetch lessons without > 500ms p95 latency
- [ ] Load test: 10k concurrent users on course page without DB timeout
- [ ] All queries verified with EXPLAIN ANALYZE plans
- [ ] Database indices migrated to production safely

### Phase 3 Acceptance Criteria (Defense)

- [ ] Concurrent session enforcement: new login invalidates old sessions
- [ ] Preview token binding includes device fingerprint
- [ ] Rate limiting adaptive: detects and tightens on abuse patterns
- [ ] All exploitation attempts logged to audit log
- [ ] Security checklist delivered and verified with QC team
- [ ] Documentation updated for each security fix

---

## FILES TO BE CREATED/MODIFIED

### Backend Files to Modify

```
backend/src/
├── middleware/
│   ├── auth.middleware.ts          [MODIFY] Add authenticate to admin
│   ├── rbac.middleware.ts          [MODIFY] Already exists, add to admin routes
│   ├── session.middleware.ts       [CREATE] Session enforcement for concurrent limits
│   └── enrollment-cache.middleware.ts [CREATE] Immediate cache invalidation
├── routes/
│   └── admin.routes.ts             [MODIFY] Add auth + RBAC to all routes
├── controllers/
│   └── lesson.controller.ts        [MODIFY] Add enrollment check in segment()
├── services/
│   ├── enrollment.service.ts       [MODIFY] Reduce cache TTL, add invalidation
│   ├── session.service.ts          [CREATE] Concurrent session management
│   └── video-token.service.ts      [MODIFY] Strengthen preview token binding
└── utils/
    └── device-fingerprint.ts       [CREATE] Canvas/WebGL fingerprinting
    
backend/prisma/
└── schema.prisma                   [MODIFY] Add indexes
└── migrations/
    └── add_indexes.sql             [CREATE] Index creation migration

backend/tests/
├── integration/
│   ├── admin-rbac.test.ts          [CREATE] Test #1-2 fixes
│   ├── video-revocation.test.ts    [CREATE] Test #3 fix
│   ├── session-limit.test.ts       [CREATE] Test #8 fix
│   └── performance-indexing.test.ts [CREATE] Test #6-7 fixes
└── unit/
    ├── session.service.test.ts     [CREATE] Test concurrent sessions
    └── device-fingerprint.test.ts  [CREATE] Test fingerprinting
```

### Frontend Files to Modify

```
frontend/src/
├── services/
│   └── device-fingerprint.ts       [CREATE] Generate fingerprint on client
├── lib/
│   └── api.ts                      [MODIFY] Send fingerprint with video requests
└── pages/
    └── Lesson.tsx                  [MODIFY] Include fingerprint in headers
```

### Documentation Files

```
docs/
├── SECURITY_AUDIT_PLAN.md          [THIS FILE]
├── SECURITY_REMEDIATION_TASKS.md   [CREATE] Detailed task list
├── SECURITY_CHECKLIST_QC.md        [CREATE] QC team testing guide
└── PERFORMANCE_OPTIMIZATION_GUIDE.md [CREATE] Index/caching best practices
```

---

## SUCCESS METRICS

### Before Fixes (Current State)

```
Vulnerability Score: 8.9/10 (CRITICAL)
- Privilege Escalation: 10/10 (Admin bypass possible)
- Data Isolation: 7/10 (Revocation delayed)
- Video Protection: 6/10 (Token reuse possible)
- Performance at 100k users: UNKNOWN (needs load test)
```

### After Phase 1 (Week 1)

```
Vulnerability Score: 4.2/10 (MEDIUM)
- Privilege Escalation: 1/10 (Fixed)
- Data Isolation: 5/10 (Improved)
- Video Protection: 8/10 (Fixed)
- Performance at 100k users: UNKNOWN (still needs testing)
```

### After Phase 2 (Week 3)

```
Vulnerability Score: 3.5/10 (MEDIUM)
- Performance at 100k users: 9/10 (Load tested + indexed)
- All critical infrastructure ready for scale
```

### After Phase 3 (Week 4)

```
Vulnerability Score: 2.1/10 (LOW)
- Privilege Escalation: 1/10
- Data Isolation: 9/10
- Video Protection: 9/10
- Performance: 9/10
- Session Security: 9/10
- Defense Monitoring: 9/10
```

---

## DEPENDENCIES & PREREQUISITES

### Required Tools

- [ ] PostgreSQL 16+ (for running migrations)
- [ ] Redis 7+ (for testing cache invalidation)
- [ ] Node.js 20 LTS
- [ ] Docker + Docker Compose (for testing at scale)
- [ ] Artillery.io (for load testing)
- [ ] New Relic / DataDog (for production monitoring)

### Required Knowledge

- Developers must understand: JWT, OAuth, RBAC patterns, video streaming, Redis caching
- QA must understand: Security testing, exploitation techniques, penetration testing
- DevOps must understand: Database indexing, query optimization, load testing

### Team Allocation

- **Backend Developer**: 35 hours (primary on #1-8)
- **Frontend Developer**: 5 hours (device fingerprinting)
- **DevOps/Database**: 15 hours (indexing, migrations, load testing)
- **QA/Security**: 20 hours (integration tests, security testing)
- **Total**: ~75 developer-hours across 4 weeks

---

## RISK MITIGATION

### If We Don't Fix These Issues

**Business Risk**:
- 100k QC testers will immediately exploit #1-2 (admin bypass)
- Platform will be considered "broken" before real launch
- Security team will flag for mandatory fixes before production
- Reputation damage if vulnerabilities leaked publicly

**Operational Risk**:
- Issue #6-7 will cause database meltdown at 100k concurrent users
- Cannot launch if platform times out under load
- Issue #8 enables unlimited account sharing (revenue loss)

### Risk of Making These Fixes

**Low Risk Because**:
- Fixes are standard security practices (no novel changes)
- Changes are additive (add auth/RBAC, don't remove features)
- All changes have clear rollback paths
- Tests will validate no regression in functionality

**Mitigation**:
- All changes on separate feature branches
- Full integration test suite before merge
- Staging environment testing with 10k+ concurrent users
- Gradual rollout to production with feature flags

---

## TIMELINE & MILESTONES

```
Week 1 (April 22-28): Critical Security Fixes
  Mon-Tue: Implement #1-2 (admin auth/RBAC)
  Wed-Thu: Implement #3 (video revocation check) + #5 (cache invalidation)
  Fri: Integration testing + code review

Week 2-3 (April 29-May 10): Performance Hardening
  Mon-Tue: Implement #6-7 (N+1 fixes + indexing)
  Wed-Thu: Load testing + query optimization
  Fri: Database migration + validation

Week 4 (May 11-17): Defense Hardening
  Mon-Tue: Implement #4 (preview token) + #8 (concurrent sessions)
  Wed-Thu: Monitoring + alerting setup
  Fri: QC checklist + documentation

May 17: Go/No-Go Decision for 100k QC Tester Onboarding
```

---

## COMMUNICATION PLAN

### Weekly Status Report
- Monday: Week plan + blockers
- Thursday: Progress update + emerging issues
- Friday: Metrics + next week preview

### Stakeholder Communication
- **Yousef (Product Owner)**: Weekly executive summary
- **Dev Team**: Daily standup on blockers
- **QA Team**: Early briefing on test plans
- **Security Team**: Weekly vulnerability status

---

## APPENDIX A: Example Exploit Code

### Exploit #1: Student Becomes Admin

```bash
#!/bin/bash
# This exploit will be found within 30 seconds of QC testing

# 1. Register as normal student
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "attacker@test.com",
    "password": "SecurePassword123",
    "fullName": "Test User"
  }'

# 2. Login as student
RESPONSE=$(curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "attacker@test.com",
    "password": "SecurePassword123"
  }')

STUDENT_TOKEN=$(echo $RESPONSE | jq -r '.accessToken')

# 3. Access admin endpoints (should return 403, currently returns 200)
curl -X GET http://localhost:3000/api/v1/admin/students \
  -H "Authorization: Bearer $STUDENT_TOKEN"
# VULNERABLE: Returns list of all students!

curl -X GET http://localhost:3000/api/v1/admin/coupons \
  -H "Authorization: Bearer $STUDENT_TOKEN"
# VULNERABLE: Returns all coupons!

# 4. Exploit: Enroll attacker in course without payment
ADMIN_STUDENT_ID="550e8400-e29b-41d4-a716-446655440000"  # Known student ID
curl -X POST http://localhost:3000/api/v1/admin/students/$ADMIN_STUDENT_ID/enroll \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enrollmentType": "PAID"}'
# VULNERABLE: Student enrolled without payment!
```

**Result**: Attacker is now enrolled, can watch all videos, without paying anything. No admin privileges needed for simple exploitation.

---

## APPENDIX B: Example Test Case

### Test Case for Phase 1 Fix Validation

```typescript
// File: backend/tests/integration/admin-rbac.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '@/app.js';
import { prisma } from '@/config/database.js';

describe('Admin RBAC Protection', () => {
  let studentToken: string;
  let adminToken: string;
  let studentUserId: string;

  beforeAll(async () => {
    // Create test users
    const student = await prisma.user.create({
      data: {
        email: `student-rbac-${Date.now()}@test.com`,
        passwordHash: 'hashed_password',
        fullName: 'Test Student',
        role: 'STUDENT'
      }
    });
    studentUserId = student.id;

    // Mock token generation (in real test, use actual auth flow)
    studentToken = generateToken({ userId: student.id, role: 'STUDENT' });
    adminToken = generateToken({ userId: 'admin-id', role: 'ADMIN' });
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
  });

  describe('GET /api/v1/admin/students', () => {
    it('should allow admin to list students', async () => {
      const response = await request(app)
        .get('/api/v1/admin/students')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.students)).toBe(true);
    });

    it('should deny student access (403)', async () => {
      const response = await request(app)
        .get('/api/v1/admin/students')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('FORBIDDEN');
    });

    it('should deny unauthenticated access (401)', async () => {
      const response = await request(app)
        .get('/api/v1/admin/students');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /api/v1/admin/students/:id/enroll', () => {
    it('should allow admin to enroll student', async () => {
      const response = await request(app)
        .post(`/api/v1/admin/students/${studentUserId}/enroll`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it('should deny student from enrolling another student (403)', async () => {
      const response = await request(app)
        .post(`/api/v1/admin/students/${studentUserId}/enroll`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('FORBIDDEN');
    });
  });

  describe('DELETE /api/v1/admin/coupons/:id', () => {
    it('should deny student from deleting coupons (403)', async () => {
      const response = await request(app)
        .delete('/api/v1/admin/coupons/coupon-123')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
    });
  });
});
```

---

## APPENDIX C: Database Migration Example

```sql
-- File: backend/prisma/migrations/2026_04_22_add_indexes.sql

-- Add indexes for critical lookups
CREATE INDEX IF NOT EXISTS "idx_enrollment_user_status" 
  ON "Enrollment"("userId", "status");

CREATE INDEX IF NOT EXISTS "idx_enrollment_enrolled_at"
  ON "Enrollment"("enrolledAt");

CREATE INDEX IF NOT EXISTS "idx_lesson_progress_user_lesson"
  ON "LessonProgress"("userId", "lessonId");

CREATE INDEX IF NOT EXISTS "idx_lesson_progress_user"
  ON "LessonProgress"("userId");

CREATE INDEX IF NOT EXISTS "idx_video_token_session"
  ON "VideoToken"("sessionId");

CREATE INDEX IF NOT EXISTS "idx_video_token_hash"
  ON "VideoToken"("tokenHash");

CREATE INDEX IF NOT EXISTS "idx_payment_user_created"
  ON "Payment"("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "idx_lesson_published"
  ON "Lesson"("isPublished");

CREATE INDEX IF NOT EXISTS "idx_section_order"
  ON "Section"("courseId", "sortOrder");

-- Analyze tables to update statistics
ANALYZE "Enrollment";
ANALYZE "LessonProgress";
ANALYZE "VideoToken";
ANALYZE "Payment";
ANALYZE "Lesson";
```

---

## NEXT STEPS

1. **Immediately**: Review this plan with the security team
2. **Today**: Create detailed tasks.md from this plan
3. **Tomorrow**: Begin Phase 1 implementation
4. **Weekly**: Update status and metrics
5. **May 17**: Go/No-Go decision for QC onboarding

---

**Document Version**: 1.0  
**Last Updated**: 2026-04-21  
**Next Review**: After Phase 1 completion (2026-04-29)
