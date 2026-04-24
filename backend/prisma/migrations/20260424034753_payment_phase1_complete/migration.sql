-- Add new columns to Payment table
ALTER TABLE "Payment" ADD COLUMN "paymobIdempotencyKey" TEXT UNIQUE;
ALTER TABLE "Payment" ADD COLUMN "webhookPayload" JSONB;
ALTER TABLE "Payment" ADD COLUMN "webhookRetryCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Payment" ADD COLUMN "errorCode" TEXT;
ALTER TABLE "Payment" ADD COLUMN "errorMessage" TEXT;
ALTER TABLE "Payment" ADD COLUMN "errorDetails" JSONB;
ALTER TABLE "Payment" ADD COLUMN "refundInitiatedAt" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN "refundInitiatedBy" TEXT;
ALTER TABLE "Payment" ADD COLUMN "refundAmount" INTEGER;
ALTER TABLE "Payment" ADD COLUMN "paymobRefundId" TEXT UNIQUE;
ALTER TABLE "Payment" ADD COLUMN "refundCompletedAt" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN "disputedAt" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN "disputeReason" TEXT;
ALTER TABLE "Payment" ADD COLUMN "resolvedAt" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN "resolvedBy" TEXT;
ALTER TABLE "Payment" ADD COLUMN "ipAddress" TEXT;
ALTER TABLE "Payment" ADD COLUMN "userAgent" TEXT;

-- Update status column default
ALTER TABLE "Payment" ALTER COLUMN "status" SET DEFAULT 'INITIATED'::"PaymentStatus";

-- Create PaymentEvent table
CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "previousStatus" TEXT,
    "newStatus" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- Create PaymentReconciliation table
CREATE TABLE "PaymentReconciliation" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "paymobOrderId" TEXT,
    "localAmount" INTEGER NOT NULL,
    "paymobAmount" INTEGER,
    "localStatus" TEXT NOT NULL,
    "paymobStatus" TEXT,
    "isReconciled" BOOLEAN NOT NULL DEFAULT false,
    "reconciliationNotes" TEXT,
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentReconciliation_pkey" PRIMARY KEY ("id")
);

-- Create indexes for Payment table
CREATE INDEX "Payment_paymobOrderId_idx" ON "Payment"("paymobOrderId");
CREATE INDEX "Payment_paymobTransactionId_idx" ON "Payment"("paymobTransactionId");
CREATE INDEX "Payment_paymobIdempotencyKey_idx" ON "Payment"("paymobIdempotencyKey");
CREATE INDEX "Payment_status_idx" ON "Payment"("status");
CREATE INDEX "Payment_errorCode_idx" ON "Payment"("errorCode");
CREATE INDEX "Payment_refundInitiatedAt_idx" ON "Payment"("refundInitiatedAt");
CREATE INDEX "Payment_disputedAt_idx" ON "Payment"("disputedAt");
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");
CREATE INDEX "Payment_userId_status_idx" ON "Payment"("userId", "status");
CREATE INDEX "Payment_paymobOrderId_status_idx" ON "Payment"("paymobOrderId", "status");

-- Create indexes for PaymentEvent table
CREATE INDEX "PaymentEvent_paymentId_createdAt_idx" ON "PaymentEvent"("paymentId", "createdAt");
CREATE INDEX "PaymentEvent_eventType_idx" ON "PaymentEvent"("eventType");
CREATE INDEX "PaymentEvent_createdAt_idx" ON "PaymentEvent"("createdAt");

-- Create indexes for PaymentReconciliation table
CREATE UNIQUE INDEX "PaymentReconciliation_paymentId_key" ON "PaymentReconciliation"("paymentId");
CREATE UNIQUE INDEX "PaymentReconciliation_paymobOrderId_key" ON "PaymentReconciliation"("paymobOrderId");
CREATE INDEX "PaymentReconciliation_isReconciled_idx" ON "PaymentReconciliation"("isReconciled");
CREATE INDEX "PaymentReconciliation_updatedAt_idx" ON "PaymentReconciliation"("updatedAt");

-- Add foreign keys
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentReconciliation" ADD CONSTRAINT "PaymentReconciliation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
