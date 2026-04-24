-- AlterEnum
ALTER TYPE "PaymentStatus" RENAME TO "PaymentStatus_old";
CREATE TYPE "PaymentStatus" AS ENUM ('INITIATED', 'AWAITING_PAYMENT', 'WEBHOOK_PENDING', 'COMPLETED', 'FAILED', 'CANCELLED', 'ENROLLMENT_FAILED', 'EMAIL_FAILED', 'REFUND_REQUESTED', 'REFUNDED', 'REFUND_FAILED', 'DISPUTED', 'MANUAL_OVERRIDE');
ALTER TABLE "Payment" ALTER COLUMN "status" TYPE "PaymentStatus" USING "status"::text::"PaymentStatus";
DROP TYPE "PaymentStatus_old";

-- CreateEnum
CREATE TYPE "PaymentEventType" AS ENUM ('INITIATED', 'PAYMENT_KEY_GENERATED', 'PAYMOB_API_ERROR', 'WEBHOOK_RECEIVED', 'WEBHOOK_VERIFIED', 'WEBHOOK_DUPLICATE', 'STATUS_CHANGED', 'ENROLLMENT_TRIGGERED', 'ENROLLMENT_SUCCEEDED', 'ENROLLMENT_FAILED', 'EMAIL_QUEUED', 'EMAIL_SENT', 'EMAIL_FAILED', 'COUPON_INCREMENTED', 'REFUND_INITIATED', 'REFUND_API_CALL', 'REFUND_SUCCEEDED', 'REFUND_FAILED', 'DISPUTE_RECEIVED', 'MANUAL_OVERRIDE_APPLIED', 'PAYMENT_POLLED');

-- AlterTable Payment - Add all new fields
ALTER TABLE "Payment" ADD COLUMN "paymobIdempotencyKey" TEXT,
ADD COLUMN "webhookPayload" JSONB,
ADD COLUMN "webhookRetryCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "errorCode" TEXT,
ADD COLUMN "errorMessage" TEXT,
ADD COLUMN "errorDetails" JSONB,
ADD COLUMN "refundInitiatedAt" TIMESTAMP(3),
ADD COLUMN "refundInitiatedBy" TEXT,
ADD COLUMN "refundAmount" INTEGER,
ADD COLUMN "paymobRefundId" TEXT,
ADD COLUMN "refundCompletedAt" TIMESTAMP(3),
ADD COLUMN "disputedAt" TIMESTAMP(3),
ADD COLUMN "disputeReason" TEXT,
ADD COLUMN "resolvedAt" TIMESTAMP(3),
ADD COLUMN "resolvedBy" TEXT,
ADD COLUMN "ipAddress" TEXT,
ADD COLUMN "userAgent" TEXT;

-- CreateTable PaymentEvent
CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "eventType" "PaymentEventType" NOT NULL,
    "status" "PaymentStatus",
    "previousStatus" "PaymentStatus",
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable PaymentReconciliation
CREATE TABLE "PaymentReconciliation" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "paymobStatus" TEXT,
    "localStatus" TEXT NOT NULL,
    "paymobAmount" INTEGER,
    "localAmount" INTEGER NOT NULL,
    "amountMismatch" BOOLEAN NOT NULL DEFAULT false,
    "isReconciled" BOOLEAN NOT NULL DEFAULT false,
    "reconciliedAt" TIMESTAMP(3),
    "reconciliedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_paymobIdempotencyKey_key" ON "Payment"("paymobIdempotencyKey");
CREATE UNIQUE INDEX "Payment_paymobRefundId_key" ON "Payment"("paymobRefundId");
CREATE INDEX "PaymentEvent_paymentId_idx" ON "PaymentEvent"("paymentId");
CREATE INDEX "PaymentEvent_paymentId_createdAt_idx" ON "PaymentEvent"("paymentId", "createdAt");
CREATE INDEX "PaymentEvent_eventType_idx" ON "PaymentEvent"("eventType");
CREATE INDEX "PaymentEvent_eventType_createdAt_idx" ON "PaymentEvent"("eventType", "createdAt");
CREATE INDEX "PaymentEvent_createdAt_idx" ON "PaymentEvent"("createdAt");
CREATE INDEX "PaymentReconciliation_paymentId_idx" ON "PaymentReconciliation"("paymentId");
CREATE INDEX "PaymentReconciliation_isReconciled_idx" ON "PaymentReconciliation"("isReconciled");

-- AddForeignKey
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentReconciliation" ADD CONSTRAINT "PaymentReconciliation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
