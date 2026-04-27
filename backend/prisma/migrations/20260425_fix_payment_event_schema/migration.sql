-- Fix PaymentEvent columns to use proper enums
ALTER TABLE "PaymentEvent" DROP COLUMN IF EXISTS "newStatus";
ALTER TABLE "PaymentEvent" ADD COLUMN IF NOT EXISTS "status" "PaymentStatus";
ALTER TABLE "PaymentEvent" ADD COLUMN IF NOT EXISTS "previousStatus" "PaymentStatus";

-- Create index for PaymentEvent if it doesn't exist
CREATE INDEX IF NOT EXISTS "PaymentEvent_eventType_createdAt_idx" ON "PaymentEvent"("eventType", "createdAt");
