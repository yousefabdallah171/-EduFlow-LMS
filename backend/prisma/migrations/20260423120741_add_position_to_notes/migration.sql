-- DropIndex
DROP INDEX "Note_userId_lessonId_key";

-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "positionSeconds" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Note_userId_lessonId_idx" ON "Note"("userId", "lessonId");
