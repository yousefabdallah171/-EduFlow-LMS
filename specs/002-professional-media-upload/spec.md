# Feature Specification: Professional Media Upload & Lesson Attachment

**Feature Branch**: `002-professional-media-upload`  
**Created**: 2026-04-27  
**Status**: Draft  
**Input**: User description: "Build a professional high-volume video upload and media management workflow with adaptive chunking, retry/backoff, offline resume, checkpointing, integrity checks, drag-drop/folder upload, and fast lesson attachment for 100+ large videos."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reliable High-Volume Upload Queue (Priority: P1)

As an admin, I can upload 100+ large videos using a resilient queue that survives weak internet, refresh, and temporary offline periods, so I can finish bulk ingestion without restarting failed uploads.

**Why this priority**: Without reliable ingestion, all downstream media library and lesson assignment workflows are blocked.

**Independent Test**: Queue 100 files, simulate weak and unstable connection, refresh browser, then verify uploads continue from prior checkpoints and finish without restarting from zero.

**Acceptance Scenarios**:

1. **Given** 100 videos are selected, **When** upload starts, **Then** each file enters a persisted queue with status, progress, and resume metadata.
2. **Given** network speed drops, **When** uploads continue, **Then** chunk size is reduced automatically and failed chunks retry with backoff.
3. **Given** browser refresh or close/reopen occurs mid-upload, **When** user returns, **Then** queue state is restored and resumable uploads continue from checkpoints.
4. **Given** internet disconnects, **When** upload is in progress, **Then** queue moves to offline/paused state and resumes automatically when connectivity returns.
5. **Given** intermittent server errors (500/502/503/504), **When** chunk upload fails, **Then** system retries only failed chunks and surfaces clear per-file failure after max attempts.

---

### User Story 2 - Operational Media Library for Bulk Management (Priority: P2)

As an admin, I can manage uploaded files in a media library with filters, folders, statuses, validation feedback, and bulk actions so I can prepare content quickly and avoid manual cleanup.

**Why this priority**: High-volume operations fail without a clear management surface after upload.

**Independent Test**: Upload mixed files (valid/invalid/duplicates), then perform filtering, sorting, and bulk actions while confirming statuses and validation outcomes are accurate.

**Acceptance Scenarios**:

1. **Given** files are uploaded, **When** opening media library, **Then** items are visible with statuses (`UPLOADING`, `PROCESSING`, `READY`, `FAILED`) and searchable metadata.
2. **Given** unsupported, oversized, or duplicate files are selected, **When** pre-upload validation runs, **Then** invalid files are rejected with explicit reasons and never enter active upload queue.
3. **Given** a folder with mixed file types is dropped, **When** queue is built, **Then** supported videos are accepted, unsupported files are rejected, and accepted/rejected counts are shown.
4. **Given** many files are selected in library, **When** admin performs bulk update (tags/folder/title pattern), **Then** updates apply in one action and success/failure summary is shown.
5. **Given** integrity checks fail post-upload, **When** processing completes, **Then** item status is `FAILED` with actionable reason and retry option.

---

### User Story 3 - Fast Lesson Attachment Workflow (Priority: P3)

As an admin, I can attach ready media to lessons individually or in bulk (mapping by naming pattern and manual override), so publishing lesson content is quick and predictable.

**Why this priority**: Uploading alone does not deliver learner value; attachment closes the loop from ingestion to course delivery.

**Independent Test**: Attach a batch of ready videos to lessons via bulk mapping, verify unresolved items are flagged, and confirm lesson playback references correct media.

**Acceptance Scenarios**:

1. **Given** ready media exists, **When** opening lesson attachment UI, **Then** admin can search media and attach in 1–2 actions per lesson.
2. **Given** filename conventions align with lesson names, **When** bulk attach runs, **Then** system proposes matches with confidence and requires confirmation before apply.
3. **Given** ambiguous or unmatched files exist, **When** bulk attach result is shown, **Then** unresolved items remain in review queue without breaking already matched attachments.
4. **Given** attachment is changed, **When** admin saves, **Then** lesson references update atomically and audit trail records old/new mapping.

---

### User Story 4 - Monitoring, Recovery, and Team Confidence (Priority: P4)

As an admin/ops user, I can monitor upload health, retry failures in bulk, and inspect error reasons so I can recover from large batch issues without engineering intervention.

**Why this priority**: At 100+ file scale, operational observability and recovery become mandatory.

**Independent Test**: Inject controlled failures across upload and processing, then recover via retry-all and confirm final completion report.

**Acceptance Scenarios**:

1. **Given** some files fail in a large batch, **When** admin clicks retry-all-failed, **Then** only failed files re-enter queue.
2. **Given** processing jobs are delayed/stuck, **When** monitoring view is opened, **Then** stuck items are highlighted with age, last activity, and recommended action.
3. **Given** batch completes, **When** summary is generated, **Then** admin sees totals for uploaded, failed, retried, attached, and pending files.

---

### Edge Cases

- File exists in queue state but user removed local source file before resume.
- Chunk uploaded on client but not acknowledged server-side (network split during response).
- Server-side chunk store eviction while client still has resume state.
- Duplicate filenames across different folders and lessons.
- User switches tabs/locales during active upload and returns later.
- Queue has mixed very large files (1GB+) and small files under constrained concurrency.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support resumable chunked upload sessions for large video files and preserve progress per file.
- **FR-002**: System MUST adapt chunk size based on recent upload throughput and failure rate without corrupting chunk order.
- **FR-003**: System MUST retry failed chunk uploads with capped exponential backoff and expose manual retry controls.
- **FR-004**: System MUST persist upload queue state locally (including session IDs and checkpoints) and restore state after refresh/reopen.
- **FR-005**: System MUST provide real-time upload telemetry: current speed, average speed, progress, ETA, and remaining files.
- **FR-006**: System MUST detect offline status, pause queue safely, and auto-resume when connection is restored.
- **FR-007**: System MUST track checkpoint state both client-side and server-side so resume can continue from last verified chunk.
- **FR-008**: System MUST validate uploaded media integrity before marking ready, including file completeness and media readability checks.
- **FR-009**: System MUST support drag-and-drop multi-file and folder upload workflows with deterministic queue ordering.
- **FR-010**: System MUST run pre-upload validation for type, max size, duration, duplicates, and storage constraints and reject invalid items before queue entry.
- **FR-011**: System MUST expose clear status transitions for each media item (`QUEUED`, `UPLOADING`, `PAUSED`, `PROCESSING`, `READY`, `FAILED`).
- **FR-012**: System MUST provide bulk retry for failed files and keep successful files untouched.
- **FR-013**: System MUST provide media library filters (status, folder, date, tag, text search) and bulk metadata actions.
- **FR-014**: System MUST support one-click attach from media library to lesson and bulk attach mapping for many lessons.
- **FR-015**: System MUST provide duplicate handling options when same source appears again (`SKIP`, `REPLACE`, `UPLOAD_AS_NEW`).
- **FR-016**: System MUST produce batch-level reporting with counts for accepted, rejected, uploaded, failed, retried, and attached.
- **FR-017**: System MUST preserve queue responsiveness and UI usability during 100-file batch uploads with bounded concurrency.

### Key Entities *(include if feature involves data)*

- **UploadSession**: Represents a resumable file upload session, including file identity, upload ID, status, and retry policy state.
- **UploadChunkCheckpoint**: Represents highest verified chunk index and integrity metadata for resume safety.
- **MediaAsset**: Canonical media library item with metadata, processing status, integrity outcome, and storage pointers.
- **MediaValidationResult**: Stores pre-upload and post-upload validation outcomes with reject/fail reasons.
- **UploadQueueItemState**: Client-side persisted queue record with progress, speed stats, ETA, and paused/offline state.
- **LessonMediaAttachment**: Mapping between a lesson and one or more media assets including active selection and audit metadata.
- **BatchOperationReport**: Aggregated operation result for upload/validation/attach actions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A batch of 100 video files completes with at least 98% successful uploads without manual restart from zero.
- **SC-002**: Refresh/reopen recovery resumes queued uploads from saved checkpoints within 10 seconds for at least 95% of resumable files.
- **SC-003**: During simulated unstable internet (100 KB/s, 300 ms latency, 5% packet loss), upload pipeline continues progressing with bounded retries and no data corruption.
- **SC-004**: ETA and speed telemetry update at least once per second and remain directionally accurate (within ±20% on rolling 60-second windows).
- **SC-005**: Failed chunks are retried automatically and capped; no infinite retry loops occur.
- **SC-006**: Pre-upload validation blocks 100% of unsupported file types and oversized files before upload starts.
- **SC-007**: Admin can attach 100 ready media files to target lessons in under 15 minutes using bulk mapping + manual review flow.
- **SC-008**: UI remains responsive during 100 concurrent queue entries with configured concurrency limits and no browser freeze events longer than 2 seconds.

## Assumptions

- Initial rollout targets admin desktop web workflow (mobile admin upload is out of scope).
- Video formats accepted initially are MP4, MOV, and WEBM; other formats are rejected.
- Maximum file size per video defaults to 5GB unless updated by admin policy.
- Concurrency defaults to 2–3 active uploads per browser session to balance stability and throughput.
- Storage and processing infrastructure supports resumable sessions and delayed background processing.
- Lesson model already exists and supports media reference updates through existing admin domain.
