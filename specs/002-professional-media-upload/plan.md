# Implementation Plan: Professional Media Upload & Lesson Attachment

**Branch**: `002-professional-media-upload` | **Date**: 2026-04-27 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/002-professional-media-upload/spec.md`

## Summary

Deliver a production-grade bulk video ingestion and lesson-attachment workflow for admin users. The plan prioritizes reliability on weak internet, resumable uploads with dual checkpoints (client/server), adaptive chunking, robust retry/backoff, and fast bulk assignment to lessons.

## Technical Context

**Language/Version**: TypeScript 5.x (frontend + backend)  
**Primary Dependencies**:
- Frontend: React 18, TanStack Query, Zustand, tus-js-client, IndexedDB (idb wrapper), react-dropzone
- Backend: Node.js + Express, Prisma, Redis, queue worker (BullMQ), tus-compatible upload endpoint
- Media Processing: ffprobe/ffmpeg worker pipeline

**Storage**:
- Metadata: PostgreSQL
- Session/checkpoint/cache: Redis
- Binary storage: S3/R2/MinIO-compatible object storage

**Testing**:
- Frontend: Vitest + Playwright
- Backend: Vitest + supertest
- Network chaos simulation: Playwright + proxy throttling profiles

**Target Platform**: Web admin dashboard (desktop-first), Linux containers in Docker/K8s  
**Project Type**: Web application (monorepo: `frontend/`, `backend/`)  
**Performance Goals**:
- Handle 100 files/batch at 1GB class with concurrency 2–3
- Keep UI responsive during large queue operations
- Resume recovery under 10 seconds after refresh/reopen

**Constraints**:
- Must tolerate unstable network (low throughput + packet loss)
- Must never restart completed chunks
- Must support offline pause/resume and persistent queue state

**Scale/Scope**:
- Initial scope: admin operations for high-volume upload and lesson binding
- Out of scope: mobile admin uploader, public end-user upload surfaces

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| Clean architecture | PASS | Upload orchestration in services; controllers remain thin |
| Security-first | PASS | Signed upload sessions, scoped auth, checksum verification, audit trail |
| Performance & resilience | PASS | Adaptive chunking, backoff, queue persistence, bounded concurrency |
| UX consistency | PASS | Shared status model, clear failure states, bulk recovery actions |

## Project Structure

### Documentation (this feature)

```text
specs/002-professional-media-upload/
├── plan.md
├── research.md
├── data-model.md
├── architecture.md
├── quickstart.md
├── contracts/
│   ├── upload-api.md
│   └── lesson-attachment-api.md
└── tasks.md
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── controllers/admin/
│   │   ├── uploads.controller.ts
│   │   ├── media-library.controller.ts
│   │   └── lesson-attachment.controller.ts
│   ├── services/upload/
│   │   ├── upload-session.service.ts
│   │   ├── chunk-checkpoint.service.ts
│   │   ├── upload-validation.service.ts
│   │   └── upload-retry-policy.ts
│   ├── services/media/
│   │   ├── media-processing.service.ts
│   │   ├── media-integrity.service.ts
│   │   └── media-library.service.ts
│   ├── services/lessons/
│   │   └── lesson-media-attachment.service.ts
│   ├── jobs/
│   │   └── media-processing.worker.ts
│   └── routes/
│       └── admin.routes.ts
└── prisma/
    └── schema.prisma

frontend/
├── src/
│   ├── components/admin/
│   │   ├── uploader/
│   │   │   ├── UploadQueuePanel.tsx
│   │   │   ├── UploadQueueRow.tsx
│   │   │   └── UploadDropzone.tsx
│   │   ├── media/
│   │   │   ├── MediaLibraryTable.tsx
│   │   │   ├── BulkActionBar.tsx
│   │   │   └── MediaStatusBadge.tsx
│   │   └── lessons/
│   │       ├── LessonAttachmentDrawer.tsx
│   │       └── BulkLessonMapper.tsx
│   ├── stores/
│   │   └── upload-queue.store.ts
│   ├── lib/
│   │   ├── indexeddb-upload-state.ts
│   │   ├── adaptive-chunking.ts
│   │   └── upload-eta.ts
│   └── hooks/
│       ├── useUploadQueue.ts
│       └── useUploadTelemetry.ts
```

**Structure Decision**: Use existing web-app monorepo with a dedicated upload domain in backend services and a dedicated uploader/media UI module in frontend admin area.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Additional persistent queue state in IndexedDB | Needed for refresh/reopen resume at 100+ file scale | In-memory or localStorage approaches break on large state and binary metadata |
