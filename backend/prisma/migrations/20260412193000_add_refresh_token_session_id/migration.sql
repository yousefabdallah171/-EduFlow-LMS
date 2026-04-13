ALTER TABLE "RefreshToken" ADD COLUMN "sessionId" TEXT NOT NULL DEFAULT '';

CREATE INDEX "RefreshToken_sessionId_idx" ON "RefreshToken"("sessionId");
