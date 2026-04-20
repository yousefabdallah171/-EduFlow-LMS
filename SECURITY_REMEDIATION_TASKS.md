# EduFlow LMS - Security Remediation Task List

**Document Type**: Developer Task Breakdown  
**Status**: Ready for Implementation  
**Date Created**: 2026-04-21  
**Total Tasks**: 24 (organized by phase)  
**Estimated Effort**: 75 developer-hours  
**Target Completion**: 2026-05-17

---

## QUICK START

1. Create feature branches for each phase
2. Follow checklist items in order
3. Run tests after each task
4. Create PR with all checklist items verified
5. Merge when all acceptance criteria met

---

# PHASE 1: CRITICAL SECURITY FIXES (Week 1)

**Phase Duration**: April 22-28 (5 business days)  
**Priority**: 🔴 MUST COMPLETE BEFORE QC TESTING  
**Issues Addressed**: #1, #2, #3, #5  
**Estimated Effort**: 20 developer-hours

---

## TASK 1.1: Add Authentication Middleware to Admin Routes

**Severity**: 🔴 CRITICAL  
**Related Issue**: #1, #2  
**Files to Modify**:
- `backend/src/routes/admin.routes.ts`

**Description**:
Admin routes currently have NO authentication middleware. ANY guest user can access /api/v1/admin/* endpoints. This fix adds the `authenticate` middleware to block unauthenticated requests.

**Current Code**:
```typescript
// backend/src/routes/admin.routes.ts (Line 1-25)
import { Router } from "express";
import { adminAnalyticsController } from "../controllers/admin/analytics.controller.js";
// ... other imports ...

const router = Router();

router.use(auditMiddleware);  // ONLY middleware - no auth!

router.get("/health", (_req, res) => {
  res.json({ scope: "admin" });
});
router.get("/students", adminStudentsController.list);  // No authentication!
```

**Required Change**:
```typescript
import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/rbac.middleware.js";
import { adminAnalyticsController } from "../controllers/admin/analytics.controller.js";
// ... other imports ...

const router = Router();

router.use(authenticate);        // NEW: Add auth check
router.use(requireRole("ADMIN")); // NEW: Add role check (will be removed in Task 1.2)
router.use(auditMiddleware);

router.get("/health", (_req, res) => {
  res.json({ scope: "admin" });
});
router.get("/students", adminStudentsController.list);
```

**Acceptance Criteria**:
- [ ] Guest request to GET /api/v1/admin/students returns 401 UNAUTHORIZED
- [ ] Request with invalid token returns 401 UNAUTHORIZED
- [ ] Request with expired token returns 401 UNAUTHORIZED
- [ ] Request with student token returns 403 FORBIDDEN (from requireRole check)

**Implementation Checklist**:
- [ ] Import `authenticate` and `requireRole` at top of admin.routes.ts
- [ ] Add `router.use(authenticate)` before `router.use(auditMiddleware)`
- [ ] Add `router.use(requireRole("ADMIN"))` after authenticate
- [ ] Test: `curl -X GET http://localhost:3000/api/v1/admin/students` (should return 401)
- [ ] Test: Student token to /api/v1/admin/students (should return 403)
- [ ] Verify /health still returns 200 with admin token
- [ ] No breaking changes to other admin routes

**Testing Command**:
```bash
# Test 1: Guest access (should fail with 401)
curl -X GET http://localhost:3000/api/v1/admin/students

# Test 2: Student token (should fail with 403)
curl -X GET http://localhost:3000/api/v1/admin/students \
  -H "Authorization: Bearer $STUDENT_TOKEN"

# Test 3: Admin token (should succeed with 200)
curl -X GET http://localhost:3000/api/v1/admin/students \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Time Estimate**: 30 minutes  
**Complexity**: LOW

---

## TASK 1.2: Verify RBAC Middleware Works on Admin Routes

**Severity**: 🔴 CRITICAL  
**Related Issue**: #2  
**Files to Check**:
- `backend/src/middleware/rbac.middleware.ts`
- `backend/src/routes/admin.routes.ts`

**Description**:
The `requireRole("ADMIN")` middleware already exists (see middleware/rbac.middleware.ts). This task verifies it's properly applied to admin routes (already done in Task 1.1) and tests that students are properly rejected.

**Current Middleware Code** (should already exist):
```typescript
// backend/src/middleware/rbac.middleware.ts
export const requireRole =
  (...roles: Array<"ADMIN" | "STUDENT">) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "UNAUTHORIZED" });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "FORBIDDEN" });
      return;
    }

    next();
  };
```

**Acceptance Criteria**:
- [ ] Student token to ANY admin endpoint returns 403 FORBIDDEN
- [ ] Admin token to admin endpoints returns 200
- [ ] Error message is consistent: `{ error: "FORBIDDEN" }`
- [ ] No race conditions in middleware

**Implementation Checklist**:
- [ ] Verify `authenticate` middleware sets `req.user` properly
- [ ] Verify `requireRole` middleware checks `req.user.role === "ADMIN"`
- [ ] Test all critical admin endpoints with student token:
  - [ ] GET /api/v1/admin/students (403)
  - [ ] POST /api/v1/admin/students/:id/enroll (403)
  - [ ] POST /api/v1/admin/students/:id/revoke (403)
  - [ ] GET /api/v1/admin/coupons (403)
  - [ ] POST /api/v1/admin/coupons (403)
  - [ ] DELETE /api/v1/admin/coupons/:id (403)
  - [ ] GET /api/v1/admin/lessons (403)
  - [ ] POST /api/v1/admin/lessons (403)

**Testing Command**:
```bash
# Comprehensive RBAC test
STUDENT_TOKEN="eyJhbGc..."  # Get from login

endpoints=(
  "GET /api/v1/admin/students"
  "GET /api/v1/admin/coupons"
  "GET /api/v1/admin/lessons"
  "GET /api/v1/admin/pricing"
  "GET /api/v1/admin/orders"
  "GET /api/v1/admin/analytics"
)

for endpoint in "${endpoints[@]}"; do
  echo "Testing: $endpoint"
  curl -s -X $(echo $endpoint | cut -d' ' -f1) \
    http://localhost:3000/api/v1$(echo $endpoint | cut -d' ' -f2) \
    -H "Authorization: Bearer $STUDENT_TOKEN" | jq '.error'
  # Should return "FORBIDDEN"
done
```

**Time Estimate**: 45 minutes  
**Complexity**: LOW

---

## TASK 1.3: Add Enrollment Re-Check to Video Segment Endpoint

**Severity**: 🔴 CRITICAL  
**Related Issue**: #3 - Video Token Reuse After Revocation  
**Files to Modify**:
- `backend/src/controllers/lesson.controller.ts`

**Description**:
The video segment endpoint validates the JWT token but does NOT re-verify that the student is still enrolled. If a student's enrollment is revoked while they have a valid video token (5-minute TTL), they can continue watching videos indefinitely until the token expires.

**Current Vulnerable Code** (Line 576-704):
```typescript
async segment(req: Request, res: Response, next: NextFunction) {
  try {
    setVideoNoStoreHeaders(res);
    const lessonId = getFirstValue(req.params.id);
    const token = getFirstValue(req.query.token as string | string[] | undefined);
    const segment = getFirstValue(req.query.file as string | string[] | undefined) ?? 
                   getFirstValue(req.params.segment);
    if (!lessonId || !segment) {
      res.status(400).json({ error: "SEGMENT_REQUIRED" });
      return;
    }

    const client = getClientContext({ ip: req.ip, userAgent: req.get("user-agent") });
    const payload = await videoTokenService.validateToken({
      token,
      lessonId,
      rawRefreshToken: req.cookies.refresh_token as string | undefined,
      previewSessionIdCookie: req.cookies.preview_session as string | undefined,
      ip: req.ip,
      userAgent: req.get("user-agent") ?? undefined
    });

    // MISSING: RE-CHECK ENROLLMENT HERE!
    // After token validation, we should verify enrollment status
    
    // ... rest of code serves segment
  } catch (error) {
    handleLessonError(error, res, next);
  }
}
```

**Required Fix**:
Add enrollment re-check right after token validation:

```typescript
async segment(req: Request, res: Response, next: NextFunction) {
  try {
    setVideoNoStoreHeaders(res);
    const lessonId = getFirstValue(req.params.id);
    const token = getFirstValue(req.query.token as string | string[] | undefined);
    const segment = getFirstValue(req.query.file as string | string[] | undefined) ?? 
                   getFirstValue(req.params.segment);
    if (!lessonId || !segment) {
      res.status(400).json({ error: "SEGMENT_REQUIRED" });
      return;
    }

    const client = getClientContext({ ip: req.ip, userAgent: req.get("user-agent") });
    const payload = await videoTokenService.validateToken({
      token,
      lessonId,
      rawRefreshToken: req.cookies.refresh_token as string | undefined,
      previewSessionIdCookie: req.cookies.preview_session as string | undefined,
      ip: req.ip,
      userAgent: req.get("user-agent") ?? undefined
    });

    // FIX: RE-CHECK ENROLLMENT FOR PAID/ENROLLED USERS
    const isPreview = "isPreview" in payload && (payload as { isPreview?: boolean }).isPreview;
    if (!isPreview) {
      const fullPayload = payload as { userId: string; lessonId: string; sessionId: string };
      const enrollmentStatus = await enrollmentService.getStatus(fullPayload.userId);
      if (!enrollmentStatus.enrolled || enrollmentStatus.status !== "ACTIVE") {
        throw new VideoTokenError("NOT_ENROLLED", 403, "Your enrollment has been revoked.");
      }
    }

    // ... rest of code serves segment
  } catch (error) {
    handleLessonError(error, res, next);
  }
}
```

**Why This Matters**:
- Prevents access after revocation
- Adds security layer even if token somehow bypasses validation
- Minimal performance impact (uses cached enrollment check)

**Acceptance Criteria**:
- [ ] Token validation succeeds
- [ ] Enrollment status checked for non-preview users
- [ ] If enrollment ACTIVE, segment served (200)
- [ ] If enrollment REVOKED, error returned (403)
- [ ] Preview tokens bypass enrollment check
- [ ] Response time < 50ms (cached check)

**Implementation Checklist**:
- [ ] Import `enrollmentService` if not already imported
- [ ] Add enrollment check after payload validation
- [ ] Check for `isPreview` flag to bypass check for preview users
- [ ] Cast payload to full type when checking enrollment
- [ ] Use existing `enrollmentService.getStatus()` method
- [ ] Test revocation scenario:
  - [ ] Student gets video token
  - [ ] Admin revokes enrollment
  - [ ] Student tries to fetch segment within 30 seconds
  - [ ] Request returns 403 with "NOT_ENROLLED" error
- [ ] Test preview users still work:
  - [ ] Guest preview request still serves segments without enrollment check
- [ ] Check error handling matches existing pattern

**Testing Command**:
```bash
# Setup: Get student token and enroll them
STUDENT_ID="..."
LESSON_ID="..."

# Step 1: Student gets video token
RESPONSE=$(curl -s -X GET \
  http://localhost:3000/api/v1/lessons/$LESSON_ID \
  -H "Authorization: Bearer $STUDENT_TOKEN")
VIDEO_TOKEN=$(echo $RESPONSE | jq -r '.videoToken')

# Step 2: Test segment access BEFORE revocation (should succeed)
curl -s -X GET \
  "http://localhost:3000/api/v1/video/$LESSON_ID/segment?token=$VIDEO_TOKEN&file=segment-000.ts" | head -c 100
# Should return video data (binary)

# Step 3: Admin revokes student
curl -s -X POST \
  http://localhost:3000/api/v1/admin/students/$STUDENT_ID/revoke \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Step 4: Test segment access AFTER revocation (should fail)
curl -s -X GET \
  "http://localhost:3000/api/v1/video/$LESSON_ID/segment?token=$VIDEO_TOKEN&file=segment-000.ts"
# Should return { error: "NOT_ENROLLED", message: "Your enrollment has been revoked." }
```

**Code Locations**:
- Enrollment check code: `backend/src/services/enrollment.service.ts:37-55`
- Error handling: `backend/src/controllers/lesson.controller.ts:107-131`
- VideoTokenError: `backend/src/services/video-token.service.ts:37-45`

**Time Estimate**: 1 hour  
**Complexity**: MEDIUM

---

## TASK 1.4: Add Cache Invalidation on Enrollment Revocation

**Severity**: 🟠 MEDIUM (High)  
**Related Issue**: #5 - Enrollment Cache 5-Minute Delay  
**Files to Modify**:
- `backend/src/services/enrollment.service.ts`
- `backend/src/controllers/admin/students.controller.ts`

**Description**:
When admin revokes a student's enrollment, the change takes effect immediately in the database BUT the Redis cache isn't invalidated. This means the student has a 5-minute window where cached enrollment status shows "ACTIVE" while they're actually revoked. This task adds immediate cache invalidation.

**Current Code** (vulnerable):
```typescript
// backend/src/services/enrollment.service.ts Line 31-35
async revoke(userId: string, revokedById?: string) {
  const enrollment = await enrollmentRepository.revoke(userId, revokedById);
  // Cache is set to 300 seconds (5 minutes)
  await redis.set(enrollmentCacheKey(userId), JSON.stringify({ enrolled: false, status: enrollment.status }), "EX", 300);
  return enrollment;
}
```

**Problem**: Even though the cache is updated, it's updated to be valid for 300 more seconds.

**Fix**: Delete cache immediately instead of setting it:
```typescript
// backend/src/services/enrollment.service.ts
async revoke(userId: string, revokedById?: string) {
  const enrollment = await enrollmentRepository.revoke(userId, revokedById);
  // IMMEDIATE INVALIDATION: Delete cache key instead of setting
  await redis.del(enrollmentCacheKey(userId));
  return enrollment;
}
```

This forces the next `getStatus()` call to hit the database and get the fresh REVOKED status.

**Additional Fix**: Reduce cache TTL for normal enrollments:
```typescript
async getStatus(userId: string) {
  const cached = await redis.get(enrollmentCacheKey(userId));
  if (cached) {
    return JSON.parse(cached) as { enrolled: boolean; status?: string };
  }

  const enrollment = await enrollmentRepository.findByUserId(userId);
  const value = enrollment
    ? {
        enrolled: enrollment.status === "ACTIVE",
        status: enrollment.status,
        enrollmentType: enrollment.enrollmentType,
        enrolledAt: enrollment.enrolledAt
      }
    : { enrolled: false };

  // REDUCED TTL: From 300 to 60 seconds (1 minute)
  await redis.set(enrollmentCacheKey(userId), JSON.stringify(value), "EX", 60);
  return value;
}
```

**Acceptance Criteria**:
- [ ] After revocation, cache key is deleted immediately
- [ ] Next request hits database and gets REVOKED status
- [ ] Normal enrollment cache TTL reduced to 60 seconds
- [ ] Enrollment check after revocation returns false within 1 second
- [ ] No negative impact on performance
- [ ] All existing tests still pass

**Implementation Checklist**:
- [ ] Change `revoke()` method to delete cache instead of set
- [ ] Change `getStatus()` method to use 60-second TTL instead of 300
- [ ] Test immediate revocation:
  - [ ] Get enrollment status (should be ACTIVE)
  - [ ] Admin revokes enrollment
  - [ ] Immediately get enrollment status again (should be REVOKED)
  - [ ] No 5-minute delay
- [ ] Test that cache still works for normal cases:
  - [ ] Enroll student
  - [ ] Get status (hits DB)
  - [ ] Get status again (hits cache)
  - [ ] Verify cache is used (check Redis key exists)
- [ ] Monitor Redis memory usage (shouldn't increase)

**Testing Command**:
```bash
# Setup
STUDENT_ID="..."
ADMIN_TOKEN="..."

# Test 1: Verify enrollment active
curl -s -X GET \
  http://localhost:3000/api/v1/admin/students/$STUDENT_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.enrollment.status'
# Should return "ACTIVE"

# Test 2: Check Redis cache exists
redis-cli GET "enrollment:$STUDENT_ID"
# Should return { "enrolled": true, "status": "ACTIVE" }

# Test 3: Revoke enrollment
curl -s -X POST \
  http://localhost:3000/api/v1/admin/students/$STUDENT_ID/revoke \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Test 4: Check cache is deleted IMMEDIATELY
redis-cli GET "enrollment:$STUDENT_ID"
# Should return (nil)

# Test 5: Verify status is REVOKED (hits fresh DB)
curl -s -X GET \
  http://localhost:3000/api/v1/admin/students/$STUDENT_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.enrollment.status'
# Should return "REVOKED"
```

**Code Locations**:
- Cache key: `backend/src/services/enrollment.service.ts:6`
- Revoke method: `backend/src/services/enrollment.service.ts:31-35`
- GetStatus method: `backend/src/services/enrollment.service.ts:37-55`

**Time Estimate**: 30 minutes  
**Complexity**: LOW

---

## TASK 1.5: Create Integration Tests for Phase 1 Fixes

**Severity**: 🟠 MEDIUM  
**Related Issues**: #1, #2, #3, #5  
**Files to Create**:
- `backend/tests/integration/admin-rbac.test.ts` (NEW)
- `backend/tests/integration/video-revocation.test.ts` (NEW)

**Description**:
Create comprehensive integration tests that verify all Phase 1 fixes work correctly. These tests will prevent regression in future changes.

**File 1: Admin RBAC Tests**

```typescript
// backend/tests/integration/admin-rbac.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '@/app.js';
import { prisma } from '@/config/database.js';
import { generateToken } from '@/utils/test-helpers.js';

describe('Admin RBAC Protection', () => {
  let studentToken: string;
  let adminToken: string;
  let studentUserId: string;

  beforeAll(async () => {
    // Create test student
    const student = await prisma.user.create({
      data: {
        email: `student-rbac-${Date.now()}@test.com`,
        passwordHash: 'hashed',
        fullName: 'Test Student',
        role: 'STUDENT'
      }
    });
    studentUserId = student.id;
    studentToken = generateToken({ userId: student.id, role: 'STUDENT' });
    adminToken = generateToken({ userId: 'admin-id', role: 'ADMIN' });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { role: 'STUDENT' } });
  });

  describe('Student RBAC: GET /api/v1/admin/*', () => {
    it('should deny student from listing students (403)', async () => {
      const response = await request(app)
        .get('/api/v1/admin/students')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('FORBIDDEN');
    });

    it('should deny student from listing coupons (403)', async () => {
      const response = await request(app)
        .get('/api/v1/admin/coupons')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('FORBIDDEN');
    });

    it('should deny student from listing lessons (403)', async () => {
      const response = await request(app)
        .get('/api/v1/admin/lessons')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('FORBIDDEN');
    });
  });

  describe('Student RBAC: POST /api/v1/admin/*', () => {
    it('should deny student from enrolling another student (403)', async () => {
      const response = await request(app)
        .post(`/api/v1/admin/students/${studentUserId}/enroll`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('FORBIDDEN');
    });

    it('should deny student from revoking another student (403)', async () => {
      const response = await request(app)
        .post(`/api/v1/admin/students/${studentUserId}/revoke`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('FORBIDDEN');
    });

    it('should deny student from creating coupon (403)', async () => {
      const response = await request(app)
        .post('/api/v1/admin/coupons')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ code: 'TEST10', discountPercentage: 10 });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('FORBIDDEN');
    });
  });

  describe('Unauthenticated RBAC', () => {
    it('should deny guest from accessing admin endpoints (401)', async () => {
      const response = await request(app)
        .get('/api/v1/admin/students');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('UNAUTHORIZED');
    });

    it('should deny guest from accessing with invalid token (401)', async () => {
      const response = await request(app)
        .get('/api/v1/admin/students')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('UNAUTHORIZED');
    });
  });

  describe('Admin Access', () => {
    it('should allow admin to list students (200)', async () => {
      const response = await request(app)
        .get('/api/v1/admin/students')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.students)).toBe(true);
    });

    it('should allow admin to enroll student (200)', async () => {
      const response = await request(app)
        .post(`/api/v1/admin/students/${studentUserId}/enroll`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });
  });
});
```

**File 2: Video Revocation Tests**

```typescript
// backend/tests/integration/video-revocation.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '@/app.js';
import { prisma } from '@/config/database.js';
import { redis } from '@/config/redis.js';

describe('Video Access After Revocation', () => {
  let studentToken: string;
  let adminToken: string;
  let studentId: string;
  let lessonId: string;
  let videoToken: string;

  beforeAll(async () => {
    // Create student
    const student = await prisma.user.create({
      data: {
        email: `video-revoke-${Date.now()}@test.com`,
        passwordHash: 'hashed',
        fullName: 'Video Test',
        role: 'STUDENT'
      }
    });
    studentId = student.id;
    studentToken = generateToken({ userId: student.id, role: 'STUDENT' });
    adminToken = generateToken({ userId: 'admin', role: 'ADMIN' });

    // Create lesson
    const lesson = await prisma.lesson.create({
      data: {
        sectionId: 'section-1',
        titleEn: 'Test Lesson',
        titleAr: 'درس اختبار',
        isPublished: true,
        videoHlsPath: 'test.m3u8'
      }
    });
    lessonId = lesson.id;

    // Enroll student
    await prisma.enrollment.create({
      data: {
        userId: student.id,
        status: 'ACTIVE',
        enrollmentType: 'PAID'
      }
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: studentId } });
    await prisma.lesson.deleteMany({ where: { id: lessonId } });
  });

  it('should allow access with valid enrollment', async () => {
    // Get video token
    const tokenResponse = await request(app)
      .get(`/api/v1/lessons/${lessonId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(tokenResponse.status).toBe(200);
    videoToken = tokenResponse.body.videoToken;
    expect(videoToken).toBeDefined();

    // Try to access segment
    const segmentResponse = await request(app)
      .get(`/api/v1/video/${lessonId}/segment?token=${videoToken}&file=segment-000.ts`);

    expect(segmentResponse.status).toBe(200);
  });

  it('should deny access after enrollment revocation', async () => {
    // Revoke enrollment
    const revokeResponse = await request(app)
      .post(`/api/v1/admin/students/${studentId}/revoke`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(revokeResponse.status).toBe(200);

    // Try to access segment with old token (should fail)
    await new Promise(resolve => setTimeout(resolve, 100)); // Ensure cache invalidation

    const segmentResponse = await request(app)
      .get(`/api/v1/video/${lessonId}/segment?token=${videoToken}&file=segment-000.ts`);

    expect(segmentResponse.status).toBe(403);
    expect(segmentResponse.body.error).toBe('NOT_ENROLLED');
  });

  it('should clear enrollment cache on revocation', async () => {
    // Enroll student again
    await prisma.enrollment.updateMany({
      where: { userId: studentId },
      data: { status: 'ACTIVE' }
    });

    // Cache key should be deleted
    const cacheKey = `enrollment:${studentId}`;
    await redis.del(cacheKey);

    // Get status (will populate cache)
    const statusBefore = await redis.get(cacheKey);
    expect(statusBefore).not.toBeNull();

    // Revoke and check cache is cleared
    await request(app)
      .post(`/api/v1/admin/students/${studentId}/revoke`)
      .set('Authorization', `Bearer ${adminToken}`);

    const statusAfter = await redis.get(cacheKey);
    expect(statusAfter).toBeNull();
  });
});
```

**Acceptance Criteria**:
- [ ] All 15+ test cases pass
- [ ] Tests cover both authentication and authorization
- [ ] Tests cover normal operation and edge cases
- [ ] Tests verify cache behavior
- [ ] No flaky tests (run 3 times, all pass)

**Implementation Checklist**:
- [ ] Create test files with correct imports
- [ ] Setup test database/Redis for tests
- [ ] Create helper functions (generateToken, etc.)
- [ ] Write and run all test cases
- [ ] Verify 100% pass rate
- [ ] Check coverage is > 80%
- [ ] Document test running instructions

**Testing Command**:
```bash
# Run Phase 1 tests
npm test -- admin-rbac.test.ts video-revocation.test.ts

# Run with coverage
npm test -- --coverage admin-rbac.test.ts video-revocation.test.ts

# Run in watch mode (during development)
npm test -- --watch admin-rbac.test.ts
```

**Time Estimate**: 2 hours  
**Complexity**: MEDIUM

---

## TASK 1.6: Code Review & Testing for Phase 1

**Severity**: 🟠 MEDIUM  
**Related Issues**: All Phase 1 issues  
**Files to Review**:
- `backend/src/routes/admin.routes.ts` (Tasks 1.1-1.2)
- `backend/src/controllers/lesson.controller.ts` (Task 1.3)
- `backend/src/services/enrollment.service.ts` (Task 1.4)
- `backend/tests/integration/*` (Task 1.5)

**Description**:
Full code review to ensure all Phase 1 changes are correct, tested, and ready for merge.

**Code Review Checklist**:
- [ ] All authentication middleware applied
- [ ] All RBAC checks present
- [ ] No hardcoded credentials in code
- [ ] Error messages don't leak sensitive info
- [ ] No unhandled exceptions
- [ ] All imports correct
- [ ] No console.logs left behind
- [ ] Code follows project style guide
- [ ] TypeScript types are correct
- [ ] No security warnings in linting

**Testing Checklist**:
- [ ] All integration tests pass (100%)
- [ ] No regressions in existing tests
- [ ] Manual testing of each scenario
- [ ] Error cases tested (invalid tokens, wrong roles, etc.)
- [ ] Edge cases covered (expired tokens, missing headers, etc.)
- [ ] Performance acceptable (response time < 100ms for auth checks)

**Acceptance Criteria for Phase 1 Completion**:
- [ ] All tasks 1.1-1.5 completed
- [ ] All tests passing
- [ ] Code reviewed by 2+ developers
- [ ] No SECURITY issues remaining
- [ ] Documentation updated
- [ ] Ready for merge to main

**Implementation Checklist**:
- [ ] Request code review from senior backend developer
- [ ] Address all feedback comments
- [ ] Run full test suite
- [ ] Verify linting passes: `npm run lint`
- [ ] Verify TypeScript compiles: `npm run build`
- [ ] Test with fresh database
- [ ] Test with fresh Redis
- [ ] Merge when all above pass

**Time Estimate**: 1.5 hours  
**Complexity**: LOW

---

## PHASE 1 SUMMARY

**Total Phase 1 Time**: ~6 hours  
**Tasks**: 6 tasks (4 implementation + 1 testing + 1 review)  
**Issues Fixed**: #1 (auth), #2 (RBAC), #3 (revocation), #5 (cache)  
**Go/No-Go Criteria**: All 4 issues completely fixed + 15+ integration tests passing

**What Gets Deployed**:
```
backend/src/routes/admin.routes.ts       (auth + RBAC)
backend/src/controllers/lesson.controller.ts (enrollment recheck)
backend/src/services/enrollment.service.ts (cache invalidation)
backend/tests/integration/admin-rbac.test.ts (NEW)
backend/tests/integration/video-revocation.test.ts (NEW)
```

**Before Phase 2**: Verify that no STUDENT can access ANY admin endpoint.

---

# PHASE 2: PERFORMANCE & SCALE HARDENING (Week 2-3)

**Phase Duration**: April 29 - May 10 (10 business days)  
**Priority**: 🟠 HIGH (Must complete before load testing)  
**Issues Addressed**: #6 (N+1), #7 (indexes), #9 (caching)  
**Estimated Effort**: 25 developer-hours

---

## TASK 2.1: Identify and Fix N+1 Queries in Lesson Listing

**Severity**: 🟠 HIGH  
**Related Issue**: #6  
**Files to Modify**:
- `backend/src/controllers/lesson.controller.ts` (getAllLessonsGrouped, list methods)

**Description**:
The `getAllLessonsGrouped()` method includes progress data with a per-lesson WHERE clause. This generates N+1 queries (1 for sections, N for lessons, N for progress). At scale (100 lessons × 100k users), this causes database overload.

**Current Vulnerable Code**:
```typescript
async getAllLessonsGrouped(req: Request, res: Response) {
  const enrollment = await enrollmentRepository.findByUserId(req.user!.userId);
  if (!enrollment || enrollment.status !== "ACTIVE") {
    res.status(403).json({ error: "NOT_ENROLLED" });
    return;
  }

  const sections = await prisma.section.findMany({
    include: {
      lessons: {
        where: { isPublished: true },
        select: {
          id: true,
          titleEn: true,
          durationSeconds: true,
          progress: {
            where: { userId: req.user!.userId },  // <-- N+1 here
            select: { completedAt: true, lastPositionSeconds: true },
            take: 1
          }
        }
      }
    }
  });
  // ... returns sections with nested lessons and progress
}
```

**Optimized Code** (batch load progress separately):
```typescript
async getAllLessonsGrouped(req: Request, res: Response) {
  const enrollment = await enrollmentRepository.findByUserId(req.user!.userId);
  if (!enrollment || enrollment.status !== "ACTIVE") {
    res.status(403).json({ error: "NOT_ENROLLED" });
    return;
  }

  // Step 1: Get sections and lessons (without progress) - 1 query
  const sections = await prisma.section.findMany({
    include: {
      lessons: {
        where: { isPublished: true },
        select: {
          id: true,
          titleEn: true,
          titleAr: true,
          descriptionEn: true,
          descriptionAr: true,
          durationSeconds: true,
          sortOrder: true,
          dripDays: true
        },
        orderBy: { sortOrder: "asc" }
      }
    },
    orderBy: { sortOrder: "asc" }
  });

  // Step 2: Collect all lesson IDs
  const lessonIds = sections.flatMap(s => s.lessons.map(l => l.id));

  // Step 3: Load all progress in one query
  const progressData = await prisma.lessonProgress.findMany({
    where: {
      userId: req.user!.userId,
      lessonId: { in: lessonIds }
    },
    select: {
      lessonId: true,
      completedAt: true,
      lastPositionSeconds: true
    }
  });

  // Step 4: Create map for quick lookup
  const progressByLessonId = new Map(
    progressData.map(p => [p.lessonId, p])
  );

  // Step 5: Merge progress into lessons (in memory)
  res.json({
    sections: sections.map((section) => ({
      ...section,
      lessons: section.lessons.map((lesson) => {
        const progress = progressByLessonId.get(lesson.id);
        const unlocksAt = 
          typeof lesson.dripDays === "number"
            ? new Date(enrollment.enrolledAt.getTime() + lesson.dripDays * 24 * 60 * 60 * 1000)
            : null;
        const isUnlocked = !unlocksAt || unlocksAt <= new Date();

        return {
          id: lesson.id,
          titleEn: lesson.titleEn,
          titleAr: lesson.titleAr,
          descriptionEn: lesson.descriptionEn,
          descriptionAr: lesson.descriptionAr,
          durationSeconds: lesson.durationSeconds,
          sortOrder: lesson.sortOrder,
          isUnlocked,
          unlocksAt: isUnlocked ? null : unlocksAt?.toISOString() ?? null,
          completedAt: progress?.completedAt ?? null,
          lastPositionSeconds: progress?.lastPositionSeconds ?? 0
        };
      })
    }))
  });
}
```

**Key Changes**:
- Load sections+lessons in 1 query
- Load all progress in 1 batch query
- Merge in memory using Map
- Result: 1+1 queries instead of 1+N+N queries

**Acceptance Criteria**:
- [ ] Only 2 database queries executed (sections + progress)
- [ ] Response data structure unchanged
- [ ] Performance improved by 80%+ (benchmark before/after)
- [ ] Response time < 500ms for 100 lessons with 100k users
- [ ] All tests still pass

**Implementation Checklist**:
- [ ] Review current query with EXPLAIN ANALYZE
- [ ] Implement batch query approach
- [ ] Test with 100+ lessons
- [ ] Verify query count with query logging
- [ ] Benchmark: measure response time before/after
- [ ] Ensure data format unchanged
- [ ] Test with enrolled and non-enrolled users
- [ ] Check for edge cases (deleted lessons, etc.)

**Testing Command**:
```bash
# Enable query logging
export PRISMA_CLIENT_ENGINE_LOG=trace

# Call endpoint
curl -s -X GET http://localhost:3000/api/v1/lessons/grouped \
  -H "Authorization: Bearer $TOKEN" | jq '.' > /tmp/response.json

# Count queries in logs (should be ~2)
# Before: ~150 queries (1 sections + 100 lessons + 100 progress)
# After: ~2 queries (1 sections + 1 progress batch)
```

**Time Estimate**: 1.5 hours  
**Complexity**: MEDIUM

---

## TASK 2.2: Create Database Indexes for Critical Queries

**Severity**: 🟠 HIGH  
**Related Issue**: #7  
**Files to Modify**:
- `backend/prisma/schema.prisma`

**Description**:
Add indexes on columns that are queried frequently. Without indexes, PostgreSQL performs full table scans. At 100k users, this causes database overload.

**Current Code** (missing indexes):
```prisma
// backend/prisma/schema.prisma
model Enrollment {
  id                String           @id @default(uuid())
  userId            String           // Missing index!
  status            EnrollmentStatus // Missing index!
  // ... other fields
}

model LessonProgress {
  id                String   @id @default(uuid())
  userId            String   // Missing index!
  lessonId          String   // Missing index!
  // ... other fields
}

model VideoToken {
  id                String   @id @default(uuid())
  sessionId         String   // Missing index!
  // ... other fields
}

model Payment {
  id                String   @id @default(uuid())
  userId            String   // Missing index!
  createdAt         DateTime // Missing index!
  // ... other fields
}
```

**Required Additions**:
```prisma
model Enrollment {
  id                String           @id @default(uuid())
  userId            String
  courseId          String
  status            EnrollmentStatus
  enrollmentType    EnrollmentType
  enrolledAt        DateTime         @default(now())
  revokedAt         DateTime?
  revokedById       String?
  paymentId         String?
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt
  
  // Relations
  user              User             @relation("StudentEnrollment", fields: [userId], references: [id])
  revokedBy         User?            @relation("RevokedBy", fields: [revokedById], references: [id])
  payment           Payment?         @relation(fields: [paymentId], references: [id])

  // ADD THESE INDEXES
  @@index([userId, status])
  @@index([enrolledAt])
  @@unique([userId])
}

model LessonProgress {
  id                    String   @id @default(uuid())
  userId                String
  lessonId              String
  completedAt           DateTime?
  watchTimeSeconds      Int      @default(0)
  lastPositionSeconds   Int      @default(0)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  // Relations
  user                  User     @relation(fields: [userId], references: [id])
  lesson                Lesson   @relation(fields: [lessonId], references: [id])

  // ADD THESE INDEXES
  @@index([userId, lessonId])
  @@index([userId])
  @@index([lessonId])
}

model VideoToken {
  id                String   @id @default(uuid())
  userId            String
  lessonId          String
  tokenHash         String
  sessionId         String
  expiresAt         DateTime
  revokedAt         DateTime?
  createdAt         DateTime @default(now())

  // Relations
  user              User     @relation(fields: [userId], references: [id])
  lesson            Lesson   @relation(fields: [lessonId], references: [id])

  // ADD THESE INDEXES
  @@index([sessionId])
  @@index([tokenHash])
  @@index([userId])
}

model Payment {
  id                String       @id @default(uuid())
  userId            String
  courseId          String
  amountPiasters    Int
  currency          String       @default("EGP")
  status            PaymentStatus @default(PENDING)
  paymobOrderId     String?
  paymobTransactionId String?
  webhookReceivedAt DateTime?
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt

  // Relations
  user              User         @relation(fields: [userId], references: [id])

  // ADD THESE INDEXES
  @@index([userId, createdAt])
  @@index([userId])
  @@index([paymobOrderId])
}

model Lesson {
  id                String   @id @default(uuid())
  sectionId         String
  titleEn           String
  titleAr           String
  descriptionEn     String?
  descriptionAr     String?
  videoHlsPath      String?
  durationSeconds   Int?
  sortOrder         Int
  isPublished       Boolean  @default(false)
  dripDays          Int?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // Relations
  section           Section         @relation(fields: [sectionId], references: [id])
  progress          LessonProgress[]
  videoTokens       VideoToken[]

  // ADD THESE INDEXES
  @@index([isPublished])
  @@index([sectionId, sortOrder])
}

model Section {
  id                String   @id @default(uuid())
  courseId          String
  titleEn           String
  titleAr           String
  sortOrder         Int
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // Relations
  lessons           Lesson[]

  // ADD THIS INDEX
  @@index([courseId, sortOrder])
}
```

**Create Migration**:
```bash
# Generate migration
npx prisma migrate dev --name add_performance_indexes

# This creates: backend/prisma/migrations/xxxx_add_performance_indexes/migration.sql
```

**The Migration SQL**:
```sql
-- CreateIndex - Enrollment
CREATE INDEX "idx_enrollment_user_status" ON "Enrollment"("userId", "status");
CREATE INDEX "idx_enrollment_enrolled_at" ON "Enrollment"("enrolledAt");

-- CreateIndex - LessonProgress
CREATE INDEX "idx_lesson_progress_user_lesson" ON "LessonProgress"("userId", "lessonId");
CREATE INDEX "idx_lesson_progress_user" ON "LessonProgress"("userId");
CREATE INDEX "idx_lesson_progress_lesson" ON "LessonProgress"("lessonId");

-- CreateIndex - VideoToken
CREATE INDEX "idx_video_token_session" ON "VideoToken"("sessionId");
CREATE INDEX "idx_video_token_hash" ON "VideoToken"("tokenHash");
CREATE INDEX "idx_video_token_user" ON "VideoToken"("userId");

-- CreateIndex - Payment
CREATE INDEX "idx_payment_user_created" ON "Payment"("userId", "createdAt");
CREATE INDEX "idx_payment_user" ON "Payment"("userId");
CREATE INDEX "idx_payment_paymob_order" ON "Payment"("paymobOrderId");

-- CreateIndex - Lesson
CREATE INDEX "idx_lesson_published" ON "Lesson"("isPublished");
CREATE INDEX "idx_lesson_section_order" ON "Lesson"("sectionId", "sortOrder");

-- CreateIndex - Section
CREATE INDEX "idx_section_course_order" ON "Section"("courseId", "sortOrder");

-- Analyze tables
ANALYZE "Enrollment";
ANALYZE "LessonProgress";
ANALYZE "VideoToken";
ANALYZE "Payment";
ANALYZE "Lesson";
ANALYZE "Section";
```

**Acceptance Criteria**:
- [ ] All 11 indexes created successfully
- [ ] No errors during migration
- [ ] Can roll back migration if needed
- [ ] Indexes are being used (verify with EXPLAIN ANALYZE)
- [ ] Query performance improved 10-100x depending on query
- [ ] No negative side effects

**Implementation Checklist**:
- [ ] Add @@index directives to schema.prisma
- [ ] Generate migration: `npx prisma migrate dev`
- [ ] Run migration on fresh database
- [ ] Test rollback: `npx prisma migrate resolve --rolled-back`
- [ ] Verify indexes with: `SELECT * FROM pg_stat_user_indexes`
- [ ] Run EXPLAIN ANALYZE on key queries before/after
- [ ] Load test: verify performance improvement
- [ ] Check index size: `SELECT * FROM pg_indexes WHERE schemaname='public'`

**Testing Command**:
```bash
# Generate and run migration
npx prisma migrate dev --name add_performance_indexes

# Verify indexes created
psql $DATABASE_URL -c "\di public.*"

# Check query performance - BEFORE indexes (from logs)
# Seq Scan on "Enrollment" -> full table scan

# After indexes:
# Index Scan using idx_enrollment_user_status on "Enrollment"

# Benchmark a query
psql $DATABASE_URL -c "EXPLAIN ANALYZE SELECT * FROM \"Enrollment\" WHERE \"userId\" = 'abc' AND \"status\" = 'ACTIVE';"
```

**Time Estimate**: 1.5 hours  
**Complexity**: LOW

---

## TASK 2.3: Implement Course Settings Caching

**Severity**: 🟡 MEDIUM  
**Related Issue**: #9  
**Files to Modify**:
- `backend/src/routes/student.routes.ts`

**Description**:
The `/api/v1/course` endpoint queries `courseSettings`, `lessons`, and `coursePackage` on every request. With 100k users viewing the course page, this is 100k database queries/second during peak. Caching reduces this to near-zero by serving from Redis.

**Current Code**:
```typescript
// backend/src/routes/student.routes.ts Line 21-34
router.get("/course", async (_req, res, next) => {
  try {
    const [settings, lessons, packages] = await Promise.all([
      prisma.courseSettings.findUnique({ where: { id: 1 } }),  // DB HIT
      prisma.lesson.findMany({...}),  // DB HIT
      prisma.coursePackage.findMany({...})  // DB HIT
    ]);
    // ... returns data
  } catch (error) {
    next(error);
  }
});
```

**Optimized Code** (with caching):
```typescript
import { redis } from "../config/redis.js";

const COURSE_CACHE_KEY = "course:public";
const COURSE_CACHE_TTL = 3600;  // 1 hour

router.get("/course", async (_req, res, next) => {
  try {
    // Step 1: Check Redis cache
    const cached = await redis.get(COURSE_CACHE_KEY);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    // Step 2: Cache miss - query database
    const [settings, lessons, packages] = await Promise.all([
      prisma.courseSettings.findUnique({ where: { id: 1 } }),
      prisma.lesson.findMany({
        where: { isPublished: true },
        select: { id: true, titleEn: true, titleAr: true, durationSeconds: true, sortOrder: true },
        orderBy: { sortOrder: "asc" }
      }),
      prisma.coursePackage.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" }
      })
    ]);

    const primaryPackage = packages[0];

    const response = {
      title: settings?.titleEn ?? "AI Workflow: From Idea to Production",
      titleEn: settings?.titleEn ?? "AI Workflow: From Idea to Production",
      titleAr: settings?.titleAr ?? "AI Workflow: من الفكرة إلى الـ Production",
      descriptionHtml: settings?.descriptionEn ?? "",
      descriptionHtmlEn: settings?.descriptionEn ?? "",
      descriptionHtmlAr: settings?.descriptionAr ?? "",
      priceEgp: primaryPackage ? primaryPackage.pricePiasters / 100 : settings ? settings.pricePiasters / 100 : 0,
      currency: primaryPackage?.currency ?? settings?.currency ?? "EGP",
      lessonCount: lessons.length,
      totalDurationSeconds: lessons.reduce((total, lesson) => total + (lesson.durationSeconds ?? 0), 0),
      isEnrollmentOpen: settings?.isEnrollmentOpen ?? false,
      enrolled: false,
      lessons: lessons.map((l) => ({
        id: l.id,
        title: l.titleEn,
        titleAr: l.titleAr,
        durationSeconds: l.durationSeconds,
        sortOrder: l.sortOrder
      })),
      packages: packages.map((coursePackage) => ({
        id: coursePackage.id,
        titleEn: coursePackage.titleEn,
        titleAr: coursePackage.titleAr,
        descriptionEn: coursePackage.descriptionEn,
        descriptionAr: coursePackage.descriptionAr,
        priceEgp: coursePackage.pricePiasters / 100,
        currency: coursePackage.currency,
        sortOrder: coursePackage.sortOrder
      }))
    };

    // Step 3: Store in cache for 1 hour
    await redis.set(COURSE_CACHE_KEY, JSON.stringify(response), "EX", COURSE_CACHE_TTL);

    res.json(response);
  } catch (error) {
    next(error);
  }
});
```

**Cache Invalidation**:
When admin updates course settings, invalidate cache:

```typescript
// In admin/settings.controller.ts or similar
async updateCourseSettings(req: Request, res: Response) {
  try {
    const updated = await prisma.courseSettings.update({...});
    
    // Invalidate course cache
    await redis.del("course:public");
    
    res.json(updated);
  } catch (error) {
    next(error);
  }
}
```

**Acceptance Criteria**:
- [ ] First request hits database (cache miss)
- [ ] Second request served from cache (no DB hit)
- [ ] Cache expires after 1 hour
- [ ] Cache invalidated when settings updated
- [ ] Response data unchanged
- [ ] Response time < 10ms for cached requests

**Implementation Checklist**:
- [ ] Import redis at top of routes file
- [ ] Add cache key constant
- [ ] Implement cache check before DB query
- [ ] Store response in cache
- [ ] Verify cache is working (check Redis)
- [ ] Add cache invalidation in admin update functions
- [ ] Test: 1st request slow, 2nd request fast
- [ ] Test: Update settings, cache invalidated

**Testing Command**:
```bash
# Test 1: First request (cache miss)
time curl -s http://localhost:3000/api/v1/course > /dev/null
# Should take ~100-500ms (DB query)

# Test 2: Second request (cache hit)
time curl -s http://localhost:3000/api/v1/course > /dev/null
# Should take <10ms (Redis hit)

# Test 3: Verify cache exists
redis-cli GET "course:public"
# Should return JSON blob

# Test 4: Admin updates settings (cache invalidation)
curl -X PATCH http://localhost:3000/api/v1/admin/settings \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"titleEn": "New Title"}'

# Verify cache deleted
redis-cli GET "course:public"
# Should return (nil) - cache was deleted

# Next request will be slow (cache miss, DB hit)
time curl -s http://localhost:3000/api/v1/course > /dev/null
```

**Time Estimate**: 45 minutes  
**Complexity**: LOW

---

## TASK 2.4: Load Testing & Performance Validation

**Severity**: 🟠 MEDIUM  
**Related Issues**: #6, #7, #9  
**Tools Required**:
- Artillery.io (for load testing)
- New Relic or DataDog (for monitoring)

**Description**:
Create load tests to verify the platform can handle 100k concurrent users without degradation. This validates that all performance optimizations (batch queries, indexes, caching) are effective.

**Load Test Scenario**:
```yaml
# File: backend/tests/load/course-listing.yml
config:
  target: http://localhost:3000/api/v1
  phases:
    - duration: 60
      arrivalRate: 100      # 100 new users per second
      name: "Warm up"
    - duration: 300
      arrivalRate: 1000     # 1000 users per second (100k total)
      name: "Peak load"
    - duration: 60
      arrivalRate: 100
      name: "Cool down"

scenarios:
  - name: "Student browsing course"
    flow:
      - post:
          url: "/auth/login"
          json:
            email: "{{ $randomString(8) }}@test.com"
            password: "SecurePassword123"
          capture:
            json: "$.accessToken"
            as: "accessToken"
      - get:
          url: "/course"
          headers:
            Authorization: "Bearer {{ accessToken }}"
      - get:
          url: "/lessons/grouped"
          headers:
            Authorization: "Bearer {{ accessToken }}"
      - think: 5  # Think time between requests
      - get:
          url: "/lessons/{{ $randomNumber(1, 100) }}"
          headers:
            Authorization: "Bearer {{ accessToken }}"
```

**Success Criteria**:
- [ ] p50 latency < 200ms
- [ ] p95 latency < 500ms
- [ ] p99 latency < 1000ms
- [ ] Error rate < 0.1%
- [ ] No database connection exhaustion
- [ ] No Redis memory exhaustion

**Implementation Checklist**:
- [ ] Install Artillery: `npm install --save-dev artillery`
- [ ] Create load test YAML file
- [ ] Run test: `artillery quick --count 1000 --num 100 http://localhost:3000/api/v1/course`
- [ ] Record baseline metrics (before optimizations)
- [ ] Run test again after optimizations
- [ ] Compare metrics (should see 50-80% improvement)
- [ ] Create summary report
- [ ] Document results

**Testing Commands**:
```bash
# Quick smoke test
artillery quick --count 100 --num 10 http://localhost:3000/api/v1/course

# Full load test
artillery run backend/tests/load/course-listing.yml

# With detailed reporting
artillery run backend/tests/load/course-listing.yml --output backend/tests/load/results.json

# Generate HTML report
artillery report backend/tests/load/results.json --output backend/tests/load/report.html
```

**Time Estimate**: 2 hours  
**Complexity**: MEDIUM

---

## TASK 2.5: Code Review & Documentation for Phase 2

**Severity**: 🟠 MEDIUM  
**Related Issues**: #6, #7, #9

**Description**:
Code review all Phase 2 changes, ensure performance improvements are measurable, and document findings.

**Code Review Checklist**:
- [ ] N+1 query fix is correct
- [ ] Database indexes are properly created
- [ ] Caching logic is sound
- [ ] Cache invalidation works on admin updates
- [ ] No new security vulnerabilities introduced
- [ ] TypeScript types are correct
- [ ] Error handling present
- [ ] No performance regressions

**Performance Verification**:
- [ ] Measure query counts (before/after)
- [ ] Benchmark response times
- [ ] Verify load test improvements
- [ ] Monitor database CPU usage
- [ ] Monitor Redis memory usage
- [ ] Check query execution plans (EXPLAIN ANALYZE)

**Documentation**:
- [ ] Document index strategy in code comments
- [ ] Create performance guide for future developers
- [ ] Document cache invalidation strategy
- [ ] Include load test results
- [ ] Create runbook for monitoring performance

**Acceptance Criteria for Phase 2 Completion**:
- [ ] All 5 tasks completed
- [ ] Load tests pass with 100k concurrent users
- [ ] p95 latency < 500ms
- [ ] No performance regressions
- [ ] All tests passing
- [ ] Code reviewed
- [ ] Ready for QC testing

**Time Estimate**: 1.5 hours  
**Complexity**: LOW

---

## PHASE 2 SUMMARY

**Total Phase 2 Time**: ~8 hours  
**Tasks**: 5 tasks (3 implementation + 1 testing + 1 review)  
**Issues Fixed**: #6 (N+1), #7 (indexes), #9 (caching)  
**Performance Improvement**: 50-80% faster on high-traffic endpoints

**Before Phase 3**: Verify load test passes with 100k concurrent users.

---

# PHASE 3: DEFENSE HARDENING & MONITORING (Week 4)

**Phase Duration**: May 11-17 (5 business days)  
**Priority**: 🟠 MEDIUM-HIGH (Important for QC testing)  
**Issues Addressed**: #4 (preview token), #8 (concurrent sessions)  
**Estimated Effort**: 30 developer-hours

*Continued in next section due to length...*

---

## TASK 3.1: Implement Concurrent Session Enforcement

**Severity**: 🟠 MEDIUM  
**Related Issue**: #8  
**Files to Create/Modify**:
- `backend/src/services/session.service.ts` (NEW)
- `backend/src/middleware/session.middleware.ts` (NEW)
- `backend/src/controllers/auth.controller.ts` (MODIFY)

**Description**:
Enforce single active session per user. When a user logs in from a new device, invalidate all previous sessions. This prevents account sharing and unauthorized access.

**New Service**:
```typescript
// File: backend/src/services/session.service.ts (CREATE)
import { redis } from "../config/redis.js";

const activeSessionKey = (userId: string) => `active-session:${userId}`;

export const sessionService = {
  async setActiveSession(userId: string, sessionId: string): Promise<void> {
    // Invalidate previous session
    const previousSessionId = await redis.get(activeSessionKey(userId));
    if (previousSessionId && previousSessionId !== sessionId) {
      await redis.del(`session:${userId}:${previousSessionId}`);
    }
    // Set new active session
    await redis.set(activeSessionKey(userId), sessionId, "EX", 604800);  // 7 days
  },

  async getActiveSession(userId: string): Promise<string | null> {
    return await redis.get(activeSessionKey(userId));
  },

  async invalidateSession(sessionId: string, userId: string): Promise<void> {
    const activeSession = await this.getActiveSession(userId);
    if (activeSession === sessionId) {
      await redis.del(activeSessionKey(userId));
    }
  }
};
```

**Modify Auth Controller**:
```typescript
// In backend/src/controllers/auth.controller.ts

export const authController = {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      
      // ... existing validation ...
      
      const sessionId = crypto.randomUUID();
      
      // NEW: Set active session (invalidates old sessions)
      await sessionService.setActiveSession(user.id, sessionId);
      
      // ... rest of login logic ...
    } catch (error) {
      next(error);
    }
  }
};
```

**Acceptance Criteria**:
- [ ] User logs in from device A (creates session)
- [ ] User logs in from device B (invalidates device A session)
- [ ] Device A loses access (token invalid)
- [ ] Device B has full access
- [ ] No session persistence across logins

**Implementation Checklist**:
- [ ] Create session.service.ts
- [ ] Modify auth controller to call sessionService.setActiveSession()
- [ ] Modify logout to call sessionService.invalidateSession()
- [ ] Test with 2 devices simultaneously
- [ ] Verify old session invalidated
- [ ] Test with rapid logins (no race conditions)

**Testing Command**:
```bash
# Terminal 1: Login from device A
DEVICE_A_TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -d '{"email":"test@test.com","password":"pass"}' | jq -r '.accessToken')

# Terminal 2: Login from device B (same user)
DEVICE_B_TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -d '{"email":"test@test.com","password":"pass"}' | jq -r '.accessToken')

# Terminal 1: Try to use device A token (should fail)
curl -s -X GET http://localhost:3000/api/v1/student/dashboard \
  -H "Authorization: Bearer $DEVICE_A_TOKEN"
# Should return 401 UNAUTHORIZED (session invalidated)

# Terminal 2: Use device B token (should succeed)
curl -s -X GET http://localhost:3000/api/v1/student/dashboard \
  -H "Authorization: Bearer $DEVICE_B_TOKEN"
# Should return 200 OK
```

**Time Estimate**: 2 hours  
**Complexity**: MEDIUM

---

## TASK 3.2: Strengthen Preview Token Device Binding

**Severity**: 🟠 MEDIUM  
**Related Issue**: #4  
**Files to Create/Modify**:
- `backend/src/utils/device-fingerprint.ts` (NEW)
- `frontend/src/lib/device-fingerprint.ts` (NEW)
- `backend/src/services/video-token.service.ts` (MODIFY)

**Description**:
Replace weak IP/UA binding with device fingerprinting. Preview tokens should bind to unique device characteristics that can't be easily spoofed.

**Backend Device Fingerprint Generation**:
```typescript
// File: backend/src/utils/device-fingerprint.ts (CREATE)
import crypto from "node:crypto";

export type DeviceFingerprintInput = {
  userAgent?: string;
  ip?: string;
  canvas?: string;      // Canvas fingerprint from client
  webgl?: string;       // WebGL renderer from client
  plugins?: string[];   // Browser plugins from client
};

export function generateDeviceFingerprint(input: DeviceFingerprintInput): string {
  const components = [
    input.userAgent || "",
    input.ip || "",
    input.canvas || "",
    input.webgl || "",
    (input.plugins || []).sort().join(",")
  ];

  const combined = components.join("|");
  return crypto.createHash("sha256").update(combined).digest("hex");
}

export function validateDeviceFingerprint(
  stored: string,
  current: DeviceFingerprintInput
): boolean {
  const currentFingerprint = generateDeviceFingerprint(current);
  // Allow for minor variations (browser plugin updates, etc.)
  return stored === currentFingerprint;
}
```

**Frontend Device Fingerprinting**:
```typescript
// File: frontend/src/lib/device-fingerprint.ts (CREATE)
export async function generateClientFingerprint(): Promise<{
  canvas: string;
  webgl: string;
  plugins: string[];
}> {
  // Canvas fingerprinting
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.textBaseline = "top";
    ctx.font = '14px "Arial"';
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("device-fingerprint", 2, 15);
  }
  const canvasFingerprint = canvas.toDataURL();

  // WebGL fingerprinting
  const canvas2 = document.createElement("canvas");
  const gl = canvas2.getContext("webgl");
  let webglRenderer = "";
  if (gl) {
    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    if (debugInfo) {
      webglRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    }
  }

  // Plugin detection (Chromium-based)
  const plugins: string[] = [];
  if (navigator.plugins) {
    for (let i = 0; i < navigator.plugins.length; i++) {
      plugins.push(navigator.plugins[i].name);
    }
  }

  return {
    canvas: canvasFingerprint.substring(0, 100),  // Limit size
    webgl: webglRenderer,
    plugins
  };
}
```

**Modify Video Token Service**:
```typescript
// In backend/src/services/video-token.service.ts

async issuePreviewToken(input: {
  lessonId: string;
  ip?: string;
  userAgent?: string;
  deviceFingerprint?: string;  // NEW
}) {
  const previewSessionId = crypto.randomUUID();
  const previewToken = signPreviewToken({
    lessonId: input.lessonId,
    previewSessionId,
    isPreview: true
  });

  const record = {
    lessonId: input.lessonId,
    ipPrefix: ipPrefix(input.ip),
    uaHash: input.userAgent ? sha256(input.userAgent) : null,
    deviceFingerprint: input.deviceFingerprint || ""  // NEW
  };

  await redis.set(previewSessionCacheKey(previewSessionId), JSON.stringify(record), "EX", PREVIEW_TTL_SECONDS);

  return {
    videoToken: previewToken,
    hlsUrl: `/api/v1/video/${input.lessonId}/playlist.m3u8?token=${encodeURIComponent(previewToken)}`,
    expiresAt,
    previewSessionId
  };
}

// Validate preview token with device fingerprint
async validateToken(input: VideoTokenValidationInput & { deviceFingerprint?: string }) {
  // ... existing code ...
  
  if ("isPreview" in payload && payload.isPreview) {
    const previewPayload = payload as PreviewTokenPayload;
    const session = JSON.parse(await redis.get(previewSessionCacheKey(previewPayload.previewSessionId)) || "{}");

    // NEW: Check device fingerprint
    if (session.deviceFingerprint && input.deviceFingerprint) {
      if (!validateDeviceFingerprint(session.deviceFingerprint, { userAgent: input.userAgent })) {
        throw new VideoTokenError("INVALID_DEVICE", 403, "Device mismatch");
      }
    }

    return payload;
  }
}
```

**Acceptance Criteria**:
- [ ] Client generates canvas + WebGL fingerprints
- [ ] Fingerprints sent to server on preview request
- [ ] Server stores fingerprint in preview session
- [ ] Subsequent requests validate fingerprint
- [ ] Different devices get different fingerprints
- [ ] Same device gets same fingerprint across page reloads
- [ ] Token can't be shared across devices

**Implementation Checklist**:
- [ ] Create device-fingerprint utility files (backend + frontend)
- [ ] Generate fingerprints on frontend before preview request
- [ ] Send fingerprint in request header
- [ ] Store fingerprint with preview session
- [ ] Validate fingerprint on playlist/segment requests
- [ ] Test: Same device, same fingerprint
- [ ] Test: Different device, different fingerprint
- [ ] Test: Can't use preview token from device B on device A

**Time Estimate**: 3 hours  
**Complexity**: MEDIUM

---

## TASK 3.3: Setup Monitoring & Alerting

**Severity**: 🟠 MEDIUM  
**Tools**: New Relic, DataDog, or similar APM

**Description**:
Setup monitoring to detect security issues and performance problems in real-time.

**Monitoring Checklist**:
- [ ] Setup APM (Application Performance Monitoring)
- [ ] Add custom metrics for:
  - [ ] Failed login attempts per IP
  - [ ] Admin endpoint access attempts
  - [ ] Video token validation failures
  - [ ] Enrollment status mismatches
  - [ ] Cache hit rates
- [ ] Setup alerts for:
  - [ ] Suspicious activity (100+ failed logins from 1 IP)
  - [ ] Performance degradation (p95 > 1 second)
  - [ ] Database errors > 1%
  - [ ] Video access anomalies
- [ ] Create dashboards for:
  - [ ] Security metrics
  - [ ] Performance metrics
  - [ ] User engagement
  - [ ] Revenue metrics

**Time Estimate**: 2 hours  
**Complexity**: LOW-MEDIUM

---

## TASK 3.4: Security Checklist for QC Team

**Severity**: 🟠 MEDIUM  
**Deliverable**: PDF/Markdown checklist  

**File**: `SECURITY_CHECKLIST_QC.md` (CREATE)

```markdown
# EduFlow LMS - Security Testing Checklist for QC Team

**Purpose**: Guide QC developers on what security vulnerabilities to test for

## 1. AUTHENTICATION & AUTHORIZATION TESTING

### 1.1 Admin Access Control
- [ ] Guest user GET /api/v1/admin/students → Should return 401
- [ ] Guest user POST /api/v1/admin/coupons → Should return 401
- [ ] Student user GET /api/v1/admin/students → Should return 403
- [ ] Student user POST /api/v1/admin/students/123/enroll → Should return 403
- [ ] Student user DELETE /api/v1/admin/coupons/456 → Should return 403
- [ ] Admin user GET /api/v1/admin/students → Should return 200
- [ ] Admin user can enroll/revoke students → Should return 200

### 1.2 Student Access Control
- [ ] Guest user GET /api/v1/lessons/grouped → Should return 401
- [ ] Student A GET /api/v1/student/orders → Should see only own orders
- [ ] Student B cannot see Student A's orders → 403 or empty result

### 1.3 Token Validation
- [ ] Expired token GET /api/v1/student/dashboard → Should return 401
- [ ] Tampered token GET /api/v1/student/dashboard → Should return 401
- [ ] Modified payload token GET /api/v1/student/dashboard → Should return 401

## 2. VIDEO SECURITY TESTING

### 2.1 Video Token Protection
- [ ] Guest cannot access /api/v1/video/:id/playlist without token → 401
- [ ] Invalid token GET /api/v1/video/:id/segment → 403
- [ ] Expired token GET /api/v1/video/:id/segment → 403
- [ ] Token for lesson A cannot access lesson B → 403

### 2.2 Direct MP4 Access Prevention
- [ ] No /api/v1/video/:id/video.mp4 endpoint exists
- [ ] Cannot access .mp4 files from storage directory directly
- [ ] Only .m3u8 and .ts files accessible (via token validation)

### 2.3 Video Playback After Revocation
- [ ] Get video token (enrollment active)
- [ ] Admin revokes enrollment
- [ ] Try to access video segment within 1 second → Should return 403
- [ ] Subsequent segment requests also return 403

### 2.4 Preview Token Sharing Prevention
- [ ] Generate preview token on Device A
- [ ] Try to use token on Device B (different IP) → Should fail
- [ ] Try to use token on Device B (same browser, different network) → Should fail
- [ ] Same device, same token works across page reloads

## 3. DATA ISOLATION & LEAKAGE

### 3.1 Student Data Isolation
- [ ] Student A cannot GET /api/v1/admin/students (RBAC)
- [ ] Student A cannot view Student B's progress data
- [ ] Student A cannot see Student B's notes
- [ ] Student A cannot see Student B's orders
- [ ] Student A cannot see Student B's profile

### 3.2 Payment Data
- [ ] Student A can only see own payment history
- [ ] Student A cannot modify payment records
- [ ] Non-enrolled user cannot see payment info

### 3.3 Admin Data Leakage
- [ ] Non-admin cannot access /api/v1/admin/analytics
- [ ] Non-admin cannot access /api/v1/admin/audit-log
- [ ] All admin endpoints require admin role

## 4. ACCOUNT SECURITY

### 4.1 Concurrent Session Testing
- [ ] Login from Device A
- [ ] Login from Device B (same user)
- [ ] Device A should be logged out (token invalid)
- [ ] Device B has full access
- [ ] Only one session per user at a time

### 4.2 Session Fixation
- [ ] Cannot use old session token after logout
- [ ] Cannot use other user's session token
- [ ] Refresh token rotation working

### 4.3 Password Security
- [ ] Weak passwords rejected (< 8 chars)
- [ ] SQL injection in password field blocked
- [ ] XSS injection in password field blocked
- [ ] Passwords stored as hashes (never plain text in DB)

## 5. PAYMENT SECURITY

### 5.1 Paymob Webhook
- [ ] Webhook with invalid HMAC rejected
- [ ] Webhook with missing signature rejected
- [ ] Duplicate webhooks don't create duplicate enrollments
- [ ] Webhook cannot enroll user for free without payment

### 5.2 Checkout Security
- [ ] Cannot modify price before payment
- [ ] Cannot bypass payment to get free access
- [ ] Cannot use expired coupon codes
- [ ] Cannot exceed coupon usage limits

## 6. INPUT VALIDATION & INJECTION

### 6.1 SQL Injection
- [ ] Test all forms with SQL injection payloads
- [ ] All queries use parameterized/ORM (Prisma)
- [ ] No raw SQL without validation

### 6.2 Cross-Site Scripting (XSS)
- [ ] Test all input fields with XSS payloads
- [ ] User content sanitized before display
- [ ] No inline scripts allowed

### 6.3 Path Traversal
- [ ] Cannot access /api/v1/video/lesson-1/../../sensitive-file
- [ ] Video segment names validated (no .. or / allowed)
- [ ] Cannot access arbitrary files from storage

## 7. RATE LIMITING & DOS

### 7.1 Auth Endpoints
- [ ] Login: max 10 attempts per minute per IP
- [ ] Register: max 5 per minute per IP
- [ ] Password reset: max 3 per minute per IP
- [ ] After limit exceeded, returns 429 Too Many Requests

### 7.2 Video Endpoints
- [ ] Playlist requests: max 30 per minute per session
- [ ] Segment requests: max 600 per minute per session
- [ ] Key requests: max 30 per minute per session
- [ ] Rate limit tracks per IP + User-Agent combination

## 8. PRIVILEGE ESCALATION

### 8.1 Role Escalation
- [ ] Student cannot self-promote to ADMIN
- [ ] Student cannot use admin token injection
- [ ] Student cannot call admin endpoints with crafted payloads
- [ ] RBAC enforced on every protected endpoint

### 8.2 Data Escalation
- [ ] Non-enrolled user cannot access course
- [ ] Revoked user cannot access course
- [ ] Admin revocation takes effect within 1 second

## 9. CACHING & TIMING ATTACKS

### 9.1 Cache Behavior
- [ ] Public data (course info) cached appropriately
- [ ] Private data (enrollment, progress) not cached between users
- [ ] Cache invalidated on admin updates
- [ ] No stale data served to users

### 9.2 Timing Attacks
- [ ] Login time similar for valid/invalid users (no user enumeration)
- [ ] Token validation time consistent (no oracle attacks)

## 10. RECONNAISSANCE & INFORMATION DISCLOSURE

### 10.1 Error Messages
- [ ] No stack traces in error responses
- [ ] No database errors revealed to users
- [ ] Generic "Invalid credentials" for auth errors
- [ ] No file paths in responses

### 10.2 HTTP Headers
- [ ] Security headers present (X-Content-Type-Options, X-Frame-Options, etc.)
- [ ] CORS properly configured (no wildcard allow)
- [ ] Cache headers correct (no-store on sensitive data)

### 10.3 API Discovery
- [ ] Cannot enumerate users by brute-forcing IDs
- [ ] Cannot discover admin endpoints through URL enumeration
- [ ] No API documentation exposing internal endpoints

## 11. PERFORMANCE UNDER ATTACK

### 11.1 Load Testing
- [ ] Platform handles 1000 concurrent users
- [ ] Platform handles 10,000 concurrent users
- [ ] p95 latency < 500ms at 10k users
- [ ] No timeout errors under load

### 11.2 Resource Exhaustion
- [ ] Cannot exhaust database connections with malicious requests
- [ ] Cannot exhaust Redis memory with token generation
- [ ] Cannot cause CPU spike through expensive operations

## TESTING TEMPLATE

For each test case:
```
Test Case: [Name]
Goal: [What security aspect to test]
Steps:
1. [Step 1]
2. [Step 2]
...
Expected Result: [What should happen]
Actual Result: [What actually happened]
Status: [ ] PASS  [ ] FAIL
Notes: [Any additional observations]
```

## SCORING

- CRITICAL (must pass): Authentication, Video Security, Data Isolation, Payment Security
- HIGH (strongly recommended): Session Security, Privilege Escalation, Injection Testing
- MEDIUM (nice to have): Rate Limiting, Caching, Headers, Reconnaissance
- LOW (optional): Performance under attack

Total Score: ___ / 100 test cases passed

**Minimum Score for Production**: 95/100 (only LOW severity items can fail)
```

**Acceptance Criteria**:
- [ ] Checklist covers all major security areas
- [ ] 100+ specific test cases
- [ ] Clear pass/fail criteria
- [ ] QC team trained on checklist
- [ ] Results tracked and reported

**Time Estimate**: 2 hours  
**Complexity**: LOW

---

## TASK 3.5: Phase 3 Code Review & Sign-Off

**Severity**: 🟠 MEDIUM  
**Related Issues**: #4, #8

**Code Review Checklist**:
- [ ] Session enforcement logic correct
- [ ] Device fingerprinting implementation sound
- [ ] Monitoring alerts configured
- [ ] QC checklist comprehensive
- [ ] No new security vulnerabilities
- [ ] All tests passing

**Performance Impact**:
- [ ] Device fingerprint generation < 50ms
- [ ] Session check < 10ms
- [ ] No negative impact on response times

**Acceptance Criteria for Phase 3 Completion**:
- [ ] All 5 tasks completed
- [ ] Session enforcement working
- [ ] Device fingerprinting working
- [ ] Monitoring alerting
- [ ] QC checklist ready
- [ ] All tests passing
- [ ] Security team signed off

**Time Estimate**: 1 hour  
**Complexity**: LOW

---

# PHASE 3 SUMMARY

**Total Phase 3 Time**: ~10 hours  
**Tasks**: 5 tasks (3 implementation + 1 checklist + 1 review)  
**Issues Fixed**: #4 (preview token), #8 (concurrent sessions)  
**Deliverables**: Session enforcement, device fingerprinting, QC security checklist, monitoring setup

---

# FINAL SIGN-OFF CHECKLIST

After all 3 phases complete, verify:

```
PHASE 1 SIGN-OFF (Week 1 - April 28)
- [ ] Issue #1 fixed: Admin routes require authentication
- [ ] Issue #2 fixed: Admin routes require RBAC
- [ ] Issue #3 fixed: Video segments re-check enrollment
- [ ] Issue #5 fixed: Enrollment cache invalidation
- [ ] 15+ integration tests passing
- [ ] Code reviewed by 2+ developers
- [ ] Zero security regressions
- [ ] Ready for Phase 2

PHASE 2 SIGN-OFF (Week 3 - May 10)
- [ ] Issue #6 fixed: N+1 queries resolved
- [ ] Issue #7 fixed: Database indexes created
- [ ] Issue #9 fixed: Course settings cached
- [ ] Load test passing: 100k concurrent users
- [ ] p95 latency < 500ms
- [ ] Performance improved 50-80%
- [ ] Zero performance regressions
- [ ] Ready for Phase 3

PHASE 3 SIGN-OFF (Week 4 - May 17)
- [ ] Issue #4 fixed: Preview token device binding
- [ ] Issue #8 fixed: Concurrent session enforcement
- [ ] Monitoring & alerting active
- [ ] QC security checklist ready
- [ ] All 24 tasks completed
- [ ] All tests passing (100%)
- [ ] Security team approved
- [ ] READY FOR QC TESTING - 100k USERS

PRODUCTION READINESS
- [ ] All 10 vulnerabilities fixed
- [ ] Load tested with 100k concurrent users
- [ ] Security tested by external team
- [ ] Performance benchmarked
- [ ] Monitoring and alerting in place
- [ ] Incident response plan documented
- [ ] Team trained on security procedures
- [ ] READY FOR LAUNCH
```

---

# APPENDIX: COMMAND REFERENCE

## Running Tests

```bash
# Unit tests
npm test -- --run

# Integration tests only
npm test -- --grep integration

# Phase 1 tests
npm test -- admin-rbac.test.ts video-revocation.test.ts

# With coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

## Database Management

```bash
# Run migration
npx prisma migrate dev --name add_indexes

# Rollback migration
npx prisma migrate resolve --rolled-back

# Check current state
npx prisma migrate status

# Reset database (WARNING: destructive)
npx prisma migrate reset
```

## Load Testing

```bash
# Quick smoke test
artillery quick --count 100 --num 10 http://localhost:3000

# Full load test
artillery run tests/load/course-listing.yml

# Generate HTML report
artillery report results.json --output report.html
```

## Redis CLI

```bash
# Check key exists
redis-cli GET "enrollment:user-id"

# Delete key
redis-cli DEL "enrollment:user-id"

# List all keys matching pattern
redis-cli KEYS "enrollment:*"

# Monitor cache hits
redis-cli MONITOR
```

## PostgreSQL CLI

```bash
# Connect to database
psql $DATABASE_URL

# List indexes
\di public.*

# Check query plan
EXPLAIN ANALYZE SELECT * FROM "Enrollment" WHERE "userId" = 'abc';

# Check index usage
SELECT * FROM pg_stat_user_indexes WHERE schemaname = 'public';
```

---

**Document Version**: 1.0  
**Total Effort**: 75 developer-hours across 4 weeks  
**Status**: Ready for implementation  
**Last Updated**: 2026-04-21

