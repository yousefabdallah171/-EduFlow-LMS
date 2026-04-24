import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { User } from "@prisma/client";

import { prisma } from "../../src/config/database";
import { paymentService } from "../../src/services/payment.service";

describe("Webhook Integration Tests", () => {
  let testUserId: string;
  let testUser: User;

  beforeEach(async () => {
    testUser = await prisma.user.create({
      data: {
        email: `test-webhook-${Date.now()}@example.com`,
        fullName: "Test Webhook User",
        passwordHash: "hashed",
        role: "STUDENT",
        emailVerified: true
      }
    });
    testUserId = testUser.id;
  });

  afterEach(async () => {
    await prisma.paymentEvent.deleteMany({ where: { payment: { userId: testUserId } } });
    await prisma.payment.deleteMany({ where: { userId: testUserId } });
    await prisma.enrollment.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
  });

  describe("Happy Path: Complete Webhook Flow", () => {
    it("should process webhook and transition payment from WEBHOOK_PENDING to COMPLETED", async () => {
      // 1. Create payment in WEBHOOK_PENDING status
      const payment = await prisma.payment.create({
        data: {
          userId: testUserId,
          amountPiasters: 49900,
          currency: "EGP",
          status: "WEBHOOK_PENDING"
        }
      });

      // 2. Process successful webhook
      const webhookPayload = {
        obj: {
          id: 123456789,
          success: true,
          order: {
            merchant_order_id: payment.id
          }
        }
      };

      const result = await paymentService.processWebhook(webhookPayload as unknown as Record<string, unknown>, "test-hmac-123");

      // 3. Verify payment status updated to COMPLETED
      expect(result.status).toBe("COMPLETED");
      expect(result.paymobTransactionId).toBe("123456789");
      expect(result.webhookReceivedAt).toBeDefined();
      expect(result.webhookHmac).toBe("test-hmac-123");

      // 4. Verify enrollment was created
      const enrollment = await prisma.enrollment.findFirst({
        where: { userId: testUserId }
      });
      expect(enrollment).toBeDefined();
      expect(enrollment?.enrollmentType).toBe("PAID");
      expect(enrollment?.status).toBe("ACTIVE");
    });

    it("should log all events in correct sequence", async () => {
      const payment = await prisma.payment.create({
        data: {
          userId: testUserId,
          amountPiasters: 49900,
          currency: "EGP",
          status: "WEBHOOK_PENDING"
        }
      });

      const webhookPayload = {
        obj: {
          id: 123456789,
          success: true,
          order: {
            merchant_order_id: payment.id
          }
        }
      };

      await paymentService.processWebhook(webhookPayload as unknown as Record<string, unknown>, "test-hmac-123");

      // Verify events were logged
      const events = await prisma.paymentEvent.findMany({
        where: { paymentId: payment.id },
        orderBy: { createdAt: "asc" }
      });

      expect(events.length).toBeGreaterThan(0);
      // Should have WEBHOOK_RECEIVED or similar event
      const eventCodes = events.map((e) => e.eventType);
      expect(eventCodes).toContain("WEBHOOK_RECEIVED");
    });
  });

  describe("Duplicate Webhook Handling", () => {
    it("should return same payment on duplicate webhook", async () => {
      // 1. Create and process first webhook
      const payment = await prisma.payment.create({
        data: {
          userId: testUserId,
          amountPiasters: 49900,
          currency: "EGP",
          status: "WEBHOOK_PENDING"
        }
      });

      const webhookPayload = {
        obj: {
          id: 123456789,
          success: true,
          order: {
            merchant_order_id: payment.id
          }
        }
      };

      const result1 = await paymentService.processWebhook(webhookPayload as unknown as Record<string, unknown>, "test-hmac-123");

      // 2. Count enrollments after first webhook
      const enrollmentsAfterFirst = await prisma.enrollment.count({
        where: { userId: testUserId }
      });

      // 3. Send identical webhook again
      const result2 = await paymentService.processWebhook(webhookPayload as unknown as Record<string, unknown>, "test-hmac-123");

      // 4. Verify same payment returned
      expect(result2.id).toBe(result1.id);
      expect(result2.status).toBe("COMPLETED");

      // 5. Verify no duplicate enrollment created
      const enrollmentsAfterSecond = await prisma.enrollment.count({
        where: { userId: testUserId }
      });

      expect(enrollmentsAfterSecond).toBe(enrollmentsAfterFirst);
    });
  });

  describe("Webhook with Failed Payment Status", () => {
    it("should update payment to FAILED when webhook success is false", async () => {
      const payment = await prisma.payment.create({
        data: {
          userId: testUserId,
          amountPiasters: 49900,
          currency: "EGP",
          status: "WEBHOOK_PENDING"
        }
      });

      const webhookPayload = {
        obj: {
          id: 123456789,
          success: false,
          order: {
            merchant_order_id: payment.id
          }
        }
      };

      const result = await paymentService.processWebhook(webhookPayload as unknown as Record<string, unknown>, "test-hmac-123");

      expect(result.status).toBe("FAILED");
    });

    it("should not create enrollment on failed payment", async () => {
      const payment = await prisma.payment.create({
        data: {
          userId: testUserId,
          amountPiasters: 49900,
          currency: "EGP",
          status: "WEBHOOK_PENDING"
        }
      });

      const webhookPayload = {
        obj: {
          id: 123456789,
          success: false,
          order: {
            merchant_order_id: payment.id
          }
        }
      };

      await paymentService.processWebhook(webhookPayload as unknown as Record<string, unknown>, "test-hmac-123");

      const enrollment = await prisma.enrollment.findFirst({
        where: { userId: testUserId }
      });

      expect(enrollment).toBeUndefined();
    });
  });

  describe("Webhook with Invalid Payload", () => {
    it("should throw error when obj is missing", async () => {
      const webhookPayload = {
        obj: undefined
      };

      await expect(
        paymentService.processWebhook(webhookPayload as unknown as Record<string, unknown>, "test-hmac")
      ).rejects.toMatchObject({
        code: "INVALID_WEBHOOK_PAYLOAD",
        status: 400
      });
    });

    it("should throw error when transaction ID is missing", async () => {
      const webhookPayload = {
        obj: {
          success: true,
          order: {
            merchant_order_id: "payment_123"
          }
        }
      };

      await expect(
        paymentService.processWebhook(webhookPayload as unknown as Record<string, unknown>, "test-hmac")
      ).rejects.toMatchObject({
        code: "INVALID_WEBHOOK_PAYLOAD",
        status: 400
      });
    });

    it("should throw error when merchant_order_id is missing", async () => {
      const webhookPayload = {
        obj: {
          id: 123456789,
          success: true,
          order: {}
        }
      };

      await expect(
        paymentService.processWebhook(webhookPayload as unknown as Record<string, unknown>, "test-hmac")
      ).rejects.toMatchObject({
        code: "INVALID_WEBHOOK_PAYLOAD",
        status: 400
      });
    });

    it("should throw PAYMENT_NOT_FOUND when payment doesn't exist", async () => {
      const webhookPayload = {
        obj: {
          id: 123456789,
          success: true,
          order: {
            merchant_order_id: "nonexistent_payment"
          }
        }
      };

      await expect(
        paymentService.processWebhook(webhookPayload as unknown as Record<string, unknown>, "test-hmac")
      ).rejects.toMatchObject({
        code: "PAYMENT_NOT_FOUND",
        status: 404
      });
    });
  });

  describe("Webhook with Coupon", () => {
    it("should increment coupon uses on successful payment with coupon", async () => {
      // Create coupon
      const coupon = await prisma.coupon.create({
        data: {
          code: "TEST_WEBHOOK_COUPON",
          discountPercent: 10,
          discountType: "PERCENT",
          validFrom: new Date(),
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });

      // Create payment with coupon
      const payment = await prisma.payment.create({
        data: {
          userId: testUserId,
          couponId: coupon.id,
          amountPiasters: 49900,
          currency: "EGP",
          status: "WEBHOOK_PENDING"
        }
      });

      const initialUses = coupon.currentUses;

      const webhookPayload = {
        obj: {
          id: 123456789,
          success: true,
          order: {
            merchant_order_id: payment.id
          }
        }
      };

      await paymentService.processWebhook(webhookPayload as unknown as Record<string, unknown>, "test-hmac-123");

      // Verify coupon uses incremented
      const updatedCoupon = await prisma.coupon.findUnique({
        where: { id: coupon.id }
      });

      expect(updatedCoupon?.currentUses).toBe(initialUses + 1);
    });
  });

  describe("Database Consistency", () => {
    it("should maintain database consistency after webhook processing", async () => {
      const payment = await prisma.payment.create({
        data: {
          userId: testUserId,
          amountPiasters: 49900,
          currency: "EGP",
          status: "WEBHOOK_PENDING"
        }
      });

      const webhookPayload = {
        obj: {
          id: 123456789,
          success: true,
          order: {
            merchant_order_id: payment.id
          }
        }
      };

      await paymentService.processWebhook(webhookPayload as unknown as Record<string, unknown>, "test-hmac-123");

      // Verify payment can be retrieved
      const retrievedPayment = await prisma.payment.findUnique({
        where: { id: payment.id }
      });

      expect(retrievedPayment).toBeDefined();
      expect(retrievedPayment?.status).toBe("COMPLETED");
      expect(retrievedPayment?.paymobTransactionId).toBe("123456789");
    });

    it("should handle webhook for payment with all fields", async () => {
      const payment = await prisma.payment.create({
        data: {
          userId: testUserId,
          amountPiasters: 49900,
          currency: "EGP",
          status: "WEBHOOK_PENDING",
          paymobOrderId: "order_123"
        }
      });

      const webhookPayload = {
        obj: {
          id: 987654321,
          success: true,
          order: {
            merchant_order_id: payment.id
          }
        }
      };

      const result = await paymentService.processWebhook(webhookPayload as unknown as Record<string, unknown>, "test-hmac-456");

      expect(result.status).toBe("COMPLETED");
      expect(result.paymobOrderId).toBe("order_123");
      expect(result.userId).toBe(testUserId);
    });
  });
});
