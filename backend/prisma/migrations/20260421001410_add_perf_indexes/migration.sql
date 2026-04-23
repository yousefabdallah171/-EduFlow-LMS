-- DropIndex
DROP INDEX "RefreshToken_sessionId_idx";

-- AlterTable
ALTER TABLE "RefreshToken" ALTER COLUMN "sessionId" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "CoursePackage_isActive_sortOrder_idx" ON "CoursePackage"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "Enrollment_status_idx" ON "Enrollment"("status");

-- CreateIndex
CREATE INDEX "Enrollment_enrolledAt_idx" ON "Enrollment"("enrolledAt");

-- CreateIndex
CREATE INDEX "Enrollment_revokedAt_idx" ON "Enrollment"("revokedAt");

-- CreateIndex
CREATE INDEX "Lesson_isPublished_sortOrder_idx" ON "Lesson"("isPublished", "sortOrder");

-- CreateIndex
CREATE INDEX "Lesson_sectionId_isPublished_sortOrder_idx" ON "Lesson"("sectionId", "isPublished", "sortOrder");

-- CreateIndex
CREATE INDEX "Lesson_isPreview_isPublished_idx" ON "Lesson"("isPreview", "isPublished");

-- CreateIndex
CREATE INDEX "LessonProgress_lessonId_idx" ON "LessonProgress"("lessonId");

-- CreateIndex
CREATE INDEX "Payment_userId_createdAt_idx" ON "Payment"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_status_createdAt_idx" ON "Payment"("status", "createdAt");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_sessionId_idx" ON "RefreshToken"("userId", "sessionId");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_revokedAt_idx" ON "RefreshToken"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "RefreshToken_familyId_idx" ON "RefreshToken"("familyId");

-- CreateIndex
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

-- CreateIndex
CREATE INDEX "Section_sortOrder_idx" ON "Section"("sortOrder");

-- CreateIndex
CREATE INDEX "VideoToken_sessionId_idx" ON "VideoToken"("sessionId");

-- CreateIndex
CREATE INDEX "VideoToken_userId_sessionId_idx" ON "VideoToken"("userId", "sessionId");

-- CreateIndex
CREATE INDEX "VideoToken_lessonId_expiresAt_idx" ON "VideoToken"("lessonId", "expiresAt");

-- CreateIndex
CREATE INDEX "VideoToken_expiresAt_idx" ON "VideoToken"("expiresAt");
