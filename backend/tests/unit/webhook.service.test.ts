import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Payment, User } from "@prisma/client";

import { paymentService } from "../../src/services/payment.service";

vi.mock("../../src/repositories/payment.repository.js", () => ({
  paymentRepository: {
    findById: vi.fn(),
    findByPaymobTxId: vi.fn(),
    updateStatus: vi.fn()
  }
}));

vi.mock("../../src/repositories/user.repository.js", () => ({
  userRepository: {
    findById: vi.fn()
  }
}));

vi.mock("../../src/repositories/coupon.repository.js", () => ({
  couponRepository: {
    incrementUses: vi.fn()
  }
}));

vi.mock("../../src/services/enrollment.service.js", () => ({
  enrollmentService: {
    enroll: vi.fn()
  }
}));

vi.mock("../../src/services/coupon.service.js", () => ({
  couponService: {
    invalidateCouponCache: vi.fn()
  }
}));

vi.mock("../../src/config/redis.js", () => ({
  redis: {
    del: vi.fn()
  }
}));

vi.mock("../../src/utils/email.js", () => ({
  sendPaymentReceiptEmail: vi.fn(),
  sendEnrollmentActivatedEmail: vi.fn()
}));

const { paymentRepository } = await import("../../src/repositories/payment.repository.js");
const { userRepository } = await import("../../src/repositories/user.repository.js");
const { couponRepository } = await import("../../src/repositories/coupon.repository.js");
const { enrollmentService } = await import("../../src/services/enrollment.service.js");
const { couponService } = await import("../../src/services/coupon.service.js");
const { sendPaymentReceiptEmail, sendEnrollmentActivatedEmail } = await import("../../src/utils/email.js");

describe("Webhook Service - processWebhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockPayment: Payment = {
    id: "payment_123",
    userId: "user_123",
    couponId: null,
    amountPiasters: 49900,
    currency: "EGP",
    status: "WEBHOOK_PENDING",
    paymobTransactionId: null,
    paymobOrderId: "order_123",
    errorCode: null,
    errorMessage: null,
    errorDetails: null,
    webhookReceivedAt: null,
    webhookHmac: null,
    createdAt: new Date("2026-04-24T10:00:00Z"),
    updatedAt: new Date("2026-04-24T10:00:00Z")
  };

  const mockUser: User = {
    id: "user_123",
    email: "student@example.com",
    passwordHash: "hash",
    fullName: "John Student",
    avatarUrl: null,
    role: "STUDENT",
    locale: "en",
    theme: "light",
    oauthProvider: "email",
    oauthId: null,
    emailVerified: true,
    emailVerifyToken: null,
    emailVerifyExpires: null,
    passwordResetToken: null,
    passwordResetExpires: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const validWebhookPayload = {
    obj: {
      id: 987654321,
      success: true,
      order: {
        merchant_order_id: "payment_123"
      }
    }
  };

  describe("Valid Webhook Processing", () => {
    it("should process successful webhook and update payment to COMPLETED", async () => {
      const completedPayment = { ...mockPayment, status: "COMPLETED" as const };

      vi.mocked(paymentRepository.findByPaymobTxId).mockResolvedValue(null);
      vi.mocked(paymentRepository.findById).mockResolvedValue(mockPayment);
      vi.mocked(paymentRepository.updateStatus).mockResolvedValue(completedPayment);
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(enrollmentService.enroll).mockResolvedValue(undefined);

      const result = await paymentService.processWebhook(validWebhookPayload as unknown as Record<string, unknown>, "test-hmac");

      expect(result.status).toBe("COMPLETED");
      expect(paymentRepository.updateStatus).toHaveBeenCalledWith("payment_123", "COMPLETED", {
        paymobTransactionId: "987654321",
        webhookReceivedAt: expect.any(Date),
        webhookHmac: "test-hmac"
      });
    });

    it("should trigger enrollment on successful payment", async () => {
      const completedPayment = { ...mockPayment, status: "COMPLETED" as const };

      vi.mocked(paymentRepository.findByPaymobTxId).mockResolvedValue(null);
      vi.mocked(paymentRepository.findById).mockResolvedValue(mockPayment);
      vi.mocked(paymentRepository.updateStatus).mockResolvedValue(completedPayment);
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(enrollmentService.enroll).mockResolvedValue(undefined);

      await paymentService.processWebhook(validWebhookPayload as unknown as Record<string, unknown>, "test-hmac");

      expect(enrollmentService.enroll).toHaveBeenCalledWith("user_123", "PAID", "payment_123");
    });

    it("should send emails on successful payment", async () => {
      const completedPayment = { ...mockPayment, status: "COMPLETED" as const };

      vi.mocked(paymentRepository.findByPaymobTxId).mockResolvedValue(null);
      vi.mocked(paymentRepository.findById).mockResolvedValue(mockPayment);
      vi.mocked(paymentRepository.updateStatus).mockResolvedValue(completedPayment);
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(enrollmentService.enroll).mockResolvedValue(undefined);

      await paymentService.processWebhook(validWebhookPayload as unknown as Record<string, unknown>, "test-hmac");

      expect(sendPaymentReceiptEmail).toHaveBeenCalledWith(expect.objectContaining({
        to: "student@example.com",
        fullName: "John Student",
        paymentId: "payment_123",
        amountEgp: 499
      }));

      expect(sendEnrollmentActivatedEmail).toHaveBeenCalledWith(
        "student@example.com",
        "John Student",
        expect.stringContaining("/dashboard")
      );
    });
  });

  describe("Duplicate Webhook Handling", () => {
    it("should return existing payment on duplicate webhook (by transaction ID)", async () => {
      const existingCompletedPayment = { ...mockPayment, status: "COMPLETED" as const, paymobTransactionId: "987654321" };

      vi.mocked(paymentRepository.findByPaymobTxId).mockResolvedValue(existingCompletedPayment);

      const result = await paymentService.processWebhook(validWebhookPayload as unknown as Record<string, unknown>, "test-hmac");

      expect(result).toEqual(existingCompletedPayment);
      expect(paymentRepository.updateStatus).not.toHaveBeenCalled();
      expect(enrollmentService.enroll).not.toHaveBeenCalled();
    });

    it("should not create duplicate enrollment on duplicate webhook", async () => {
      const existingCompletedPayment = { ...mockPayment, status: "COMPLETED" as const, paymobTransactionId: "987654321" };

      vi.mocked(paymentRepository.findByPaymobTxId).mockResolvedValue(existingCompletedPayment);

      await paymentService.processWebhook(validWebhookPayload as unknown as Record<string, unknown>, "test-hmac");

      expect(enrollmentService.enroll).not.toHaveBeenCalled();
    });
  });

  describe("Failed Payment Webhook", () => {
    it("should update payment to FAILED status when webhook success is false", async () => {
      const failedPayload = {
        obj: {
          id: 987654321,
          success: false,
          order: {
            merchant_order_id: "payment_123"
          }
        }
      };

      const failedPayment = { ...mockPayment, status: "FAILED" as const };

      vi.mocked(paymentRepository.findByPaymobTxId).mockResolvedValue(null);
      vi.mocked(paymentRepository.findById).mockResolvedValue(mockPayment);
      vi.mocked(paymentRepository.updateStatus).mockResolvedValue(failedPayment);

      const result = await paymentService.processWebhook(failedPayload as unknown as Record<string, unknown>, "test-hmac");

      expect(result.status).toBe("FAILED");
      expect(paymentRepository.updateStatus).toHaveBeenCalledWith("payment_123", "FAILED", expect.any(Object));
    });

    it("should not trigger enrollment on failed payment", async () => {
      const failedPayload = {
        obj: {
          id: 987654321,
          success: false,
          order: {
            merchant_order_id: "payment_123"
          }
        }
      };

      const failedPayment = { ...mockPayment, status: "FAILED" as const };

      vi.mocked(paymentRepository.findByPaymobTxId).mockResolvedValue(null);
      vi.mocked(paymentRepository.findById).mockResolvedValue(mockPayment);
      vi.mocked(paymentRepository.updateStatus).mockResolvedValue(failedPayment);

      await paymentService.processWebhook(failedPayload as unknown as Record<string, unknown>, "test-hmac");

      expect(enrollmentService.enroll).not.toHaveBeenCalled();
    });

    it("should not send emails on failed payment", async () => {
      const failedPayload = {
        obj: {
          id: 987654321,
          success: false,
          order: {
            merchant_order_id: "payment_123"
          }
        }
      };

      const failedPayment = { ...mockPayment, status: "FAILED" as const };

      vi.mocked(paymentRepository.findByPaymobTxId).mockResolvedValue(null);
      vi.mocked(paymentRepository.findById).mockResolvedValue(mockPayment);
      vi.mocked(paymentRepository.updateStatus).mockResolvedValue(failedPayment);

      await paymentService.processWebhook(failedPayload as unknown as Record<string, unknown>, "test-hmac");

      expect(sendPaymentReceiptEmail).not.toHaveBeenCalled();
      expect(sendEnrollmentActivatedEmail).not.toHaveBeenCalled();
    });
  });

  describe("Missing Data Validation", () => {
    it("should throw INVALID_WEBHOOK_PAYLOAD when obj is missing", async () => {
      const invalidPayload = { obj: undefined };

      await expect(
        paymentService.processWebhook(invalidPayload as unknown as Record<string, unknown>, "test-hmac")
      ).rejects.toMatchObject({
        code: "INVALID_WEBHOOK_PAYLOAD",
        status: 400
      });
    });

    it("should throw INVALID_WEBHOOK_PAYLOAD when transaction.id is missing", async () => {
      const invalidPayload = {
        obj: {
          success: true,
          order: {
            merchant_order_id: "payment_123"
          }
        }
      };

      await expect(
        paymentService.processWebhook(invalidPayload as unknown as Record<string, unknown>, "test-hmac")
      ).rejects.toMatchObject({
        code: "INVALID_WEBHOOK_PAYLOAD",
        status: 400
      });
    });

    it("should throw INVALID_WEBHOOK_PAYLOAD when merchant_order_id is missing", async () => {
      const invalidPayload = {
        obj: {
          id: 987654321,
          success: true,
          order: {}
        }
      };

      await expect(
        paymentService.processWebhook(invalidPayload as unknown as Record<string, unknown>, "test-hmac")
      ).rejects.toMatchObject({
        code: "INVALID_WEBHOOK_PAYLOAD",
        status: 400
      });
    });

    it("should throw PAYMENT_NOT_FOUND when payment doesn't exist", async () => {
      vi.mocked(paymentRepository.findByPaymobTxId).mockResolvedValue(null);
      vi.mocked(paymentRepository.findById).mockResolvedValue(null);

      await expect(
        paymentService.processWebhook(validWebhookPayload as unknown as Record<string, unknown>, "test-hmac")
      ).rejects.toMatchObject({
        code: "PAYMENT_NOT_FOUND",
        status: 404
      });
    });
  });

  describe("Coupon Use Increment", () => {
    it("should increment coupon uses on successful payment when couponId exists", async () => {
      const paymentWithCoupon = { ...mockPayment, couponId: "coupon_123" };
      const completedPayment = { ...paymentWithCoupon, status: "COMPLETED" as const };

      vi.mocked(paymentRepository.findByPaymobTxId).mockResolvedValue(null);
      vi.mocked(paymentRepository.findById).mockResolvedValue(paymentWithCoupon);
      vi.mocked(paymentRepository.updateStatus).mockResolvedValue(completedPayment);
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(enrollmentService.enroll).mockResolvedValue(undefined);

      await paymentService.processWebhook(validWebhookPayload as unknown as Record<string, unknown>, "test-hmac");

      expect(couponRepository.incrementUses).toHaveBeenCalledWith("coupon_123");
      expect(couponService.invalidateCouponCache).toHaveBeenCalled();
    });

    it("should not increment coupon uses on failed payment", async () => {
      const failedPayload = {
        obj: {
          id: 987654321,
          success: false,
          order: {
            merchant_order_id: "payment_123"
          }
        }
      };

      const paymentWithCoupon = { ...mockPayment, couponId: "coupon_123" };
      const failedPayment = { ...paymentWithCoupon, status: "FAILED" as const };

      vi.mocked(paymentRepository.findByPaymobTxId).mockResolvedValue(null);
      vi.mocked(paymentRepository.findById).mockResolvedValue(paymentWithCoupon);
      vi.mocked(paymentRepository.updateStatus).mockResolvedValue(failedPayment);

      await paymentService.processWebhook(failedPayload as unknown as Record<string, unknown>, "test-hmac");

      expect(couponRepository.incrementUses).not.toHaveBeenCalled();
    });
  });

  describe("Email Error Handling", () => {
    it("should not block webhook processing on email errors", async () => {
      const completedPayment = { ...mockPayment, status: "COMPLETED" as const };

      vi.mocked(paymentRepository.findByPaymobTxId).mockResolvedValue(null);
      vi.mocked(paymentRepository.findById).mockResolvedValue(mockPayment);
      vi.mocked(paymentRepository.updateStatus).mockResolvedValue(completedPayment);
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(enrollmentService.enroll).mockResolvedValue(undefined);
      vi.mocked(sendPaymentReceiptEmail).mockRejectedValue(new Error("Email service error"));

      const result = await paymentService.processWebhook(validWebhookPayload as unknown as Record<string, unknown>, "test-hmac");

      expect(result.status).toBe("COMPLETED");
      expect(enrollmentService.enroll).toHaveBeenCalled();
    });

    it("should handle user not found when sending emails", async () => {
      const completedPayment = { ...mockPayment, status: "COMPLETED" as const };

      vi.mocked(paymentRepository.findByPaymobTxId).mockResolvedValue(null);
      vi.mocked(paymentRepository.findById).mockResolvedValue(mockPayment);
      vi.mocked(paymentRepository.updateStatus).mockResolvedValue(completedPayment);
      vi.mocked(userRepository.findById).mockResolvedValue(null);
      vi.mocked(enrollmentService.enroll).mockResolvedValue(undefined);

      const result = await paymentService.processWebhook(validWebhookPayload as unknown as Record<string, unknown>, "test-hmac");

      expect(result.status).toBe("COMPLETED");
      expect(sendPaymentReceiptEmail).not.toHaveBeenCalled();
    });
  });
});
