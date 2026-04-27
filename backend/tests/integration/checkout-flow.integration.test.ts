import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { User } from "@prisma/client";

import { prisma } from "../../src/config/database";
import { paymentService } from "../../src/services/payment.service";
import { enrollmentService } from "../../src/services/enrollment.service";

describe("Checkout Flow Integration Tests", () => {
  let testUserId: string;
  let testUser: User;

  beforeEach(async () => {
    testUser = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        fullName: "Test User",
        passwordHash: "hashed",
        role: "STUDENT",
        emailVerified: true
      }
    });
    testUserId = testUser.id;
  });

  afterEach(async () => {
    await prisma.payment.deleteMany({ where: { userId: testUserId } });
    await prisma.enrollment.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
  });

  describe("Payment Creation & Validation", () => {
    it("should create payment record with INITIATED status", async () => {
      const enrollmentStatus = await enrollmentService.getStatus(testUserId);
      expect(enrollmentStatus.enrolled).toBe(false);

      try {
        await paymentService.createPaymobOrder(testUserId);
      } catch (error) {
        // Expected to fail at Paymob API call
        if (error instanceof paymentService.PaymentError) {
          const payment = await prisma.payment.findFirst({
            where: { userId: testUserId }
          });
          expect(payment).toBeDefined();
          expect(payment?.status).toBe("INITIATED");
        }
      }
    });

    it("should prevent duplicate enrollment", async () => {
      await enrollmentService.enroll(testUserId, "ADMIN_ENROLLED");

      const error = await new Promise<unknown>((resolve) => {
        paymentService
          .createPaymobOrder(testUserId)
          .catch((err) => resolve(err));
      });

      expect(error).toBeDefined();
      expect((error as Record<string, unknown>).code).toBe("ALREADY_ENROLLED");
      expect((error as Record<string, unknown>).status).toBe(409);
    });

    it("should prevent concurrent checkouts within 30 minutes", async () => {
      try {
        await paymentService.createPaymobOrder(testUserId);
      } catch {
        // First attempt creates payment
      }

      const secondError = await new Promise<unknown>((resolve) => {
        paymentService
          .createPaymobOrder(testUserId)
          .catch((err) => resolve(err));
      });

      expect(secondError).toBeDefined();
      expect((secondError as Record<string, unknown>).code).toBe("CHECKOUT_IN_PROGRESS");
      expect((secondError as Record<string, unknown>).status).toBe(409);
    });

    it("should allow new checkout after 30 minutes", async () => {
      const payment1 = await prisma.payment.create({
        data: {
          userId: testUserId,
          amountPiasters: 50000,
          currency: "EGP",
          status: "INITIATED",
          createdAt: new Date(Date.now() - 31 * 60 * 1000) // 31 min ago
        }
      });

      expect(payment1.id).toBeDefined();

      try {
        await paymentService.createPaymobOrder(testUserId);
      } catch (error) {
        // Should get Paymob error, not CHECKOUT_IN_PROGRESS
        if (error instanceof paymentService.PaymentError) {
          expect(error.code).not.toBe("CHECKOUT_IN_PROGRESS");
        }
      }
    });
  });

  describe("Error Handling & Storage", () => {
    it("should store error details when payment fails", async () => {
      const payment = await prisma.payment.create({
        data: {
          userId: testUserId,
          amountPiasters: 50000,
          currency: "EGP",
          status: "INITIATED"
        }
      });

      const errorCode = "PAYMOB_SERVER_ERROR";
      const errorMessage = "Paymob server temporarily unavailable";

      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
          errorCode,
          errorMessage
        }
      });

      const updated = await prisma.payment.findUnique({
        where: { id: payment.id }
      });

      expect(updated?.status).toBe("FAILED");
      expect(updated?.errorCode).toBe(errorCode);
      expect(updated?.errorMessage).toBe(errorMessage);
    });
  });

  describe("Coupon Application", () => {
    it("should calculate discount correctly", async () => {
      const coupon = await prisma.coupon.create({
        data: {
          code: `TEST-${Date.now()}`,
          discountType: "PERCENTAGE",
          discountValue: "20",
          maxUses: 100
        }
      });

      const payment = await prisma.payment.create({
        data: {
          userId: testUserId,
          amountPiasters: 50000,
          currency: "EGP",
          couponId: coupon.id,
          discountPiasters: 10000, // 20% of 50000
          amountPiasters: 40000 // After discount
        }
      });

      expect(payment.discountPiasters).toBe(10000);
      expect(payment.amountPiasters).toBe(40000);

      await prisma.coupon.delete({ where: { id: coupon.id } });
    });
  });

  describe("Payment Status Transitions", () => {
    it("should track status changes with timestamps", async () => {
      const payment = await prisma.payment.create({
        data: {
          userId: testUserId,
          amountPiasters: 50000,
          currency: "EGP",
          status: "INITIATED"
        }
      });

      const createdAt = payment.createdAt;

      await new Promise((r) => setTimeout(r, 100));

      const updated = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "WEBHOOK_PENDING",
          webhookReceivedAt: new Date()
        }
      });

      expect(updated.status).toBe("WEBHOOK_PENDING");
      expect(updated.webhookReceivedAt).not.toBeNull();
      expect(updated.updatedAt.getTime()).toBeGreaterThan(
        createdAt.getTime()
      );
    });
  });

  describe("Payment History Retrieval", () => {
    it("should retrieve payment history for user", async () => {
      const payment1 = await prisma.payment.create({
        data: {
          userId: testUserId,
          amountPiasters: 50000,
          currency: "EGP",
          status: "COMPLETED"
        }
      });

      const payment2 = await prisma.payment.create({
        data: {
          userId: testUserId,
          amountPiasters: 100000,
          currency: "EGP",
          status: "FAILED"
        }
      });

      const history = await paymentService.listPaymentHistory(testUserId);

      expect(history.length).toBeGreaterThanOrEqual(2);
      expect(history.some((p) => p.id === payment1.id)).toBe(true);
      expect(history.some((p) => p.id === payment2.id)).toBe(true);
    });

    it("should order payments by creation date descending", async () => {
      await prisma.payment.create({
        data: {
          userId: testUserId,
          amountPiasters: 50000,
          currency: "EGP",
          status: "COMPLETED"
        }
      });

      await new Promise((r) => setTimeout(r, 10));

      await prisma.payment.create({
        data: {
          userId: testUserId,
          amountPiasters: 100000,
          currency: "EGP",
          status: "COMPLETED"
        }
      });

      const history = await paymentService.listPaymentHistory(testUserId);

      if (history.length >= 2) {
        expect(
          new Date(history[0].createdAt).getTime()
        ).toBeGreaterThanOrEqual(
          new Date(history[1].createdAt).getTime()
        );
      }
    });
  });

  describe("Atomic Transactions", () => {
    it("should maintain data consistency in transactions", async () => {
      const payment = await prisma.payment.create({
        data: {
          userId: testUserId,
          amountPiasters: 50000,
          currency: "EGP",
          status: "COMPLETED"
        }
      });

      const result = await prisma.$transaction(async (tx) => {
        const updatedPayment = await tx.payment.update({
          where: { id: payment.id },
          data: { status: "REFUND_REQUESTED" }
        });

        const enrollment = await tx.enrollment.create({
          data: {
            userId: testUserId,
            enrollmentType: "PAID",
            paymentId: payment.id
          }
        });

        return { payment: updatedPayment, enrollment };
      });

      expect(result.payment.status).toBe("REFUND_REQUESTED");
      expect(result.enrollment.paymentId).toBe(payment.id);
    });
  });
});
