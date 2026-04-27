-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CARD', 'MOBILE_WALLET', 'BANK_TRANSFER');

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "paymentMethod" "PaymentMethod";
