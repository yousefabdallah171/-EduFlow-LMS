# EduFlow LMS — Student Dashboard & Pages

> **Update rule:** Any time you add/change a student page, component, or route, update this doc.

---

## Route Map (Student)

All student routes require login (`STUDENT` role). Locale prefix `/:locale/` is optional — both `/en/lessons` and `/lessons` work.

| Route | File | Description |
|-------|------|-------------|
| `/dashboard` | `pages/student/Dashboard.tsx` | Main student hub |
| `/lessons` | `pages/Lessons.tsx` | All lessons grouped by section |
| `/lessons/:lessonId` | `pages/Lesson.tsx` | Video player + notes |
| `/progress` | `pages/student/Progress.tsx` | Progress tracking |
| `/notes` | `pages/student/Notes.tsx` | All notes |
| `/downloads` | `pages/student/Downloads.tsx` | Downloadable resources |
| `/orders` | `pages/student/Orders.tsx` | Purchase history |
| `/profile` | `pages/student/Profile.tsx` | Account settings |
| `/help` | `pages/student/Help.tsx` | FAQ & support |

---

## Student Dashboard (`/dashboard`)

**File:** `frontend/src/pages/student/Dashboard.tsx`  
**API:** `GET /api/v1/student/dashboard`  
**Cache:** Redis `student:dashboard:{userId}` — 5 minutes

### What It Shows

- **Enrollment status** — ACTIVE / REVOKED / EXPIRED banner
- **Course completion %** — `completionPercent` based on completed lessons / total
- **Progress bar** — visual completion indicator
- **Enrolled date** — when enrollment started
- **Total watch time** — `totalWatchTimeSeconds` in hr:min
- **Lessons watched count** — out of total published lessons
- **Last lesson** — resume button pointing to `lastLessonId`
- **Quick links** — to `/lessons`, `/progress`, `/notes`, `/downloads`

### Dashboard Payload (from API)

```typescript
{
  lastLessonId:          string | null,
  completionPercent:     number,          // 0–100
  enrolled:              boolean,
  status:                string | null,   // "ACTIVE" | "REVOKED" | ...
  enrolledAt:            string | null,   // ISO date
  totalWatchTimeSeconds: number,
  lessonsWatched:        number,
  progress: Array<{
    lessonId:   string,
    watchTime:  number,   // seconds
    completed:  boolean,
  }>
}
```

Cache invalidated when: student enrolls, enrollment revoked, or progress updated.

---

## Lessons Page (`/lessons`)

**File:** `frontend/src/pages/Lessons.tsx`  
**API:** `GET /api/v1/lessons/grouped`  
**Cache:** Redis `lessons:published-grouped:v1` — 2 hours; React Query staleTime = 5 min

### What It Shows

- Lessons organized into **sections** (collapsible)
- Each section has a total duration and lesson count
- Each lesson card shows: title, duration, completion badge, preview/locked icon
- Lazy loading: first 12 lessons per section, more on scroll (IntersectionObserver)
- Search/filter in UI (client-side)

---

## Lesson Player (`/lessons/:lessonId`)

**File:** `frontend/src/pages/Lesson.tsx`  
**API:** `GET /api/v1/lessons/:id/detail`

### What It Shows

- **HLS video player** (native `<video>` + HLS.js)
- Lesson title and description (bilingual based on locale)
- Section breadcrumb
- **Note-taking panel** — timestamped notes pinned to video position
  - Create: POST `/student/notes` with `positionSeconds`
  - Click note → jump to that position in video
  - Export all notes via `/student/notes/export`
- **Resources panel** — downloadable files (`LessonResource` table)
- **Progress auto-save** — every 5 seconds, POST `/lessons/:id/progress`
- **Watermark** — user name + masked email overlaid
- **Drip content** — locked indicator if `dripDays` not yet reached

---

## Progress Page (`/progress`)

**File:** `frontend/src/pages/student/Progress.tsx`

### What It Shows

- Visual progress bar (% complete)
- Lesson completion breakdown: ✅ completed / 🔄 in-progress / ⬜ not started
- Count stats: completed, in-progress, not started
- Suggested next lesson
- Watch time per lesson

---

## Notes Page (`/notes`)

**File:** `frontend/src/pages/student/Notes.tsx`  
**API:** `GET /student/notes`, `POST /student/notes`, `PATCH /student/notes/:id`, `DELETE /student/notes/:id`

- Shows all notes across all lessons
- Grouped by lesson
- Shows timestamp in video where note was taken
- Click → navigates to `/lessons/:lessonId?t={positionSeconds}`
- Edit / delete inline
- Export button → `GET /student/notes/export`

---

## Downloads Page (`/downloads`)

**File:** `frontend/src/pages/student/Downloads.tsx`  
**API:** Fetches from lesson resources across all enrolled lessons

- Lists all downloadable files (PDFs, ZIPs, etc.)
- Shows file size, lesson name, download button
- Only accessible to enrolled students

---

## Orders Page (`/orders`)

**File:** `frontend/src/pages/student/Orders.tsx`  
**API:** `GET /student/orders`  
**Cache:** Redis `student:payments:{userId}` — 1 hour

- Payment history with amount (EGP), status, date
- Status badges: COMPLETED, PENDING, FAILED, REFUNDED, REFUND_REQUESTED
- Refund request button for COMPLETED payments

---

## Profile Page (`/profile`)

**File:** `frontend/src/pages/student/Profile.tsx`  
**API:** `GET /student/profile`, `PATCH /student/profile`, `PATCH /student/profile/password`

- Edit: fullName, locale (en/ar), theme (light/dark), avatarUrl
- Change password (Google-linked accounts: password change is **locked/disabled**)
- Email display only (not editable)

---

## Student Components

**`components/student/SectionGroup.tsx`**
- Collapsible section container
- IntersectionObserver for lazy loading (loads 12 per scroll)
- Total duration display for section

**`components/student/LessonCard.tsx`**
- Lesson title, description, duration
- Status: preview (unlocked), locked (not enrolled), completed badge
- Drip countdown if locked by drip schedule

**`components/student/ResourcesList.tsx`**
- Downloadable resource list with file size and download link

---

## Shell & Layout

**`components/layout/StudentShell.tsx`** — wrapper for all student pages  
**`components/layout/NavBar.tsx`** — nav items for logged-in student:

```
Dashboard | Course | Lessons | Profile
```

Language switcher (EN / AR) and theme toggle always visible.  
User avatar dropdown: Profile, Logout.

---

## Localization

All student-facing text is translated in `frontend/src/locales/en.json` and `ar.json`.

Student translation key namespaces:
- `student.dashboard.*` — dashboard labels
- `student.progress.*` — progress page
- `student.lesson.*` — lesson player
- `common.*` — shared UI

Arabic locale: full RTL support, bidirectional icons via `.icon-dir` class.

---

## Database Tables Used by Student Pages

| Page | Primary Table(s) |
|------|-----------------|
| Dashboard | Enrollment, LessonProgress, Lesson |
| Lessons | Section → Lesson (nested select) |
| Lesson player | Lesson, VideoToken, LessonProgress |
| Notes | Note |
| Downloads | LessonResource |
| Orders | Payment |
| Progress | LessonProgress, Lesson |
| Profile | User |
