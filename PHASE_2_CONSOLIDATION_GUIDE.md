# Phase 2 Tasks 6-8: Consolidation & Optimization Guide

## Task 6: Consolidate Duplicate Course Data Endpoints

**Current State:** Multiple queryKeys fetch the same `/course` endpoint:
- `["course-summary"]` - Checkout.tsx, Course.tsx
- `["course-summary-public"]` - Preview.tsx
- `["course-public"]` - Legacy

**Target:** Consolidate to single `["course"]` queryKey

### Implementation:
```typescript
// BEFORE (Checkout, Course, Preview pages):
const { data } = useQuery({
  queryKey: ["course-summary"],  // or "course-summary-public"
  queryFn: () => api.get("/course").then(r => r.data),
  staleTime: CACHE_TIME.MEDIUM,
  gcTime: getGCTime(CACHE_TIME.MEDIUM)
});

// AFTER:
const { data } = useQuery({
  queryKey: ["course"],  // Single unified key
  queryFn: () => api.get("/course").then(r => r.data),
  staleTime: CACHE_TIME.MEDIUM,
  gcTime: getGCTime(CACHE_TIME.MEDIUM)
});
```

### Files to Update:
- `frontend/src/pages/Checkout.tsx` - Change "course-summary" → "course"
- `frontend/src/pages/Course.tsx` - Change "course-summary" → "course"  
- `frontend/src/pages/Preview.tsx` - Change "course-summary-public" → "course"
- Any invalidate calls: `["course-summary"]` → `["course"]`

**Benefit:** 2-3 redundant `/course` requests eliminated per session.

---

## Task 7: Fix Lesson Data Double-Fetch

**Current State:** `Lessons.tsx` fetches TWO endpoints:
```typescript
const [lessons, grouped] = await Promise.all([
  api.get("/lessons"),          // Returns flat array
  api.get("/lessons/grouped")   // Returns grouped by section
]);
// Only grouped is used in rendering - lessons call is wasted!
```

**Target:** Use ONLY `/lessons/grouped`, remove `/lessons`

### Implementation:
```typescript
// BEFORE:
const [lessons, grouped] = await Promise.all([
  api.get("/lessons"),
  api.get("/lessons/grouped")
]);

// AFTER (use only grouped):
const { data: grouped } = useQuery({
  queryKey: ["lessons-grouped"],
  queryFn: () => api.get("/lessons/grouped").then(r => r.data),
  staleTime: CACHE_TIME.MEDIUM,
  gcTime: getGCTime(CACHE_TIME.MEDIUM)
});

// If flat array needed:
const lessons = useMemo(() => 
  Object.values(grouped || {}).flat(), 
  [grouped]
);
```

### Files to Update:
- `frontend/src/pages/Lessons.tsx` - Remove `/lessons` call, use only `/lessons/grouped`

**Benefit:** 50% fewer requests on Lessons page load (1 request instead of 2).

---

## Task 8: Parallel Enrollment Status Checks

**Current State:** Serial fetching in Dashboard:
```typescript
// Waits for enrollment before fetching other data
const enrollment = await fetchEnrollment(); // 200ms
const lessons = await fetchLessons(); // Waits 200ms more
```

**Target:** Parallelize with Promise.all or useQueries

### Implementation:
```typescript
// BEFORE (serial):
const enrollment = useQuery({
  queryKey: ["enrollment"],
  queryFn: fetchEnrollment
});

const lessons = useQuery({
  queryKey: ["lessons"],
  queryFn: fetchLessons
});
// Requests run sequentially: total ~400ms

// AFTER (parallel):
const [enrollmentQuery, lessonsQuery] = useQueries({
  queries: [
    {
      queryKey: ["enrollment"],
      queryFn: fetchEnrollment,
      staleTime: CACHE_TIME.SHORT,
      gcTime: getGCTime(CACHE_TIME.SHORT)
    },
    {
      queryKey: ["lessons"],
      queryFn: fetchLessons,
      staleTime: CACHE_TIME.MEDIUM,
      gcTime: getGCTime(CACHE_TIME.MEDIUM)
    }
  ]
});
// Requests run in parallel: total ~200ms (2x faster)
```

### Files to Update:
- `frontend/src/pages/student/Dashboard.tsx` - Use useQueries or Promise.all
- `frontend/src/lib/router.tsx` - Parallelize bootstrap queries

**Benefit:** 50% faster page load (fewer blocking waits on enrollment check).

---

## Implementation Checklist

- [ ] Task 6: Update all course queryKey references
- [ ] Task 6: Update all course invalidation calls
- [ ] Task 6: Test Checkout → Course → Preview navigation (should use cache)
- [ ] Task 7: Update Lessons.tsx to use only /lessons/grouped
- [ ] Task 7: Verify lessons still render correctly
- [ ] Task 7: Network tab shows 1 request (not 2) on Lessons page
- [ ] Task 8: Convert Dashboard to useQueries or Promise.all
- [ ] Task 8: Run lighthouse - enrollment check should not block other requests
- [ ] All files pass eslint
- [ ] All pages render without console errors

---

## Performance Expected Impact

| Metric | Before | After | Gain |
|--------|--------|-------|------|
| Checkout→Course→Preview nav | 3x /course | 1x /course (cached) | 67% reduction |
| Lessons page load | 2 requests | 1 request | 50% faster |
| Dashboard mount | ~400ms | ~200ms | 2x faster |
| Session API calls | 25-35 | 8-12 | 70% reduction |

---

## Notes

- All Task 6-8 work uses the cache configuration from Task 5
- Always add `staleTime` and `gcTime` from `CACHE_TIME` constants
- Consolidate duplicate requests aggressively - if two pages fetch same endpoint with same key, they should share cache
- Parallelization with useQueries is preferred over Promise.all for React Query integrations
