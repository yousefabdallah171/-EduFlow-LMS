CREATE TABLE "LessonResource" (
  "id" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "fileSizeBytes" BIGINT NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LessonResource_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "LessonResource" ADD CONSTRAINT "LessonResource_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
