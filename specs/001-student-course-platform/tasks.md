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

- [X] T001 Initialize pnpm monorepo with `pnpm-workspace.yaml` at repository root
- [X] T002 [P] Scaffold backend package: `backend/package.json`, `backend/tsconfig.json` (strict mode), `backend/.eslintrc.js`
- [X] T003 [P] Scaffold frontend package: `frontend/package.json`, `frontend/tsconfig.json` (strict mode), `frontend/.eslintrc.js`
- [X] T004 [P] Create `docker/backend.Dockerfile` (Node.js 20 Alpine multi-stage build)
- [X] T005 [P] Create `docker/frontend.Dockerfile` (Vite build → Nginx Alpine)
- [X] T006 [P] Create `docker/nginx.conf` (SPA fallback, `/api/*` proxy, tus large-body config)
- [X] T007 [P] Create `docker-compose.yml` (services: frontend, backend, postgres:16-alpine, redis:7-alpine on `eduflow_net`; volumes: pgdata, redisdata, video_storage)
- [X] T008 [P] Create `docker-compose.dev.yml` (dev overrides: hot-reload volume mounts for backend tsx watch + frontend Vite HMR)
- [X] T009 [P] Create `.env.example` at repo root with all required variables (DATABASE_URL using Docker hostnames)
- [X] T010 [P] Configure Tailwind CSS with EduFlow brand tokens (#EB2027 primary red tonal scale) in `frontend/src/styles/tailwind.config.ts`
- [X] T011 [P] Add Inter + Noto Kufi Arabic font imports and `:lang(ar)` font switching in `frontend/src/styles/globals.css`
- [X] T012 [P] Add `eslint-plugin-logical-css` rule to block hardcoded `left`/`right` CSS values in `frontend/.eslintrc.js`
- [X] T013 Initialize shadcn/ui component registry and install base components (Table, Dialog, Sheet, Tabs, Form, Input, Select, Badge, Progress, Skeleton, Card, Avatar, Accordion, Switch, Sonner) in `frontend/src/components/ui/`

**Checkpoint**: Repo structure created, Docker stack starts (`docker compose up --build`), both containers healthy.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core backend infrastructure that ALL user stories depend on. No user story work begins until this phase is complete.

**⚠️ CRITICAL**: Every phase from 3 onward blocks on this phase completing.

- [X] T014 Define complete Prisma schema with all 10 tables (users, refresh_tokens, enrollments, payments, coupons, lessons, lesson_progress, video_tokens, video_uploads, course_settings) in `backend/prisma/schema.prisma`
- [X] T015 Run initial Prisma migration and generate client: `backend/prisma/migrations/`
- [X] T016 Create seed script (admin user `admin@eduflow.com`/`Admin1234!`, course settings EN/AR, 3 sample lessons) in `backend/prisma/seed.ts`
- [X] T017 [P] Implement zod-validated env schema in `backend/src/config/env.ts`
- [X] T018 [P] Implement Prisma client singleton in `backend/src/config/database.ts`
- [X] T019 [P] Implement ioredis client singleton in `backend/src/config/redis.ts`
- [X] T020 Implement Express app with helmet, cors (allowlist), compression, and global error handler in `backend/src/app.ts`
- [X] T021 [P] Implement JWT utility: sign/verify access token (15 min HS256) + refresh token (7 days) in `backend/src/utils/jwt.ts`
- [X] T022 [P] Implement email masking utility (`j***@example.com` format) in `backend/src/utils/mask-email.ts`
- [X] T023 [P] Implement nodemailer email utility (verification + password reset templates) in `backend/src/utils/email.ts`
- [X] T024 Implement JWT auth middleware (validate Bearer token, attach `req.user`) in `backend/src/middleware/auth.middleware.ts`
- [X] T025 Implement RBAC middleware (`requireRole('ADMIN' | 'STUDENT')`) in `backend/src/middleware/rbac.middleware.ts`
- [X] T026 [P] Implement rate limiting middleware (10 req/min auth, 20 req/min payment) in `backend/src/middleware/rate-limit.middleware.ts`
- [X] T027 [P] Set up React app entry point with `<StrictMode>` and provider stack in `frontend/src/main.tsx`
- [X] T028 [P] Create RootLayout component (sets `dir`+`lang` on `<html>` from locale store, applies theme class) in `frontend/src/components/layout/RootLayout.tsx`
- [X] T029 [P] Configure react-i18next with `en.json` + `ar.json` skeleton files and locale detector in `frontend/src/lib/i18n.ts`
- [X] T030 [P] Configure TanStack Query client + axios instance with JWT interceptor (attach Bearer, handle 401 refresh) in `frontend/src/lib/api.ts`
- [X] T031 [P] Create Zustand stores: `auth.store.ts` (user + accessToken), `theme.store.ts` (light/dark + localStorage), `locale.store.ts` (en/ar + localStorage) in `frontend/src/stores/`

**Checkpoint**: `docker compose exec backend pnpm prisma migrate deploy && pnpm prisma db seed` succeeds. `GET /api/v1/course` returns 200.

---

## Phase 3: User Story 1 — Student Registration (Priority: P1) 🎯 MVP

**Goal**: Students can register with email/password or Google OAuth, verify email, log in, and reset password.

**Independent Test**: Registration → email verification → login → refresh token → logout cycle works end-to-end.

### P0 Tests for User Story 1 ⚠️ (Constitution VIII — NON-NEGOTIABLE)

> **Write tests first — they MUST FAIL before implementation**

- [X] T032 [P] [US1] Write integration test for email registration + duplicate check in `backend/tests/integration/auth.test.ts`
- [X] T033 [P] [US1] Write integration test for JWT refresh rotation + reuse detection in `backend/tests/integration/auth.test.ts`
- [X] T034 [P] [US1] Write E2E test for full registration → verify → login flow in `frontend/tests/e2e/registration.spec.ts`

### Implementation for User Story 1

- [X] T035 [P] [US1] Create User repository (findByEmail, findById, create, update) in `backend/src/repositories/user.repository.ts`
- [X] T036 [P] [US1] Create RefreshToken repository (create, findByHash, revokeByFamily, revokeBySession) in `backend/src/repositories/refresh-token.repository.ts`
- [X] T037 [US1] Implement AuthService (register with bcrypt cost 12, login, logout, refresh with family tracking, forgotPassword, resetPassword) in `backend/src/services/auth.service.ts`
- [X] T038 [US1] Configure Passport Google OAuth2 strategy (find-or-create by googleId/email, issue EduFlow JWT after OAuth) in `backend/src/config/passport.ts`
- [X] T039 [US1] Implement auth controller (register, login, oauth callback, refresh, logout, forgotPassword, resetPassword, verifyEmail) in `backend/src/controllers/auth.controller.ts`
- [X] T040 [US1] Define auth routes with rate limiting applied in `backend/src/routes/auth.routes.ts`
- [X] T041 [P] [US1] Create Register page: shadcn/ui Form + inline validation + Google OAuth button in `frontend/src/pages/Register.tsx`
- [X] T042 [P] [US1] Create Login page: shadcn/ui Form + inline validation in `frontend/src/pages/Login.tsx`
- [X] T043 [P] [US1] Create ForgotPassword + ResetPassword pages with shadcn/ui Form in `frontend/src/pages/ForgotPassword.tsx`
- [X] T044 [US1] Implement useAuth hook (login, logout, refresh on mount, Google OAuth redirect) in `frontend/src/hooks/useAuth.ts`

**Checkpoint**: Student can register, verify email, log in, and refresh tokens. Google OAuth flow complete.

---

## Phase 4: User Story 2 — Paymob Course Purchase (Priority: P2)

**Goal**: Enrolled student can purchase the course via Paymob. Webhook triggers enrollment with HMAC validation.

**Independent Test**: Initiate checkout → simulate Paymob webhook with valid HMAC → verify enrollment ACTIVE; repeat with tampered HMAC → verify enrollment NOT created.

### P0 Tests for User Story 2 ⚠️ (Constitution VIII — NON-NEGOTIABLE)

> **Write tests first — they MUST FAIL before implementation**

- [X] T045 [P] [US2] Write integration test for checkout initiation + HMAC webhook enrollment in `backend/tests/integration/payment-webhook.test.ts`
- [X] T046 [P] [US2] Write unit test for HMAC-SHA512 validation (valid payload + tampered payload) in `backend/tests/unit/hmac.test.ts`

### Implementation for User Story 2

- [X] T047 [P] [US2] Create Payment repository (create, findById, updateStatus, findByPaymobTxId) in `backend/src/repositories/payment.repository.ts`
- [X] T048 [P] [US2] Create Enrollment repository (create, findByUserId, updateStatus, revoke) in `backend/src/repositories/enrollment.repository.ts`
- [X] T049 [P] [US2] Create Coupon repository (findByCode, incrementUses, findAllActive) in `backend/src/repositories/coupon.repository.ts`
- [X] T050 [US2] Implement HMAC webhook middleware (validate Paymob HMAC-SHA512, reject on mismatch) in `backend/src/middleware/hmac.middleware.ts`
- [X] T051 [US2] Implement PaymentService (createPaymobOrder, getPaymentKey, applyCoupon, processWebhook with idempotency check on paymob_transaction_id) in `backend/src/services/payment.service.ts`
- [X] T052 [US2] Implement EnrollmentService (enroll, revoke, getStatus, cacheInRedis) in `backend/src/services/enrollment.service.ts`
- [X] T053 [US2] Implement payment controller (POST /checkout, POST /checkout/validate-coupon) in `backend/src/controllers/payment.controller.ts`
- [X] T054 [US2] Implement webhook controller (POST /webhooks/paymob — public route, HMAC middleware applied) in `backend/src/controllers/webhook.controller.ts`
- [X] T055 [US2] Register payment + webhook routes in `backend/src/routes/student.routes.ts`
- [X] T056 [US2] Create Checkout page: course price display, coupon input with Floating UI popover for coupon details, Pay Now button, shadcn/ui Skeleton while loading in `frontend/src/pages/Checkout.tsx`
- [X] T057 [US2] Implement useEnrollment hook (check enrollment status, poll after payment redirect) in `frontend/src/hooks/useEnrollment.ts`

**Checkpoint**: Student completes Paymob payment, webhook received, enrollment ACTIVE. Invalid HMAC → 400, no enrollment.

---

## Phase 5: User Story 3 — Protected Video Playback with Watermark (Priority: P3)

**Goal**: Enrolled student plays HLS video with signed token. Dynamic watermark overlay. Token expires on logout.

**Independent Test**: Get lesson → extract videoToken → stream HLS → verify watermark visible; logout → old token rejected 401; share URL → rejected 401.

### P0 Tests for User Story 3 ⚠️ (Constitution VIII — NON-NEGOTIABLE)

> **Write tests first — they MUST FAIL before implementation**

- [X] T058 [P] [US3] Write integration test for video token issuance + expiry + revocation on logout in `backend/tests/integration/video-token.test.ts`
- [X] T059 [P] [US3] Write integration test for progress tracking (update, completion at 90%) in `backend/tests/integration/progress.test.ts`
- [X] T060 [P] [US3] Write E2E test for video playback + watermark visibility in `frontend/tests/e2e/video-playback.spec.ts`

### Implementation for User Story 3

- [X] T061 [P] [US3] Create VideoToken repository (create, findByHash, revokeBySession, revokeByUser) in `backend/src/repositories/video-token.repository.ts`
- [X] T062 [P] [US3] Create Lesson repository (findAll, findById, findPublishedForStudent with drip check) in `backend/src/repositories/lesson.repository.ts`
- [X] T063 [P] [US3] Create LessonProgress repository (upsert, findByUserAndLesson, findCourseCompletion) in `backend/src/repositories/progress.repository.ts`
- [X] T064 [US3] Implement video token utility (sign JWT with userId+lessonId+sessionId, verify, revoke via Redis) in `backend/src/utils/video-token.ts`
- [X] T065 [US3] Implement VideoTokenService (issue token, validate token, revoke on logout, AES-128 key generation per session) in `backend/src/services/video-token.service.ts`
- [X] T066 [US3] Implement ProgressService (updateProgress, markComplete at ≥90% watch time, getCourseCompletion) in `backend/src/services/progress.service.ts`
- [X] T067 [US3] Implement lesson controller (GET /lessons, GET /lessons/:id with token issuance, POST /lessons/:id/progress, GET /video/:id/playlist.m3u8, GET /video/:id/key) in `backend/src/controllers/lesson.controller.ts`
- [X] T068 [US3] Register lesson + video routes in `backend/src/routes/student.routes.ts`
- [X] T069 [P] [US3] Create WatermarkOverlay component (semi-transparent div with name + masked email, position changes every 45s) in `frontend/src/components/shared/WatermarkOverlay.tsx`
- [X] T070 [US3] Create VideoPlayer component: hls.js initialization, WatermarkOverlay layered on top, Floating UI tooltips on control buttons, re-request token on expiry in `frontend/src/components/shared/VideoPlayer.tsx`
- [X] T071 [US3] Implement useVideoToken hook (fetch token from API, handle 401 → trigger re-auth) in `frontend/src/hooks/useVideoToken.ts`
- [X] T072 [US3] Create Lesson page: VideoPlayer + lesson title + progress bar + next/prev navigation in `frontend/src/pages/Lesson.tsx`
- [X] T073 [US3] Create Course page: shadcn/ui Accordion curriculum (locked/unlocked lessons), course completion Progress bar in `frontend/src/pages/Course.tsx`

**Checkpoint**: Enrolled student streams HLS video with watermark. Token expires correctly. Unenrolled student gets 403.

---

 
**Goal**: Admin uploads video via tus protocol with pause/resume. FFmpeg processes to HLS. Progress tracked in Sheet panel.

**Independent Test**: Create tus session → upload in chunks → pause mid-upload → resume from offset → verify HLS files generated.

### P0 Tests for User Story 4 ⚠️ (Constitution VIII — NON-NEGOTIABLE)

> **Write tests first — they MUST FAIL before implementation**

- [X] T074 [P] [US4] Write integration test for tus upload: chunk upload, offset query, resume-after-interrupt in `backend/tests/integration/tus-upload.test.ts`

### Implementation for User Story 4

- [X] T075 [P] [US4] Create VideoUpload repository (create, findById, updateOffset, updateStatus) in `backend/src/repositories/video-upload.repository.ts`
- [X] T076 [US4] Implement UploadService: @tus-io/server configuration (Redis-backed state, onUploadFinish triggers FFmpeg job, HLS output to video_storage volume) in `backend/src/services/upload.service.ts`
- [X] T077 [US4] Implement admin uploads controller (tus POST, HEAD, PATCH, DELETE; GET list) in `backend/src/controllers/admin/uploads.controller.ts`
- [X] T078 [US4] Implement admin lessons controller (GET list, POST create, PATCH update, DELETE, POST reorder) in `backend/src/controllers/admin/lessons.controller.ts`
- [X] T079 [US4] Register admin upload + lesson routes (RBAC ADMIN required) in `backend/src/routes/admin.routes.ts`
- [X] T080 [P] [US4] Implement useTusUpload hook (tus-js-client Upload, onProgress → Progress bar, onSuccess/onError → Sonner toast) in `frontend/src/hooks/useTusUpload.ts`
- [X] T081 [US4] Create admin Lessons page: lesson list table, "Upload Video" button opening Sheet panel with shadcn/ui Progress bar and cancel Dialog in `frontend/src/pages/admin/Lessons.tsx`

**Checkpoint**: Admin uploads a test video, progress tracked to 100%, HLS segments appear in storage, lesson status → READY.

---

## Phase 7: User Story 5 — Admin Student Management (Priority: P5)

**Goal**: Admin lists students, searches with live combobox, manually enrolls or revokes with Dialog confirmation.

**Independent Test**: Search for student → enroll → verify access → revoke → verify access denied.

### P0 Tests for User Story 5 ⚠️ (Constitution VIII — NON-NEGOTIABLE)

> **Write tests first — they MUST FAIL before implementation**

- [X] T082 [P] [US5] Write integration test for manual enrollment + revocation + access invalidation in `backend/tests/integration/enrollment.test.ts`

### Implementation for User Story 5

- [X] T083 [US5] Implement admin students controller (GET list paginated, GET search ILIKE query, POST enroll, POST revoke) in `backend/src/controllers/admin/students.controller.ts`
- [X] T084 [US5] Register admin student routes in `backend/src/routes/admin.routes.ts`
- [X] T085 [US5] Create admin Students page: shadcn/ui Table with enrollment status Badge, Headless UI Combobox live search, Enroll/Revoke buttons with Dialog confirmation, shadcn/ui Skeleton while loading, EmptyState when no results in `frontend/src/pages/admin/Students.tsx`
- [X] T086 [US5] E2E test: admin enroll + revoke flow in `frontend/tests/e2e/admin-enrollment.spec.ts`

**Checkpoint**: Admin finds student via combobox, enrolls, student gains access, admin revokes, student loses access.

---

## Phase 8: User Story 6 — Pricing & Coupon Management (Priority: P6)

**Goal**: Admin sets course price, creates/edits/deletes coupons. Coupons applied at checkout.

**Independent Test**: Create coupon → apply at checkout → verify discounted price in Paymob order; expire coupon → verify checkout rejects it.

### Implementation for User Story 6

- [X] T087 [US6] Implement CouponService (validate, apply with row-level lock to prevent race conditions, CRUD) in `backend/src/services/coupon.service.ts`
- [X] T088 [US6] Implement admin coupons controller (GET list, POST create, PATCH update, DELETE soft-delete) in `backend/src/controllers/admin/coupons.controller.ts`
- [X] T089 [US6] Implement admin pricing controller (GET current price, PATCH update price) in `backend/src/controllers/admin/pricing.controller.ts`
- [X] T090 [US6] Register coupon + pricing routes in `backend/src/routes/admin.routes.ts`
- [X] T091 [US6] Create admin Pricing page: course price editor, coupon list with Floating UI popovers for usage stats, create/edit/delete Dialogs, shadcn/ui Badge for EXPIRED status in `frontend/src/pages/admin/Pricing.tsx`
- [X] T092 [US6] Unit test: coupon validation (expiry, max uses, race condition, discount calculation) in `backend/tests/unit/coupon.test.ts`

**Checkpoint**: Admin creates SAVE20 coupon, student applies it at checkout, Paymob receives discounted amount.

---

## Phase 9: User Story 7 — Admin Analytics & Reporting (Priority: P7)

**Goal**: Admin views KPI dashboard (revenue, enrollments, completion rate, watch time) cached in Redis.

**Independent Test**: Trigger enrollments + progress updates → view analytics dashboard → verify KPIs match expected calculations.

### Implementation for User Story 7

- [X] T093 [US7] Implement AnalyticsService (calculateKPIs with Redis 60-min cache, revenueTimeseries, topLessons, dropOffLessons) in `backend/src/services/analytics.service.ts`
- [X] T094 [US7] Implement admin analytics controller (GET KPIs by period, GET payments list paginated, POST mark-paid) in `backend/src/controllers/admin/analytics.controller.ts`
- [X] T095 [US7] Register analytics + payments routes in `backend/src/routes/admin.routes.ts`
- [X] T096 [US7] Create admin Dashboard page: shadcn/ui Cards for KPIs (revenue, enrollments, completion, watch time), revenue + enrollment timeseries charts in `frontend/src/pages/admin/Dashboard.tsx`
- [X] T097 [US7] Create admin Analytics page: lesson completion rates table, drop-off analysis, payment history table with shadcn/ui Table + filters in `frontend/src/pages/admin/Analytics.tsx`
- [X] T098 [US7] Unit test: KPI calculation accuracy (revenue sum, completion %, average watch time) in `backend/tests/unit/analytics.test.ts`

**Checkpoint**: Analytics dashboard shows correct totals matching database state.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Navigation, bilingual UI, dark/light mode, routing, and constitution compliance validation.

- [X] T099 [P] Create NavBar: EduFlow logo, Headless UI Menu language switcher (EN/AR), Floating UI profile dropdown (avatar + logout), mobile menu trigger in `frontend/src/components/layout/NavBar.tsx`
- [X] T100 [P] Create MobileDrawer (Headless UI Disclosure with slide transition) + AdminShell layout wrapper in `frontend/src/components/layout/MobileDrawer.tsx` + `frontend/src/components/layout/AdminShell.tsx`
- [X] T101 [P] Create ThemeToggle component (Headless UI Switch) in `frontend/src/components/shared/ThemeToggle.tsx`
- [X] T102 [P] Create LanguageSwitcher component (Headless UI Menu with EN/AR options, sets dir on html) in `frontend/src/components/shared/LanguageSwitcher.tsx`
- [X] T103 [P] Create EmptyState component with slot for illustration image + title + description in `frontend/src/components/shared/EmptyState.tsx`
- [X] T104 [US1] Create Landing page: hero section, course overview, FAQ Headless UI Disclosure accordion, CTA button in `frontend/src/pages/Landing.tsx`
- [X] T105 [P] Create React Router config: public routes, student-protected routes, admin-protected routes, redirect guards in `frontend/src/lib/router.tsx`
- [X] T106 [P] Complete `frontend/src/locales/en.json` — all UI strings for every page and component
- [X] T107 [P] Complete `frontend/src/locales/ar.json` — Arabic translations for all keys in en.json
- [X] T108 [P] Configure Playwright: browser matrix (Chrome, Firefox, Safari), base URL `http://localhost`, screenshot on failure in `frontend/playwright.config.ts`
- [X] T109 Run full P0 E2E test suite (`docker compose exec frontend npx playwright test`) — all 6 specs must pass
- [ ] T110 Run Lighthouse CI on course page + lesson page — verify Lighthouse Performance ≥ 90, Accessibility ≥ 90
- [X] T111 Validate RTL mode: switch to Arabic, verify `dir="rtl"` on `<html>`, verify all pages layout correctly (no overflow, icons mirrored)
- [X] T112 Validate dark mode: toggle theme, verify all pages render correctly with no invisible text or broken contrast
- [X] T113 Verify all API routes use `/api/v1/` prefix (`grep -r "app.use(" backend/src/routes/`)
- [X] T114 Verify no hardcoded `left`/`right` CSS values (`pnpm lint` in frontend — zero logical-css errors)

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

---

## Phase 11: Public Course Sales Experience (US8)

**Purpose**: Build the full pre-sale conversion funnel — landing, about, testimonials, FAQ, contact, and pricing pages.

**Goal**: Guest lands on `/` → explores `/about`, `/faq`, `/pricing` → clicks CTA → reaches `/register`.

**Independent Test**: Visit each public page → verify no auth required, all links work, EN/AR both render.

### P0 Tests for Phase 11 ⚠️

> **Write tests first — they MUST FAIL before implementation**

- [ ] T115 [P] [US8] Write E2E test for public funnel navigation: Landing → About → Pricing → Register in `frontend/tests/e2e/public-funnel.spec.ts`

### Implementation for Phase 11

- [ ] T116 [P] [US8] Create About/Instructor page: instructor bio, credentials, photo slot, teaching philosophy in `frontend/src/pages/About.tsx`
- [ ] T117 [P] [US8] Create Testimonials page: student success story cards, star ratings, names + avatars in `frontend/src/pages/Testimonials.tsx`
- [ ] T118 [P] [US8] Create FAQ page: Headless UI Disclosure accordion, bilingual questions/answers, search input in `frontend/src/pages/FAQ.tsx`
- [ ] T119 [P] [US8] Create Contact page: contact form (name, email, message), submit calls `POST /api/v1/contact`, Sonner toast on success in `frontend/src/pages/Contact.tsx`
- [ ] T120 [P] [US8] Create Pricing/Offer page: full sales pitch, price breakdown, what's included list, guarantee badge, CTA button in `frontend/src/pages/Pricing.tsx`
- [ ] T121 [US8] Implement contact form controller (`POST /api/v1/contact` — rate limited, sends email via nodemailer) in `backend/src/controllers/contact.controller.ts`
- [ ] T122 [US8] Create public routes file and register contact + any future public endpoints in `backend/src/routes/public.routes.ts`
- [ ] T123 [US8] Mount public router in `backend/src/app.ts` under `/api/v1`
- [ ] T124 [US8] Expand Landing page: add instructor bio section, testimonials preview carousel (3 cards), extended FAQ (Headless UI Disclosure), sticky CTA bar on mobile in `frontend/src/pages/Landing.tsx`
- [ ] T125 [P] [US8] Update router config: add `/about`, `/testimonials`, `/faq`, `/contact`, `/pricing` to public routes in `frontend/src/lib/router.tsx`
- [ ] T126 [P] [US8] Add EN/AR translation keys for all Phase 11 pages in `frontend/src/locales/en.json` + `frontend/src/locales/ar.json`

**Checkpoint**: All public pages accessible without auth. Contact form submits successfully. EN/AR both render without overflow.

---

## Phase 12: Free Preview Lesson Flow (US9)

**Purpose**: First lesson (admin-configurable) is publicly watchable. Drives conversion: guest → register → purchase.

**Goal**: Guest visits `/preview` → watches lesson → sees enrollment CTA → registers → gets redirected to checkout.

**Independent Test**: Set `is_preview=true` on lesson 1 → guest token issued → HLS streams → unset preview → guest token rejected 403.

### P0 Tests for Phase 12 ⚠️

> **Write tests first — they MUST FAIL before implementation**

- [ ] T127 [P] [US9] Write integration test: preview lesson issues guest token (1hr TTL), non-preview lesson rejects guest (403) in `backend/tests/integration/preview.test.ts`
- [ ] T128 [P] [US9] Write integration test: preview security — enrolled student token works on any lesson, guest token only on preview lesson in `backend/tests/integration/preview.test.ts`
- [ ] T129 [P] [US9] Write E2E test: guest watches preview → sees CTA banner → registers → CTA redirects to `/checkout` in `frontend/tests/e2e/preview-flow.spec.ts`

### Implementation for Phase 12

- [ ] T130 [US9] Add `is_preview BOOLEAN DEFAULT false` column to `lessons` table: new Prisma migration in `backend/prisma/migrations/`
- [ ] T131 [US9] Update Lesson repository: expose `is_preview` in `findById` + `findAll` responses in `backend/src/repositories/lesson.repository.ts`
- [ ] T132 [US9] Update VideoTokenService: issue short-lived guest preview token (1hr TTL, no session binding, `viewer_type: GUEST`) when `is_preview=true` in `backend/src/services/video-token.service.ts`
- [ ] T133 [US9] Update lesson controller: skip enrollment check when `is_preview=true`, issue guest token; track viewer_type (GUEST/REGISTERED/ENROLLED) in `backend/src/controllers/lesson.controller.ts`
- [ ] T134 [US9] Add `PATCH /api/v1/admin/lessons/:id/preview` toggle endpoint (admin only) in `backend/src/controllers/admin/lessons.controller.ts`
- [ ] T135 [P] [US9] Update AnalyticsService: track `preview_views` with viewer_type breakdown; add preview-to-registration and preview-to-purchase conversion rates in `backend/src/services/analytics.service.ts`
- [ ] T136 [US9] Create LessonPreview page (`/preview`): VideoPlayer with no auth guard, PreviewCTABanner overlaid for non-enrolled visitors in `frontend/src/pages/LessonPreview.tsx`
- [ ] T137 [P] [US9] Create PreviewCTABanner component: floating bottom bar "Enroll to access all N lessons", links to `/checkout`, hidden for enrolled students in `frontend/src/components/shared/PreviewCTABanner.tsx`
- [ ] T138 [US9] Add per-row preview toggle Switch to admin Lessons page (calls PATCH preview endpoint, shows Badge on preview lessons) in `frontend/src/pages/admin/Lessons.tsx`
- [ ] T139 [P] [US9] Update admin Analytics page: add preview conversion funnel section (views → registrations → purchases) in `frontend/src/pages/admin/Analytics.tsx`
- [ ] T140 [P] [US9] Update router: add public `/preview` route + EN/AR translations for preview flow in `frontend/src/lib/router.tsx`

**Checkpoint**: Guest streams preview lesson. Enrolled student sees no CTA. Non-preview lesson rejects guest token with 403. Admin toggle updates `is_preview` in DB.

---

## Phase 13: Student Dashboard Expansion (US10)

**Purpose**: Complete the authenticated student experience — dashboard, progress, notes, downloads, billing, and profile.

**Goal**: Student logs in → lands on `/dashboard` → resumes lesson → takes notes → downloads resources → views orders.

**Independent Test**: Login → GET `/api/v1/student/dashboard` returns last-watched lesson + completion % → frontend renders correctly.

### P0 Tests for Phase 13 ⚠️

> **Write tests first — they MUST FAIL before implementation**

- [ ] T141 [P] [US10] Write integration test: GET /student/dashboard returns correct progress summary + last-watched lesson in `backend/tests/integration/student-dashboard.test.ts`
- [ ] T142 [P] [US10] Write integration test: notes CRUD — create, update, delete, list per lesson in `backend/tests/integration/notes.test.ts`
- [ ] T143 [P] [US10] Write E2E test: login → dashboard → click Continue Learning → lands on correct lesson in `frontend/tests/e2e/student-dashboard.spec.ts`

### Implementation for Phase 13

- [ ] T144 [US10] Implement student dashboard controller (`GET /api/v1/student/dashboard`: last-watched lessonId, total completion %, enrolled status, enrollment date) in `backend/src/controllers/student.controller.ts`
- [ ] T145 [US10] Register `/student/dashboard` route in `backend/src/routes/student.routes.ts`
- [ ] T146 [US10] Create student Dashboard page: completion ring (shadcn/ui Progress), "Continue Learning" CTA card, recent activity list, enrollment info in `frontend/src/pages/student/Dashboard.tsx`
- [ ] T147 [P] [US10] Create student Progress page: lesson-by-lesson completion table (shadcn/ui Table), watch time per lesson, overall % bar in `frontend/src/pages/student/Progress.tsx`
- [ ] T148 [US10] Add `notes` table to Prisma schema (`id`, `userId`, `lessonId`, `content TEXT`, `createdAt`, `updatedAt`) + migration in `backend/prisma/schema.prisma`
- [ ] T149 [US10] Create Note repository (create, findByUserAndLesson, findAllByUser, update, delete) in `backend/src/repositories/note.repository.ts`
- [ ] T150 [US10] Implement NoteService (CRUD, export all notes as plain text file) in `backend/src/services/note.service.ts`
- [ ] T151 [US10] Implement notes controller (`GET/POST/PATCH/DELETE /api/v1/student/notes`) in `backend/src/controllers/notes.controller.ts`
- [ ] T152 [US10] Register notes routes in `backend/src/routes/student.routes.ts`
- [ ] T153 [P] [US10] Create student Notes page: grouped by lesson accordion, inline textarea editor (shadcn/ui), export-as-text button, EmptyState when no notes in `frontend/src/pages/student/Notes.tsx`
- [ ] T154 [US10] Add `lesson_resources` table (`id`, `lessonId`, `title`, `fileUrl`, `fileSizeBytes`, `createdAt`) + migration in `backend/prisma/schema.prisma`
- [ ] T155 [US10] Implement resources controller (`GET /api/v1/lessons/:id/resources`) + admin upload endpoint (`POST/DELETE /api/v1/admin/lessons/:id/resources`) in `backend/src/controllers/resources.controller.ts`
- [ ] T156 [US10] Register resource routes in `backend/src/routes/student.routes.ts` + `backend/src/routes/admin.routes.ts`
- [ ] T157 [P] [US10] Create student Downloads page: resources grouped by lesson, file size Badge, download link, EmptyState when no resources in `frontend/src/pages/student/Downloads.tsx`
- [ ] T158 [P] [US10] Create student Orders page: payment history table (date, amount, status, receipt), shadcn/ui Skeleton while loading, EmptyState if no payments in `frontend/src/pages/student/Orders.tsx`
- [ ] T159 [US10] Implement profile controller (`GET /api/v1/student/profile`, `PATCH /api/v1/student/profile`: name, avatar URL, `PATCH /api/v1/student/profile/password`: current + new password with bcrypt re-hash) in `backend/src/controllers/profile.controller.ts`
- [ ] T160 [US10] Register profile routes in `backend/src/routes/student.routes.ts`
- [ ] T161 [P] [US10] Create student Profile & Security page: avatar display, name/email fields, change-password form with current+new+confirm fields, save with Sonner toast in `frontend/src/pages/student/Profile.tsx`
- [ ] T162 [P] [US10] Create student Help page: FAQ Disclosure accordion (same data as public FAQ), contact form for enrolled students in `frontend/src/pages/student/Help.tsx`
- [ ] T163 [US10] Create VerifyEmail page (`/verify-email?token=`): calls `GET /api/v1/auth/verify-email`, shows success checkmark or error with resend link in `frontend/src/pages/VerifyEmail.tsx`
- [ ] T164 [US10] Create ResetPassword page (`/reset-password?token=`): new password + confirm fields, submits to `POST /api/v1/auth/reset-password`, redirects to login on success in `frontend/src/pages/ResetPassword.tsx`
- [ ] T165 [P] [US10] Update router: add all student routes (`/dashboard`, `/progress`, `/notes`, `/downloads`, `/orders`, `/profile`, `/help`) + public auth routes (`/verify-email`, `/reset-password`) in `frontend/src/lib/router.tsx`
- [ ] T166 [P] [US10] Add EN/AR translation keys for all Phase 13 pages in `frontend/src/locales/en.json` + `frontend/src/locales/ar.json`

**Checkpoint**: Student logs in → dashboard shows real progress data → can take notes on a lesson → can view order history.

---

## Phase 14: Admin Operations Expansion (US11)

**Purpose**: Complete admin control suite — orders, student details, media library, tickets, audit log, notifications, and settings.

**Goal**: Admin manages full platform lifecycle: reviews orders, handles support tickets, inspects audit trail, configures course settings.

**Independent Test**: Create order → mark-paid → verify audit log entry → GET `/api/v1/admin/audit` shows action.

### P0 Tests for Phase 14 ⚠️

> **Write tests first — they MUST FAIL before implementation**

- [ ] T167 [P] [US11] Write integration test: PATCH /admin/orders/:id/mark-paid creates audit log entry, updates payment status in `backend/tests/integration/admin-orders.test.ts`
- [ ] T168 [P] [US11] Write integration test: every admin mutating action (enroll, revoke, mark-paid) generates audit log row in `backend/tests/integration/audit-log.test.ts`

### Implementation for Phase 14

- [ ] T169 [US11] Add `audit_logs` table to Prisma schema (`id`, `adminId`, `action VARCHAR`, `targetType`, `targetId`, `metadata JSONB`, `createdAt`) + migration in `backend/prisma/schema.prisma`
- [ ] T170 [US11] Create AuditLog repository (create, findPaginated) in `backend/src/repositories/audit-log.repository.ts`
- [ ] T171 [US11] Implement audit middleware: automatically log every ADMIN-scoped mutating request (POST/PATCH/DELETE) after response in `backend/src/middleware/audit.middleware.ts`
- [ ] T172 [US11] Apply audit middleware to all admin routes in `backend/src/routes/admin.routes.ts`
- [ ] T173 [US11] Implement admin orders controller (`GET` paginated list with filters, `GET /:id`, `PATCH /:id/mark-paid`, `GET /export-csv`) in `backend/src/controllers/admin/orders.controller.ts`
- [ ] T174 [US11] Implement admin audit controller (`GET /api/v1/admin/audit` paginated, filterable by action type + date range) in `backend/src/controllers/admin/audit.controller.ts`
- [ ] T175 [US11] Register orders + audit routes in `backend/src/routes/admin.routes.ts`
- [ ] T176 [P] [US11] Create admin Orders page: payment table with date/amount/status/student filters, mark-paid Dialog, export CSV button, shadcn/ui Skeleton in `frontend/src/pages/admin/Orders.tsx`
- [ ] T177 [P] [US11] Create admin StudentDetail page (`/admin/students/:id`): enrollment timeline, lesson watch-time table, notes count badge, revoke enrollment Dialog in `frontend/src/pages/admin/StudentDetail.tsx`
- [ ] T178 [P] [US11] Create admin MediaLibrary page: video upload grid (thumbnail slot, PROCESSING/READY Badge, file size), re-process button, delete with Dialog confirm in `frontend/src/pages/admin/MediaLibrary.tsx`
- [ ] T179 [P] [US11] Create admin AuditLog page: paginated action table (timestamp, actor, action, target), expandable metadata row in `frontend/src/pages/admin/AuditLog.tsx`
- [ ] T180 [US11] Add `support_tickets` table (`id`, `userId`, `subject`, `status ENUM(OPEN,RESOLVED)`, `createdAt`) + `ticket_messages` (`id`, `ticketId`, `senderId`, `body`, `createdAt`) + migration in `backend/prisma/schema.prisma`
- [ ] T181 [US11] Implement tickets controller: student routes (`POST /student/tickets`, `GET /student/tickets`); admin routes (`GET /admin/tickets`, `PATCH /admin/tickets/:id/status`, `POST /admin/tickets/:id/reply`) in `backend/src/controllers/tickets.controller.ts`
- [ ] T182 [US11] Register ticket routes in `backend/src/routes/student.routes.ts` + `backend/src/routes/admin.routes.ts`
- [ ] T183 [P] [US11] Create admin Tickets page: ticket list with OPEN/RESOLVED badges (shadcn/ui), reply Sheet panel with message thread + Textarea, resolve button in `frontend/src/pages/admin/Tickets.tsx`
- [ ] T184 [US11] Implement admin course settings controller (`GET /api/v1/admin/settings/course`, `PATCH`: title, description, thumbnail URL; `GET/PATCH /api/v1/admin/settings/system`: SMTP host/user/pass masked, Paymob API key masked) in `backend/src/controllers/admin/settings.controller.ts`
- [ ] T185 [US11] Register settings routes in `backend/src/routes/admin.routes.ts`
- [ ] T186 [P] [US11] Create admin Settings page: course meta editor (title, description, thumbnail), SMTP config form (masked password), Paymob key field (masked), save with Sonner toast in `frontend/src/pages/admin/Settings.tsx`
- [ ] T187 [US11] Implement admin notifications controller (`GET /api/v1/admin/notifications/templates`, `PATCH /:id`, `POST /broadcast`: sends email to all enrolled students via nodemailer) in `backend/src/controllers/admin/notifications.controller.ts`
- [ ] T188 [US11] Register notifications routes in `backend/src/routes/admin.routes.ts`
- [ ] T189 [P] [US11] Create admin Notifications page: template list, inline Textarea editor, live preview panel, broadcast Dialog with student count confirmation in `frontend/src/pages/admin/Notifications.tsx`
- [ ] T190 [P] [US11] Update AdminShell sidebar: add nav links for Orders, StudentDetail, MediaLibrary, AuditLog, Tickets, Settings, Notifications in `frontend/src/components/layout/AdminShell.tsx`
- [ ] T191 [P] [US11] Update router: add all admin routes (`/admin/orders`, `/admin/students/:id`, `/admin/media`, `/admin/audit`, `/admin/tickets`, `/admin/settings`, `/admin/notifications`) in `frontend/src/lib/router.tsx`
- [ ] T192 [P] [US11] Add EN/AR translation keys for all Phase 14 pages in `frontend/src/locales/en.json` + `frontend/src/locales/ar.json`

**Checkpoint**: Admin can view all orders, mark one as paid, see the action in audit log. Ticket created by student appears in admin tickets page.

---

## Phase 15: Trust & Legal Pages (US12)

**Purpose**: Legal compliance and trust pages required for any commercial platform.

**Goal**: All legal pages render correctly in EN/AR, footer links to all legal pages from every page.

**Independent Test**: Visit `/privacy`, `/terms`, `/refund` — all return 200, no auth required, RTL renders correctly.

### Implementation for Phase 15

- [ ] T193 [P] [US12] Create PrivacyPolicy page: structured rich-text layout, section anchors, last-updated date in `frontend/src/pages/PrivacyPolicy.tsx`
- [ ] T194 [P] [US12] Create Terms page: numbered sections, key terms highlighted, print-friendly layout in `frontend/src/pages/Terms.tsx`
- [ ] T195 [P] [US12] Create RefundPolicy page: clear refund window statement, conditions list, contact CTA in `frontend/src/pages/RefundPolicy.tsx`
- [ ] T196 [P] [US12] Create NotFound (404) page: friendly Arabic + English message, illustration slot, link back to landing in `frontend/src/pages/NotFound.tsx`
- [ ] T197 [US12] Create Footer component: links to all legal pages, social links, copyright line, EduFlow logo in `frontend/src/components/layout/Footer.tsx`
- [ ] T198 [US12] Mount Footer in RootLayout so it appears on all public + student pages in `frontend/src/components/layout/RootLayout.tsx`
- [ ] T199 [US12] Update router: add `/privacy`, `/terms`, `/refund` routes + `*` wildcard → NotFound in `frontend/src/lib/router.tsx`
- [ ] T200 [P] [US12] Add EN/AR translation keys for legal pages and footer in `frontend/src/locales/en.json` + `frontend/src/locales/ar.json`

**Checkpoint**: Footer visible on all pages. `/privacy`, `/terms`, `/refund` load without auth. Unknown routes show 404 page.

---

## Phase 16: UX Polish & Mobile (Cross-Cutting)

**Purpose**: Production-quality polish — responsive mobile layout, Skeleton loaders, EmptyStates, RTL validation on all new pages.

- [ ] T201 [P] Add Skeleton loaders to all new pages: Dashboard, Progress, Notes, Downloads, Orders, Profile, all admin pages (use shadcn/ui Skeleton, show while TanStack Query is loading)
- [ ] T202 [P] Add EmptyState components to all list views: Notes (no notes yet), Downloads (no resources), Orders (no payments), Tickets (no tickets), MediaLibrary (no uploads)
- [ ] T203 [P] Update AdminShell: collapsible sidebar on mobile (≤ 768px) using shadcn/ui Sheet instead of fixed sidebar in `frontend/src/components/layout/AdminShell.tsx`
- [ ] T204 [P] Update NavBar: add student sidebar nav links for Dashboard, Course, Progress, Notes, Downloads, Orders, Profile, Help in `frontend/src/components/layout/NavBar.tsx`
- [ ] T205 [P] Add sticky mobile CTA bar to Landing and Pricing pages: fixed bottom bar on `< 768px`, hides on scroll-up in `frontend/src/pages/Landing.tsx` + `frontend/src/pages/Pricing.tsx`
- [ ] T206 [P] Write E2E test: full student flow at 375px mobile viewport (login → dashboard → lesson → notes) in `frontend/tests/e2e/mobile-student.spec.ts`
- [ ] T207 [P] Write E2E test: RTL Arabic mode — register, checkout, dashboard, lesson, profile all render correctly with `dir="rtl"` in `frontend/tests/e2e/rtl-all-pages.spec.ts`
- [ ] T208 Run Lighthouse CI on all new key pages (`/`, `/preview`, `/dashboard`, `/course`, `/lesson/:id`) — verify Performance ≥ 90, Accessibility ≥ 90
- [ ] T209 Validate RTL on all Phase 11–15 pages: switch to Arabic, verify no overflow, correct text alignment, icons mirrored where directional
- [ ] T210 Validate dark mode on all Phase 11–15 pages: toggle theme, verify no invisible text or broken contrast
- [ ] T211 Run full E2E test suite after Phase 16 — all specs (including new ones) must pass (`docker compose exec frontend npx playwright test`)
- [ ] T212 Verify no hardcoded `left`/`right` CSS in all new pages (`pnpm lint` in frontend — zero logical-css errors)

**Checkpoint**: All new pages pass Lighthouse ≥ 90. Mobile nav works at 375px. Arabic RTL renders without overflow on all new pages.
