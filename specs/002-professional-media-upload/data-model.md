# Data Model: Professional Media Upload & Lesson Attachment

## Entity Overview

1. `UploadSession`
2. `UploadChunkCheckpoint`
3. `MediaAsset`
4. `MediaValidationResult`
5. `LessonMediaAttachment`
6. `BatchOperationReport`

## Entities

### UploadSession

- `id` (string, PK)
- `adminUserId` (string, FK -> User)
- `uploadProtocol` (enum: `TUS`, `MULTIPART`)
- `sourceFileName` (string)
- `sourceFileSizeBytes` (bigint)
- `mimeType` (string)
- `status` (enum: `QUEUED`, `UPLOADING`, `PAUSED`, `OFFLINE`, `PROCESSING`, `READY`, `FAILED`, `CANCELLED`)
- `chunkSizeBytes` (int)
- `nextChunkIndex` (int)
- `maxChunkIndex` (int)
- `retryAttempt` (int)
- `retryNextAt` (datetime)
- `uploadSessionToken` (string, unique)
- `storageObjectKey` (string, nullable)
- `createdAt` (datetime)
- `updatedAt` (datetime)

### UploadChunkCheckpoint

- `id` (string, PK)
- `uploadSessionId` (string, FK -> UploadSession)
- `chunkIndex` (int)
- `chunkSizeBytes` (int)
- `chunkChecksum` (string)
- `acknowledgedAt` (datetime)
- `isFinalChunk` (boolean)

**Constraint**: Unique `(uploadSessionId, chunkIndex)`

### MediaAsset

- `id` (string, PK)
- `uploadSessionId` (string, FK -> UploadSession, nullable)
- `title` (string)
- `originalFileName` (string)
- `normalizedName` (string)
- `mediaType` (enum: `VIDEO`)
- `status` (enum: `PROCESSING`, `READY`, `FAILED`)
- `storageObjectKey` (string)
- `hlsPlaylistPath` (string, nullable)
- `durationSeconds` (int, nullable)
- `sizeBytes` (bigint)
- `checksum` (string, nullable)
- `width` (int, nullable)
- `height` (int, nullable)
- `errorCode` (string, nullable)
- `errorMessage` (string, nullable)
- `folderId` (string, nullable)
- `createdAt` (datetime)
- `updatedAt` (datetime)

### MediaValidationResult

- `id` (string, PK)
- `mediaAssetId` (string, FK -> MediaAsset, nullable)
- `uploadSessionId` (string, FK -> UploadSession, nullable)
- `stage` (enum: `PRE_UPLOAD`, `POST_UPLOAD`)
- `status` (enum: `PASSED`, `FAILED`, `WARNING`)
- `rule` (enum: `TYPE`, `SIZE`, `DURATION`, `DUPLICATE`, `STORAGE_QUOTA`, `CHECKSUM`, `PLAYABILITY`)
- `message` (string)
- `detailsJson` (json)
- `createdAt` (datetime)

### LessonMediaAttachment

- `id` (string, PK)
- `lessonId` (string, FK -> Lesson)
- `mediaAssetId` (string, FK -> MediaAsset)
- `attachmentRole` (enum: `PRIMARY_VIDEO`, `SUPPLEMENTAL`)
- `mappingSource` (enum: `MANUAL`, `AUTO_MATCH`, `BULK_REVIEWED`)
- `isActive` (boolean)
- `attachedByUserId` (string, FK -> User)
- `attachedAt` (datetime)

**Constraint**: One active `PRIMARY_VIDEO` per lesson.

### BatchOperationReport

- `id` (string, PK)
- `operationType` (enum: `UPLOAD_BATCH`, `RETRY_FAILED`, `BULK_ATTACH`, `BULK_METADATA_UPDATE`)
- `initiatedByUserId` (string, FK -> User)
- `totalItems` (int)
- `acceptedItems` (int)
- `rejectedItems` (int)
- `completedItems` (int)
- `failedItems` (int)
- `retriedItems` (int)
- `pendingItems` (int)
- `startedAt` (datetime)
- `finishedAt` (datetime, nullable)
- `summaryJson` (json)

## State Transitions

### UploadSession.status

`QUEUED` -> `UPLOADING` -> (`PAUSED` | `OFFLINE` | `PROCESSING` | `FAILED` | `CANCELLED`)  
`PAUSED` -> `UPLOADING`  
`OFFLINE` -> `UPLOADING`  
`PROCESSING` -> (`READY` | `FAILED`)

### MediaAsset.status

`PROCESSING` -> (`READY` | `FAILED`)
