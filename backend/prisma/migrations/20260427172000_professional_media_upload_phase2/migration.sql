-- CreateEnum
CREATE TYPE "UploadProtocol" AS ENUM ('TUS', 'MULTIPART');

-- CreateEnum
CREATE TYPE "UploadSessionStatus" AS ENUM ('QUEUED', 'UPLOADING', 'PAUSED', 'OFFLINE', 'PROCESSING', 'READY', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ValidationStage" AS ENUM ('PRE_UPLOAD', 'POST_UPLOAD');

-- CreateEnum
CREATE TYPE "ValidationStatus" AS ENUM ('PASSED', 'FAILED', 'WARNING');

-- CreateEnum
CREATE TYPE "ValidationRule" AS ENUM ('TYPE', 'SIZE', 'DURATION', 'DUPLICATE', 'STORAGE_QUOTA', 'CHECKSUM', 'PLAYABILITY');

-- CreateEnum
CREATE TYPE "AttachmentRole" AS ENUM ('PRIMARY_VIDEO', 'SUPPLEMENTAL');

-- CreateEnum
CREATE TYPE "MappingSource" AS ENUM ('MANUAL', 'AUTO_MATCH', 'BULK_REVIEWED');

-- CreateEnum
CREATE TYPE "BatchOperationType" AS ENUM ('UPLOAD_BATCH', 'RETRY_FAILED', 'BULK_ATTACH', 'BULK_METADATA_UPDATE');

-- AlterTable
ALTER TABLE "MediaFile"
ADD COLUMN "uploadSessionId" TEXT;

-- CreateTable
CREATE TABLE "UploadSession" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "uploadProtocol" "UploadProtocol" NOT NULL DEFAULT 'TUS',
    "sourceFileName" TEXT NOT NULL,
    "sourceFileSizeBytes" BIGINT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "status" "UploadSessionStatus" NOT NULL DEFAULT 'QUEUED',
    "chunkSizeBytes" INTEGER NOT NULL,
    "nextChunkIndex" INTEGER NOT NULL DEFAULT 0,
    "maxChunkIndex" INTEGER NOT NULL,
    "retryAttempt" INTEGER NOT NULL DEFAULT 0,
    "retryNextAt" TIMESTAMP(3),
    "uploadSessionToken" TEXT NOT NULL,
    "storageObjectKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UploadSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadChunkCheckpoint" (
    "id" TEXT NOT NULL,
    "uploadSessionId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "chunkSizeBytes" INTEGER NOT NULL,
    "chunkChecksum" TEXT NOT NULL,
    "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isFinalChunk" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UploadChunkCheckpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaValidationResult" (
    "id" TEXT NOT NULL,
    "mediaAssetId" TEXT,
    "uploadSessionId" TEXT,
    "stage" "ValidationStage" NOT NULL,
    "status" "ValidationStatus" NOT NULL,
    "rule" "ValidationRule" NOT NULL,
    "message" TEXT NOT NULL,
    "detailsJson" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaValidationResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonMediaAttachment" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "mediaAssetId" TEXT NOT NULL,
    "attachmentRole" "AttachmentRole" NOT NULL DEFAULT 'PRIMARY_VIDEO',
    "mappingSource" "MappingSource" NOT NULL DEFAULT 'MANUAL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "attachedByUserId" TEXT NOT NULL,
    "attachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonMediaAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatchOperationReport" (
    "id" TEXT NOT NULL,
    "operationType" "BatchOperationType" NOT NULL,
    "initiatedByUserId" TEXT NOT NULL,
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "acceptedItems" INTEGER NOT NULL DEFAULT 0,
    "rejectedItems" INTEGER NOT NULL DEFAULT 0,
    "completedItems" INTEGER NOT NULL DEFAULT 0,
    "failedItems" INTEGER NOT NULL DEFAULT 0,
    "retriedItems" INTEGER NOT NULL DEFAULT 0,
    "pendingItems" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "summaryJson" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "BatchOperationReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UploadSession_uploadSessionToken_key" ON "UploadSession"("uploadSessionToken");

-- CreateIndex
CREATE INDEX "UploadSession_adminUserId_idx" ON "UploadSession"("adminUserId");

-- CreateIndex
CREATE INDEX "UploadSession_status_idx" ON "UploadSession"("status");

-- CreateIndex
CREATE INDEX "UploadSession_createdAt_idx" ON "UploadSession"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UploadChunkCheckpoint_uploadSessionId_chunkIndex_key" ON "UploadChunkCheckpoint"("uploadSessionId", "chunkIndex");

-- CreateIndex
CREATE INDEX "UploadChunkCheckpoint_uploadSessionId_acknowledgedAt_idx" ON "UploadChunkCheckpoint"("uploadSessionId", "acknowledgedAt");

-- CreateIndex
CREATE INDEX "MediaValidationResult_mediaAssetId_idx" ON "MediaValidationResult"("mediaAssetId");

-- CreateIndex
CREATE INDEX "MediaValidationResult_uploadSessionId_idx" ON "MediaValidationResult"("uploadSessionId");

-- CreateIndex
CREATE INDEX "MediaValidationResult_stage_status_idx" ON "MediaValidationResult"("stage", "status");

-- CreateIndex
CREATE INDEX "LessonMediaAttachment_lessonId_isActive_idx" ON "LessonMediaAttachment"("lessonId", "isActive");

-- CreateIndex
CREATE INDEX "LessonMediaAttachment_mediaAssetId_idx" ON "LessonMediaAttachment"("mediaAssetId");

-- CreateIndex
CREATE INDEX "LessonMediaAttachment_attachedByUserId_idx" ON "LessonMediaAttachment"("attachedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "LessonMediaAttachment_active_primary_lesson_key"
ON "LessonMediaAttachment"("lessonId")
WHERE "attachmentRole" = 'PRIMARY_VIDEO' AND "isActive" = true;

-- CreateIndex
CREATE INDEX "BatchOperationReport_initiatedByUserId_startedAt_idx" ON "BatchOperationReport"("initiatedByUserId", "startedAt");

-- CreateIndex
CREATE INDEX "BatchOperationReport_operationType_startedAt_idx" ON "BatchOperationReport"("operationType", "startedAt");

-- CreateIndex
CREATE INDEX "MediaFile_uploadSessionId_idx" ON "MediaFile"("uploadSessionId");

-- AddForeignKey
ALTER TABLE "MediaFile" ADD CONSTRAINT "MediaFile_uploadSessionId_fkey" FOREIGN KEY ("uploadSessionId") REFERENCES "UploadSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadSession" ADD CONSTRAINT "UploadSession_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadChunkCheckpoint" ADD CONSTRAINT "UploadChunkCheckpoint_uploadSessionId_fkey" FOREIGN KEY ("uploadSessionId") REFERENCES "UploadSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaValidationResult" ADD CONSTRAINT "MediaValidationResult_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaValidationResult" ADD CONSTRAINT "MediaValidationResult_uploadSessionId_fkey" FOREIGN KEY ("uploadSessionId") REFERENCES "UploadSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonMediaAttachment" ADD CONSTRAINT "LessonMediaAttachment_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonMediaAttachment" ADD CONSTRAINT "LessonMediaAttachment_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonMediaAttachment" ADD CONSTRAINT "LessonMediaAttachment_attachedByUserId_fkey" FOREIGN KEY ("attachedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchOperationReport" ADD CONSTRAINT "BatchOperationReport_initiatedByUserId_fkey" FOREIGN KEY ("initiatedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
