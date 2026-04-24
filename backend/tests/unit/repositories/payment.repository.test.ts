import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { paymentRepository } from "@/repositories/payment.repository";
import { prisma } from "@/config/database";
import { PaymentStatus } from "@prisma/client";

vi.mock("@/config/database");

describe("PaymentRepository", () => {
  const mockPayment = {
    id: "payment-123",
    userId: "user-123",
    packageId: "pkg-123",
    amountPiasters: 50000,
    currency: "EGP",
    paymobOrderId: "order-123",
    paymobTransactionId: null,
    paymobIdempotencyKey: null,
    couponId: null,
    discountPiasters: 0,
    status: "INITIATED" as PaymentStatus,
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
    ipAddress: "192.168.1.1",
    userAgent: "Mozilla/5.0",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("should create a payment record", async () => {
      vi.spyOn(prisma.payment, "create").mockResolvedValueOnce(mockPayment);

      const result = await paymentRepository.create({
        userId: mockPayment.userId,
        amountPiasters: mockPayment.amountPiasters,
      });

      expect(result).toEqual(mockPayment);
      expect(prisma.payment.create).toHaveBeenCalled();
    });
  });

  describe("findById", () => {
    it("should return payment by id", async () => {
      vi.spyOn(prisma.payment, "findUnique").mockResolvedValueOnce(
        mockPayment
      );

      const result = await paymentRepository.findById("payment-123");

      expect(result).toEqual(mockPayment);
      expect(prisma.payment.findUnique).toHaveBeenCalledWith({
        where: { id: "payment-123" },
      });
    });

    it("should return null if payment not found", async () => {
      vi.spyOn(prisma.payment, "findUnique").mockResolvedValueOnce(null);

      const result = await paymentRepository.findById("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("update", () => {
    it("should update payment record", async () => {
      const updated = { ...mockPayment, status: "AWAITING_PAYMENT" as PaymentStatus };
      vi.spyOn(prisma.payment, "update").mockResolvedValueOnce(updated);

      const result = await paymentRepository.update("payment-123", {
        status: "AWAITING_PAYMENT",
      });

      expect(result.status).toBe("AWAITING_PAYMENT");
    });
  });

  describe("findByPaymobOrderId", () => {
    it("should find payment by Paymob order ID", async () => {
      vi.spyOn(prisma.payment, "findUnique").mockResolvedValueOnce(
        mockPayment
      );

      const result = await paymentRepository.findByPaymobOrderId("order-123");

      expect(result).toEqual(mockPayment);
      expect(prisma.payment.findUnique).toHaveBeenCalledWith({
        where: { paymobOrderId: "order-123" },
      });
    });
  });

  describe("findByIdempotencyKey", () => {
    it("should find payment by idempotency key", async () => {
      vi.spyOn(prisma.payment, "findUnique").mockResolvedValueOnce(
        mockPayment
      );

      const result = await paymentRepository.findByIdempotencyKey("key-123");

      expect(result).toEqual(mockPayment);
      expect(prisma.payment.findUnique).toHaveBeenCalledWith({
        where: { paymobIdempotencyKey: "key-123" },
      });
    });
  });

  describe("findByStatus", () => {
    it("should find all payments with specific status", async () => {
      const payments = [mockPayment, { ...mockPayment, id: "payment-456" }];
      vi.spyOn(prisma.payment, "findMany").mockResolvedValueOnce(payments);

      const result = await paymentRepository.findByStatus("INITIATED");

      expect(result).toHaveLength(2);
      expect(prisma.payment.findMany).toHaveBeenCalledWith({
        where: { status: "INITIATED" },
        orderBy: { createdAt: "desc" },
      });
    });
  });

  describe("findPendingByUserId", () => {
    it("should find pending payments for user", async () => {
      const payments = [mockPayment];
      vi.spyOn(prisma.payment, "findMany").mockResolvedValueOnce(payments);

      const result = await paymentRepository.findPendingByUserId("user-123");

      expect(result).toHaveLength(1);
      expect(prisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: "user-123",
          }),
        })
      );
    });
  });

  describe("findByFilters", () => {
    it("should filter payments with multiple criteria", async () => {
      const payments = [mockPayment];
      vi.spyOn(prisma.payment, "findMany").mockResolvedValueOnce(payments);
      vi.spyOn(prisma.payment, "count").mockResolvedValueOnce(1);

      const result = await paymentRepository.findByFilters({
        status: "INITIATED",
        userId: "user-123",
        page: 1,
        limit: 20,
      });

      expect(result.payments).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
    });
  });

  describe("findRefundablePayments", () => {
    it("should return completed payments not yet refunded", async () => {
      const completed = {
        ...mockPayment,
        status: "COMPLETED" as PaymentStatus,
      };
      vi.spyOn(prisma.payment, "findMany").mockResolvedValueOnce([completed]);

      const result = await paymentRepository.findRefundablePayments();

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe("COMPLETED");
    });
  });

  describe("findExpiredWebhookPending", () => {
    it("should find webhook pending payments past timeout", async () => {
      const expiredPayment = {
        ...mockPayment,
        status: "WEBHOOK_PENDING" as PaymentStatus,
        createdAt: new Date(Date.now() - 15 * 60 * 1000),
      };
      vi.spyOn(prisma.payment, "findMany").mockResolvedValueOnce([
        expiredPayment,
      ]);

      const result = await paymentRepository.findExpiredWebhookPending(10);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe("WEBHOOK_PENDING");
    });
  });

  describe("updateWithEvent", () => {
    it("should update payment and create event atomically", async () => {
      const updated = {
        ...mockPayment,
        status: "COMPLETED" as PaymentStatus,
      };

      vi.spyOn(prisma, "$transaction").mockImplementation(
        async (callback: any) => {
          const mockTx = {
            payment: {
              update: vi.fn().mockResolvedValue(updated),
            },
            paymentEvent: {
              create: vi.fn().mockResolvedValue({}),
            },
          };
          return callback(mockTx);
        }
      );

      const result = await paymentRepository.updateWithEvent(
        "payment-123",
        { status: "COMPLETED" },
        {
          paymentId: "payment-123",
          eventType: "STATUS_CHANGED",
          previousStatus: "INITIATED",
          newStatus: "COMPLETED",
        }
      );

      expect(result.payment.status).toBe("COMPLETED");
    });
  });
});
