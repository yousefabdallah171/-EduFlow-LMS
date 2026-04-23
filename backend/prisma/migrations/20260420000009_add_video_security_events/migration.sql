CREATE TABLE "VideoSecurityEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "sessionId" TEXT,
  "lessonId" TEXT,
  "previewSessionId" TEXT,
  "eventType" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'INFO',
  "ip" TEXT,
  "userAgent" TEXT,
  "fingerprint" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VideoSecurityEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VideoSecurityEvent_createdAt_idx" ON "VideoSecurityEvent"("createdAt");
CREATE INDEX "VideoSecurityEvent_eventType_idx" ON "VideoSecurityEvent"("eventType");
CREATE INDEX "VideoSecurityEvent_userId_idx" ON "VideoSecurityEvent"("userId");
CREATE INDEX "VideoSecurityEvent_sessionId_idx" ON "VideoSecurityEvent"("sessionId");
CREATE INDEX "VideoSecurityEvent_lessonId_idx" ON "VideoSecurityEvent"("lessonId");
CREATE INDEX "VideoSecurityEvent_previewSessionId_idx" ON "VideoSecurityEvent"("previewSessionId");

ALTER TABLE "VideoSecurityEvent" ADD CONSTRAINT "VideoSecurityEvent_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "VideoSecurityEvent" ADD CONSTRAINT "VideoSecurityEvent_lessonId_fkey"
FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

