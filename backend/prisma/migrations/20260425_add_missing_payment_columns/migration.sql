-- Add missing columns to Payment table
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "webhookLastRetryAt" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "webhookNextRetryAt" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "enrollmentLastRetryAt" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "enrollmentNextRetryAt" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "refundRetryCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "refundLastRetryAt" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "refundNextRetryAt" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "refundStatus" "RefundStatus";
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "recoveryAttempts" JSONB;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "packageId" TEXT;

-- Add foreign key for packageId if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'Payment_packageId_fkey' AND table_name = 'Payment'
  ) THEN
    ALTER TABLE "Payment" ADD CONSTRAINT "Payment_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "CoursePackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;
