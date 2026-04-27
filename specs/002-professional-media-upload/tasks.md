# Tasks: Professional Media Upload & Lesson Attachment

**Input**: Design documents from `specs/002-professional-media-upload/`  
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`

**Tests**: Included because reliability and recovery testing are explicit core requirements.  
**Organization**: Tasks are grouped by user story for independent delivery and validation.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish feature module scaffolding and shared utilities.

- [X] T001 Create feature documentation index in `specs/002-professional-media-upload/README.md`
- [X] T002 Create upload domain folders in `backend/src/services/upload/`
- [X] T003 [P] Create media processing folders in `backend/src/services/media/` and `backend/src/jobs/`
- [X] T004 [P] Create admin uploader UI module folders in `frontend/src/components/admin/uploader/`
- [X] T005 [P] Create admin media module folders in `frontend/src/components/admin/media/`
- [X] T006 [P] Create lesson attachment UI module folders in `frontend/src/components/admin/lessons/`
- [X] T007 Add feature environment keys and validation in `backend/src/config/env.ts`
- [X] T008 Add frontend upload feature flags/constants in `frontend/src/lib/upload-config.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure required before any user story implementation.

- [X] T009 Create Prisma models and enums for sessions/checkpoints/media reports in `backend/prisma/schema.prisma`
- [X] T010 Generate and apply migration for new upload/media tables in `backend/prisma/migrations/`
- [X] T011 [P] Add repositories for upload sessions/checkpoints/media in `backend/src/repositories/`
- [X] T012 [P] Implement upload status/state enums and shared types in `backend/src/services/upload/upload.types.ts`
- [X] T013 [P] Implement upload queue state types in `frontend/src/types/upload-queue.ts`
- [X] T014 Build IndexedDB storage adapter for queue/session persistence in `frontend/src/lib/indexeddb-upload-state.ts`
- [X] T015 Implement backend audit trail primitives for upload/attach actions in `backend/src/services/audit/upload-audit.service.ts`
- [X] T016 Integrate new admin routes for upload/library/attachment in `backend/src/routes/admin.routes.ts`
- [X] T017 Add centralized error mapping for upload pipeline codes in `backend/src/utils/upload-errors.ts`

**Checkpoint**: Foundations complete; user stories can proceed.

---

## Phase 3: User Story 1 - Reliable High-Volume Upload Queue (Priority: P1) 🎯 MVP

**Goal**: Deliver resilient 100+ file queue with adaptive chunking, retry/backoff, offline support, and resume.

**Independent Test**: Upload batch under unstable network, refresh browser, reconnect after offline, confirm progress resumes from checkpoints.

### Tests for User Story 1

- [X] T018 [P] [US1] Add backend contract tests for session/chunk/complete endpoints in `backend/tests/contract/upload-session.contract.test.ts`
- [X] T019 [P] [US1] Add backend integration tests for checkpoint resume and retry behavior in `backend/tests/integration/upload-resume.integration.test.ts`
- [X] T020 [P] [US1] Add frontend unit tests for adaptive chunk algorithm in `frontend/src/lib/__tests__/adaptive-chunking.test.ts`
- [X] T021 [P] [US1] Add frontend unit tests for ETA/speed calculations in `frontend/src/lib/__tests__/upload-eta.test.ts`
- [X] T022 [P] [US1] Add Playwright scenario for refresh/reopen resume in `frontend/tests/e2e/upload-refresh-resume.spec.ts`
- [X] T023 [P] [US1] Add Playwright scenario for offline pause/auto-resume in `frontend/tests/e2e/upload-offline-resume.spec.ts`

### Implementation for User Story 1

- [X] T024 [P] [US1] Implement upload session creation service in `backend/src/services/upload/upload-session.service.ts`
- [X] T025 [P] [US1] Implement chunk checkpoint acknowledgment service in `backend/src/services/upload/chunk-checkpoint.service.ts`
- [X] T026 [US1] Implement chunk upload endpoint handlers in `backend/src/controllers/admin/uploads.controller.ts`
- [X] T027 [US1] Implement capped retry/backoff policy utility in `backend/src/services/upload/upload-retry-policy.ts`
- [X] T028 [US1] Implement adaptive chunk recommendation logic in `backend/src/services/upload/adaptive-chunk-hints.service.ts`
- [X] T029 [US1] Build frontend queue store with persisted state in `frontend/src/stores/upload-queue.store.ts`
- [X] T030 [US1] Implement upload orchestrator hook (`enqueue/start/pause/resume/retry`) in `frontend/src/hooks/useUploadQueue.ts`
- [X] T031 [US1] Implement adaptive chunk client utility in `frontend/src/lib/adaptive-chunking.ts`
- [X] T032 [US1] Implement telemetry utility for rolling speed/ETA in `frontend/src/lib/upload-eta.ts`
- [X] T033 [US1] Implement upload queue panel UI and row state rendering in `frontend/src/components/admin/uploader/UploadQueuePanel.tsx`
- [X] T034 [US1] Implement offline detection and auto-resume wiring in `frontend/src/hooks/useUploadQueue.ts`
- [X] T035 [US1] Add retry-all-failed action for queue scope in `frontend/src/components/admin/uploader/UploadQueuePanel.tsx`

**Checkpoint**: Admin can reliably upload and recover large batches.

---

## Phase 4: User Story 2 - Operational Media Library for Bulk Management (Priority: P2)

**Goal**: Add pre-validation, media status visibility, filtering, and bulk operations.

**Independent Test**: Upload mixed valid/invalid files and verify reject reasons, library filters, and bulk update behavior.

### Tests for User Story 2

- [X] T036 [P] [US2] Add backend tests for pre-upload validation rules in `backend/tests/integration/upload-validation.integration.test.ts`
- [X] T037 [P] [US2] Add backend tests for duplicate handling options in `backend/tests/integration/duplicate-handling.integration.test.ts`
- [X] T038 [P] [US2] Add frontend tests for queue acceptance/rejection summaries in `frontend/src/components/admin/uploader/__tests__/UploadDropzone.test.tsx`
- [X] T039 [P] [US2] Add Playwright scenario for folder drop mixed file types in `frontend/tests/e2e/upload-folder-mixed-files.spec.ts`

### Implementation for User Story 2

- [X] T040 [P] [US2] Implement pre-upload validation service in `backend/src/services/upload/upload-validation.service.ts`
- [X] T041 [P] [US2] Implement duplicate policy resolver in `backend/src/services/upload/duplicate-resolution.service.ts`
- [X] T042 [US2] Implement media library query/filter endpoint in `backend/src/controllers/admin/media-library.controller.ts`
- [X] T043 [US2] Implement media status aggregation endpoint in `backend/src/controllers/admin/media-library.controller.ts`
- [X] T044 [US2] Implement drag-drop and folder ingestion UI with accepted/rejected counters in `frontend/src/components/admin/uploader/UploadDropzone.tsx`
- [X] T045 [US2] Implement media library table with status filters and search in `frontend/src/components/admin/media/MediaLibraryTable.tsx`
- [X] T046 [US2] Implement bulk action bar (tags/folder/title updates) in `frontend/src/components/admin/media/BulkActionBar.tsx`
- [X] T047 [US2] Add media status badge component with consistent state colors in `frontend/src/components/admin/media/MediaStatusBadge.tsx`

**Checkpoint**: Admin can operate the library efficiently at scale.

---

## Phase 5: User Story 3 - Fast Lesson Attachment Workflow (Priority: P3)

**Goal**: Enable individual and bulk mapping from ready media assets to lessons.

**Independent Test**: Run bulk auto-map, manually resolve unmatched entries, apply atomically, and verify lesson media references.

### Tests for User Story 3

- [X] T048 [P] [US3] Add backend contract tests for auto-map and bulk-attach APIs in `backend/tests/contract/lesson-attachment.contract.test.ts`
- [X] T049 [P] [US3] Add backend integration test for atomic bulk attach behavior in `backend/tests/integration/lesson-bulk-attach.integration.test.ts`
- [X] T050 [P] [US3] Add Playwright scenario for bulk mapping + review flow in `frontend/tests/e2e/lesson-bulk-map.spec.ts`

### Implementation for User Story 3

- [X] T051 [P] [US3] Implement matching heuristics service in `backend/src/services/lessons/lesson-media-matching.service.ts`
- [X] T052 [US3] Implement auto-map endpoint in `backend/src/controllers/admin/lesson-attachment.controller.ts`
- [X] T053 [US3] Implement atomic bulk attach endpoint in `backend/src/controllers/admin/lesson-attachment.controller.ts`
- [X] T054 [US3] Implement single lesson attach endpoint in `backend/src/controllers/admin/lesson-attachment.controller.ts`
- [X] T055 [US3] Implement lesson attachment drawer UI in `frontend/src/components/admin/lessons/LessonAttachmentDrawer.tsx`
- [X] T056 [US3] Implement bulk mapper review UI in `frontend/src/components/admin/lessons/BulkLessonMapper.tsx`
- [X] T057 [US3] Wire lesson pages to updated attachment APIs in `frontend/src/pages/admin/Lessons.tsx`

**Checkpoint**: Upload-to-lesson workflow is complete and practical.

---

## Phase 6: User Story 4 - Monitoring, Recovery, and Team Confidence (Priority: P4)

**Goal**: Add observability and recovery controls for high-volume operations.

**Independent Test**: Inject failures, recover with retry-all, and verify batch summary + stuck item handling.

### Tests for User Story 4

- [X] T058 [P] [US4] Add backend integration tests for retry-all-failed workflow in `backend/tests/integration/retry-all-failed.integration.test.ts`
- [X] T059 [P] [US4] Add backend integration tests for stuck-item detection in `backend/tests/integration/upload-stuck-detection.integration.test.ts`
- [X] T060 [P] [US4] Add Playwright scenario for error dashboard recovery in `frontend/tests/e2e/upload-recovery-dashboard.spec.ts`

### Implementation for User Story 4

- [X] T061 [P] [US4] Implement batch report service and summary API in `backend/src/services/upload/batch-report.service.ts`
- [X] T062 [P] [US4] Implement stuck-item detector in `backend/src/services/upload/upload-stuck-detector.service.ts`
- [X] T063 [US4] Implement retry-all-failed endpoint in `backend/src/controllers/admin/uploads.controller.ts`
- [X] T064 [US4] Implement processing queue telemetry endpoint in `backend/src/controllers/admin/media-library.controller.ts`
- [X] T065 [US4] Build admin recovery panel UI in `frontend/src/components/admin/uploader/UploadRecoveryPanel.tsx`
- [X] T066 [US4] Build batch completion summary UI in `frontend/src/components/admin/uploader/BatchSummaryCard.tsx`

**Checkpoint**: Admin can monitor and recover batch operations without engineering support.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T067 [P] Add observability metrics (retry rate, resume success, upload throughput) in `backend/src/observability/prometheus.ts`
- [X] T068 [P] Add structured logging for upload session lifecycle in `backend/src/middleware/request-logging.middleware.ts`
- [X] T069 [P] Add docs for runbook and operational playbook in `docs/features/MEDIA-UPLOAD-OPERATIONS.md`
- [X] T070 Tune concurrency/chunk defaults and expose admin-safe configs in `frontend/src/lib/upload-config.ts` and `backend/src/config/env.ts`
- [X] T071 Run quickstart validation scenarios and capture evidence in `specs/002-professional-media-upload/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 -> Phase 2 -> User Story phases (3–6) -> Phase 7.
- User Stories depend on foundational phase completion.

### User Story Dependencies

- **US1** is MVP and required by all later stories.
- **US2** depends on US1 upload states and session persistence.
- **US3** depends on US2 media readiness visibility.
- **US4** depends on US1–US3 operational events.

### Parallel Opportunities

- Repository/service/model creation tasks marked `[P]` can be parallelized.
- Test authoring per story is highly parallel.
- Frontend and backend implementation tasks within same story can run in parallel after API contract stabilization.

## Implementation Strategy

### MVP First

1. Complete Phases 1 and 2.
2. Deliver Phase 3 (US1) and validate resilience scenarios.
3. Ship internal beta for bulk upload reliability.

### Incremental Delivery

1. Add US2 for production operations.
2. Add US3 to complete content publishing loop.
3. Add US4 to harden recovery and support.

### Team Split (Suggested)

- Engineer A: Backend upload/checkpoint/integrity domain
- Engineer B: Frontend uploader queue and persistence UX
- Engineer C: Media library + lesson mapping UX
- Engineer D: Automated test and chaos validation pipeline
