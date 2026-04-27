import { describe, it, expect, beforeEach, vi } from "vitest";
import { adminPaymentService } from "../../../src/services/admin-payment.service.js";
import { prisma } from "../../../src/config/database.js";

vi.mock("../../../src/config/database.js", () => ({
  prisma: {
    payment: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      groupBy: vi.fn(),
      aggregate: vi.fn()
    },
    enrollment: {
      count: vi.fn(),
      findMany: vi.fn(),
      groupBy: vi.fn()
    }
  }
}));

describe("Admin Payment Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listPayments", () => {
    it("should list all payments with default pagination", async () => {
      const mockPayments = [
        {
          id: "payment-1",
          userId: "user-1",
          amountPiasters: 10000,
          status: "COMPLETED",
          refundStatus: null,
          createdAt: new Date("2024-01-01"),
          user: { email: "test@example.com", name: "Test User" }
        }
      ];

      (prisma.payment.count as any).mockResolvedValueOnce(1);
      (prisma.payment.findMany as any).mockResolvedValueOnce(mockPayments);

      const result = await adminPaymentService.listPayments({});

      expect(result.payments).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.limit).toBe(50);
      expect(result.pagination.offset).toBe(0);
      expect(result.pagination.hasMore).toBe(false);
    });

    it("should filter payments by status", async () => {
      (prisma.payment.count as any).mockResolvedValueOnce(1);
      (prisma.payment.findMany as any).mockResolvedValueOnce([]);

      await adminPaymentService.listPayments({ status: "COMPLETED" });

      expect(prisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: "COMPLETED" })
        })
      );
    });

    it("should filter payments by userId", async () => {
      (prisma.payment.count as any).mockResolvedValueOnce(1);
      (prisma.payment.findMany as any).mockResolvedValueOnce([]);

      await adminPaymentService.listPayments({ userId: "user-123" });

      expect(prisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: "user-123" })
        })
      );
    });

    it("should filter payments by date range", async () => {
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-12-31");

      (prisma.payment.count as any).mockResolvedValueOnce(1);
      (prisma.payment.findMany as any).mockResolvedValueOnce([]);

      await adminPaymentService.listPayments({ startDate, endDate });

      expect(prisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { gte: startDate, lte: endDate }
          })
        })
      );
    });

    it("should filter payments by amount range", async () => {
      (prisma.payment.count as any).mockResolvedValueOnce(1);
      (prisma.payment.findMany as any).mockResolvedValueOnce([]);

      await adminPaymentService.listPayments({
        minAmount: 5000,
        maxAmount: 15000
      });

      expect(prisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            amountPiasters: { gte: 5000, lte: 15000 }
          })
        })
      );
    });

    it("should apply pagination offset and limit", async () => {
      (prisma.payment.count as any).mockResolvedValueOnce(100);
      (prisma.payment.findMany as any).mockResolvedValueOnce([]);

      const result = await adminPaymentService.listPayments({
        limit: 20,
        offset: 40
      });

      expect(prisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
          skip: 40
        })
      );
      expect(result.pagination.hasMore).toBe(true);
    });

    it("should return hasMore as false when at end of results", async () => {
      (prisma.payment.count as any).mockResolvedValueOnce(50);
      (prisma.payment.findMany as any).mockResolvedValueOnce([]);

      const result = await adminPaymentService.listPayments({
        limit: 50,
        offset: 0
      });

      expect(result.pagination.hasMore).toBe(false);
    });

    it("should throw error on database failure", async () => {
      (prisma.payment.count as any).mockRejectedValueOnce(
        new Error("Database error")
      );

      await expect(
        adminPaymentService.listPayments({})
      ).rejects.toThrow("Database error");
    });
  });

  describe("getPaymentDetail", () => {
    it("should get detailed payment information", async () => {
      const mockPayment = {
        id: "payment-1",
        userId: "user-1",
        amountPiasters: 10000,
        status: "COMPLETED",
        refundStatus: null,
        refundAmount: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        paymobOrderId: "order-123",
        paymobTransactionId: "txn-123",
        paymobRefundId: null,
        user: {
          id: "user-1",
          email: "test@example.com",
          name: "Test User"
        },
        events: [
          {
            id: "event-1",
            paymentId: "payment-1",
            eventType: "PAYMENT_COMPLETED",
            status: "COMPLETED",
            metadata: {},
            createdAt: new Date()
          }
        ],
        enrollment: {
          id: "enrollment-1",
          status: "ACTIVE",
          enrolledAt: new Date(),
          revokedAt: null
        }
      };

      (prisma.payment.findUnique as any).mockResolvedValueOnce(mockPayment);

      const result = await adminPaymentService.getPaymentDetail("payment-1");

      expect(result.id).toBe("payment-1");
      expect(result.user.email).toBe("test@example.com");
      expect(result.events).toHaveLength(1);
      expect(result.enrollment).not.toBeNull();
    });

    it("should throw error when payment not found", async () => {
      (prisma.payment.findUnique as any).mockResolvedValueOnce(null);

      await expect(
        adminPaymentService.getPaymentDetail("invalid-id")
      ).rejects.toThrow("Payment invalid-id not found");
    });

    it("should handle database errors", async () => {
      (prisma.payment.findUnique as any).mockRejectedValueOnce(
        new Error("Database error")
      );

      await expect(
        adminPaymentService.getPaymentDetail("payment-1")
      ).rejects.toThrow("Database error");
    });
  });

  describe("searchPayments", () => {
    it("should search payments by payment ID", async () => {
      (prisma.payment.findMany as any).mockResolvedValueOnce([]);

      await adminPaymentService.searchPayments("payment-123");

      expect(prisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                id: expect.objectContaining({ contains: "payment-123" })
              })
            ])
          })
        })
      );
    });

    it("should search payments by user ID", async () => {
      (prisma.payment.findMany as any).mockResolvedValueOnce([]);

      await adminPaymentService.searchPayments("user-123");

      expect(prisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                userId: expect.objectContaining({ contains: "user-123" })
              })
            ])
          })
        })
      );
    });

    it("should search payments by email", async () => {
      (prisma.payment.findMany as any).mockResolvedValueOnce([]);

      await adminPaymentService.searchPayments("test@example.com");

      expect(prisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                user: expect.objectContaining({
                  email: expect.objectContaining({ contains: "test@example.com" })
                })
              })
            ])
          })
        })
      );
    });

    it("should search payments by user name", async () => {
      (prisma.payment.findMany as any).mockResolvedValueOnce([]);

      await adminPaymentService.searchPayments("John");

      expect(prisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                user: expect.objectContaining({
                  name: expect.objectContaining({ contains: "John" })
                })
              })
            ])
          })
        })
      );
    });

    it("should respect custom limit", async () => {
      (prisma.payment.findMany as any).mockResolvedValueOnce([]);

      await adminPaymentService.searchPayments("query", 10);

      expect(prisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10
        })
      );
    });

    it("should default to limit of 20", async () => {
      (prisma.payment.findMany as any).mockResolvedValueOnce([]);

      await adminPaymentService.searchPayments("query");

      expect(prisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20
        })
      );
    });
  });

  describe("getPaymentsByStatus", () => {
    it("should get payments by status COMPLETED", async () => {
      (prisma.payment.findMany as any).mockResolvedValueOnce([]);

      await adminPaymentService.getPaymentsByStatus("COMPLETED");

      expect(prisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: "COMPLETED" }
        })
      );
    });

    it("should get payments by status PENDING", async () => {
      (prisma.payment.findMany as any).mockResolvedValueOnce([]);

      await adminPaymentService.getPaymentsByStatus("PENDING");

      expect(prisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: "PENDING" }
        })
      );
    });

    it("should respect custom limit", async () => {
      (prisma.payment.findMany as any).mockResolvedValueOnce([]);

      await adminPaymentService.getPaymentsByStatus("FAILED", 25);

      expect(prisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 25
        })
      );
    });

    it("should default to limit of 50", async () => {
      (prisma.payment.findMany as any).mockResolvedValueOnce([]);

      await adminPaymentService.getPaymentsByStatus("REFUNDED");

      expect(prisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50
        })
      );
    });

    it("should order results by createdAt descending", async () => {
      (prisma.payment.findMany as any).mockResolvedValueOnce([]);

      await adminPaymentService.getPaymentsByStatus("COMPLETED");

      expect(prisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: "desc" }
        })
      );
    });
  });

  describe("getPaymentStats", () => {
    it("should get payment statistics without date filters", async () => {
      const mockStats = [
        { status: "COMPLETED", _count: { id: 100 }, _sum: { amountPiasters: 1000000 } },
        { status: "PENDING", _count: { id: 10 }, _sum: { amountPiasters: 100000 } }
      ];

      (prisma.payment.groupBy as any).mockResolvedValueOnce(mockStats);
      (prisma.payment.count as any).mockResolvedValueOnce(110);
      (prisma.payment.aggregate as any).mockResolvedValueOnce({
        _sum: { amountPiasters: 1100000 }
      });

      const result = await adminPaymentService.getPaymentStats();

      expect(result.total).toBe(110);
      expect(result.totalAmount).toBe(1100000);
      expect(result.byStatus).toHaveLength(2);
    });

    it("should get payment statistics with date range", async () => {
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-12-31");

      (prisma.payment.groupBy as any).mockResolvedValueOnce([]);
      (prisma.payment.count as any).mockResolvedValueOnce(0);
      (prisma.payment.aggregate as any).mockResolvedValueOnce({
        _sum: { amountPiasters: 0 }
      });

      await adminPaymentService.getPaymentStats(startDate, endDate);

      expect(prisma.payment.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            createdAt: { gte: startDate, lte: endDate }
          }
        })
      );
    });

    it("should format stats correctly", async () => {
      (prisma.payment.groupBy as any).mockResolvedValueOnce([
        { status: "COMPLETED", _count: { id: 50 }, _sum: { amountPiasters: 500000 } }
      ]);
      (prisma.payment.count as any).mockResolvedValueOnce(50);
      (prisma.payment.aggregate as any).mockResolvedValueOnce({
        _sum: { amountPiasters: 500000 }
      });

      const result = await adminPaymentService.getPaymentStats();

      expect(result.byStatus[0]).toEqual({
        status: "COMPLETED",
        count: 50,
        amount: 500000
      });
    });

    it("should handle null sum amounts", async () => {
      (prisma.payment.groupBy as any).mockResolvedValueOnce([
        { status: "FAILED", _count: { id: 5 }, _sum: { amountPiasters: null } }
      ]);
      (prisma.payment.count as any).mockResolvedValueOnce(5);
      (prisma.payment.aggregate as any).mockResolvedValueOnce({
        _sum: { amountPiasters: null }
      });

      const result = await adminPaymentService.getPaymentStats();

      expect(result.totalAmount).toBe(0);
      expect(result.byStatus[0].amount).toBe(0);
    });

    it("should handle database errors gracefully", async () => {
      (prisma.payment.groupBy as any).mockRejectedValueOnce(
        new Error("Database error")
      );

      await expect(
        adminPaymentService.getPaymentStats()
      ).rejects.toThrow("Database error");
    });
  });
});
