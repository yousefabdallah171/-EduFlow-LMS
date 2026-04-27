-- AlterTable
ALTER TABLE "User" ADD COLUMN "adminTotpSecret" TEXT,
ADD COLUMN "adminTotpBackupCodes" TEXT[] DEFAULT ARRAY[]::TEXT[];
