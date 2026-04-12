---
description: "Task list for EduFlow — Student Course Platform"
---

# Tasks: EduFlow — Student Course Platform

**Input**: Design documents from `/specs/001-student-course-platform/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: P0 integration + E2E tests are **REQUIRED** (constitution principle VIII — NON-NEGOTIABLE).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US7)
- All tasks include exact file paths

## Path Conventions

- **Backend**: `backend/src/`, `backend/tests/`, `backend/prisma/`
- **Frontend**: `frontend/src/`, `frontend/tests/e2e/`
- **Infrastructure**: `docker/`, `docker-compose.yml`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Monorepo scaffolding, Docker, tooling, and base configuration. No business logic.

- [ ] T001 Initialize pnpm monorepo with `pnpm-workspace.yaml` at repository root
- [ ] T002 [P] Scaffold backend package: `backend/package.json`, `backend/tsconfig.json` (strict mode), `backend/.eslintrc.js`
- [ ] T003 [P] Scaffold frontend package: `frontend/package.json`, `frontend/tsconfig.json` (strict mode), `frontend/.eslintrc.js`
- [ ] T004 [P] Create `docker/backend.Dockerfile` (Node.js 20 Alpine multi-stage build)
- [ ] T005 [P] Create `docker/frontend.Dockerfile` (Vite build → Nginx Alpine)
- [ ] T006 [P] Create `docker/nginx.conf` (SPA fallback, `/api/*` proxy, tus large-body config)
- [ ] T007 [P] Create `docker-compose.yml` (services: frontend, backend, postgres:16-alpine, redis:7-alpine on `eduflow_net`; volumes: pgdata, redisdata, video_storage)
- [ ] T008 [P] Create `docker-compose.dev.yml` (dev overrides: hot-reload volume mounts for backend tsx watch + frontend Vite HMR)
- [ ] T009 [P] Create `.env.example` at repo root with all required variables (DATABASE_URL using Docker hostnames)
- [ ] T010 [P] Configure Tailwind CSS with EduFlow brand tokens (#EB2027 primary red tonal scale) in `frontend/src/styles/tailwind.config.ts`
- [ ] T011 [P] Add Inter + Noto Kufi Arabic font imports and `:lang(ar)` font switching in `frontend/src/styles/globals.css`
- [ ] T012 [P] Add `eslint-plugin-logical-css` rule to block hardcoded `left`/`right` CSS values in `frontend/.eslintrc.js`
- [ ] T013 Initialize shadcn/ui component registry and install base components (Table, Dialog, Sheet, Tabs, Form, Input, Select, Badge, Progress, Skeleton, Card, Avatar, Accordion, Switch, Sonner) in `frontend/src/components/ui/`

**Checkpoint**: Repo structure created, Docker stack starts (`docker compose up --build`), both containers healthy.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core backend infrastructure that ALL user stories depend on. No user story work begins until this phase is complete.

**⚠️ CRITICAL**: Every phase from 3 onward blocks on this phase completing.

- [ ] T014 Define complete Prisma schema with all 10 tables (users, refresh_tokens, enrollments, payments, coupons, lessons, lesson_progress, video_tokens, video_uploads, course_settings) in `backend/prisma/schema.prisma`
- [ ] T015 Run initial Prisma migration and generate client: `backend/prisma/migrations/`
- [ ] T016 Create seed script (admin user `admin@eduflow.com`/`Admin1234!`, course settings EN/AR, 3 sample lessons) in `backend/prisma/seed.ts`
- [ ] T017 [P] Implement zod-validated env schema in `backend/src/config/env.ts`
- [ ] T018 [P] Implement Prisma client singleton in `backend/src/config/database.ts`
- [ ] T019 [P] Implement ioredis client singleton in `backend/src/config/redis.ts`
- [ ] T020 Implement Express app with helmet, cors (allowlist), compression, and global error handler in `backend/src/app.ts`
- [ ] T021 [P] Implement JWT utility: sign/verify access token (15 min HS256) + refresh token (7 days) in `backend/src/utils/jwt.ts`
- [ ] T022 [P] Implement email masking utility (`j***@example.com` format) in `backend/src/utils/mask-email.ts`
- [ ] T023 [P] Implement nodemailer email utility (verification + password reset templates) in `backend/src/utils/email.ts`
- [ ] T024 Implement JWT auth middleware (validate Bearer token, attach `req.user`) in `backend/src/middleware/auth.middleware.ts`
- [ ] T025 Implement RBAC middleware (`requireRole('ADMIN' | 'STUDENT')`) in `backend/src/middleware/rbac.middleware.ts`
- [ ] T026 [P] Implement rate limiting middleware (10 req/min auth, 20 req/min payment) in `backend/src/middleware/rate-limit.middleware.ts`
- [ ] T027 [P] Set up React app entry point with `<StrictMode>` and provider stack in `frontend/src/main.tsx`
- [ ] T028 [P] Create RootLayout component (sets `dir`+`lang` on `<html>` from locale store, applies theme class) in `frontend/src/components/layout/RootLayout.tsx`
- [ ] T029 [P] Configure react-i18next with `en.json` + `ar.json` skeleton files and locale detector in `frontend/src/lib/i18n.ts`
- [ ] T030 [P] Configure TanStack Query client + axios instance with JWT interceptor (attach Bearer, handle 401 refresh) in `frontend/src/lib/api.ts`
- [ ] T031 [P] Create Zustand stores: `auth.store.ts` (user + accessToken), `theme.store.ts` (light/dark + localStorage), `locale.store.ts` (en/ar + localStorage) in `frontend/src/stores/`

**Checkpoint**: `docker compose exec backend pnpm prisma migrate deploy && pnpm prisma db seed` succeeds. `GET /api/v1/course` returns 200.

---

## Phase 3: User Story 1 — Student Registration (Priority: P1) 🎯 MVP

**Goal**: Students can register with email/password or Google OAuth, verify email, log in, and reset password.

**Independent Test**: Registration → email verification → login → refresh token → logout cycle works end-to-end.

### P0 Tests for User Story 1 ⚠️ (Constitution VIII — NON-NEGOTIABLE)

> **Write tests first — they MUST FAIL before implementation**

- [ ] T032 [P] [US1] Write integration test for email registration + duplicate check in `backend/tests/integration/auth.test.ts`
- [ ] T033 [P] [US1] Write integration test for JWT refresh rotation + reuse detection in `backend/tests/integration/auth.test.ts`
- [ ] T034 [P] [US1] Write E2E test for full registration → verify → login flow in `frontend/tests/e2e/registration.spec.ts`

### Implementation for User Story 1

- [ ] T035 [P] [US1] Create User repository (findByEmail, findById, create, update) in `backend/src/repositories/user.repository.ts`
- [ ] T036 [P] [US1] Create RefreshToken repository (create, findByHash, revokeByFamily, revokeBySession) in `backend/src/repositories/refresh-token.repository.ts`
- [ ] T037 [US1] Implement AuthService (register with bcrypt cost 12, login, logout, refresh with family tracking, forgotPassword, resetPassword) in `backend/src/services/auth.service.ts`
- [ ] T038 [US1] Configure Passport Google OAuth2 strategy (find-or-create by googleId/email, issue EduFlow JWT after OAuth) in `backend/src/config/passport.ts`
- [ ] T039 [US1] Implement auth controller (register, login, oauth callback, refresh, logout, forgotPassword, resetPassword, verifyEmail) in `backend/src/controllers/auth.controller.ts`
- [ ] T040 [US1] Define auth routes with rate limiting applied in `backend/src/routes/auth.routes.ts`
- [ ] T041 [P] [US1] Create Register page: shadcn/ui Form + inline validation + Google OAuth button in `frontend/src/pages/Register.tsx`
- [ ] T042 [P] [US1] Create Login page: shadcn/ui Form + inline validation in `frontend/src/pages/Login.tsx`
- [ ] T043 [P] [US1] Create ForgotPassword + ResetPassword pages with shadcn/ui Form in `frontend/src/pages/ForgotPassword.tsx`
- [ ] T044 [US1] Implement useAuth hook (login, logout, refresh on mount, Google OAuth redirect) in `frontend/src/hooks/useAuth.ts`

**Checkpoint**: Student can register, verify email, log in, and refresh tokens. Google OAuth flow complete.

---

## Phase 4: User Story 2 — Paymob Course Purchase (Priority: P2)

**Goal**: Enrolled student can purchase the course via Paymob. Webhook triggers enrollment with HMAC validation.

**Independent Test**: Initiate checkout → simulate Paymob webhook with valid HMAC → verify enrollment ACTIVE; repeat with tampered HMAC → verify enrollment NOT created.

### P0 Tests for User Story 2 ⚠️ (Constitution VIII — NON-NEGOTIABLE)

> **Write tests first — they MUST FAIL before implementation**

- [ ] T045 [P] [US2] Write integration test for checkout initiation + HMAC webhook enrollment in `backend/tests/integration/payment-webhook.test.ts`
- [ ] T046 [P] [US2] Write unit test for HMAC-SHA512 validation (valid payload + tampered payload) in `backend/tests/unit/hmac.test.ts`

### Implementation for User Story 2

- [ ] T047 [P] [US2] Create Payment repository (create, findById, updateStatus, findByPaymobTxId) in `backend/src/repositories/payment.repository.ts`
- [ ] T048 [P] [US2] Create Enrollment repository (create, findByUserId, updateStatus, revoke) in `backend/src/repositories/enrollment.repository.ts`
- [ ] T049 [P] [US2] Create Coupon repository (findByCode, incrementUses, findAllActive) in `backend/src/repositories/coupon.repository.ts`
- [ ] T050 [US2] Implement HMAC webhook middleware (validate Paymob HMAC-SHA512, reject on mismatch) in `backend/src/middleware/hmac.middleware.ts`
- [ ] T051 [US2] Implement PaymentService (createPaymobOrder, getPaymentKey, applyCoupon, processWebhook with idempotency check on paymob_transaction_id) in `backend/src/services/payment.service.ts`
- [ ] T052 [US2] Implement EnrollmentService (enroll, revoke, getStatus, cacheInRedis) in `backend/src/services/enrollment.service.ts`
- [ ] T053 [US2] Implement payment controller (POST /checkout, POST /checkout/validate-coupon) in `backend/src/controllers/payment.controller.ts`
- [ ] T054 [US2] Implement webhook controller (POST /webhooks/paymob — public route, HMAC middleware applied) in `backend/src/controllers/webhook.controller.ts`
- [ ] T055 [US2] Register payment + webhook routes in `backend/src/routes/student.routes.ts`
- [ ] T056 [US2] Create Checkout page: course price display, coupon input with Floating UI popover for coupon details, Pay Now button, shadcn/ui Skeleton while loading in `frontend/src/pages/Checkout.tsx`
- [ ] T057 [US2] Implement useEnrollment hook (check enrollment status, poll after payment redirect) in `frontend/src/hooks/useEnrollment.ts`

**Checkpoint**: Student completes Paymob payment, webhook received, enrollment ACTIVE. Invalid HMAC → 400, no enrollment.

---

## Phase 5: User Story 3 — Protected Video Playback with Watermark (Priority: P3)

**Goal**: Enrolled student plays HLS video with signed token. Dynamic watermark overlay. Token expires on logout.

**Independent Test**: Get lesson → extract videoToken → stream HLS → verify watermark visible; logout → old token rejected 401; share URL → rejected 401.

### P0 Tests for User Story 3 ⚠️ (Constitution VIII — NON-NEGOTIABLE)

> **Write tests first — they MUST FAIL before implementation**

- [ ] T058 [P] [US3] Write integration test for video token issuance + expiry + revocation on logout in `backend/tests/integration/video-token.test.ts`
- [ ] T059 [P] [US3] Write integration test for progress tracking (update, completion at 90%) in `backend/tests/integration/progress.test.ts`
- [ ] T060 [P] [US3] Write E2E test for video playback + watermark visibility in `frontend/tests/e2e/video-playback.spec.ts`

### Implementation for User Story 3

- [ ] T061 [P] [US3] Create VideoToken repository (create, findByHash, revokeBySession, revokeByUser) in `backend/src/repositories/video-token.repository.ts`
- [ ] T062 [P] [US3] Create Lesson repository (findAll, findById, findPublishedForStudent with drip check) in `backend/src/repositories/lesson.repository.ts`
- [ ] T063 [P] [US3] Create LessonProgress repository (upsert, findByUserAndLesson, findCourseCompletion) in `backend/src/repositories/progress.repository.ts`
- [ ] T064 [US3] Implement video token utility (sign JWT with userId+lessonId+sessionId, verify, revoke via Redis) in `backend/src/utils/video-token.ts`
- [ ] T065 [US3] Implement VideoTokenService (issue token, validate token, revoke on logout, AES-128 key generation per session) in `backend/src/services/video-token.service.ts`
- [ ] T066 [US3] Implement ProgressService (updateProgress, markComplete at ≥90% watch time, getCourseCompletion) in `backend/src/services/progress.service.ts`
- [ ] T067 [US3] Implement lesson controller (GET /lessons, GET /lessons/:id with token issuance, POST /lessons/:id/progress, GET /video/:id/playlist.m3u8, GET /video/:id/key) in `backend/src/controllers/lesson.controller.ts`
- [ ] T068 [US3] Register lesson + video routes in `backend/src/routes/student.routes.ts`
- [ ] T069 [P] [US3] Create WatermarkOverlay component (semi-transparent div with name + masked email, position changes every 45s) in `frontend/src/components/shared/WatermarkOverlay.tsx`
- [ ] T070 [US3] Create VideoPlayer component: hls.js initialization, WatermarkOverlay layered on top, Floating UI tooltips on control buttons, re-request token on expiry in `frontend/src/components/shared/VideoPlayer.tsx`
- [ ] T071 [US3] Implement useVideoToken hook (fetch token from API, handle 401 → trigger re-auth) in `frontend/src/hooks/useVideoToken.ts`
- [ ] T072 [US3] Create Lesson page: VideoPlayer + lesson title + progress bar + next/prev navigation in `frontend/src/pages/Lesson.tsx`
- [ ] T073 [US3] Create Course page: shadcn/ui Accordion curriculum (locked/unlocked lessons), course completion Progress bar in `frontend/src/pages/Course.tsx`

**Checkpoint**: Enrolled student streams HLS video with watermark. Token expires correctly. Unenrolled student gets 403.

---

## Phase 6: User Story 4 — Admin Video Upload (Priority: P4)

**Goal**: Admin uploads video via tus protocol with pause/resume. FFmpeg processes to HLS. Progress tracked in Sheet panel.

**Independent Test**: Create tus session → upload in chunks → pause mid-upload → resume from offset → verify HLS files generated.

### P0 Tests for User Story 4 ⚠️ (Constitution VIII — NON-NEGOTIABLE)

> **Write tests first — they MUST FAIL before implementation**

- [ ] T074 [P] [US4] Write integration test for tus upload: chunk upload, offset query, resume-after-interrupt in `backend/tests/integration/tus-upload.test.ts`

### Implementation for User Story 4

- [ ] T075 [P] [US4] Create VideoUpload repository (create, findById, updateOffset, updateStatus) in `backend/src/repositories/video-upload.repository.ts`
- [ ] T076 [US4] Implement UploadService: @tus-io/server configuration (Redis-backed state, onUploadFinish triggers FFmpeg job, HLS output to video_storage volume) in `backend/src/services/upload.service.ts`
- [ ] T077 [US4] Implement admin uploads controller (tus POST, HEAD, PATCH, DELETE; GET list) in `backend/src/controllers/admin/uploads.controller.ts`
- [ ] T078 [US4] Implement admin lessons controller (GET list, POST create, PATCH update, DELETE, POST reorder) in `backend/src/controllers/admin/lessons.controller.ts`
- [ ] T079 [US4] Register admin upload + lesson routes (RBAC ADMIN required) in `backend/src/routes/admin.routes.ts`
- [ ] T080 [P] [US4] Implement useTusUpload hook (tus-js-client Upload, onProgress → Progress bar, onSuccess/onError → Sonner toast) in `frontend/src/hooks/useTusUpload.ts`
- [ ] T081 [US4] Create admin Lessons page: lesson list table, "Upload Video" button opening Sheet panel with shadcn/ui Progress bar and cancel Dialog in `frontend/src/pages/admin/Lessons.tsx`

**Checkpoint**: Admin uploads a test video, progress tracked to 100%, HLS segments appear in storage, lesson status → READY.

---

## Phase 7: User Story 5 — Admin Student Management (Priority: P5)

**Goal**: Admin lists students, searches with live combobox, manually enrolls or revokes with Dialog confirmation.

**Independent Test**: Search for student → enroll → verify access → revoke → verify access denied.

### P0 Tests for User Story 5 ⚠️ (Constitution VIII — NON-NEGOTIABLE)

> **Write tests first — they MUST FAIL before implementation**

- [ ] T082 [P] [US5] Write integration test for manual enrollment + revocation + access invalidation in `backend/tests/integration/enrollment.test.ts`

### Implementation for User Story 5

- [ ] T083 [US5] Implement admin students controller (GET list paginated, GET search ILIKE query, POST enroll, POST revoke) in `backend/src/controllers/admin/students.controller.ts`
- [ ] T084 [US5] Register admin student routes in `backend/src/routes/admin.routes.ts`
- [ ] T085 [US5] Create admin Students page: shadcn/ui Table with enrollment status Badge, Headless UI Combobox live search, Enroll/Revoke buttons with Dialog confirmation, shadcn/ui Skeleton while loading, EmptyState when no results in `frontend/src/pages/admin/Students.tsx`
- [ ] T086 [US5] E2E test: admin enroll + revoke flow in `frontend/tests/e2e/admin-enrollment.spec.ts`

**Checkpoint**: Admin finds student via combobox, enrolls, student gains access, admin revokes, student loses access.

---

## Phase 8: User Story 6 — Pricing & Coupon Management (Priority: P6)

**Goal**: Admin sets course price, creates/edits/deletes coupons. Coupons applied at checkout.

**Independent Test**: Create coupon → apply at checkout → verify discounted price in Paymob order; expire coupon → verify checkout rejects it.

### Implementation for User Story 6

- [ ] T087 [US6] Implement CouponService (validate, apply with row-level lock to prevent race conditions, CRUD) in `backend/src/services/coupon.service.ts`
- [ ] T088 [US6] Implement admin coupons controller (GET list, POST create, PATCH update, DELETE soft-delete) in `backend/src/controllers/admin/coupons.controller.ts`
- [ ] T089 [US6] Implement admin pricing controller (GET current price, PATCH update price) in `backend/src/controllers/admin/pricing.controller.ts`
- [ ] T090 [US6] Register coupon + pricing routes in `backend/src/routes/admin.routes.ts`
- [ ] T091 [US6] Create admin Pricing page: course price editor, coupon list with Floating UI popovers for usage stats, create/edit/delete Dialogs, shadcn/ui Badge for EXPIRED status in `frontend/src/pages/admin/Pricing.tsx`
- [ ] T092 [US6] Unit test: coupon validation (expiry, max uses, race condition, discount calculation) in `backend/tests/unit/coupon.test.ts`

**Checkpoint**: Admin creates SAVE20 coupon, student applies it at checkout, Paymob receives discounted amount.

---

## Phase 9: User Story 7 — Admin Analytics & Reporting (Priority: P7)

**Goal**: Admin views KPI dashboard (revenue, enrollments, completion rate, watch time) cached in Redis.

**Independent Test**: Trigger enrollments + progress updates → view analytics dashboard → verify KPIs match expected calculations.

### Implementation for User Story 7

- [ ] T093 [US7] Implement AnalyticsService (calculateKPIs with Redis 60-min cache, revenueTimeseries, topLessons, dropOffLessons) in `backend/src/services/analytics.service.ts`
- [ ] T094 [US7] Implement admin analytics controller (GET KPIs by period, GET payments list paginated, POST mark-paid) in `backend/src/controllers/admin/analytics.controller.ts`
- [ ] T095 [US7] Register analytics + payments routes in `backend/src/routes/admin.routes.ts`
- [ ] T096 [US7] Create admin Dashboard page: shadcn/ui Cards for KPIs (revenue, enrollments, completion, watch time), revenue + enrollment timeseries charts in `frontend/src/pages/admin/Dashboard.tsx`
- [ ] T097 [US7] Create admin Analytics page: lesson completion rates table, drop-off analysis, payment history table with shadcn/ui Table + filters in `frontend/src/pages/admin/Analytics.tsx`
- [ ] T098 [US7] Unit test: KPI calculation accuracy (revenue sum, completion %, average watch time) in `backend/tests/unit/analytics.test.ts`

**Checkpoint**: Analytics dashboard shows correct totals matching database state.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Navigation, bilingual UI, dark/light mode, routing, and constitution compliance validation.

- [ ] T099 [P] Create NavBar: EduFlow logo, Headless UI Menu language switcher (EN/AR), Floating UI profile dropdown (avatar + logout), mobile menu trigger in `frontend/src/components/layout/NavBar.tsx`
- [ ] T100 [P] Create MobileDrawer (Headless UI Disclosure with slide transition) + AdminShell layout wrapper in `frontend/src/components/layout/MobileDrawer.tsx` + `frontend/src/components/layout/AdminShell.tsx`
- [ ] T101 [P] Create ThemeToggle component (Headless UI Switch) in `frontend/src/components/shared/ThemeToggle.tsx`
- [ ] T102 [P] Create LanguageSwitcher component (Headless UI Menu with EN/AR options, sets dir on html) in `frontend/src/components/shared/LanguageSwitcher.tsx`
- [ ] T103 [P] Create EmptyState component with slot for illustration image + title + description in `frontend/src/components/shared/EmptyState.tsx`
- [ ] T104 [US1] Create Landing page: hero section, course overview, FAQ Headless UI Disclosure accordion, CTA button in `frontend/src/pages/Landing.tsx`
- [ ] T105 [P] Create React Router config: public routes, student-protected routes, admin-protected routes, redirect guards in `frontend/src/lib/router.tsx`
- [ ] T106 [P] Complete `frontend/src/locales/en.json` — all UI strings for every page and component
- [ ] T107 [P] Complete `frontend/src/locales/ar.json` — Arabic translations for all keys in en.json
- [ ] T108 [P] Configure Playwright: browser matrix (Chrome, Firefox, Safari), base URL `http://localhost`, screenshot on failure in `frontend/playwright.config.ts`
- [ ] T109 Run full P0 E2E test suite (`docker compose exec frontend npx playwright test`) — all 6 specs must pass
- [ ] T110 Run Lighthouse CI on course page + lesson page — verify Lighthouse Performance ≥ 90, Accessibility ≥ 90
- [ ] T111 Validate RTL mode: switch to Arabic, verify `dir="rtl"` on `<html>`, verify all pages layout correctly (no overflow, icons mirrored)
- [ ] T112 Validate dark mode: toggle theme, verify all pages render correctly with no invisible text or broken contrast
- [ ] T113 Verify all API routes use `/api/v1/` prefix (`grep -r "app.use(" backend/src/routes/`)
- [ ] T114 Verify no hardcoded `left`/`right` CSS values (`pnpm lint` in frontend — zero logical-css errors)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — **BLOCKS all user stories**
- **US1 Registration (Phase 3)**: Depends on Phase 2 only
- **US2 Payment (Phase 4)**: Depends on Phase 2 + US1 auth infrastructure
- **US3 Video Playback (Phase 5)**: Depends on Phase 2 + US2 enrollment (to test protected access)
- **US4 Upload (Phase 6)**: Depends on Phase 2 only (admin-only, independent of student flows)
- **US5 Student Mgmt (Phase 7)**: Depends on Phase 2 + US1 (students must exist)
- **US6 Coupons (Phase 8)**: Depends on Phase 2 + US2 (coupons used at checkout)
- **US7 Analytics (Phase 9)**: Depends on all prior phases (aggregates data from all flows)
- **Polish (Phase 10)**: Depends on all user story phases completing

### User Story Dependencies

- **US4 (Upload)** and **US3 (Video)** can run in parallel after Phase 2 (no shared state)
- **US5 (Student Mgmt)** can run in parallel with US3, US4, US6

### Within Each User Story

- Tests MUST be written first and MUST FAIL before implementation begins
- Repositories before services
- Services before controllers
- Controllers before routes
- Backend routes before frontend pages
- Story complete + tested before moving to next priority

---

## Parallel Opportunities

### Phase 1 — All setup tasks in parallel (different files):

```
T002 backend scaffold
T003 frontend scaffold  ← parallel
T004 backend.Dockerfile ← parallel
T005 frontend.Dockerfile ← parallel
T007 docker-compose.yml ← parallel
T010 Tailwind config    ← parallel
```

### Phase 2 — All config + utility tasks in parallel:

```
T017 env.ts
T018 database.ts      ← parallel
T019 redis.ts         ← parallel
T021 jwt.ts           ← parallel
T022 mask-email.ts    ← parallel
T023 email.ts         ← parallel
T027-T031 frontend providers ← parallel with backend
```

### Phase 5 — Repos and utilities in parallel:

```
T061 video-token.repository.ts
T062 lesson.repository.ts       ← parallel
T063 progress.repository.ts     ← parallel
T069 WatermarkOverlay.tsx        ← parallel (frontend)
```

---

## Implementation Strategy

### MVP: User Story 1 Only (Register + Login)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US1 Registration
4. **STOP and VALIDATE**: `docker compose up` → register student → login → refresh token → works
5. Demo or deploy MVP

### Full Product: Incremental Delivery

| Sprint | Delivers |
|--------|----------|
| 1 | Setup + Foundational + US1 Registration |
| 2 | US2 Payment + US4 Upload (parallel teams possible) |
| 3 | US3 Video Playback |
| 4 | US5 Student Mgmt + US6 Coupons |
| 5 | US7 Analytics + Phase 10 Polish |

### Parallel Team Strategy (if 2 developers)

After Phase 2 completes:
- **Developer A**: US1 → US2 → US3 (student journey)
- **Developer B**: US4 → US5 → US6 → US7 (admin features)

Stories complete and integrate at US3 (video playback requires enrollment from US2).

---

## Notes

- `[P]` tasks = different files, no blocking dependencies on incomplete tasks
- `[US?]` label maps task to specific user story for traceability
- Each user story is independently completable and testable
- P0 tests **MUST** be written before implementation (constitution principle VIII)
- Commit after each task or logical group
- Validate each story independently before proceeding to next
- Docker is the primary runtime — all validation commands use `http://localhost`
- Avoid: vague tasks, same-file conflicts, cross-story dependencies that break independence
