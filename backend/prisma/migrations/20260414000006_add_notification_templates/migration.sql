CREATE TABLE "NotificationTemplate" (
  "id" SERIAL NOT NULL,
  "key" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "bodyHtml" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NotificationTemplate_key_key" ON "NotificationTemplate"("key");
