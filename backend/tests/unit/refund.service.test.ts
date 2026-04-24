import { describe, it, expect, vi, beforeEach } from "vitest";
import { refundService } from "../../src/services/refund.service.js";
import { prisma } from "../../src/config/database.js";
import { PaymentError, PaymentErrorCodes } from "../../src/types/payment.types.js";

vi.mock("../../src/config/database.js");

describe("Refund Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initiateRefund", () => {
    it("should initiate a full refund", async () => {
      const paymentId = "pay_123";
      const payment = {
        id: paymentId,
        userId: "user_123",
        amountPiasters: 10000,
        status: "COMPLETED",
        refundStatus: null
      };

      (prisma.payment.findUnique as any).mockResolvedValue(payment);
      (prisma.payment.update as any).mockResolvedValue({
        ...payment,
        status: "REFUND_REQUESTED",
        refundAmount: 10000,
        refundStatus: "REQUESTED"
      });

      const result = await refundService.initiateRefund(
        { paymentId, reason: "Test refund" },
        undefined
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it("should initiate a partial refund", async () => {
      const paymentId = "pay_123";
      const payment = {
        id: paymentId,
        userId: "user_123",
        amountPiasters: 10000,
        status: "COMPLETED",
        refundStatus: null
      };

      (prisma.payment.findUnique as any).mockResolvedValue(payment);
      (prisma.payment.update as any).mockResolvedValue({
        ...payment,
        status: "REFUND_REQUESTED",
        refundAmount: 5000,
        refundStatus: "REQUESTED"
      });

      const result = await refundService.initiateRefund(
        { paymentId, amount: 5000, reason: "Partial refund" },
        undefined
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it("should reject refund for non-existent payment", async () => {
      (prisma.payment.findUnique as any).mockResolvedValue(null);

      await expect(
        refundService.initiateRefund({ paymentId: "invalid", reason: "Test" })
      ).rejects.toThrow();
    });

    it("should reject refund with invalid amount", async () => {
      const paymentId = "pay_123";
      const payment = {
        id: paymentId,
        userId: "user_123",
        amountPiasters: 10000,
        status: "COMPLETED",
        refundStatus: null
      };

      (prisma.payment.findUnique as any).mockResolvedValue(payment);

      await expect(
        refundService.initiateRefund(
          { paymentId, amount: 15000, reason: "Test" }
        )
      ).rejects.toThrow();
    });

    it("should reject refund if already refunded", async () => {
      const paymentId = "pay_123";
      const payment = {
        id: paymentId,
        userId: "user_123",
        amountPiasters: 10000,
        status: "COMPLETED",
        refundStatus: "COMPLETED"
      };

      (prisma.payment.findUnique as any).mockResolvedValue(payment);

      await expect(
        refundService.initiateRefund({ paymentId, reason: "Test" })
      ).rejects.toThrow();
    });

    it("should reject zero or negative amount", async () => {
      const paymentId = "pay_123";
      const payment = {
        id: paymentId,
        userId: "user_123",
        amountPiasters: 10000,
        status: "COMPLETED",
        refundStatus: null
      };

      (prisma.payment.findUnique as any).mockResolvedValue(payment);

      await expect(
        refundService.initiateRefund(
          { paymentId, amount: 0, reason: "Test" }
        )
      ).rejects.toThrow();
    });
  });

  describe("getRefundStatus", () => {
    it("should return refund status when refund exists", async () => {
      const paymentId = "pay_123";
      const payment = {
        id: paymentId,
        refundStatus: "PROCESSING",
        refundAmount: 10000,
        refundInitiatedAt: new Date()
      };

      (prisma.payment.findUnique as any).mockResolvedValue(payment);

      const status = await refundService.getRefundStatus(paymentId);

      expect(status).toBeDefined();
      expect(status?.refundStatus).toBe("PROCESSING");
    });

    it("should return null when no refund exists", async () => {
      (prisma.payment.findUnique as any).mockResolvedValue({
        id: "pay_123",
        refundStatus: null
      });

      const status = await refundService.getRefundStatus("pay_123");

      expect(status).toBeNull();
    });
  });

  describe("cancelRefund", () => {
    it("should cancel a pending refund", async () => {
      const paymentId = "pay_123";
      const refundQueue = {
        id: "refund_123",
        paymentId,
        resolution: null
      };

      (prisma.refundQueue.findUnique as any).mockResolvedValue(refundQueue);
      (prisma.refundQueue.update as any).mockResolvedValue({
        ...refundQueue,
        resolution: "CANCELLED"
      });

      const result = await refundService.cancelRefund(
        paymentId,
        "User requested cancellation"
      );

      expect(result).toBe(true);
    });

    it("should reject cancellation if already resolved", async () => {
      (prisma.refundQueue.findUnique as any).mockResolvedValue({
        id: "refund_123",
        paymentId: "pay_123",
        resolution: "COMPLETED"
      });

      await expect(
        refundService.cancelRefund("pay_123", "Test")
      ).rejects.toThrow();
    });
  });

  describe("completeRefund", () => {
    it("should mark refund as completed and revoke enrollment for full refund", async () => {
      const paymentId = "pay_123";
      const refundId = "refund_123";

      (prisma.refundQueue.findUnique as any).mockResolvedValue({
        paymentId,
        refundType: "FULL",
        refundAmount: 10000
      });

      (prisma.payment.findUnique as any).mockResolvedValue({
        id: paymentId,
        amountPiasters: 10000
      });

      (prisma.refundQueue.update as any).mockResolvedValue({
        resolution: "COMPLETED"
      });

      const result = await refundService.completeRefund(paymentId, refundId);

      expect(result).toBe(true);
    });

    it("should mark refund as completed but keep enrollment for partial refund", async () => {
      const paymentId = "pay_123";
      const refundId = "refund_123";

      (prisma.refundQueue.findUnique as any).mockResolvedValue({
        paymentId,
        refundType: "PARTIAL",
        refundAmount: 5000
      });

      (prisma.payment.findUnique as any).mockResolvedValue({
        id: paymentId,
        amountPiasters: 10000
      });

      (prisma.refundQueue.update as any).mockResolvedValue({
        resolution: "COMPLETED"
      });

      const result = await refundService.completeRefund(paymentId, refundId);

      expect(result).toBe(true);
    });
  });

  describe("failRefund", () => {
    it("should mark refund as failed", async () => {
      const paymentId = "pay_123";
      const errorMessage = "Paymob API error";

      (prisma.payment.update as any).mockResolvedValue({
        id: paymentId,
        refundStatus: "FAILED"
      });

      const result = await refundService.failRefund(paymentId, errorMessage);

      expect(result).toBe(true);
    });
  });

  describe("getRefundHistory", () => {
    it("should return all refunds for a payment", async () => {
      const paymentId = "pay_123";
      const refunds = [
        {
          id: "refund_1",
          paymentId,
          refundAmount: 5000,
          refundType: "PARTIAL",
          createdAt: new Date()
        },
        {
          id: "refund_2",
          paymentId,
          refundAmount: 5000,
          refundType: "PARTIAL",
          createdAt: new Date()
        }
      ];

      (prisma.refundQueue.findMany as any).mockResolvedValue(refunds);

      const history = await refundService.getRefundHistory(paymentId);

      expect(history).toHaveLength(2);
    });

    it("should return empty array if no refunds exist", async () => {
      (prisma.refundQueue.findMany as any).mockResolvedValue([]);

      const history = await refundService.getRefundHistory("pay_123");

      expect(history).toHaveLength(0);
    });
  });

  describe("Refund validation", () => {
    it("should not allow refund for FAILED payment", async () => {
      (prisma.payment.findUnique as any).mockResolvedValue({
        id: "pay_123",
        status: "FAILED",
        refundStatus: null
      });

      await expect(
        refundService.initiateRefund({ paymentId: "pay_123", reason: "Test" })
      ).rejects.toThrow();
    });

    it("should not allow refund for INITIATED payment", async () => {
      (prisma.payment.findUnique as any).mockResolvedValue({
        id: "pay_123",
        status: "INITIATED",
        refundStatus: null
      });

      await expect(
        refundService.initiateRefund({ paymentId: "pay_123", reason: "Test" })
      ).rejects.toThrow();
    });
  });
});
