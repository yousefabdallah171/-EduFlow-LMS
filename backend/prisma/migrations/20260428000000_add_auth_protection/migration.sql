-- CreateEnum
CREATE TYPE "AttemptType" AS ENUM ('LOGIN', 'REGISTER', 'PASSWORD_RESET', 'RESEND_VERIFICATION');

-- CreateEnum
CREATE TYPE "AttemptResult" AS ENUM ('SUCCESS', 'FAIL_CREDENTIALS', 'FAIL_NOT_VERIFIED', 'BLOCKED_BAN', 'LOCKED_OUT', 'CAPTCHA_REQUIRED', 'CAPTCHA_FAIL', 'RATE_LIMITED', 'FLOOD_LIMIT');

-- CreateEnum
CREATE TYPE "BanType" AS ENUM ('IP', 'EMAIL', 'FINGERPRINT', 'IP_EMAIL', 'IP_FINGERPRINT', 'ALL');

-- CreateEnum
CREATE TYPE "BanReason" AS ENUM ('AUTO_PROGRESSIVE', 'AUTO_REGISTRATION_FLOOD', 'MANUAL_ADMIN');

-- CreateTable
CREATE TABLE "BrowserFingerprint" (
    "id" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "seenCount" INTEGER NOT NULL DEFAULT 1,
    "userId" TEXT,

    CONSTRAINT "BrowserFingerprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthAttemptLog" (
    "id" TEXT NOT NULL,
    "type" "AttemptType" NOT NULL,
    "result" "AttemptResult" NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "emailAttempted" TEXT,
    "fingerprintId" TEXT,
    "userId" TEXT,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "lockoutApplied" BOOLEAN NOT NULL DEFAULT false,
    "banApplied" BOOLEAN NOT NULL DEFAULT false,
    "captchaRequired" BOOLEAN NOT NULL DEFAULT false,
    "captchaPassed" BOOLEAN,
    "delayApplied" INTEGER NOT NULL DEFAULT 0,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthAttemptLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityBan" (
    "id" TEXT NOT NULL,
    "banType" "BanType" NOT NULL,
    "reason" "BanReason" NOT NULL,
    "notes" TEXT,
    "ipAddress" TEXT,
    "email" TEXT,
    "fingerprintId" TEXT,
    "attemptCount" INTEGER,
    "isPermanent" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "liftedAt" TIMESTAMP(3),
    "liftedById" TEXT,
    "createdById" TEXT,
    "liftReason" TEXT,

    CONSTRAINT "SecurityBan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityWhitelist" (
    "id" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "reason" TEXT,
    "addedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityWhitelist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BrowserFingerprint_hash_key" ON "BrowserFingerprint"("hash");

-- CreateIndex
CREATE INDEX "BrowserFingerprint_hash_idx" ON "BrowserFingerprint"("hash");

-- CreateIndex
CREATE INDEX "BrowserFingerprint_userId_idx" ON "BrowserFingerprint"("userId");

-- CreateIndex
CREATE INDEX "AuthAttemptLog_ipAddress_createdAt_idx" ON "AuthAttemptLog"("ipAddress", "createdAt");

-- CreateIndex
CREATE INDEX "AuthAttemptLog_emailAttempted_createdAt_idx" ON "AuthAttemptLog"("emailAttempted", "createdAt");

-- CreateIndex
CREATE INDEX "AuthAttemptLog_fingerprintId_createdAt_idx" ON "AuthAttemptLog"("fingerprintId", "createdAt");

-- CreateIndex
CREATE INDEX "AuthAttemptLog_result_createdAt_idx" ON "AuthAttemptLog"("result", "createdAt");

-- CreateIndex
CREATE INDEX "AuthAttemptLog_type_result_createdAt_idx" ON "AuthAttemptLog"("type", "result", "createdAt");

-- CreateIndex
CREATE INDEX "AuthAttemptLog_createdAt_idx" ON "AuthAttemptLog"("createdAt");

-- CreateIndex
CREATE INDEX "SecurityBan_ipAddress_isActive_idx" ON "SecurityBan"("ipAddress", "isActive");

-- CreateIndex
CREATE INDEX "SecurityBan_email_isActive_idx" ON "SecurityBan"("email", "isActive");

-- CreateIndex
CREATE INDEX "SecurityBan_fingerprintId_isActive_idx" ON "SecurityBan"("fingerprintId", "isActive");

-- CreateIndex
CREATE INDEX "SecurityBan_isActive_expiresAt_idx" ON "SecurityBan"("isActive", "expiresAt");

-- CreateIndex
CREATE INDEX "SecurityBan_createdAt_idx" ON "SecurityBan"("createdAt");

-- CreateIndex
CREATE INDEX "SecurityBan_banType_isActive_idx" ON "SecurityBan"("banType", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "SecurityWhitelist_ipAddress_key" ON "SecurityWhitelist"("ipAddress");

-- CreateIndex
CREATE INDEX "SecurityWhitelist_ipAddress_idx" ON "SecurityWhitelist"("ipAddress");

-- AddForeignKey
ALTER TABLE "BrowserFingerprint" ADD CONSTRAINT "BrowserFingerprint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthAttemptLog" ADD CONSTRAINT "AuthAttemptLog_fingerprintId_fkey" FOREIGN KEY ("fingerprintId") REFERENCES "BrowserFingerprint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthAttemptLog" ADD CONSTRAINT "AuthAttemptLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityBan" ADD CONSTRAINT "SecurityBan_fingerprintId_fkey" FOREIGN KEY ("fingerprintId") REFERENCES "BrowserFingerprint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityBan" ADD CONSTRAINT "SecurityBan_liftedById_fkey" FOREIGN KEY ("liftedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityBan" ADD CONSTRAINT "SecurityBan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityWhitelist" ADD CONSTRAINT "SecurityWhitelist_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

