-- Create course packages so pricing can support multiple purchasable plans.
CREATE TABLE "CoursePackage" (
    "id" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "descriptionEn" TEXT,
    "descriptionAr" TEXT,
    "pricePiasters" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoursePackage_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Payment" ADD COLUMN "packageId" TEXT;

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_packageId_fkey"
FOREIGN KEY ("packageId") REFERENCES "CoursePackage"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
