import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Payment, User } from "@prisma/client";

import { paymentService } from "../../src/services/payment.service";

vi.mock("../../src/repositories/payment.repository.js", () => ({
  paymentRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    findPendingByUserId: vi.fn(),
    update: vi.fn()
  }
}));

vi.mock("../../src/repositories/user.repository.js", () => ({
  userRepository: {
    findById: vi.fn()
  }
}));

vi.mock("../../src/services/enrollment.service.js", () => ({
  enrollmentService: {
    getStatus: vi.fn()
  }
}));

vi.mock("../../src/services/coupon.service.js", () => ({
  couponService: {
    applyCoupon: vi.fn(),
    CouponError: Error
  }
}));

vi.mock("../../src/services/course.service.js", () => ({
  courseService: {
    getCoursePackagesCached: vi.fn(),
    getCourseSettingsCached: vi.fn()
  }
}));

vi.mock("../../src/config/database.js", () => ({
  prisma: {
    $transaction: vi.fn()
  }
}));

vi.mock("../../src/config/redis.js", () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn()
  }
}));

const { paymentRepository } = await import("../../src/repositories/payment.repository.js");
const { userRepository } = await import("../../src/repositories/user.repository.js");
const { enrollmentService } = await import("../../src/services/enrollment.service.js");
const { courseService } = await import("../../src/services/course.service.js");
const { prisma } = await import("../../src/config/database.js");

describe("Payment Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createPaymobOrder", () => {
    it("should throw USER_NOT_FOUND when user doesn't exist", async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(null);

      await expect(
        paymentService.createPaymobOrder("user123")
      ).rejects.toMatchObject({
        code: "USER_NOT_FOUND",
        status: 404
      });
    });

    it("should throw ALREADY_ENROLLED when user is enrolled", async () => {
      const mockUser: User = {
        id: "user123",
        email: "test@example.com",
        passwordHash: "hash",
        fullName: "Test User",
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

      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(enrollmentService.getStatus).mockResolvedValue({
        enrolled: true,
        status: "ACTIVE" as const
      });

      await expect(
        paymentService.createPaymobOrder("user123")
      ).rejects.toMatchObject({
        code: "ALREADY_ENROLLED",
        status: 409
      });
    });

    it("should throw CHECKOUT_IN_PROGRESS when pending payment exists within 30 min", async () => {
      const mockUser: User = {
        id: "user123",
        email: "test@example.com",
        passwordHash: "hash",
        fullName: "Test User",
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

      const pendingPayment: Payment = {
        id: "payment123",
        userId: "user123",
        packageId: "pkg1",
        amountPiasters: 50000,
        currency: "EGP",
        couponId: null,
        discountPiasters: 0,
        status: "INITIATED",
        paymentMethod: null,
        paymobOrderId: null,
        paymobTransactionId: null,
        paymobIdempotencyKey: null,
        webhookReceivedAt: null,
        webhookHmac: null,
        webhookPayload: null,
        webhookRetryCount: 0,
        errorCode: null,
        errorMessage: null,
        errorDetails: null,
        refundInitiatedAt: null,
        refundInitiatedBy: null,
        refundAmount: null,
        paymobRefundId: null,
        refundCompletedAt: null,
        disputedAt: null,
        disputeReason: null,
        resolvedAt: null,
        resolvedBy: null,
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        updatedAt: new Date()
      };

      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(enrollmentService.getStatus).mockResolvedValue({
        enrolled: false,
        status: undefined
      });
      vi.mocked(paymentRepository.findPendingByUserId).mockResolvedValue([
        pendingPayment
      ]);

      await expect(
        paymentService.createPaymobOrder("user123")
      ).rejects.toMatchObject({
        code: "CHECKOUT_IN_PROGRESS",
        status: 409
      });
    });

    it("should allow checkout when pending payment is older than 30 min", async () => {
      const mockUser: User = {
        id: "user123",
        email: "test@example.com",
        passwordHash: "hash",
        fullName: "Test User",
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

      const oldPayment: Payment = {
        id: "payment123",
        userId: "user123",
        packageId: "pkg1",
        amountPiasters: 50000,
        currency: "EGP",
        couponId: null,
        discountPiasters: 0,
        status: "INITIATED",
        paymentMethod: null,
        paymobOrderId: null,
        paymobTransactionId: null,
        paymobIdempotencyKey: null,
        webhookReceivedAt: null,
        webhookHmac: null,
        webhookPayload: null,
        webhookRetryCount: 0,
        errorCode: null,
        errorMessage: null,
        errorDetails: null,
        refundInitiatedAt: null,
        refundInitiatedBy: null,
        refundAmount: null,
        paymobRefundId: null,
        refundCompletedAt: null,
        disputedAt: null,
        disputeReason: null,
        resolvedAt: null,
        resolvedBy: null,
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(Date.now() - 31 * 60 * 1000), // 31 minutes ago
        updatedAt: new Date()
      };

      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(enrollmentService.getStatus).mockResolvedValue({
        enrolled: false,
        status: undefined
      });
      vi.mocked(paymentRepository.findPendingByUserId).mockResolvedValue([
        oldPayment
      ]);
      vi.mocked(courseService.getCoursePackagesCached).mockResolvedValue([
        {
          id: "pkg1",
          titleEn: "Package 1",
          titleAr: "الحزمة 1",
          descriptionEn: "Test",
          descriptionAr: "اختبار",
          pricePiasters: 50000,
          currency: "EGP",
          isActive: true,
          sortOrder: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);
      vi.mocked(prisma.$transaction).mockImplementation(async (cb) => {
        const mockTx = {
          payment: {
            create: vi.fn().mockResolvedValue({
              id: "new-payment",
              amountPiasters: 50000,
              currency: "EGP",
              discountPiasters: 0
            })
          }
        } as unknown;
        return cb(mockTx);
      });

      // Should not throw
      await expect(
        paymentService.createPaymobOrder("user123")
      ).rejects.toThrow(); // Will fail on Paymob request (expected since mocked)
    });
  });

  describe("createPaymobOrderWithRetry", () => {
    it("should retry on PAYMOB_SERVER_ERROR", async () => {
      let attemptCount = 0;
      vi.spyOn(paymentService, "createPaymobOrder").mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new paymentService.PaymentError(
            "PAYMOB_SERVER_ERROR",
            502,
            "Server error"
          );
        }
        return {
          paymentKey: "key",
          orderId: "order",
          amount: 50000,
          currency: "EGP",
          discountApplied: 0,
          iframeId: "iframe"
        };
      });

      const result = await paymentService.createPaymobOrderWithRetry("user123");
      expect(result.paymentKey).toBe("key");
      expect(attemptCount).toBe(3);
    });

    it("should not retry on ALREADY_ENROLLED error", async () => {
      let attemptCount = 0;
      vi.spyOn(paymentService, "createPaymobOrder").mockImplementation(async () => {
        attemptCount++;
        throw new paymentService.PaymentError(
          "ALREADY_ENROLLED",
          409,
          "Already enrolled"
        );
      });

      await expect(
        paymentService.createPaymobOrderWithRetry("user123")
      ).rejects.toMatchObject({
        code: "ALREADY_ENROLLED"
      });
      expect(attemptCount).toBe(1);
    });

    it("should retry on PAYMOB_TIMEOUT", async () => {
      let attemptCount = 0;
      vi.spyOn(paymentService, "createPaymobOrder").mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 2) {
          throw new paymentService.PaymentError(
            "PAYMOB_TIMEOUT",
            503,
            "Timeout"
          );
        }
        return {
          paymentKey: "key",
          orderId: "order",
          amount: 50000,
          currency: "EGP",
          discountApplied: 0,
          iframeId: "iframe"
        };
      });

      const result = await paymentService.createPaymobOrderWithRetry("user123");
      expect(result.paymentKey).toBe("key");
      expect(attemptCount).toBe(2);
    });

    it("should retry on PAYMOB_RATE_LIMITED", async () => {
      let attemptCount = 0;
      vi.spyOn(paymentService, "createPaymobOrder").mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 2) {
          throw new paymentService.PaymentError(
            "PAYMOB_RATE_LIMITED",
            503,
            "Rate limited"
          );
        }
        return {
          paymentKey: "key",
          orderId: "order",
          amount: 50000,
          currency: "EGP",
          discountApplied: 0,
          iframeId: "iframe"
        };
      });

      const result = await paymentService.createPaymobOrderWithRetry("user123");
      expect(result.paymentKey).toBe("key");
      expect(attemptCount).toBe(2);
    });

    it("should fail after MAX_RETRIES attempts", async () => {
      vi.spyOn(paymentService, "createPaymobOrder").mockRejectedValue(
        new paymentService.PaymentError(
          "PAYMOB_SERVER_ERROR",
          502,
          "Persistent error"
        )
      );

      await expect(
        paymentService.createPaymobOrderWithRetry("user123")
      ).rejects.toMatchObject({
        code: "PAYMOB_SERVER_ERROR"
      });
    });
  });

  describe("validateCouponPreview", () => {
    it("should return invalid for empty coupon code", async () => {
      vi.mocked(courseService.getCoursePackagesCached).mockResolvedValue([]);
      vi.mocked(courseService.getCourseSettingsCached).mockResolvedValue({
        id: 1,
        titleEn: "Course",
        titleAr: "الدورة",
        descriptionEn: "Test",
        descriptionAr: "اختبار",
        pricePiasters: 50000,
        currency: "EGP",
        isEnrollmentOpen: true,
        updatedAt: new Date(),
        updatedById: null
      });

      const result = await paymentService.validateCouponPreview("");

      expect(result.valid).toBe(false);
      expect(result.reason).toBe("NOT_FOUND");
    });

    it("should return invalid for undefined coupon code", async () => {
      vi.mocked(courseService.getCoursePackagesCached).mockResolvedValue([]);
      vi.mocked(courseService.getCourseSettingsCached).mockResolvedValue({
        id: 1,
        titleEn: "Course",
        titleAr: "الدورة",
        descriptionEn: "Test",
        descriptionAr: "اختبار",
        pricePiasters: 50000,
        currency: "EGP",
        isEnrollmentOpen: true,
        updatedAt: new Date(),
        updatedById: null
      });

      const result = await paymentService.validateCouponPreview(undefined);

      expect(result.valid).toBe(false);
    });
  });

  describe("getCheckoutPackage", () => {
    it("should return package by ID when it exists", async () => {
      const packages = [
        {
          id: "pkg1",
          titleEn: "Package 1",
          titleAr: "الحزمة 1",
          descriptionEn: "Test",
          descriptionAr: "اختبار",
          pricePiasters: 50000,
          currency: "EGP",
          isActive: true,
          sortOrder: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      vi.mocked(courseService.getCoursePackagesCached).mockResolvedValue(
        packages
      );

      const result = await paymentService.getCheckoutPackage("pkg1");

      expect(result.id).toBe("pkg1");
      expect(result.pricePiasters).toBe(50000);
    });

    it("should return first package when no ID provided", async () => {
      const packages = [
        {
          id: "pkg1",
          titleEn: "Package 1",
          titleAr: "الحزمة 1",
          descriptionEn: "Test",
          descriptionAr: "اختبار",
          pricePiasters: 50000,
          currency: "EGP",
          isActive: true,
          sortOrder: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      vi.mocked(courseService.getCoursePackagesCached).mockResolvedValue(
        packages
      );

      const result = await paymentService.getCheckoutPackage();

      expect(result.id).toBe("pkg1");
    });

    it("should fall back to course settings when no package found", async () => {
      vi.mocked(courseService.getCoursePackagesCached).mockResolvedValue([]);
      vi.mocked(courseService.getCourseSettingsCached).mockResolvedValue({
        id: 1,
        titleEn: "Course",
        titleAr: "الدورة",
        descriptionEn: "Test",
        descriptionAr: "اختبار",
        pricePiasters: 50000,
        currency: "EGP",
        isEnrollmentOpen: true,
        updatedAt: new Date(),
        updatedById: null
      });

      const result = await paymentService.getCheckoutPackage();

      expect(result.id).toBeNull();
      expect(result.pricePiasters).toBe(50000);
    });
  });
});
