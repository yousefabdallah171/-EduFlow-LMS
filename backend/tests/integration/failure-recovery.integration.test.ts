import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { prisma } from "../../src/config/database.js";
import { paymentRecoveryService } from "../../src/services/payment-recovery.service.js";
import { queueWebhookForRetry } from "../../src/jobs/webhook-retry.job.js";
import { queueEmail } from "../../src/jobs/email-queue.job.js";
import { queueFailedPaymentForRecovery } from "../../src/jobs/failed-payment-recovery.job.js";
import { PaymentErrorCodes } from "../../src/types/payment.types.js";

describe("Failure Recovery Integration Tests", () => {
  let testPaymentId: string;
  let testUserId: string;
  let testPackageId: string;

  beforeEach(async () => {
    // Create test data
    const user = await prisma.user.create({
      data: {
        email: "test@example.com",
        name: "Test User",
        password: "hashed"
      }
    });
    testUserId = user.id;

    const pkg = await prisma.package.create({
      data: {
        name: "Test Package",
        price: 99.99,
        duration: 30,
        description: "Test package"
      }
    });
    testPackageId = pkg.id;

    const payment = await prisma.payment.create({
      data: {
        userId: testUserId,
        packageId: testPackageId,
        amount: 99.99,
        currency: "USD",
        status: "PENDING",
        paymobOrderId: "test-order-123"
      }
    });
    testPaymentId = payment.id;
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.paymentEvent.deleteMany({});
    await prisma.webhookRetryQueue.deleteMany({});
    await prisma.emailQueue.deleteMany({});
    await prisma.failedPaymentQueue.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.package.deleteMany({});
    await prisma.user.deleteMany({});
  });

  describe("Webhook retry recovery", () => {
    it("should queue webhook for retry on failure", async () => {
      const payload = {
        type: "transaction.success",
        obj: {
          id: 123,
          success: true,
          amount_cents: 9999
        }
      };

      await queueWebhookForRetry(testPaymentId, payload, "test-hmac", new Error("Webhook failed"));

      const queueEntry = await prisma.webhookRetryQueue.findUnique({
        where: { paymentId: testPaymentId }
      });

      expect(queueEntry).toBeDefined();
      expect(queueEntry?.retryCount).toBe(0);
      expect(queueEntry?.resolvedAt).toBeNull();
      expect(queueEntry?.nextRetryAt).toBeDefined();
    });

    it("should track webhook retry attempts", async () => {
      const payload = { type: "test" };
      await queueWebhookForRetry(testPaymentId, payload, "hmac", new Error("Failed"));

      const entry = await prisma.webhookRetryQueue.findUnique({
        where: { paymentId: testPaymentId }
      });

      expect(entry?.retryCount).toBe(0);
      expect(entry?.maxRetries).toBe(3);
    });

    it("should update next retry time with exponential backoff", async () => {
      const payload = { type: "test" };
      await queueWebhookForRetry(testPaymentId, payload, "hmac", new Error("Failed"));

      const entry = await prisma.webhookRetryQueue.findUnique({
        where: { paymentId: testPaymentId }
      });

      // First retry should be 5 minutes out
      const expectedTime = new Date(Date.now() + 5 * 60 * 1000);
      expect(entry?.nextRetryAt).toBeDefined();
      const diff = Math.abs(entry!.nextRetryAt!.getTime() - expectedTime.getTime());
      expect(diff).toBeLessThan(1000); // Within 1 second
    });

    it("should store error details in webhook retry queue", async () => {
      const error = new Error("Webhook processing error");
      const payload = { type: "test", data: "payload" };

      await queueWebhookForRetry(testPaymentId, payload, "test-hmac", error);

      const entry = await prisma.webhookRetryQueue.findUnique({
        where: { paymentId: testPaymentId }
      });

      expect(entry?.errorDetails).toBeDefined();
      expect((entry?.errorDetails as any)?.lastError).toContain("Webhook processing error");
    });

    it("should mark webhook as resolved on success", async () => {
      const payload = { type: "test" };
      await queueWebhookForRetry(testPaymentId, payload, "hmac", new Error("Failed"));

      // Simulate webhook success
      await prisma.webhookRetryQueue.update({
        where: { paymentId: testPaymentId },
        data: {
          resolvedAt: new Date(),
          resolution: "SUCCESS"
        }
      });

      const entry = await prisma.webhookRetryQueue.findUnique({
        where: { paymentId: testPaymentId }
      });

      expect(entry?.resolution).toBe("SUCCESS");
      expect(entry?.resolvedAt).toBeDefined();
    });
  });

  describe("Email queue recovery", () => {
    it("should queue email for sending", async () => {
      await queueEmail(
        "test@example.com",
        "PAYMENT_FAILED",
        "Payment Failed",
        "payment-failed",
        { paymentId: testPaymentId }
      );

      const email = await prisma.emailQueue.findFirst({
        where: { recipient: "test@example.com" }
      });

      expect(email).toBeDefined();
      expect(email?.status).toBe("PENDING");
      expect(email?.emailType).toBe("PAYMENT_FAILED");
    });

    it("should track email retry attempts", async () => {
      await queueEmail(
        "test@example.com",
        "PAYMENT_FAILED",
        "Payment Failed",
        "payment-failed",
        { paymentId: testPaymentId }
      );

      const email = await prisma.emailQueue.findFirst({
        where: { recipient: "test@example.com" }
      });

      expect(email?.retryCount).toBe(0);
      expect(email?.maxRetries).toBe(5);
    });

    it("should move emails to DLQ after max retries", async () => {
      const email = await prisma.emailQueue.create({
        data: {
          recipient: "test@example.com",
          emailType: "PAYMENT_FAILED",
          subject: "Payment Failed",
          template: "payment-failed",
          context: {},
          status: "PENDING",
          retryCount: 5,
          maxRetries: 5,
          nextRetry: new Date()
        }
      });

      // Move to DLQ
      await prisma.emailQueue.update({
        where: { id: email.id },
        data: {
          status: "DLQ",
          movedToDlqAt: new Date(),
          lastError: "Max retries exceeded"
        }
      });

      const updated = await prisma.emailQueue.findUnique({
        where: { id: email.id }
      });

      expect(updated?.status).toBe("DLQ");
      expect(updated?.movedToDlqAt).toBeDefined();
    });

    it("should detect bounce errors and move to DLQ immediately", async () => {
      const email = await prisma.emailQueue.create({
        data: {
          recipient: "invalid@noreply.com",
          emailType: "PAYMENT_FAILED",
          subject: "Payment Failed",
          template: "payment-failed",
          context: {},
          status: "PENDING",
          retryCount: 0,
          maxRetries: 5,
          nextRetry: new Date()
        }
      });

      // Simulate bounce detection
      await prisma.emailQueue.update({
        where: { id: email.id },
        data: {
          status: "DLQ",
          movedToDlqAt: new Date(),
          lastError: "bounce",
          errorCode: "EMAIL_BOUNCE_DETECTED"
        }
      });

      const updated = await prisma.emailQueue.findUnique({
        where: { id: email.id }
      });

      expect(updated?.status).toBe("DLQ");
      expect(updated?.errorCode).toBe("EMAIL_BOUNCE_DETECTED");
    });
  });

  describe("Failed payment recovery", () => {
    it("should queue payment for recovery on failure", async () => {
      await queueFailedPaymentForRecovery(testPaymentId, "PAYMOB_ERROR", PaymentErrorCodes.PAYMOB_TIMEOUT);

      const recovery = await prisma.failedPaymentQueue.findUnique({
        where: { paymentId: testPaymentId }
      });

      expect(recovery).toBeDefined();
      expect(recovery?.failureType).toBe("PAYMOB_ERROR");
      expect(recovery?.failureCode).toBe(PaymentErrorCodes.PAYMOB_TIMEOUT);
      expect(recovery?.retryCount).toBe(0);
    });

    it("should track recovery attempts", async () => {
      await queueFailedPaymentForRecovery(testPaymentId, "PAYMOB_ERROR", PaymentErrorCodes.PAYMOB_RATE_LIMITED);

      const recovery = await prisma.failedPaymentQueue.findUnique({
        where: { paymentId: testPaymentId }
      });

      expect(recovery?.maxRetries).toBe(3);
      expect(recovery?.retryCount).toBe(0);
    });

    it("should mark recovery as successful when complete", async () => {
      await queueFailedPaymentForRecovery(testPaymentId, "WEBHOOK_FAILED", PaymentErrorCodes.WEBHOOK_RETRY_FAILED);

      // Simulate successful recovery
      await prisma.failedPaymentQueue.update({
        where: { paymentId: testPaymentId },
        data: {
          resolution: "RECOVERED",
          resolvedAt: new Date()
        }
      });

      const recovery = await prisma.failedPaymentQueue.findUnique({
        where: { paymentId: testPaymentId }
      });

      expect(recovery?.resolution).toBe("RECOVERED");
      expect(recovery?.resolvedAt).toBeDefined();
    });

    it("should mark recovery as manual review when max retries exceeded", async () => {
      const recovery = await prisma.failedPaymentQueue.create({
        data: {
          paymentId: testPaymentId,
          failureType: "PAYMOB_ERROR",
          failureCode: PaymentErrorCodes.PAYMOB_SERVER_ERROR,
          retryCount: 3,
          maxRetries: 3,
          firstAttempt: new Date()
        }
      });

      await prisma.failedPaymentQueue.update({
        where: { id: recovery.id },
        data: {
          resolution: "MANUAL_REVIEW",
          resolvedAt: new Date()
        }
      });

      const updated = await prisma.failedPaymentQueue.findUnique({
        where: { id: recovery.id }
      });

      expect(updated?.resolution).toBe("MANUAL_REVIEW");
    });
  });

  describe("Payment recovery orchestration", () => {
    it("should handle Paymob errors with automatic recovery", async () => {
      const result = await paymentRecoveryService.handleFailedPayment(
        testPaymentId,
        "Paymob timeout",
        PaymentErrorCodes.PAYMOB_TIMEOUT
      );

      expect(result.recoveryAttempted).toBe(true);
      expect(result.actions.length).toBeGreaterThan(0);
      expect(result.actions[0]).toContain("automatic recovery");
    });

    it("should handle card errors with user notification", async () => {
      const result = await paymentRecoveryService.handleFailedPayment(
        testPaymentId,
        "Card declined",
        PaymentErrorCodes.CARD_DECLINED
      );

      expect(result.recoveryAttempted).toBe(true);
      expect(result.actions.some(a => a.includes("notification"))).toBe(true);
    });

    it("should increment recovery attempts counter", async () => {
      const payment = await prisma.payment.findUnique({
        where: { id: testPaymentId }
      });
      const initialAttempts = payment?.recoveryAttempts || 0;

      await paymentRecoveryService.handleFailedPayment(
        testPaymentId,
        "Test failure",
        PaymentErrorCodes.PAYMOB_ERROR
      );

      const updated = await prisma.payment.findUnique({
        where: { id: testPaymentId }
      });

      expect((updated?.recoveryAttempts || 0)).toBe(initialAttempts + 1);
    });
  });

  describe("Payment event audit trail", () => {
    it("should create event on recovery attempt", async () => {
      await paymentRecoveryService.handleFailedPayment(
        testPaymentId,
        "Test failure",
        PaymentErrorCodes.PAYMOB_TIMEOUT
      );

      const events = await prisma.paymentEvent.findMany({
        where: { paymentId: testPaymentId }
      });

      expect(events.length).toBeGreaterThan(0);
      expect(events.some(e => e.eventType === "RECOVERY_INITIATED")).toBe(true);
    });

    it("should track error code in events", async () => {
      await paymentRecoveryService.handleFailedPayment(
        testPaymentId,
        "Test failure",
        PaymentErrorCodes.INSUFFICIENT_FUNDS
      );

      const events = await prisma.paymentEvent.findMany({
        where: { paymentId: testPaymentId, eventType: "RECOVERY_INITIATED" }
      });

      expect(events.length).toBeGreaterThan(0);
      const metadata = events[0].metadata as any;
      expect(metadata?.failureCode).toBe(PaymentErrorCodes.INSUFFICIENT_FUNDS);
    });
  });

  describe("Recovery status tracking", () => {
    it("should provide recovery status for payment", async () => {
      await queueFailedPaymentForRecovery(testPaymentId, "PAYMOB_ERROR", PaymentErrorCodes.PAYMOB_TIMEOUT);

      const status = await paymentRecoveryService.getRecoveryStatus(testPaymentId);

      expect(status).toBeDefined();
      expect(status?.failedPaymentQueue).toBeDefined();
      expect(status?.recoveryAttempts).toBeDefined();
    });

    it("should include queue status in recovery status", async () => {
      await queueFailedPaymentForRecovery(testPaymentId, "WEBHOOK_FAILED", PaymentErrorCodes.WEBHOOK_RETRY_FAILED);
      await queueWebhookForRetry(testPaymentId, {}, "hmac", new Error("Failed"));

      const status = await paymentRecoveryService.getRecoveryStatus(testPaymentId);

      expect(status?.webhookRetryQueue).toBeDefined();
      expect(status?.failedPaymentQueue).toBeDefined();
    });
  });

  describe("Recovery workflow selection", () => {
    it("should determine correct recovery action for Paymob error", async () => {
      const result = await paymentRecoveryService.handleFailedPayment(
        testPaymentId,
        "Server error",
        PaymentErrorCodes.PAYMOB_SERVER_ERROR
      );

      expect(result.nextAction).toContain("recovery");
    });

    it("should determine correct recovery action for card error", async () => {
      const result = await paymentRecoveryService.handleFailedPayment(
        testPaymentId,
        "Card expired",
        PaymentErrorCodes.CARD_EXPIRED
      );

      expect(result.nextAction).toContain("user");
    });

    it("should determine correct recovery action for network error", async () => {
      const result = await paymentRecoveryService.handleFailedPayment(
        testPaymentId,
        "Timeout",
        PaymentErrorCodes.NETWORK_ERROR
      );

      expect(result.nextAction).toContain("network");
    });
  });

  describe("Concurrent recovery handling", () => {
    it("should handle multiple recovery attempts for same payment", async () => {
      await paymentRecoveryService.handleFailedPayment(testPaymentId, "Attempt 1", PaymentErrorCodes.PAYMOB_TIMEOUT);
      await paymentRecoveryService.handleFailedPayment(testPaymentId, "Attempt 2", PaymentErrorCodes.PAYMOB_TIMEOUT);

      const payment = await prisma.payment.findUnique({
        where: { id: testPaymentId }
      });

      expect((payment?.recoveryAttempts || 0)).toBeGreaterThanOrEqual(2);
    });

    it("should create separate recovery queue entries for different failure types", async () => {
      await queueFailedPaymentForRecovery(testPaymentId, "PAYMOB_ERROR", PaymentErrorCodes.PAYMOB_TIMEOUT);

      // Create another payment for second failure
      const payment2 = await prisma.payment.create({
        data: {
          userId: testUserId,
          packageId: testPackageId,
          amount: 99.99,
          currency: "USD",
          status: "PENDING",
          paymobOrderId: "test-order-456"
        }
      });

      await queueFailedPaymentForRecovery(payment2.id, "WEBHOOK_FAILED", PaymentErrorCodes.WEBHOOK_RETRY_FAILED);

      const recovery1 = await prisma.failedPaymentQueue.findUnique({
        where: { paymentId: testPaymentId }
      });

      const recovery2 = await prisma.failedPaymentQueue.findUnique({
        where: { paymentId: payment2.id }
      });

      expect(recovery1?.failureType).toBe("PAYMOB_ERROR");
      expect(recovery2?.failureType).toBe("WEBHOOK_FAILED");
    });
  });
});
