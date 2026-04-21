# EduFlow LMS - Security Remediation Task List (REORGANIZED)

**Document Type**: Developer Task Breakdown  
**Status**: In Progress  
**Date Created**: 2026-04-21  
**Last Updated**: 2026-04-21  
**Total Phases**: 5 (Reorganized)
**Tasks Per Phase**: 6-8 tasks  
**Total Tasks**: 32 detailed tasks  
**Estimated Effort**: 80 developer-hours  
**Target Completion**: 2026-05-24

---

## QUICK START

1. Complete ONE PHASE at a time
2. Each phase has 6-8 focused tasks
3. Follow checklist items in order
4. Run tests after each task
5. Mark with ✅ when complete
6. Move to next phase only when all tasks PASS

---

## PHASE OVERVIEW

| Phase | Focus | Tasks | Status | Timeline |
|-------|-------|-------|--------|----------|
| **Phase 1** | Authentication & Authorization | 8 tasks | ✅ DONE | Apr 22-24 |
| **Phase 2** | Video Security & Session Management | 7 tasks | ✅ DONE | Apr 25-27 |
| **Phase 3** | Performance Optimization (Part 1) | 6 tasks | ✅ DONE | Apr 28-30 |
| **Phase 4** | Performance Optimization (Part 2) | 6 tasks | ✅ DONE | May 1-3 |
| **Phase 5** | Monitoring, Testing & Sign-Off | 8 tasks | 🟡 IN PROGRESS | May 4-10 |

---

# PHASE 1: AUTHENTICATION & AUTHORIZATION (Week 1)

**Phase Duration**: April 22-24 (3 business days)  
**Priority**: 🔴 MUST COMPLETE FIRST  
**Issues Addressed**: #1, #2  
**Estimated Effort**: 16 developer-hours  
**Acceptance**: All 8 tasks must PASS before Phase 2

---

## TASK 1.1: Add Authentication Middleware to Admin Routes
**Status**: ✅ DONE  
**Severity**: 🔴 CRITICAL  
**Estimated Time**: 2 hours

- [x] Import `authenticate` middleware in admin.routes.ts
- [x] Add `router.use(authenticate)` before other middleware
- [x] Test: Guest request returns 401
- [x] Test: Invalid token returns 401
- [x] Test: Expired token returns 401
- [x] Verify admin routes still work with valid token
- [x] No breaking changes to other routes

**Files Modified**:
- `backend/src/routes/admin.routes.ts`

---

## TASK 1.2: Add RBAC Middleware to Admin Routes
**Status**: ✅ DONE  
**Severity**: 🔴 CRITICAL  
**Estimated Time**: 2 hours

- [x] Import `requireRole("ADMIN")` middleware
- [x] Add middleware after authenticate check
- [x] Test: Student token returns 403 FORBIDDEN
- [x] Test: Admin token returns 200 OK
- [x] Verify all admin endpoints are protected
- [x] Check audit logs show access attempts
- [x] Integration test coverage for RBAC

**Files Modified**:
- `backend/src/middleware/rbac.middleware.ts`
- `backend/src/routes/admin.routes.ts`

---

## TASK 1.3: Protect Student-Only Routes
**Status**: ✅ DONE  
**Severity**: 🔴 CRITICAL  
**Estimated Time**: 2 hours

- [x] Add `authenticate` to /api/v1/student/* routes
- [x] Add `requireRole("STUDENT")` where needed
- [x] Test: Guest cannot access /dashboard
- [x] Test: Admin cannot access /student/notes
- [x] Test: Students can only see their own data
- [x] Verify course preview is still public
- [x] Check all student endpoints are secured

**Files Modified**:
- `backend/src/routes/student.routes.ts`
- `backend/src/middleware/auth.middleware.ts`

---

## TASK 1.4: Implement Token Refresh Security
**Status**: ✅ DONE  
**Severity**: 🔴 CRITICAL  
**Estimated Time**: 2 hours

- [x] Token reuse detection in refresh logic
- [x] Track refresh token hash in Redis
- [x] Detect when same token is used twice
- [x] Invalidate all tokens on reuse detected
- [x] Test: Replayed refresh token fails
- [x] Test: Token rotation works properly
- [x] Verify error messages don't leak info

**Files Modified**:
- `backend/src/services/auth.service.ts`
- `backend/src/utils/jwt.ts`
- `backend/tests/integration/token-reuse.test.ts`

---

## TASK 1.5: Verify Login/Register Security
**Status**: ✅ DONE  
**Severity**: 🟡 HIGH  
**Estimated Time**: 1.5 hours

- [x] Password validation rules enforced
- [x] Email uniqueness constraint working
- [x] Invalid email format rejected
- [x] Weak password rejected
- [x] Test: Register with duplicate email fails
- [x] Test: Register with weak password fails
- [x] Test: Successful registration creates user

**Files Modified**:
- `backend/src/controllers/auth.controller.ts`
- `backend/tests/integration/auth.test.ts`

---

## TASK 1.6: Add Logout Functionality
**Status**: ✅ DONE  
**Severity**: 🟡 HIGH  
**Estimated Time**: 1.5 hours

- [x] Logout endpoint clears refresh tokens
- [x] Logout invalidates session in Redis
- [x] After logout, refresh token fails
- [x] Frontend clears localStorage on logout
- [x] Test: Cannot use token after logout
- [x] Test: Cannot refresh after logout
- [x] Verify cleanup on server and client

**Files Modified**:
- `backend/src/controllers/auth.controller.ts`
- `backend/src/services/auth.service.ts`
- `frontend/src/hooks/useAuth.ts`

---

## TASK 1.7: Add Audit Logging for Auth Events
**Status**: ✅ DONE  
**Severity**: 🟡 HIGH  
**Estimated Time**: 2 hours

- [x] Log all login attempts (success/failure)
- [x] Log all logout events
- [x] Log token refresh events
- [x] Log failed auth attempts with reason
- [x] Include user ID, IP, timestamp in logs
- [x] Test: Audit log shows all events
- [x] Verify sensitive data not logged

**Files Modified**:
- `backend/src/middleware/audit.middleware.ts`
- `backend/src/services/auth.service.ts`
- `backend/src/controllers/auth.controller.ts`

---

## TASK 1.8: Phase 1 Testing & Sign-Off
**Status**: ✅ DONE  
**Severity**: 🟡 HIGH  
**Estimated Time**: 2 hours

- [x] All unit tests pass
- [x] All integration tests pass
- [x] No console errors in browser
- [x] No TypeScript errors
- [x] Linting passes
- [x] Manual testing of all 4 auth flows
- [x] Create Phase 1 sign-off evidence

**Testing Commands**:
```bash
cd backend && npm test
cd frontend && npm test
npm run lint
npm run build
```

**Files Modified**:
- `docs/evidence/2026-04-21/phase1-sign-off.md`

---

# PHASE 2: VIDEO SECURITY & SESSION MANAGEMENT (Week 2)

**Phase Duration**: April 25-27 (3 business days)  
**Priority**: 🔴 CRITICAL  
**Issues Addressed**: #3, #4, #8  
**Estimated Effort**: 14 developer-hours  
**Acceptance**: All 7 tasks must PASS before Phase 3

---

## TASK 2.1: Implement Video Token Expiration (5 minutes)
**Status**: ✅ DONE  
**Severity**: 🔴 CRITICAL  
**Estimated Time**: 2 hours

- [x] Video tokens expire in 5 minutes
- [x] Expired tokens cannot access segments
- [x] Check token expiry on every segment request
- [x] Test: Old token after 5 min fails
- [x] Test: New token works within 5 min
- [x] Verify frontend refreshes tokens
- [x] No silent failures on expired token

**Files Modified**:
- `backend/src/utils/video-token.ts`
- `backend/src/services/video-token.service.ts`
- `backend/tests/integration/video-token.test.ts`

---

## TASK 2.2: Add Enrollment Re-Check at Segment Endpoint
**Status**: ✅ DONE  
**Severity**: 🔴 CRITICAL  
**Estimated Time**: 2 hours

- [x] Before serving segment, check enrollment
- [x] Check enrollment status is ACTIVE
- [x] Check student hasn't been revoked
- [x] Reject if enrollment expired
- [x] Test: Revoked student cannot access
- [x] Test: Active student can access
- [x] Test: Expired enrollment denied

**Files Modified**:
- `backend/src/controllers/lesson.controller.ts`
- `backend/src/services/video-token.service.ts`
- `backend/tests/integration/video-hardening.test.ts`

---

## TASK 2.3: Implement Token Revocation on Enrollment Change
**Status**: ✅ DONE  
**Severity**: 🔴 CRITICAL  
**Estimated Time**: 2 hours

- [x] When enrollment revoked, invalidate all tokens
- [x] When status changed, clear token cache
- [x] When refund processed, revoke access
- [x] Test: Token invalid after revoke
- [x] Test: Student cannot re-use old token
- [x] Test: Admin can force revoke
- [x] Verify token cleanup in Redis

**Files Modified**:
- `backend/src/services/enrollment.service.ts`
- `backend/src/controllers/admin/students.controller.ts`
- `backend/tests/integration/enrollment.test.ts`

---

## TASK 2.4: Fix Enrollment Cache Expiry Issue
**Status**: ✅ DONE  
**Severity**: 🟡 HIGH  
**Estimated Time**: 1.5 hours

- [x] Enrollment cache TTL reduced to 2 minutes
- [x] Revocation immediately clears cache
- [x] Cache invalidation tested
- [x] Test: New token after revoke fails
- [x] Test: Cache doesn't delay revocation
- [x] Verify no 5-minute window
- [x] Monitor Redis cache behavior

**Files Modified**:
- `backend/src/services/enrollment.service.ts`
- `backend/src/utils/cache.ts`

---

## TASK 2.5: Implement Concurrent Session Enforcement
**Status**: ✅ DONE  
**Severity**: 🔴 CRITICAL  
**Estimated Time**: 2 hours

- [x] Only one active session per user
- [x] New login invalidates old sessions
- [x] Each session has unique session ID
- [x] Test: Second login logs out first
- [x] Test: Old token fails after new login
- [x] Test: Session ID in Redis updated
- [x] Toggle via ENFORCE_SINGLE_SESSION env var

**Files Modified**:
- `backend/src/services/session.service.ts`
- `backend/src/services/auth.service.ts`
- `backend/src/middleware/auth.middleware.ts`
- `backend/tests/integration/single-session.test.ts`

---

## TASK 2.6: Add Device Fingerprinting to Preview
**Status**: ✅ DONE  
**Severity**: 🟡 HIGH  
**Estimated Time**: 2 hours

- [x] Collect user agent and IP for preview
- [x] Store fingerprint with preview token
- [x] Validate fingerprint matches on use
- [x] Test: Different IP cannot use token
- [x] Test: Same device works normally
- [x] Tolerance for IP changes
- [x] Log fingerprint mismatches

**Files Modified**:
- `backend/src/services/video-token.service.ts`
- `backend/src/utils/device-fingerprint.ts`
- `backend/tests/integration/video-token.test.ts`

---

## TASK 2.7: Phase 2 Testing & Sign-Off
**Status**: ✅ DONE  
**Severity**: 🟡 HIGH  
**Estimated Time**: 1.5 hours

- [x] All video security tests pass
- [x] Session management tests pass
- [x] Manual video playback test
- [x] Test enrollment revocation flow
- [x] Test concurrent sessions
- [x] No TypeScript errors
- [x] Create Phase 2 sign-off evidence

**Testing Commands**:
```bash
npm test -- video-token
npm test -- single-session
npm test -- enrollment
npm test -- video-hardening
```

---

# PHASE 3: PERFORMANCE OPTIMIZATION - PART 1 (Week 2-3)

**Phase Duration**: April 28-30 (3 business days)  
**Priority**: 🟡 HIGH  
**Issues Addressed**: #6, #7  
**Estimated Effort**: 12 developer-hours  
**Acceptance**: All 6 tasks must PASS before Phase 4

---

## TASK 3.1: Fix N+1 Query in Lesson Listing
**Status**: ✅ DONE  
**Severity**: 🟡 HIGH  
**Estimated Time**: 2 hours

- [x] Batch load progress records
- [x] Merge progress into lessons in memory
- [x] Test: Query count reduced
- [x] Measure performance improvement
- [x] Test: Data still correct
- [x] Verify no missing progress
- [x] Load test with 1000+ lessons

**Files Modified**:
- `backend/src/controllers/lesson.controller.ts`
- `backend/src/services/lesson.service.ts`
- `backend/tests/integration/lesson.test.ts`

---

## TASK 3.2: Add Database Indexes for High-Traffic Columns
**Status**: ✅ DONE  
**Severity**: 🟡 HIGH  
**Estimated Time**: 2 hours

- [x] Index on User.id (primary lookup)
- [x] Index on Enrollment.userId
- [x] Index on LessonProgress.userId
- [x] Index on LessonProgress.lessonId
- [x] Index on VideoToken.sessionId
- [x] Index on Payment.userId
- [x] Run migration and verify

**Files Modified**:
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/*/migration.sql`

---

## TASK 3.3: Implement Course Settings Caching
**Status**: ✅ DONE  
**Severity**: 🟡 HIGH  
**Estimated Time**: 2 hours

- [x] Cache course settings in Redis
- [x] Cache duration: 1 hour
- [x] Invalidate on admin changes
- [x] Test: Cache hit reduces queries
- [x] Test: Updates reflected within 1 hour
- [x] Measure query reduction
- [x] Monitor cache hit rate

**Files Modified**:
- `backend/src/services/course.service.ts`
- `backend/src/controllers/admin/pricing.controller.ts`
- `backend/src/controllers/admin/settings.controller.ts`

---

## TASK 3.4: Implement Enrollment Status Caching
**Status**: ✅ DONE  
**Severity**: 🟡 HIGH  
**Estimated Time**: 1.5 hours

- [x] Cache enrollment status in Redis
- [x] Cache duration: 2 minutes
- [x] Invalidate immediately on changes
- [x] Test: Cache reduces DB queries
- [x] Test: Status changes reflected quickly
- [x] Measure query reduction
- [x] No stale data issues

**Files Modified**:
- `backend/src/services/enrollment.service.ts`
- `backend/src/utils/cache.ts`

---

## TASK 3.5: Optimize Lesson Detail Endpoint
**Status**: ✅ DONE  
**Severity**: 🟡 HIGH  
**Estimated Time**: 1.5 hours

- [x] Reduce queries in lesson detail
- [x] Batch load related data
- [x] Cache lesson metadata
- [x] Test: Single query for detail
- [x] Test: All data returned correctly
- [x] Measure performance
- [x] Load test with concurrent requests

**Files Modified**:
- `backend/src/controllers/lesson.controller.ts`
- `backend/src/services/lesson.service.ts`

---

## TASK 3.6: Phase 3 Testing & Benchmarking
**Status**: ✅ DONE  
**Severity**: 🟡 HIGH  
**Estimated Time**: 2 hours

- [x] Load test: 10k requests to /course
- [x] Load test: 5k requests to /lessons
- [x] Measure response times
- [x] Measure query counts
- [x] Verify all data accurate
- [x] No N+1 queries remaining
- [x] Create performance report

**Testing Commands**:
```bash
npm run load:course
npm run load:student
npm run load:benchmark
npm run load:report
```

---

# PHASE 4: PERFORMANCE OPTIMIZATION - PART 2 (Week 3)

**Phase Duration**: May 1-3 (3 business days)  
**Priority**: 🟡 HIGH  
**Issues Addressed**: #9, #10  
**Estimated Effort**: 12 developer-hours  
**Acceptance**: All 6 tasks must PASS before Phase 5

---

## TASK 4.1: Implement Redis Caching for Lessons
**Status**: ✅ DONE  
**Severity**: 🟡 HIGH  
**Estimated Time**: 2 hours

- [x] Cache lessons list in Redis
- [x] Cache duration: 2 hours
- [x] Invalidate on admin changes
- [x] Test: Cache reduces DB queries
- [x] Measure query reduction
- [x] Verify all lessons returned
- [x] Test concurrent cache access

**Files Modified**:
- `backend/src/services/lesson.service.ts`
- `backend/src/routes/student.routes.ts`

---

## TASK 4.2: Implement Redis Caching for Progress
**Status**: ✅ DONE  
**Severity**: 🟡 HIGH  
**Estimated Time**: 2 hours

- [x] Cache user progress in Redis
- [x] Cache duration: 5 minutes
- [x] Invalidate on progress update
- [x] Test: Faster progress retrieval
- [x] Measure performance gain
- [x] Verify data accuracy
- [x] Handle concurrent updates

**Files Modified**:
- `backend/src/services/progress.service.ts`
- `backend/src/controllers/lesson.controller.ts`

---

## TASK 4.3: Optimize Database Connection Pool
**Status**: ✅ DONE  
**Severity**: 🟡 HIGH  
**Estimated Time**: 1.5 hours

- [x] Configure Prisma connection pool
- [x] Set pool size based on load
- [x] Monitor connection usage
- [x] Test: No connection timeouts
- [x] Verify pool efficiency
- [x] Handle disconnections
- [x] Monitor metrics

**Files Modified**:
- `backend/src/config/database.ts`
- `backend/prisma/schema.prisma`

---

## TASK 4.4: Implement Query Result Pagination
**Status**: ✅ DONE  
**Severity**: 🟡 HIGH  
**Estimated Time**: 2 hours

- [x] Add pagination to lesson list
- [x] Add pagination to student list
- [x] Default page size: 20
- [x] Test: Returns correct subset
- [x] Test: Pagination links work
- [x] Verify count accuracy
- [x] Measure memory usage

**Files Modified**:
- `backend/src/controllers/lesson.controller.ts`
- `backend/src/controllers/admin/students.controller.ts`

---

## TASK 4.5: Optimize Frontend Bundle Size
**Status**: ✅ DONE  
**Severity**: 🟡 HIGH  
**Estimated Time**: 2 hours

- [x] Analyze bundle with esbuild
- [x] Remove unused dependencies
- [x] Code splitting for lazy routes
- [x] Test: Build time reduced
- [x] Test: Bundle size reduced
- [x] Test: No broken imports
- [x] Measure frontend load time

**Files Modified**:
- `frontend/vite.config.ts`
- `frontend/package.json`

---

## TASK 4.6: Phase 4 Performance Testing & Report
**Status**: ✅ DONE  
**Severity**: 🟡 HIGH  
**Estimated Time**: 2 hours

- [x] Load test: 50k requests
- [x] Measure p95 latency
- [x] Measure p99 latency
- [x] Verify no errors under load
- [x] Check memory usage
- [x] Verify all caching working
- [x] Create comprehensive report

**Testing Commands**:
```bash
npm run load:full
npm run load:stress
npm run analyze:bundle
npm run analyze:performance
```

---

# PHASE 5: MONITORING, TESTING & SIGN-OFF (Week 3-4)

**Phase Duration**: May 4-10 (5 business days)  
**Priority**: 🟡 HIGH  
**Issues Addressed**: All remaining  
**Estimated Effort**: 20 developer-hours  
**Acceptance**: Full QC sign-off required

---

## TASK 5.1: Set Up Prometheus Monitoring
**Status**: 🟡 IN PROGRESS  
**Severity**: 🟡 HIGH  
**Estimated Time**: 3 hours

- [ ] Deploy Prometheus container
- [ ] Collect backend metrics
- [ ] Collect frontend metrics
- [ ] Configure scrape intervals
- [ ] Test: Metrics visible in Prometheus
- [ ] Verify data quality
- [ ] Create metric dashboard

**Files Modified**:
- `docker-compose.monitoring.yml`
- `docker/prometheus/prometheus.yml`
- `backend/src/observability/prometheus.ts`

**Testing Commands**:
```bash
docker-compose -f docker-compose.monitoring.yml up -d
curl http://localhost:9090/metrics
```

---

## TASK 5.2: Set Up Grafana Dashboard
**Status**: 🟡 IN PROGRESS  
**Severity**: 🟡 HIGH  
**Estimated Time**: 2 hours

- [ ] Deploy Grafana container
- [ ] Connect to Prometheus
- [ ] Create API latency dashboard
- [ ] Create error rate dashboard
- [ ] Create cache hit rate dashboard
- [ ] Test: Dashboards visible
- [ ] Create dashboard documentation

**Files Modified**:
- `docker-compose.monitoring.yml`
- `docker/grafana/provisioning/*`

---

## TASK 5.3: Set Up Sentry Error Tracking
**Status**: 🟡 IN PROGRESS  
**Severity**: 🟡 HIGH  
**Estimated Time**: 2 hours

- [ ] Configure Sentry project
- [ ] Backend integration working
- [ ] Frontend integration working
- [ ] Test: Errors captured in Sentry
- [ ] Configure alerts
- [ ] Test: Alerts triggered
- [ ] Document alert procedures

**Files Modified**:
- `backend/src/observability/sentry.ts`
- `frontend/src/observability/sentry.ts`

---

## TASK 5.4: Create QC Security Checklist
**Status**: ✅ DONE  
**Severity**: 🟡 HIGH  
**Estimated Time**: 2 hours

- [x] Document all security tests
- [x] Create attacker scenarios
- [x] Add automated test script
- [x] Document manual test steps
- [x] Create evidence template
- [x] Add screenshot guides
- [x] Create QC runbook

**Files Modified**:
- `docs/QC_SECURITY_CHECKLIST.md`
- `docs/QC_SECURITY_REPORT_TEMPLATE.md`
- `frontend/scripts/playwright-manual-check.cjs`

---

## TASK 5.5: Create Integration Test Suite
**Status**: ✅ DONE  
**Severity**: 🟡 HIGH  
**Estimated Time**: 3 hours

- [x] Test all auth flows
- [x] Test all video flows
- [x] Test enrollment changes
- [x] Test concurrent sessions
- [x] Test performance requirements
- [x] Test error handling
- [x] Test data isolation

**Files Modified**:
- `backend/tests/integration/*.test.ts`
- `frontend/tests/e2e/*.spec.ts`

**Testing Commands**:
```bash
npm test
npm run test:e2e
npm run test:integration
```

---

## TASK 5.6: Create E2E Testing Suite
**Status**: ✅ DONE  
**Severity**: 🟡 HIGH  
**Estimated Time**: 2 hours

- [x] Test login flow end-to-end
- [x] Test video playback end-to-end
- [x] Test enrollment flow
- [x] Test refund flow
- [x] Test admin operations
- [x] Test error scenarios
- [x] Run on Chrome, Firefox, Safari

**Files Modified**:
- `frontend/tests/e2e/auth.spec.ts`
- `frontend/tests/e2e/video.spec.ts`
- `frontend/playwright.config.ts`

---

## TASK 5.7: Document All Security Measures
**Status**: 🟡 IN PROGRESS  
**Severity**: 🟡 HIGH  
**Estimated Time**: 3 hours

- [ ] Write architecture document
- [ ] Document each security fix
- [ ] Create runbook for operations
- [ ] Create troubleshooting guide
- [ ] Document monitoring procedures
- [ ] Create incident response guide
- [ ] Create deployment checklist

**Files Created**:
- `docs/SECURITY_ARCHITECTURE.md`
- `docs/SECURITY_RUNBOOK.md`
- `docs/TROUBLESHOOTING.md`
- `docs/DEPLOYMENT_CHECKLIST.md`

---

## TASK 5.8: Phase 5 QC Sign-Off
**Status**: 🟡 IN PROGRESS  
**Severity**: 🔴 CRITICAL  
**Estimated Time**: 4 hours

- [ ] Run all automated tests (must PASS)
- [ ] Run QC security checklist (manual)
- [ ] Verify all evidence collected
- [ ] Review all code changes
- [ ] Confirm no regressions
- [ ] Approve for production
- [ ] Create final sign-off report

**Sign-Off Checklist**:
- [ ] All 32 tasks completed
- [ ] All 5 phases passed
- [ ] All tests passing (100%)
- [ ] All evidence documented
- [ ] Security review approved
- [ ] Performance benchmarks met
- [ ] Ready for production deployment

**Testing Commands**:
```bash
npm test
npm run test:e2e
npm run load:full
npm run lint
npm run build
npm run analyze
```

---

## SUMMARY TABLE

| Phase | Status | Tasks | Estimated Hours | Start Date | End Date |
|-------|--------|-------|-----------------|------------|----------|
| Phase 1 | ✅ DONE | 8 | 16 | Apr 22 | Apr 24 |
| Phase 2 | ✅ DONE | 7 | 14 | Apr 25 | Apr 27 |
| Phase 3 | ✅ DONE | 6 | 12 | Apr 28 | Apr 30 |
| Phase 4 | ✅ DONE | 6 | 12 | May 1 | May 3 |
| Phase 5 | 🟡 IN PROGRESS | 8 | 20 | May 4 | May 10 |
| **TOTAL** | **🟡 ONGOING** | **32** | **80** | **Apr 22** | **May 10** |

---

## HOW TO USE THIS DOCUMENT

1. **Pick your current phase** (1-5)
2. **Work through tasks in order** (1.1, 1.2, ... 1.8)
3. **Check off each completed task** with ✅
4. **Run tests after each task**
5. **Don't skip ahead** - phases build on each other
6. **Only move to next phase when ALL tasks PASS**
7. **Document evidence** for QC in `docs/evidence/2026-04-21/`

---

## EVIDENCE & DOCUMENTATION

All evidence artifacts stored in:
```
docs/evidence/2026-04-21/
  ├── phase1-sign-off.md
  ├── phase2-sign-off.md
  ├── phase3-sign-off.md
  ├── phase4-sign-off.md
  ├── phase5-sign-off.md
  ├── performance-report.md
  ├── security-checklist-results.md
  └── final-sign-off.md
```

---

**Status Updated**: April 21, 2026  
**Next Review**: May 1, 2026  
**QC Sign-Off Target**: May 10, 2026
