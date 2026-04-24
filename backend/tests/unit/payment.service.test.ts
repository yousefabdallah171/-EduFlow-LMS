import { describe, it, expect, beforeEach, vi } from "vitest";
import { paymentService } from "@/services/payment.service";
import { paymentRepository } from "@/repositories/payment.repository";
import { userRepository } from "@/repositories/user.repository";
import { enrollmentService } from "@/services/enrollment.service";
import { couponService } from "@/services/coupon.service";
import { courseService } from "@/services/course.service";
import { redis } from "@/config/redis";
import { prisma } from "@/config/database";

vi.mock("@/repositories/payment.repository");
vi.mock("@/repositories/user.repository");
vi.mock("@/services/enrollment.service");
vi.mock("@/services/coupon.service");
vi.mock("@/services/course.service");
vi.mock("@/config/redis");
vi.mock("@/config/database");
vi.mock("@/utils/email");

describe("PaymentService", () => {
  const mockUser = {
    id: "user-123",
    email: "student@test.com",
    fullName: "John Doe"
  };

  const mockPackage = {
    id: "pkg-123",
    pricePiasters: 50000,
    currency: "EGP"
  };

  const mockPayment = {
    id: "payment-123",
    userId: "user-123",
    amountPiasters: 50000,
    discountPiasters: 0,
    status: "INITIATED"
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createPaymobOrder", () => {
    it("should create payment successfully with all Paymob API calls", async () => {
      vi.spyOn(userRepository, "findById").mockResolvedValueOnce(mockUser);
      vi.spyOn(enrollmentService, "getStatus").mockResolvedValueOnce({
        enrolled: false
      });
      vi.spyOn(paymentRepository, "findPendingByUserId").mockResolvedValueOnce(
        []
      );
      vi.spyOn(courseService, "getCoursePackagesCached").mockResolvedValueOnce(
        [mockPackage]
      );
      vi.spyOn(prisma, "$transaction").mockResolvedValueOnce(mockPayment);
      vi.spyOn(paymentRepository, "update").mockResolvedValueOnce(mockPayment);
      vi.spyOn(redis, "del").mockResolvedValueOnce(1);

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: "auth-token" })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 123456 })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: "payment-key-token" })
        });

      const result = await paymentService.createPaymobOrder(
        "user-123",
        undefined,
        "pkg-123"
      );

      expect(result).toEqual(
        expect.objectContaining({
          paymentKey: "payment-key-token",
          orderId: "payment-123",
          amount: 50000,
          currency: "EGP"
        })
      );
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it("should throw USER_NOT_FOUND when user doesn't exist", async () => {
      vi.spyOn(userRepository, "findById").mockResolvedValueOnce(null);

      expect(
        paymentService.createPaymobOrder("nonexistent")
      ).rejects.toThrow("Student not found");
    });

    it("should throw ALREADY_ENROLLED when user is enrolled", async () => {
      vi.spyOn(userRepository, "findById").mockResolvedValueOnce(mockUser);
      vi.spyOn(enrollmentService, "getStatus").mockResolvedValueOnce({
        enrolled: true
      });

      expect(
        paymentService.createPaymobOrder("user-123")
      ).rejects.toThrow("Student is already enrolled");
    });

    it("should throw CHECKOUT_IN_PROGRESS when user has pending payment within 30 minutes", async () => {
      const recentPayment = {
        ...mockPayment,
        createdAt: new Date(Date.now() - 10 * 60 * 1000)
      };

      vi.spyOn(userRepository, "findById").mockResolvedValueOnce(mockUser);
      vi.spyOn(enrollmentService, "getStatus").mockResolvedValueOnce({
        enrolled: false
      });
      vi.spyOn(paymentRepository, "findPendingByUserId").mockResolvedValueOnce(
        [recentPayment]
      );

      expect(
        paymentService.createPaymobOrder("user-123")
      ).rejects.toThrow("You have a checkout in progress");
    });

    it("should allow new checkout after 30 minutes", async () => {
      const oldPayment = {
        ...mockPayment,
        createdAt: new Date(Date.now() - 35 * 60 * 1000)
      };

      vi.spyOn(userRepository, "findById").mockResolvedValueOnce(mockUser);
      vi.spyOn(enrollmentService, "getStatus").mockResolvedValueOnce({
        enrolled: false
      });
      vi.spyOn(paymentRepository, "findPendingByUserId").mockResolvedValueOnce(
        [oldPayment]
      );
      vi.spyOn(courseService, "getCoursePackagesCached").mockResolvedValueOnce(
        [mockPackage]
      );
      vi.spyOn(prisma, "$transaction").mockResolvedValueOnce(mockPayment);
      vi.spyOn(paymentRepository, "update").mockResolvedValueOnce(mockPayment);
      vi.spyOn(redis, "del").mockResolvedValueOnce(1);

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: "auth-token" })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 123456 })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: "payment-key-token" })
        });

      const result = await paymentService.createPaymobOrder("user-123");

      expect(result).toBeDefined();
      expect(result.paymentKey).toBe("payment-key-token");
    });

    it("should throw INVALID_COUPON when coupon is invalid", async () => {
      vi.spyOn(userRepository, "findById").mockResolvedValueOnce(mockUser);
      vi.spyOn(enrollmentService, "getStatus").mockResolvedValueOnce({
        enrolled: false
      });
      vi.spyOn(paymentRepository, "findPendingByUserId").mockResolvedValueOnce(
        []
      );
      vi.spyOn(courseService, "getCoursePackagesCached").mockResolvedValueOnce(
        [mockPackage]
      );

      const couponError = new Error("Coupon expired");
      (couponError as any).constructor = { name: "CouponError" };
      vi.spyOn(couponService, "applyCoupon").mockRejectedValueOnce(couponError);
      vi.spyOn(prisma, "$transaction").mockImplementationOnce(async (fn) => {
        return fn(prisma);
      });

      expect(
        paymentService.createPaymobOrder("user-123", "INVALID_CODE")
      ).rejects.toThrow("This coupon is expired or has reached its usage limit");
    });

    it("should handle Paymob 401 auth failure", async () => {
      vi.spyOn(userRepository, "findById").mockResolvedValueOnce(mockUser);
      vi.spyOn(enrollmentService, "getStatus").mockResolvedValueOnce({
        enrolled: false
      });
      vi.spyOn(paymentRepository, "findPendingByUserId").mockResolvedValueOnce(
        []
      );
      vi.spyOn(courseService, "getCoursePackagesCached").mockResolvedValueOnce(
        [mockPackage]
      );
      vi.spyOn(prisma, "$transaction").mockResolvedValueOnce(mockPayment);
      vi.spyOn(redis, "del").mockResolvedValueOnce(1);

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: "Invalid API key" })
      });

      expect(
        paymentService.createPaymobOrder("user-123")
      ).rejects.toThrow("Paymob authentication failed");
    });

    it("should handle Paymob 429 rate limiting with retry", async () => {
      vi.spyOn(userRepository, "findById").mockResolvedValueOnce(mockUser);
      vi.spyOn(enrollmentService, "getStatus").mockResolvedValueOnce({
        enrolled: false
      });
      vi.spyOn(paymentRepository, "findPendingByUserId").mockResolvedValueOnce(
        []
      );
      vi.spyOn(courseService, "getCoursePackagesCached").mockResolvedValueOnce(
        [mockPackage]
      );
      vi.spyOn(prisma, "$transaction").mockResolvedValueOnce(mockPayment);
      vi.spyOn(redis, "del").mockResolvedValueOnce(1);

      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return {
            ok: false,
            status: 429
          };
        }
        return {
          ok: true,
          json: async () =>
            callCount <= 3
              ? { token: "auth-token" }
              : { id: 123456 }
        };
      });

      expect(
        paymentService.createPaymobOrder("user-123")
      ).rejects.toThrow("Paymob API rate limit exceeded");
    });

    it("should handle Paymob 5xx server error with retry", async () => {
      vi.spyOn(userRepository, "findById").mockResolvedValueOnce(mockUser);
      vi.spyOn(enrollmentService, "getStatus").mockResolvedValueOnce({
        enrolled: false
      });
      vi.spyOn(paymentRepository, "findPendingByUserId").mockResolvedValueOnce(
        []
      );
      vi.spyOn(courseService, "getCoursePackagesCached").mockResolvedValueOnce(
        [mockPackage]
      );
      vi.spyOn(prisma, "$transaction").mockResolvedValueOnce(mockPayment);
      vi.spyOn(redis, "del").mockResolvedValueOnce(1);

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 502
      });

      expect(
        paymentService.createPaymobOrder("user-123")
      ).rejects.toThrow("Paymob server error");
    });

    it("should store error details when Paymob API fails", async () => {
      vi.spyOn(userRepository, "findById").mockResolvedValueOnce(mockUser);
      vi.spyOn(enrollmentService, "getStatus").mockResolvedValueOnce({
        enrolled: false
      });
      vi.spyOn(paymentRepository, "findPendingByUserId").mockResolvedValueOnce(
        []
      );
      vi.spyOn(courseService, "getCoursePackagesCached").mockResolvedValueOnce(
        [mockPackage]
      );
      vi.spyOn(prisma, "$transaction").mockResolvedValueOnce(mockPayment);
      vi.spyOn(redis, "del").mockResolvedValueOnce(1);
      vi.spyOn(paymentRepository, "update").mockResolvedValueOnce(mockPayment);

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      try {
        await paymentService.createPaymobOrder("user-123");
      } catch {
        expect(paymentRepository.update).toHaveBeenCalledWith(
          "payment-123",
          expect.objectContaining({
            status: "FAILED",
            errorCode: "PAYMOB_SERVER_ERROR"
          })
        );
      }
    });
  });

  describe("validateCouponPreview", () => {
    it("should return valid coupon with discount", async () => {
      vi.spyOn(courseService, "getCoursePackagesCached").mockResolvedValueOnce(
        [mockPackage]
      );
      vi.spyOn(couponService, "validateCoupon").mockResolvedValueOnce({
        valid: true,
        discountAmount: 5000,
        discountPercentage: 10
      });

      const result = await paymentService.validateCouponPreview("SAVE10");

      expect(result).toEqual(
        expect.objectContaining({
          valid: true,
          discountAmount: 5000
        })
      );
    });

    it("should return invalid for missing coupon code", async () => {
      vi.spyOn(courseService, "getCoursePackagesCached").mockResolvedValueOnce(
        [mockPackage]
      );

      const result = await paymentService.validateCouponPreview(undefined);

      expect(result).toEqual({ valid: false, reason: "NOT_FOUND" });
    });

    it("should return invalid for empty coupon code", async () => {
      vi.spyOn(courseService, "getCoursePackagesCached").mockResolvedValueOnce(
        [mockPackage]
      );

      const result = await paymentService.validateCouponPreview("   ");

      expect(result).toEqual({ valid: false, reason: "NOT_FOUND" });
    });
  });

  describe("processWebhook", () => {
    it("should process successful webhook and create enrollment", async () => {
      const mockWebhook = {
        obj: {
          id: "tx-123",
          success: true,
          order: { merchant_order_id: "payment-123" }
        }
      };

      vi.spyOn(paymentRepository, "findByPaymobTxId").mockResolvedValueOnce(
        null
      );
      vi.spyOn(paymentRepository, "findById").mockResolvedValueOnce(mockPayment);
      vi.spyOn(paymentRepository, "updateStatus").mockResolvedValueOnce({
        ...mockPayment,
        status: "COMPLETED"
      });
      vi.spyOn(redis, "del").mockResolvedValueOnce(1);
      vi.spyOn(enrollmentService, "enroll").mockResolvedValueOnce(undefined);

      const result = await paymentService.processWebhook(mockWebhook, "hmac");

      expect(result.status).toBe("COMPLETED");
      expect(enrollmentService.enroll).toHaveBeenCalledWith(
        "user-123",
        "PAID",
        "payment-123"
      );
    });

    it("should handle duplicate webhook idempotently", async () => {
      const mockWebhook = {
        obj: {
          id: "tx-123",
          success: true,
          order: { merchant_order_id: "payment-123" }
        }
      };

      const existingPayment = { ...mockPayment, status: "COMPLETED" };
      vi.spyOn(paymentRepository, "findByPaymobTxId").mockResolvedValueOnce(
        existingPayment
      );

      const result = await paymentService.processWebhook(mockWebhook, "hmac");

      expect(result).toEqual(existingPayment);
      expect(paymentRepository.findById).not.toHaveBeenCalled();
    });

    it("should handle failed payment webhook", async () => {
      const mockWebhook = {
        obj: {
          id: "tx-123",
          success: false,
          order: { merchant_order_id: "payment-123" }
        }
      };

      vi.spyOn(paymentRepository, "findByPaymobTxId").mockResolvedValueOnce(
        null
      );
      vi.spyOn(paymentRepository, "findById").mockResolvedValueOnce(mockPayment);
      vi.spyOn(paymentRepository, "updateStatus").mockResolvedValueOnce({
        ...mockPayment,
        status: "FAILED"
      });
      vi.spyOn(redis, "del").mockResolvedValueOnce(1);

      const result = await paymentService.processWebhook(mockWebhook, "hmac");

      expect(result.status).toBe("FAILED");
      expect(enrollmentService.enroll).not.toHaveBeenCalled();
    });

    it("should throw PAYMENT_NOT_FOUND for unknown payment", async () => {
      const mockWebhook = {
        obj: {
          id: "tx-123",
          success: true,
          order: { merchant_order_id: "unknown-payment" }
        }
      };

      vi.spyOn(paymentRepository, "findByPaymobTxId").mockResolvedValueOnce(
        null
      );
      vi.spyOn(paymentRepository, "findById").mockResolvedValueOnce(null);

      expect(
        paymentService.processWebhook(mockWebhook, "hmac")
      ).rejects.toThrow("Payment record not found");
    });

    it("should throw INVALID_WEBHOOK_PAYLOAD for missing transaction", async () => {
      const mockWebhook = {
        obj: null
      };

      expect(
        paymentService.processWebhook(mockWebhook, "hmac")
      ).rejects.toThrow("Webhook payload is missing transaction details");
    });
  });

  describe("listPaymentHistory", () => {
    it("should return cached payment history", async () => {
      const cachedPayments = [
        {
          id: "payment-123",
          amountEgp: 500,
          status: "COMPLETED",
          createdAt: new Date().toISOString()
        }
      ];

      vi.spyOn(redis, "get").mockResolvedValueOnce(JSON.stringify(cachedPayments));

      const result = await paymentService.listPaymentHistory("user-123");

      expect(result).toEqual(cachedPayments);
    });

    it("should fetch from database when cache misses", async () => {
      vi.spyOn(redis, "get").mockResolvedValueOnce(null);
      vi.spyOn(prisma.payment, "findMany").mockResolvedValueOnce([mockPayment]);
      vi.spyOn(redis, "set").mockResolvedValueOnce("OK");

      const result = await paymentService.listPaymentHistory("user-123");

      expect(result).toHaveLength(1);
      expect(result[0].amountEgp).toBe(500);
    });
  });

  describe("invalidatePaymentHistoryCache", () => {
    it("should delete cache key from Redis", async () => {
      vi.spyOn(redis, "del").mockResolvedValueOnce(1);

      await paymentService.invalidatePaymentHistoryCache("user-123");

      expect(redis.del).toHaveBeenCalledWith("student:payments:user-123");
    });

    it("should not throw when Redis fails", async () => {
      vi.spyOn(redis, "del").mockRejectedValueOnce(new Error("Redis down"));

      expect(
        paymentService.invalidatePaymentHistoryCache("user-123")
      ).resolves.not.toThrow();
    });
  });
});
