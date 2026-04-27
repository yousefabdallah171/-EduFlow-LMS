-- Create FailedPaymentQueue table
CREATE TABLE "FailedPaymentQueue" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "failureType" TEXT NOT NULL,
    "failureCode" TEXT NOT NULL,
    "failureReason" TEXT NOT NULL,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "firstAttempt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAttempt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextRetry" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FailedPaymentQueue_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "FailedPaymentQueue_paymentId_key" UNIQUE ("paymentId"),
    CONSTRAINT "FailedPaymentQueue_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create EmailQueue table
CREATE TABLE "EmailQueue" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT,
    "recipient" TEXT NOT NULL,
    "emailType" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "context" JSONB NOT NULL,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 5,
    "status" TEXT NOT NULL,
    "lastError" TEXT,
    "errorCode" TEXT,
    "firstAttempt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAttempt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextRetry" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "movedToDlqAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailQueue_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "EmailQueue_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create WebhookRetryQueue table
CREATE TABLE "WebhookRetryQueue" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "errorDetails" JSONB,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "firstAttempt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAttempt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextRetry" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookRetryQueue_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "WebhookRetryQueue_paymentId_key" UNIQUE ("paymentId"),
    CONSTRAINT "WebhookRetryQueue_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create AdminAuditLog table
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "paymentId" TEXT,
    "targetId" TEXT,
    "reason" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AdminAuditLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create indexes for FailedPaymentQueue
CREATE INDEX "FailedPaymentQueue_resolvedAt_idx" ON "FailedPaymentQueue"("resolvedAt");
CREATE INDEX "FailedPaymentQueue_nextRetry_idx" ON "FailedPaymentQueue"("nextRetry");
CREATE INDEX "FailedPaymentQueue_failureType_idx" ON "FailedPaymentQueue"("failureType");

-- Create indexes for EmailQueue
CREATE INDEX "EmailQueue_status_idx" ON "EmailQueue"("status");
CREATE INDEX "EmailQueue_nextRetry_idx" ON "EmailQueue"("nextRetry");
CREATE INDEX "EmailQueue_paymentId_idx" ON "EmailQueue"("paymentId");
CREATE INDEX "EmailQueue_status_createdAt_idx" ON "EmailQueue"("status", "createdAt");

-- Create indexes for WebhookRetryQueue
CREATE INDEX "WebhookRetryQueue_nextRetry_idx" ON "WebhookRetryQueue"("nextRetry");
CREATE INDEX "WebhookRetryQueue_resolvedAt_idx" ON "WebhookRetryQueue"("resolvedAt");

-- Create indexes for AdminAuditLog
CREATE INDEX "AdminAuditLog_adminId_idx" ON "AdminAuditLog"("adminId");
CREATE INDEX "AdminAuditLog_paymentId_idx" ON "AdminAuditLog"("paymentId");
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");
CREATE INDEX "AdminAuditLog_action_createdAt_idx" ON "AdminAuditLog"("action", "createdAt");
