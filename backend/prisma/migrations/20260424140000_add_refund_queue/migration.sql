-- Create RefundStatus enum if not exists
DO $$ BEGIN
  CREATE TYPE "RefundStatus" AS ENUM ('REQUESTED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add refund-related columns to Payment table
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "refundStatus" "RefundStatus";
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "refundRetryCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "refundLastRetryAt" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "refundNextRetryAt" TIMESTAMP(3);

-- Create RefundQueue table
CREATE TABLE IF NOT EXISTS "RefundQueue" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "refundType" TEXT NOT NULL,
    "refundAmount" INTEGER NOT NULL,
    "reason" TEXT,
    "paymobRefundId" TEXT UNIQUE,

    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,

    "firstAttempt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAttempt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextRetry" TIMESTAMP(3),

    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "errorDetails" JSONB,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefundQueue_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RefundQueue_paymentId_key" UNIQUE ("paymentId"),
    CONSTRAINT "RefundQueue_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for RefundQueue
CREATE INDEX IF NOT EXISTS "RefundQueue_nextRetry_idx" ON "RefundQueue"("nextRetry");
CREATE INDEX IF NOT EXISTS "RefundQueue_resolvedAt_idx" ON "RefundQueue"("resolvedAt");
CREATE INDEX IF NOT EXISTS "RefundQueue_paymentId_idx" ON "RefundQueue"("paymentId");
CREATE INDEX IF NOT EXISTS "RefundQueue_status_idx" ON "RefundQueue"("resolution");

-- Create indexes for Payment refund columns
CREATE INDEX IF NOT EXISTS "Payment_refundStatus_idx" ON "Payment"("refundStatus");
CREATE INDEX IF NOT EXISTS "Payment_refundInitiatedAt_idx" ON "Payment"("refundInitiatedAt");
CREATE INDEX IF NOT EXISTS "Payment_refundNextRetryAt_idx" ON "Payment"("refundNextRetryAt");
