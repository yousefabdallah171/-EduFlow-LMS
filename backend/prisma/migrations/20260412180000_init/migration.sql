-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'STUDENT');

-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('en', 'ar');

-- CreateEnum
CREATE TYPE "Theme" AS ENUM ('light', 'dark');

-- CreateEnum
CREATE TYPE "OAuthProvider" AS ENUM ('email', 'google');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "EnrollmentType" AS ENUM ('PAID', 'ADMIN_ENROLLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "CouponDiscountType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "VideoStatus" AS ENUM ('NONE', 'PROCESSING', 'READY', 'ERROR');

-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('UPLOADING', 'COMPLETE', 'PROCESSING', 'READY', 'CANCELLED', 'ERROR');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "fullName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "locale" "Locale" NOT NULL DEFAULT 'en',
    "theme" "Theme" NOT NULL DEFAULT 'light',
    "oauthProvider" "OAuthProvider" NOT NULL DEFAULT 'email',
    "oauthId" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifyToken" TEXT,
    "emailVerifyExpires" TIMESTAMP(3),
    "passwordResetToken" TEXT,
    "passwordResetExpires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "enrollmentType" "EnrollmentType" NOT NULL,
    "paymentId" TEXT,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountPiasters" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "paymobOrderId" TEXT,
    "paymobTransactionId" TEXT,
    "couponId" TEXT,
    "discountPiasters" INTEGER NOT NULL DEFAULT 0,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "webhookReceivedAt" TIMESTAMP(3),
    "webhookHmac" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discountType" "CouponDiscountType" NOT NULL,
    "discountValue" DECIMAL(10,2) NOT NULL,
    "maxUses" INTEGER,
    "usesCount" INTEGER NOT NULL DEFAULT 0,
    "expiryDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lesson" (
    "id" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "descriptionEn" TEXT,
    "descriptionAr" TEXT,
    "videoHlsPath" TEXT,
    "videoStatus" "VideoStatus" NOT NULL DEFAULT 'NONE',
    "durationSeconds" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "dripDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "watchTimeSeconds" INTEGER NOT NULL DEFAULT 0,
    "lastPositionSeconds" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoUpload" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "offsetBytes" BIGINT NOT NULL DEFAULT 0,
    "status" "UploadStatus" NOT NULL DEFAULT 'UPLOADING',
    "storagePath" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "VideoUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "descriptionEn" TEXT,
    "descriptionAr" TEXT,
    "pricePiasters" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "isEnrollmentOpen" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "CourseSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_oauthId_key" ON "User"("oauthId");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_userId_key" ON "Enrollment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_paymentId_key" ON "Enrollment"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_paymobTransactionId_key" ON "Payment"("paymobTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- CreateIndex
CREATE UNIQUE INDEX "LessonProgress_userId_lessonId_key" ON "LessonProgress"("userId", "lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "VideoToken_tokenHash_key" ON "VideoToken"("tokenHash");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonProgress" ADD CONSTRAINT "LessonProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonProgress" ADD CONSTRAINT "LessonProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoToken" ADD CONSTRAINT "VideoToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoToken" ADD CONSTRAINT "VideoToken_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoUpload" ADD CONSTRAINT "VideoUpload_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoUpload" ADD CONSTRAINT "VideoUpload_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseSettings" ADD CONSTRAINT "CourseSettings_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

