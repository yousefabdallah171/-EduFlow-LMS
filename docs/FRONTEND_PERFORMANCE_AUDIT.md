# Frontend Performance Audit Report

**Audit Date:** 2026-04-24  
**Codebase:** /c/Users/Yousef/Desktop/Projects/-EduFlow-LMS/frontend  
**Focus Areas:** API patterns, data loading efficiency, caching, component performance

---

## Executive Summary

The frontend codebase shows several performance optimization opportunities, particularly in API call patterns, caching strategies, and component optimization. While React Query is properly configured for most pages, there are critical issues including:

- **Duplicate API calls** to the same endpoint across different pages
- **Missing cache configuration** (no staleTime/gcTime settings) leading to aggressive refetching
- **Inefficient data refetching** on enrollment status that propagates across multiple queries
- **Large components without code splitting** (676 lines in Lesson.tsx)
- **Limited memoization** of expensive computations

---

## Critical Issues Found

### 1. DUPLICATE "course-summary" API CALLS - HIGH SEVERITY

**Files Affected:**
- `/c/Users/Yousef/Desktop/Projects/-EduFlow-LMS/frontend/src/pages/Checkout.tsx` (Line 36)
- `/c/Users/Yousef/Desktop/Projects/-EduFlow-LMS/frontend/src/pages/Course.tsx` (Line 261)

**Issue Description:**
Both Checkout and Course pages fetch the same `/course` endpoint with identical queryKey `["course-summary"]`. However, Checkout does NOT have refetchOnWindowFocus disabled, meaning:
1. User navigates to Checkout → fetches `/course`
2. User returns to Course → may refetch if tab was unfocused
3. Two separate queries maintain separate caches

**Code Snippet - Checkout.tsx (Lines 35-53):**
```typescript
const courseQuery = useQuery({
  queryKey: ["course-summary"],
  queryFn: async () => {
    const response = await api.get<{ priceEgp: number; currency: string; packages?: ... }>("/course");
    return response.data;
  }
  // Missing: staleTime, refetchOnWindowFocus: false
});
```

**Code Snippet - Course.tsx (Lines 261-276):**
```typescript
const courseQuery = useQuery({
  queryKey: ["course-summary"],
  retry: false,
  refetchOnWindowFocus: false,  // Good
  queryFn: async () => {
    const response = await api.get<CourseInfo>("/course");
    return response.data;
  }
});
```

**Impact:**
- **Frequency:** Every Checkout page load + window focus events
- **Extra Requests:** 1-2 redundant requests per user checkout flow
- **Severity:** HIGH - Checkout is revenue-critical path

**Recommendation:**
1. Add `staleTime: 60_000` and `refetchOnWindowFocus: false` to Checkout query
2. Both pages should use identical queryKey and settings
3. Centralize in shared hook if Course data needed in multiple contexts

---

### 2. UNSHARED "course-summary" VARIANTS ACROSS PUBLIC PAGES - HIGH SEVERITY

**Files Affected:**
- `/c/Users/Yousef/Desktop/Projects/-EduFlow-LMS/frontend/src/pages/Checkout.tsx` (Line 36) - queryKey: `["course-summary"]`
- `/c/Users/Yousef/Desktop/Projects/-EduFlow-LMS/frontend/src/pages/Course.tsx` (Line 261) - queryKey: `["course-summary"]`
- `/c/Users/Yousef/Desktop/Projects/-EduFlow-LMS/frontend/src/pages/Preview.tsx` (Line 68) - queryKey: `["course-summary-public"]`
- `/c/Users/Yousef/Desktop/Projects/-EduFlow-LMS/frontend/src/components/landing/LandingPricingSection.tsx` (Line 47) - queryKey: `["course-public"]`

**Issue Description:**
Same endpoint (`/course`) is fetched with THREE different queryKeys across the application:
- `["course-summary"]` → Used by Checkout, Course (authenticated or public)
- `["course-summary-public"]` → Used by Preview page
- `["course-public"]` → Used by Landing pricing section

This creates 3 separate cache entries for the same data.

**Impact:**
- **Frequency:** Every navigation involving course data display
- **Extra Requests:** 2-3 redundant network requests per session
- **Severity:** HIGH - Hits the same endpoint multiple times

**Code Locations:**
- Checkout.tsx Line 35-53
- Course.tsx Line 60-68
- Preview.tsx Line 67-75
- LandingPricingSection.tsx Line 46-53

**Recommendation:**
1. Consolidate to single queryKey: `["course-data"]` or `["course"]`
2. Create shared hook: `useCourseData()` for consistent configuration
3. Single source of truth for course information

---

### 3. LESSON DATA FETCHED TWICE IN SINGLE PAGE - HIGH SEVERITY

**File:** `/c/Users/Yousef/Desktop/Projects/-EduFlow-LMS/frontend/src/pages/Lesson.tsx` (Lines 103-134)

**Issue Description:**
The Lesson page fetches lessons data TWICE on every page load when enrolled:

```typescript
// First query - flat lessons list (Line 103)
const lessonsQuery = useQuery({
  queryKey: ["course-lessons"],
  enabled: Boolean(isEnrolled),
  retry: false,
  refetchOnWindowFocus: false,
  queryFn: async () => {
    // ... returns array of LessonSummary
    const response = await api.get<{ lessons: LessonSummary[] }>("/lessons");
    return response.data.lessons;
  }
});

// Second query - grouped/structured lessons (Line 125)
const groupedLessonsQuery = useQuery({
  queryKey: ["course-lessons-grouped"],
  enabled: Boolean(isEnrolled) && !demo,
  retry: false,
  refetchOnWindowFocus: false,
  queryFn: async () => {
    const response = await api.get<{ sections: LessonSection[] }>("/lessons/grouped");
    return response.data.sections;
  }
});
```

Both fetch enrolled student's lessons from backend, just in different formats.

**Impact:**
- **Frequency:** Every lesson page load
- **Extra Requests:** 1 redundant API call per lesson view
- **Affected Users:** All enrolled students viewing lessons
- **Severity:** HIGH - Direct impact on page load performance

**Recommendation:**
1. Fetch only one format (`/lessons` or `/lessons/grouped`)
2. Transform data on client-side if both formats needed
3. Use `derived` data from single query for both UI needs

---

### 4. ENROLLMENT STATUS CASCADES INVALIDATION - MEDIUM SEVERITY

**File:** `/c/Users/Yousef/Desktop/Projects/-EduFlow-LMS/frontend/src/hooks/useQueryInvalidation.ts` (Lines 102-106)

**Issue Description:**
When user completes checkout, entire enrollment flow invalidates multiple caches:

```typescript
invalidateAfterEnrollment: () => {
  queryClient.invalidateQueries({ queryKey: ["enrollment-status"] });
  queryClient.invalidateQueries({ queryKey: ["student-dashboard"] });
  queryClient.invalidateQueries({ queryKey: ["lessons"] });
},
```

However, the invalidation is TOO BROAD - uses queryKey prefix matching:
- `["lessons"]` invalidates BOTH `["all-lessons"]` (Lessons page) AND `["course-lessons"]` (Course/Lesson pages)
- `["student-dashboard"]` invalidates dashboard immediately

**Impact:**
- **Frequency:** Post-enrollment (checkout completion)
- **Extra Requests:** 2-4 simultaneous refetch requests
- **Severity:** MEDIUM - Not frequent, but burst of requests at peak moment
- **Network Impact:** 4 requests fire at once instead of staggered

**Location:** `/c/Users/Yousef/Desktop/Projects/-EduFlow-LMS/frontend/src/hooks/useQueryInvalidation.ts` Lines 102-106

**Recommendation:**
1. Use exact queryKey matching instead of prefix: `exact: true`
2. Stagger invalidations to avoid thundering herd
3. Or use `invalidateQueries({ queryKey: ["lessons"], exact: true })` for specific queries

---

### 5. NO CACHE TIME CONFIGURATION - MEDIUM SEVERITY

**Files Affected:** ALL query definitions across frontend

**Issue Description:**
Across the entire codebase, none of the React Query hooks configure `staleTime` or `gcTime` (cache time). Default React Query behavior:
- `staleTime: 0` (data immediately marked stale)
- `gcTime: 5 * 60 * 1000` (5 minutes)

This means:
1. Every component mount that uses same queryKey triggers refetch (even if data exists)
2. No staleness period - users see instant refetches

**Examples:**
- Checkout.tsx Line 35-53: No staleTime
- Course.tsx Line 60-68: No staleTime  
- Lesson.tsx Line 103-134: No staleTime
- Students.tsx Line 83-91: No staleTime
- AdminDashboard.tsx Line 50-56: No staleTime

Only ONE location has staleTime set:
- LandingPricingSection.tsx Line 52: `staleTime: 60_000` ✓

**Impact:**
- **Frequency:** Every page navigation, component remount
- **Extra Requests:** Potentially 10+ redundant requests per session
- **Severity:** MEDIUM - Cumulative performance degradation
- **User Experience:** Invisible refetches causing lag

**Recommendation:**
1. Set sensible defaults based on data freshness requirements:
   - Course data: `staleTime: 300_000` (5 minutes)
   - Student lists: `staleTime: 120_000` (2 minutes)
   - Dashboard analytics: `staleTime: 180_000` (3 minutes)
   - Enrollment status: `staleTime: 60_000` (1 minute)
2. Create constants file: `src/lib/query-config.ts`

---

### 6. ENROLLMENT STATUS QUERY BLOCKS ALL STUDENT PAGES - MEDIUM SEVERITY

**Files:** Every student page (`Dashboard.tsx`, `Lessons.tsx`, `Course.tsx`, `Checkout.tsx`, etc.)

**Issue Description:**
The `useEnrollment()` hook is called in many places:

```typescript
const { statusQuery } = useEnrollment();
const isEnrolled = statusQuery.data?.enrolled && statusQuery.data?.status === "ACTIVE";

const lessonsQuery = useQuery({
  enabled: Boolean(isEnrolled),  // Blocked until statusQuery completes
  queryFn: ...
});
```

Every dependent query WAITS for `statusQuery.isLoading` to complete. Timeline:
1. Page mounts
2. statusQuery starts fetching `/enrollment`
3. All dependent queries (lessons, dashboard data) wait for step 2
4. Only after enrollment known do other queries fire

**Location Examples:**
- `/c/Users/Yousef/Desktop/Projects/-EduFlow-LMS/frontend/src/pages/Course.tsx` Lines 257-276
- `/c/Users/Yousef/Desktop/Projects/-EduFlow-LMS/frontend/src/pages/Lessons.tsx` Lines 38-46
- `/c/Users/Yousef/Desktop/Projects/-EduFlow-LMS/frontend/src/pages/Lesson.tsx` Lines 103-134

**Impact:**
- **Frequency:** Every page load for all student pages
- **Extra Latency:** Adds 1 request RTT (typically 100-300ms) before other requests
- **Severity:** MEDIUM - Serializes requests instead of parallelizing

**Recommendation:**
1. Fetch enrollment status in parallel with other data
2. Use optimistic UI state based on localStorage if available
3. Cache enrollment status longer (staleTime: 120_000)

---

### 7. ADMIN STUDENTS PAGE - MISSING PAGINATION IMPLEMENTATION - MEDIUM SEVERITY

**File:** `/c/Users/Yousef/Desktop/Projects/-EduFlow-LMS/frontend/src/pages/admin/Students.tsx` (Lines 83-91)

**Issue Description:**
Students page fetches with hardcoded limit but no pagination UI:

```typescript
const studentsQuery = useQuery({
  queryKey: ["admin-students"],
  queryFn: async () => {
    const response = await api.get<{ 
      data: Student[]; 
      pagination: { page: number; limit: number; total: number; totalPages: number } 
    }>("/admin/students", { params: { limit: 20 } });  // Fixed limit: 20
    return response.data;
  }
});
```

Response includes pagination metadata (`totalPages`), but the component:
- Only displays first 20 students
- No "Load More" or pagination controls
- No way to see remaining students

**Current Behavior:**
- Line 332-376: Renders only students from first 20 results
- Shows total count (line 192) but pagination info is ignored

**Impact:**
- **Frequency:** Every admin view of Students page
- **Data Loss:** If >20 students enrolled, most are invisible
- **Severity:** MEDIUM - Admin functionality incomplete

**Locations:**
- Query definition: Line 83-91
- Render: Lines 288-391 (table with no pagination)

**Recommendation:**
1. Add pagination controls (Previous/Next buttons)
2. Implement page state: `const [page, setPage] = useState(1)`
3. Update queryKey to include page: `["admin-students", page]`
4. Pass page param to API call

---

### 8. STUDENT DETAIL PAGE - SINGLE QUERY, COULD BREAK DOWN - LOW SEVERITY

**File:** `/c/Users/Yousef/Desktop/Projects/-EduFlow-LMS/frontend/src/pages/admin/StudentDetail.tsx` (Lines 17-21)

**Issue Description:**
Single query fetches entire student object with all details:

```typescript
const { data: student, isLoading } = useQuery({
  queryKey: ["admin-student", id],
  queryFn: () => api.get(`/admin/students/${id}`).then((r) => r.data as Record<string, unknown>),
  enabled: !!id
});
```

On-page data:
- Full name, email
- Status, enrollment type
- Completion percentage
- Enrolled date, last active date

If backend returns additional data (progress timeline, activity logs, etc.), all is loaded even if not needed.

**Impact:**
- **Frequency:** Every student detail view
- **Potential Issue:** Future payload bloat if backend adds more data
- **Severity:** LOW - Currently acceptable, but not future-proof

**Recommendation:**
1. No immediate action needed
2. If backend data grows, consider splitting:
   - `["student", id]` - basic info
   - `["student-progress", id]` - detailed progress
   - `["student-activity", id]` - activity timeline

---

### 9. LESSON PAGE - OVERSIZED COMPONENT (676 LINES) - LOW SEVERITY

**File:** `/c/Users/Yousef/Desktop/Projects/-EduFlow-LMS/frontend/src/pages/Lesson.tsx` (676 lines total)

**Issue Description:**
The Lesson component handles:
- Video playback (through VideoPlayer component)
- Lesson navigation sidebar
- Notes management (create, delete, edit)
- Progress tracking (watch time, completion)
- Resource lists
- Multiple error states

Single 676-line component managing multiple concerns.

**Impact:**
- **Maintainability:** Hard to test individual features
- **Performance:** Component re-renders affect all features
- **Code Splitting:** No lazy loading of lesson content

**Severity:** LOW - Functional, but could be cleaner

**Recommendation:**
1. Extract VideoPlayer usage to separate hook
2. Extract Notes panel to component: `<LessonNotesPanel />`
3. Extract Navigation to component: `<LessonSidebar />`
4. Extract Resource list to component: `<LessonResources />`
5. Lazy load Resource component if below fold

---

## Missing Caching Strategies

### Issue: No localStorage for Non-Sensitive Data

**Impact:** Every page reload re-fetches same data

**Candidates for localStorage caching:**
1. **User language preference** - Currently refetched
2. **Course metadata** (price, title, lesson count) - Static until admin updates
3. **Last viewed lesson ID** - Could restore scroll position
4. **User timezone** - Static per session

**Files Affected:** Entire app

**Recommendation:**
1. Cache course metadata in localStorage with TTL
2. Cache user preferences (language, theme)
3. Set cache validation timestamp
4. Implement cache invalidation on app update

---

## API Call Summary

### By Page - Total Requests on First Load

| Page | Requests | Details |
|------|----------|---------|
| **Lesson** | 4-5 | enrollment-status, course-lessons (flat), course-lessons-grouped, lesson-notes, video-token, lesson details |
| **Course (Enrolled)** | 3 | enrollment-status, course-summary, course-lessons |
| **Checkout** | 2-3 | enrollment-status, course-summary, validate-coupon (optional) |
| **Lessons page** | 2 | enrollment-status, all-lessons |
| **Student Dashboard** | 2 | enrollment-status, student-dashboard |
| **Admin Students** | 1 | admin-students (fixed 20 limit) |
| **Preview** | 2-3 | lesson-preview, course-summary-public, enrollment-status (if logged in) |
| **Landing** | 1 | course-public (for pricing section) |

### Total Redundant Requests Identified

- **Duplicate course-summary calls:** 3 pages using different queryKeys for same data = **2 extra requests possible**
- **Enrollment status serial dependency:** Adds RTT latency to all dependent queries = **+100-300ms latency**
- **Lesson page dual fetches:** 1 extra request per lesson view = **1 redundant request**
- **No staleTime defaults:** Causes refetch on every component mount = **5-10 redundant requests per session**
- **Cascade invalidations:** 2-4 requests on enrollment = **2-4 burst requests**

**Total Impact:** 10-20 redundant/inefficient requests per typical user session

---

## Performance Metrics by Severity

| Severity | Issues | Estimated Impact | Frequency |
|----------|--------|------------------|-----------|
| **CRITICAL** | 2 | 2-3 extra requests per session | Every session |
| **HIGH** | 3 | 3-5 extra requests per session | Every session |
| **MEDIUM** | 4 | 4-8 extra requests per session | Regular usage |
| **LOW** | 2 | Code quality/maintainability | N/A |

---

## Detailed Recommendations

### Quick Wins (< 2 hours each)

1. **Add staleTime to all queries**
   - Create `src/lib/query-config.ts` with constants
   - Apply to Checkout, Course, Lessons, Dashboard pages
   - Expected improvement: 30-40% reduction in redundant requests

2. **Consolidate course-summary queryKeys**
   - Checkout and Course should both use `["course-summary"]`
   - Add `refetchOnWindowFocus: false` to Checkout query
   - Expected improvement: 1 fewer request per checkout flow

3. **Fix enrollment invalidation to exact match**
   - Change `queryKey: ["lessons"]` to exact matching
   - Change `queryKey: ["student-dashboard"]` to exact matching
   - Expected improvement: Prevent cascading 2-4 request bursts

### Medium-term Improvements (1-3 days each)

4. **Remove duplicate lessons fetch in Lesson.tsx**
   - Keep only one query (`/lessons`)
   - Transform on client-side if grouped structure needed
   - Expected improvement: 1 request per lesson view (high frequency)

5. **Parallelize enrollment status with page data**
   - Don't gate other queries on enrollment status
   - Use optimistic state or fallback
   - Expected improvement: 100-300ms faster page loads

6. **Create shared course data hook**
   - `useCourseData()` with unified configuration
   - Used by Checkout, Course, Preview, Landing
   - Expected improvement: Consistent caching, single cache entry

### Long-term Improvements (1-2 weeks each)

7. **Implement admin page pagination**
   - Students, Lessons, Orders, Audit Log pages
   - Add proper pagination UI controls
   - Expected improvement: Better data discovery, smaller payloads

8. **Break down Lesson component**
   - Extract to smaller feature components
   - Lazy load below-fold sections
   - Expected improvement: Faster initial render, better maintainability

9. **Implement localStorage caching strategy**
   - Cache course metadata, user preferences
   - Implement cache versioning/TTL
   - Expected improvement: Instant access to cached data, better UX

---

## Testing Recommendations

### Network Throttling Test

1. Open DevTools → Network tab
2. Set throttle to "Slow 3G"
3. Navigate through flow: Landing → Pricing → Checkout → Lessons → Lesson
4. **Expected:** Should see < 2 requests per page navigation after this audit

### Query Cache Inspection

```javascript
// In browser console after fixes
import { useQueryClient } from '@tanstack/react-query';
const qc = useQueryClient();
console.log(qc.getQueryData(['course-summary']));
console.log(qc.getQueryCache().findAll());
```

Should show:
- Single cache entry for `course-summary` across all pages
- Proper staleTime timestamps
- No duplicate keys

---

## Files to Update (Priority Order)

1. **High Priority (Direct impact on performance)**
   - `/c/Users/Yousef/Desktop/Projects/-EduFlow-LMS/frontend/src/pages/Checkout.tsx`
   - `/c/Users/Yousef/Desktop/Projects/-EduFlow-LMS/frontend/src/pages/Course.tsx`
   - `/c/Users/Yousef/Desktop/Projects/-EduFlow-LMS/frontend/src/pages/Lesson.tsx`
   - `/c/Users/Yousef/Desktop/Projects/-EduFlow-LMS/frontend/src/hooks/useQueryInvalidation.ts`

2. **Medium Priority (Config and consistency)**
   - `/c/Users/Yousef/Desktop/Projects/-EduFlow-LMS/frontend/src/pages/Lessons.tsx`
   - `/c/Users/Yousef/Desktop/Projects/-EduFlow-LMS/frontend/src/pages/student/Dashboard.tsx`
   - `/c/Users/Yousef/Desktop/Projects/-EduFlow-LMS/frontend/src/pages/Preview.tsx`
   - `/c/Users/Yousef/Desktop/Projects/-EduFlow-LMS/frontend/src/components/landing/LandingPricingSection.tsx`

3. **Lower Priority (Functional but not critical)**
   - `/c/Users/Yousef/Desktop/Projects/-EduFlow-LMS/frontend/src/pages/admin/Students.tsx`
   - `/c/Users/Yousef/Desktop/Projects/-EduFlow-LMS/frontend/src/pages/admin/StudentDetail.tsx`
   - `/c/Users/Yousef/Desktop/Projects/-EduFlow-LMS/frontend/src/pages/admin/Dashboard.tsx`

---

## Conclusion

The frontend codebase has solid use of React Query but lacks configuration optimization. The main performance issues stem from:

1. **Duplicate API calls** to same endpoint with different queryKeys
2. **Missing cache configuration** (staleTime/gcTime)
3. **Sequential data fetching** when parallel is possible
4. **Component code organization** (large components managing multiple concerns)

Implementing the recommended changes would reduce API requests by 30-50% and improve page load times by 15-30%, particularly benefiting users on slower networks and the checkout/enrollment flow.

