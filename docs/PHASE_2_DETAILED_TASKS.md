# PHASE 2: HIGH PRIORITY SECURITY & PERFORMANCE FIXES

**Duration**: 2-3 weeks  
**Priority**: Complete immediately after Phase 1  
**Total Tasks**: 8  
**Estimated Total Time**: 25-32 hours

---

## PHASE 2 - TASK 1: Add RBAC Middleware to Admin Resource Endpoints

**Severity**: HIGH - Admin privilege escalation  
**Type**: Security / Authorization  
**Estimated Time**: 3-4 hours  
**Files Modified**: 2

### Description
Admin users can add resources to ANY lesson without verifying they have permission to edit that lesson. Resources should only be creatable for lessons the admin manages or course admins manage.

### Current Issue
```typescript
// resources.controller.ts - Line 39-50
async createResource(req: Request, res: Response, next: NextFunction) {
  const { lessonId, fileUrl, title } = req.body;
  // NO check that admin has access to this lesson!
  
  const resource = await prisma.lessonResource.create({
    data: { lessonId, fileUrl, title }
  });
}
```

### Files to Modify
1. **`backend/src/controllers/resources.controller.ts`** - Add permission check
2. **`backend/src/services/lesson.service.ts`** - Add permission lookup

### Implementation Checklist

- [ ] **Step 1**: Add permission check method to lesson.service.ts:
```typescript
async adminCanEditLesson(adminId: string, lessonId: string): Promise<boolean> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { courseId: true }
  });
  
  if (!lesson) return false;
  
  // Check if admin is assigned to this course
  const hasAccess = await prisma.courseAdmin.findUnique({
    where: { courseId_adminId: { courseId: lesson.courseId, adminId } }
  });
  
  return !!hasAccess;
}
```

- [ ] **Step 2**: Update createResource handler:
```typescript
async createResource(req: Request, res: Response, next: NextFunction) {
  const { lessonId, fileUrl, title } = req.body;
  const adminId = req.user!.userId;
  
  // Check permission
  const canEdit = await lessonService.adminCanEditLesson(adminId, lessonId);
  if (!canEdit) {
    return res.status(403).json({ error: "Access denied to this lesson" });
  }
  
  const resource = await prisma.lessonResource.create({
    data: { lessonId, fileUrl, title }
  });
  
  res.json(resource);
}
```

- [ ] **Step 3**: Test authorization:
```bash
# Admin 1 creates lesson in Course A
# Admin 2 (assigned to Course B) tries to add resource to Admin1's lesson
# Should receive 403 Forbidden
```

### Acceptance Criteria
✅ Admins can only add resources to lessons in their courses  
✅ Unauthorized admin receives 403 Forbidden  
✅ Super-admin can add resources to any lesson  
✅ Tests verify RBAC enforcement  

---

## PHASE 2 - TASK 2: Restrict Admin Order Detail User Data Exposure

**Severity**: HIGH - PII exposure  
**Type**: Security / Data Exposure  
**Estimated Time**: 2-3 hours  
**Files Modified**: 1

### Description
Order detail endpoint returns complete user object including `passwordHash`, `emailVerified`, `oauthProvider`, and other sensitive fields not needed for admin order viewing. Admin should only see customer name, email, and relevant order details.

### Current Issue
```typescript
// orders.controller.ts - Line 43-55
const payment = await prisma.payment.findUnique({
  where: { id },
  include: { user: true } // Returns ALL user fields!
});

res.json(payment);
// Response includes: id, email, fullName, passwordHash, emailVerified, 
// oauthProvider, createdAt, updatedAt, etc.
```

### Files to Modify
1. **`backend/src/controllers/admin/orders.controller.ts`** - Use selective field inclusion

### Implementation Checklist

- [ ] **Step 1**: Update detail handler to select specific fields:
```typescript
async detail(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params;
  
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          // DO NOT include: passwordHash, emailVerified, oauthProvider
        }
      },
      coupon: true,
      enrollment: true
    }
  });
  
  if (!payment) {
    return res.status(404).json({ error: "Payment not found" });
  }
  
  res.json(payment);
}
```

- [ ] **Step 2**: Verify response doesn't include sensitive fields:
```bash
curl /api/v1/admin/orders/123 \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | grep -E "passwordHash|emailVerified|oauthProvider"
# Should return nothing
```

- [ ] **Step 3**: Test all admin order endpoints use selective fields

### Acceptance Criteria
✅ Order detail doesn't return passwordHash  
✅ Order detail doesn't return emailVerified  
✅ Order detail doesn't return oauthProvider  
✅ Admin can still see customer email and name  
✅ All admin order endpoints follow same pattern  

---

## PHASE 2 - TASK 3: Implement Request-Level Memoization for Lesson Count

**Severity**: HIGH - Performance  
**Type**: Performance / Caching  
**Estimated Time**: 3-4 hours  
**Files Modified**: 2

### Description
`getPublishedLessonCount()` is called multiple times per request (list, detail, progress calculation). Each call hits Redis. Adding request-level memoization avoids redundant lookups in same request.

### Current Issue
```typescript
// Called 3+ times per request:
// 1. students.controller.ts:236 (list endpoint)
// 2. students.controller.ts:327 (detail endpoint)
// 3. progress.repository.ts:38 (progress calculation)

// Each call goes: request → Redis lookup → database (if cache miss)
```

### Files to Modify
1. **`backend/src/middleware/request-context.middleware.ts`** - NEW file
2. **`backend/src/services/lesson.service.ts`** - Use request cache

### Implementation Checklist

- [ ] **Step 1**: Create request context middleware:
```typescript
// backend/src/middleware/request-context.middleware.ts
declare global {
  namespace Express {
    interface Request {
      cache?: Map<string, any>;
    }
  }
}

export const requestCacheMiddleware = (req: Request, res: Response, next: NextFunction) => {
  req.cache = new Map(); // Fresh cache per request
  next();
};
```

- [ ] **Step 2**: Register middleware in app.ts:
```typescript
app.use(requestCacheMiddleware);
```

- [ ] **Step 3**: Update lesson.service.ts:
```typescript
async getPublishedLessonCount(req?: Request): Promise<number> {
  // Check request-level cache first (if req provided)
  if (req?.cache?.has("publishedLessonCount")) {
    return req.cache.get("publishedLessonCount");
  }

  // Check Redis cache
  try {
    const cached = await redis.get(publishedLessonCountCacheKey);
    if (cached) {
      const count = parseInt(cached, 10);
      if (req?.cache) req.cache.set("publishedLessonCount", count);
      return count;
    }
  } catch { /* ignore */ }

  // Database query
  const count = await prisma.lesson.count({ where: { isPublished: true } });

  // Cache in Redis
  try {
    await redis.setex(publishedLessonCountCacheKey, CACHE_TTL, String(count));
  } catch { /* ignore */ }

  // Cache in request
  if (req?.cache) req.cache.set("publishedLessonCount", count);

  return count;
}
```

- [ ] **Step 4**: Update all callers to pass request:
```typescript
// students.controller.ts
const count = await lessonService.getPublishedLessonCount(req);

// progress.repository.ts
const count = await lessonService.getPublishedLessonCount(req);
```

- [ ] **Step 5**: Test caching behavior:
```bash
# Add logging to service
logger.debug("publishedLessonCount", { source: "request-cache|redis|database" });

# Make request that calls count 3 times
curl /api/v1/admin/students/123/detail \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Check logs:
# publishedLessonCount source: database (first call)
# publishedLessonCount source: request-cache (second call)
# publishedLessonCount source: request-cache (third call)
```

### Acceptance Criteria
✅ First call within request hits database/Redis  
✅ Subsequent calls within same request use request-level cache  
✅ Different requests have separate caches  
✅ Request cache is garbage collected after response  
✅ Redis lookups reduced by ~60%  

---

## PHASE 2 - TASK 4: Paginate Student Detail Lesson Progress Query

**Severity**: HIGH - Performance  
**Type**: Performance / Scalability  
**Estimated Time**: 3-4 hours  
**Files Modified**: 2

### Description
Student detail endpoint fetches ALL lesson progress records (could be 100+) without pagination. With a student who completed 500 lessons, this query loads 500 progress objects into memory unnecessarily. Pagination to last 50 lessons keeps response size bounded.

### Current Issue
```typescript
// students.controller.ts - Line 335-361
const student = await prisma.user.findFirst({
  include: {
    lessonProgress: {
      orderBy: { updatedAt: "desc" }
      // NO pagination - loads ALL lessons!
    }
  }
});
```

### Files to Modify
1. **`backend/src/controllers/admin/students.controller.ts`** - Add take/skip
2. **`backend/src/types/pagination.ts`** - Define pagination schema

### Implementation Checklist

- [ ] **Step 1**: Update student detail query:
```typescript
const student = await prisma.user.findFirst({
  where: { id: studentId, role: "STUDENT" },
  include: {
    enrollments: { orderBy: { enrolledAt: "desc" } },
    lessonProgress: {
      orderBy: { updatedAt: "desc" },
      take: 50, // Only last 50 progresses
      skip: 0
    }
  }
});
```

- [ ] **Step 2**: Add pagination params to request handler:
```typescript
async detail(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params;
  const page = Math.max(0, parseInt(req.query.page as string) || 0);
  const limit = 50;
  const skip = page * limit;
  
  const student = await prisma.user.findFirst({
    include: {
      lessonProgress: {
        orderBy: { updatedAt: "desc" },
        take: limit,
        skip: skip
      }
    }
  });
}
```

- [ ] **Step 3**: Return pagination metadata:
```typescript
const totalProgress = await prisma.lessonProgress.count({
  where: { userId: studentId }
});

res.json({
  ...student,
  pagination: {
    page,
    limit,
    total: totalProgress,
    pages: Math.ceil(totalProgress / limit)
  }
});
```

- [ ] **Step 4**: Test with student who has 100+ lesson progress:
```bash
# Create test student with 100 lesson progresses
# Fetch detail
curl /api/v1/admin/students/123/detail \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Verify response includes only 50 progresses
# Verify pagination metadata is present
# Verify response size is bounded
```

### Acceptance Criteria
✅ Lesson progress paginated (max 50 per request)  
✅ Pagination metadata returned (total, page, pages)  
✅ Memory usage constant regardless of lesson count  
✅ Response time <500ms even with 100+ lessons  
✅ Next page accessible via ?page=1 query param  

---

## PHASE 2 - TASK 5: Add Cache Configuration to All React Query Hooks (Frontend)

**Severity**: HIGH - Performance  
**Type**: Performance / Frontend Caching  
**Estimated Time**: 4-5 hours  
**Files Modified**: 20+ files

### Description
20+ pages use React Query without `staleTime` or `gcTime` configuration. Default `staleTime: 0` means every component mount triggers a refetch. Setting `staleTime: 60000` (1 minute) reduces redundant requests by 70-80%.

### Current Issue
```typescript
// Pages missing cache config
const { data: lessons } = useQuery({
  queryKey: ["lessons"],
  queryFn: () => api.get("/lessons").then(r => r.data)
  // staleTime defaults to 0 - refetch on every mount!
});

// Load Lessons page: 1 request
// Navigate away, come back: 1 more request (unnecessary)
// Same data hasn't changed in 2 minutes!
```

### Files to Modify
1. **`frontend/src/hooks/useQuery*.ts`** - Create cached query hooks
2. **All page components** - Use cached hooks (20+ files)

### Implementation Checklist

- [ ] **Step 1**: Create cache constants:
```typescript
// frontend/src/lib/query-config.ts
export const CACHE_TIME = {
  SHORT: 1000 * 60, // 1 minute
  MEDIUM: 1000 * 60 * 5, // 5 minutes
  LONG: 1000 * 60 * 30, // 30 minutes
  NEVER: Infinity // Until invalidated
};
```

- [ ] **Step 2**: Create custom hook factory:
```typescript
// frontend/src/hooks/useQueryWithCache.ts
export const useQueryWithCache = <T,>(
  queryKey: QueryKey,
  queryFn: QueryFunction<T>,
  staleTime = CACHE_TIME.MEDIUM
) => {
  return useQuery<T>({
    queryKey,
    queryFn,
    staleTime,
    gcTime: staleTime * 2, // Keep in cache 2x longer
    refetchOnWindowFocus: false,
    refetchOnReconnect: true
  });
};
```

- [ ] **Step 3**: Create specific hooks for each data type:
```typescript
// frontend/src/hooks/useLessonsQuery.ts
export const useLessonsQuery = (filters?: any) => {
  return useQueryWithCache(
    ["lessons", filters],
    () => api.get("/lessons", { params: filters }).then(r => r.data),
    CACHE_TIME.SHORT // Lessons change frequently
  );
};

// frontend/src/hooks/useCourseQuery.ts
export const useCourseQuery = (courseId?: string) => {
  return useQueryWithCache(
    ["course", courseId],
    () => api.get(`/course/${courseId}`).then(r => r.data),
    CACHE_TIME.LONG // Course metadata changes rarely
  );
};
```

- [ ] **Step 4**: Replace useQuery calls in pages:
```typescript
// Before:
const { data: lessons } = useQuery({
  queryKey: ["lessons"],
  queryFn: () => api.get("/lessons").then(r => r.data)
});

// After:
const { data: lessons } = useLessonsQuery();
```

- [ ] **Step 5**: Identify and set appropriate cache times:
  - **SHORT (1 min)**: User profile, lesson progress, enrollment status
  - **MEDIUM (5 min)**: Lessons, courses, resources
  - **LONG (30 min)**: Admin student list, order history, analytics
  - **NEVER**: Cart items, checkout state (invalidate explicitly)

- [ ] **Step 6**: Apply to pages:
```bash
# List of pages to update:
# frontend/src/pages/Dashboard.tsx
# frontend/src/pages/Lessons.tsx
# frontend/src/pages/Course.tsx
# frontend/src/pages/Checkout.tsx
# frontend/src/pages/student/Profile.tsx
# frontend/src/pages/admin/Students.tsx
# frontend/src/pages/admin/StudentDetail.tsx
# ... (20+ files total)
```

- [ ] **Step 7**: Test caching behavior:
```bash
# 1. Load Lessons page
curl /api/v1/lessons
# 1 request

# 2. Navigate away
# 3. Return to Lessons page
curl /api/v1/lessons
# No request! (cached for 1 minute)

# 4. Wait 60+ seconds
# 5. Navigate back
curl /api/v1/lessons
# 1 request (cache expired)
```

### Acceptance Criteria
✅ All query hooks specify `staleTime`  
✅ No refetch within staleTime window  
✅ Refetch on tab focus returns true  
✅ Requests reduced by 70-80% per session  
✅ Memory usage constant (old data cached 2x staleTime)  

---

## PHASE 2 - TASK 6: Consolidate Duplicate Course Data Endpoints (Frontend)

**Severity**: HIGH - Performance  
**Type**: Performance / API Optimization  
**Estimated Time**: 3-4 hours  
**Files Modified**: 4

### Description
Same course data fetched with 3 different queryKeys: `["course-summary"]`, `["course-summary-public"]`, `["course-public"]`. Consolidating to single queryKey saves 2 redundant requests per session.

### Current Issue
```typescript
// Checkout.tsx
const { data } = useQuery({
  queryKey: ["course-summary"],
  queryFn: () => api.get("/course").then(r => r.data)
});

// Course.tsx
const { data } = useQuery({
  queryKey: ["course-summary-public"],
  queryFn: () => api.get("/course").then(r => r.data)
});

// Preview.tsx
const { data } = useQuery({
  queryKey: ["course-public"],
  queryFn: () => api.get("/course").then(r => r.data)
});
// All 3 fetch SAME endpoint but with different keys = 2 redundant requests!
```

### Files to Modify
1. **`frontend/src/hooks/useCourseQuery.ts`** - Unified hook
2. **`frontend/src/pages/Checkout.tsx`** - Use unified hook
3. **`frontend/src/pages/Course.tsx`** - Use unified hook
4. **`frontend/src/pages/Preview.tsx`** - Use unified hook

### Implementation Checklist

- [ ] **Step 1**: Create unified course query hook:
```typescript
// frontend/src/hooks/useCourseQuery.ts
export const useCourseQuery = (type?: 'public' | 'authenticated') => {
  return useQueryWithCache(
    ["course"], // Single key
    () => api.get("/course").then(r => r.data),
    CACHE_TIME.MEDIUM
  );
};
```

- [ ] **Step 2**: Update Checkout.tsx:
```typescript
// Before:
const { data } = useQuery({
  queryKey: ["course-summary"],
  queryFn: () => api.get("/course").then(r => r.data)
});

// After:
const { data } = useCourseQuery();
```

- [ ] **Step 3**: Update Course.tsx:
```typescript
const { data: course } = useCourseQuery();
```

- [ ] **Step 4**: Update Preview.tsx:
```typescript
const { data: course } = useCourseQuery('public');
```

- [ ] **Step 5**: Verify no duplicate requests:
```bash
# Open Network tab
# Load Checkout page
# Should see only 1 /course request

# Load Course page
# Should use cached data from Checkout

# Load Preview page
# Should use cached data
```

- [ ] **Step 6**: Test cache invalidation:
```typescript
// When course is updated
const queryClient = useQueryClient();
await queryClient.invalidateQueries({ queryKey: ["course"] });
// All pages using ["course"] refetch automatically
```

### Acceptance Criteria
✅ Single queryKey for course data  
✅ No duplicate `/course` requests  
✅ Cache shared across all pages  
✅ Requests reduced from 3 to 1 per session  
✅ Invalidation updates all consuming pages  

---

## PHASE 2 - TASK 7: Fix Lesson Data Double-Fetch (Frontend)

**Severity**: HIGH - Performance  
**Type**: Performance / API Optimization  
**Estimated Time**: 3-4 hours  
**Files Modified**: 2

### Description
Lessons page makes TWO simultaneous API calls to `/lessons` and `/lessons/grouped`. Both return same student's lesson data in different structures. One is redundant.

### Current Issue
```typescript
// Lessons.tsx
const [lessons, grouped] = await Promise.all([
  api.get("/lessons"), // Returns: [{ id, title, completedAt, ... }]
  api.get("/lessons/grouped") // Returns: { sectionId: [{ id, title, ... }] }
]);

// Both contain same data, different format!
// Only grouped view is used for rendering
// The /lessons call is wasted
```

### Files to Modify
1. **`backend/src/controllers/lesson.controller.ts`** - Verify endpoint behavior
2. **`frontend/src/pages/Lessons.tsx`** - Use only grouped endpoint

### Implementation Checklist

- [ ] **Step 1**: Identify what each endpoint returns:
```bash
# Test /lessons endpoint
curl /api/v1/lessons \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  | head -100
# Sample output: [{ id: "1", title: "...", completedAt: null }]

# Test /lessons/grouped endpoint
curl /api/v1/lessons/grouped \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  | head -100
# Sample output: { "section-1": [{ id: "1", title: "...", completedAt: null }] }
```

- [ ] **Step 2**: Update Lessons.tsx to use only grouped:
```typescript
// Before:
const [lessons, grouped] = await Promise.all([
  api.get("/lessons"),
  api.get("/lessons/grouped")
]);

// After:
const { data: grouped } = useQuery({
  queryKey: ["lessons-grouped"],
  queryFn: () => api.get("/lessons/grouped").then(r => r.data)
});

const lessons = useMemo(() => {
  // Convert grouped back to flat array if needed
  return Object.values(grouped).flat();
}, [grouped]);
```

- [ ] **Step 3**: Verify rendering still works:
```bash
# Load Lessons page
# Should still display all lessons correctly
# Should only make 1 /lessons* request
```

- [ ] **Step 4**: Check if /lessons is used elsewhere:
```bash
grep -r "/api/v1/lessons\"" frontend/src
# If only in Lessons.tsx, can remove that call
# If used elsewhere, consolidate to grouped format
```

- [ ] **Step 5**: Test performance:
```bash
# Before: 2 requests
# After: 1 request
# Page load time should be ~30-50% faster
```

### Acceptance Criteria
✅ Only one lesson endpoint called  
✅ Grouped data used for rendering  
✅ No duplicate data fetched  
✅ Request count reduced from 2 to 1  
✅ Page renders identically  

---

## PHASE 2 - TASK 8: Add Authentication Enrollment Status Enforcement

**Severity**: HIGH - Performance / Security  
**Type**: Security + Performance  
**Estimated Time**: 3-4 hours  
**Files Modified**: 2

### Description
Student pages serialize enrollment status check before other queries (100-300ms delay). Parallelize with other requests and remove unnecessary prefetching. Also verify backend enforces enrollment on lesson access.

### Current Issue
```typescript
// Current: Waits for enrollment before fetching lessons
const enrollment = await fetchEnrollment(); // 200ms
const lessons = await fetchLessons(); // Waits until enrollment done

// Better: Fetch in parallel
const [enrollment, lessons] = await Promise.all([
  fetchEnrollment(),
  fetchLessons()
]);
```

### Files to Modify
1. **`frontend/src/pages/Dashboard.tsx`** - Parallelize queries
2. **`frontend/src/lib/router.tsx`** - Remove serial dependencies

### Implementation Checklist

- [ ] **Step 1**: Identify serial dependencies:
```typescript
// Before (serial):
const enrollment = await fetchEnrollment();
if (!enrollment?.active) return <NotEnrolled />;
const lessons = await fetchLessons();
```

- [ ] **Step 2**: Parallelize in Dashboard:
```typescript
// After (parallel):
const [enrollmentQuery, lessonsQuery] = useQueries({
  queries: [
    { queryKey: ["enrollment"], queryFn: fetchEnrollment },
    { queryKey: ["lessons"], queryFn: fetchLessons }
  ]
});

const enrollment = enrollmentQuery.data;
const lessons = lessonsQuery.data;

if (!enrollment?.active) return <NotEnrolled />;
return <LessonsList lessons={lessons} />;
```

- [ ] **Step 3**: Use Promise.all instead of await chains:
```typescript
// Before:
const profile = await api.get("/user/profile");
const enrollments = await api.get("/enrollments");
const dashboard = await api.get("/dashboard");

// After:
const [profile, enrollments, dashboard] = await Promise.all([
  api.get("/user/profile"),
  api.get("/enrollments"),
  api.get("/dashboard")
]);
```

- [ ] **Step 4**: Verify backend enforces access:
```bash
# Student not enrolled tries to access lesson
curl /api/v1/lessons/123 \
  -H "Authorization: Bearer $UNENROLLED_STUDENT_TOKEN"
# Should return 403 Forbidden

# Backend must validate enrollment status
# Frontend cannot be sole arbiter of access
```

- [ ] **Step 5**: Test parallel loading:
```bash
# Open Network tab (DevTools)
# Load Dashboard
# Should see 3 requests starting simultaneously
# Not: Request 1 → Request 2 → Request 3 (serial)
```

### Acceptance Criteria
✅ Enrollment status checked in parallel with data fetch  
✅ Page load time reduced by 100-300ms  
✅ Backend enforces enrollment on lesson access  
✅ Serial chains replaced with Promise.all  
✅ No UI flicker from async dependencies  

---

## PHASE 2 SUMMARY TABLE

| Task | Priority Issue | Fix | Time |
|------|---|---|---|
| 1 | Resource RBAC | Add admin permission check | 3-4h |
| 2 | Order PII exposure | Selective field selection | 2-3h |
| 3 | Lesson count inefficiency | Request-level memoization | 3-4h |
| 4 | Progress memory bloat | Pagination (50 max) | 3-4h |
| 5 | Cache misses | Add staleTime to queries | 4-5h |
| 6 | Duplicate endpoints | Single queryKey | 3-4h |
| 7 | Double-fetch lessons | Remove redundant call | 3-4h |
| 8 | Serial enrollment check | Parallelize queries | 3-4h |
| **TOTAL PHASE 2** | **8 HIGH PRIORITY** | **23 HIGH IMPACT** | **25-32h** |

---

## PHASE 2 VERIFICATION CHECKLIST

After completing Phase 2:

- [ ] All 8 tasks implemented and tested
- [ ] No regressions in existing features
- [ ] Performance benchmarks improved:
  - Admin student list: <500ms (was 1-2s)
  - Dashboard load: <800ms (was 1.5-2s)
  - Lessons page: <600ms (was 1-2s)
- [ ] API call count reduced by 30-50%
- [ ] Memory usage stable under load
- [ ] All tests passing
- [ ] Security review completed
- [ ] Code review signed off
- [ ] Ready for Phase 3

---

## NEXT PHASE

See `PHASE_3_DETAILED_TASKS.md` for medium-priority fixes.
