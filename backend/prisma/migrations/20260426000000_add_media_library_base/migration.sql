-- Ensure media enums exist for clean databases.
DO $$
BEGIN
  CREATE TYPE "MediaType" AS ENUM ('VIDEO', 'IMAGE', 'PDF', 'DOCUMENT', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "MediaStatus" AS ENUM ('UPLOADING', 'PROCESSING', 'READY', 'ERROR');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Media folders
CREATE TABLE IF NOT EXISTS "MediaFolder" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "parentId" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaFolder_pkey" PRIMARY KEY ("id")
);

-- Media files
CREATE TABLE IF NOT EXISTS "MediaFile" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "type" "MediaType" NOT NULL,
  "status" "MediaStatus" NOT NULL DEFAULT 'UPLOADING',
  "originalFilename" TEXT NOT NULL,
  "storagePath" TEXT,
  "hlsPath" TEXT,
  "durationSeconds" INTEGER,
  "mimeType" TEXT,
  "sizeBytes" BIGINT NOT NULL DEFAULT 0,
  "errorMessage" TEXT,
  "folderId" TEXT,
  "uploadedById" TEXT NOT NULL,
  "tusUploadId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaFile_pkey" PRIMARY KEY ("id")
);

-- Backfill relation columns if absent
ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "mediaFileId" TEXT;
ALTER TABLE "LessonResource" ADD COLUMN IF NOT EXISTS "mediaFileId" TEXT;
ALTER TABLE "VideoUpload" ADD COLUMN IF NOT EXISTS "mediaFileId" TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS "MediaFolder_parentId_idx" ON "MediaFolder"("parentId");
CREATE INDEX IF NOT EXISTS "MediaFolder_createdById_idx" ON "MediaFolder"("createdById");
CREATE INDEX IF NOT EXISTS "MediaFile_folderId_idx" ON "MediaFile"("folderId");
CREATE INDEX IF NOT EXISTS "MediaFile_uploadedById_idx" ON "MediaFile"("uploadedById");
CREATE INDEX IF NOT EXISTS "MediaFile_status_idx" ON "MediaFile"("status");
CREATE INDEX IF NOT EXISTS "MediaFile_type_idx" ON "MediaFile"("type");
CREATE INDEX IF NOT EXISTS "MediaFile_createdAt_idx" ON "MediaFile"("createdAt");
CREATE INDEX IF NOT EXISTS "Lesson_mediaFileId_idx" ON "Lesson"("mediaFileId");
CREATE INDEX IF NOT EXISTS "LessonResource_mediaFileId_idx" ON "LessonResource"("mediaFileId");
CREATE INDEX IF NOT EXISTS "VideoUpload_mediaFileId_idx" ON "VideoUpload"("mediaFileId");

-- Foreign keys
DO $$
BEGIN
  ALTER TABLE "MediaFolder"
    ADD CONSTRAINT "MediaFolder_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "MediaFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "MediaFolder"
    ADD CONSTRAINT "MediaFolder_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "MediaFile"
    ADD CONSTRAINT "MediaFile_folderId_fkey"
    FOREIGN KEY ("folderId") REFERENCES "MediaFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "MediaFile"
    ADD CONSTRAINT "MediaFile_uploadedById_fkey"
    FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "Lesson"
    ADD CONSTRAINT "Lesson_mediaFileId_fkey"
    FOREIGN KEY ("mediaFileId") REFERENCES "MediaFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "LessonResource"
    ADD CONSTRAINT "LessonResource_mediaFileId_fkey"
    FOREIGN KEY ("mediaFileId") REFERENCES "MediaFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "VideoUpload"
    ADD CONSTRAINT "VideoUpload_mediaFileId_fkey"
    FOREIGN KEY ("mediaFileId") REFERENCES "MediaFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
