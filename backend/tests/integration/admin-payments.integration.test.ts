import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { adminPaymentsController } from "../../src/controllers/admin/payments.controller.js";
import { adminPaymentService } from "../../src/services/admin-payment.service.js";
import { adminPaymentManagementService } from "../../src/services/admin-payment-management.service.js";

vi.mock("../../src/services/admin-payment.service.js");
vi.mock("../../src/services/admin-payment-management.service.js");

describe("Admin Payments Controller Integration", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();

    mockReq = {
      user: { id: "admin-1", role: "ADMIN" },
      query: {},
      params: {},
      body: {}
    };

    mockRes = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis()
    };

    mockNext = vi.fn();
  });

  describe("listPayments endpoint", () => {
    it("should list payments with default pagination", async () => {
      const mockResult = {
        payments: [
          {
            id: "payment-1",
            userId: "user-1",
            amount: 10000,
            status: "COMPLETED",
            refundStatus: null,
            createdAt: new Date(),
            user: { email: "test@example.com", name: "Test User" }
          }
        ],
        pagination: {
          total: 1,
          limit: 50,
          offset: 0,
          hasMore: false
        }
      };

      (adminPaymentService.listPayments as any).mockResolvedValueOnce(mockResult);

      await adminPaymentsController.listPayments(
        mockReq as any,
        mockRes as any,
        mockNext
      );

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult
      });
    });

    it("should filter payments by status", async () => {
      mockReq.query = { status: "COMPLETED" };

      (adminPaymentService.listPayments as any).mockResolvedValueOnce({
        payments: [],
        pagination: { total: 0, limit: 50, offset: 0, hasMore: false }
      });

      await adminPaymentsController.listPayments(
        mockReq as any,
        mockRes as any,
        mockNext
      );

      expect(adminPaymentService.listPayments).toHaveBeenCalledWith(
        expect.objectContaining({ status: "COMPLETED" })
      );
    });

    it("should return validation error for invalid status", async () => {
      mockReq.query = { status: "INVALID_STATUS" };

      await adminPaymentsController.listPayments(
        mockReq as any,
        mockRes as any,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "VALIDATION_ERROR" })
      );
    });

    it("should apply date range filters", async () => {
      mockReq.query = {
        startDate: "2024-01-01T00:00:00.000Z",
        endDate: "2024-12-31T23:59:59.999Z"
      };

      (adminPaymentService.listPayments as any).mockResolvedValueOnce({
        payments: [],
        pagination: { total: 0, limit: 50, offset: 0, hasMore: false }
      });

      await adminPaymentsController.listPayments(
        mockReq as any,
        mockRes as any,
        mockNext
      );

      expect(adminPaymentService.listPayments).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date)
        })
      );
    });

    it("should apply amount range filters", async () => {
      mockReq.query = { minAmount: 1000, maxAmount: 50000 };

      (adminPaymentService.listPayments as any).mockResolvedValueOnce({
        payments: [],
        pagination: { total: 0, limit: 50, offset: 0, hasMore: false }
      });

      await adminPaymentsController.listPayments(
        mockReq as any,
        mockRes as any,
        mockNext
      );

      expect(adminPaymentService.listPayments).toHaveBeenCalledWith(
        expect.objectContaining({
          minAmount: 1000,
          maxAmount: 50000
        })
      );
    });

    it("should handle service errors", async () => {
      (adminPaymentService.listPayments as any).mockRejectedValueOnce(
        new Error("Database error")
      );

      await adminPaymentsController.listPayments(
        mockReq as any,
        mockRes as any,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe("getPaymentDetail endpoint", () => {
    it("should get payment details", async () => {
      mockReq.params = { paymentId: "payment-1" };

      const mockPayment = {
        id: "payment-1",
        userId: "user-1",
        amount: 10000,
        status: "COMPLETED",
        refundStatus: null,
        refundAmount: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        paymobOrderId: "order-123",
        paymobTransactionId: "txn-123",
        paymobRefundId: null,
        user: { id: "user-1", email: "test@example.com", name: "Test User" },
        events: [],
        enrollment: null
      };

      (adminPaymentService.getPaymentDetail as any).mockResolvedValueOnce(
        mockPayment
      );

      await adminPaymentsController.getPaymentDetail(
        mockReq as any,
        mockRes as any,
        mockNext
      );

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockPayment
      });
    });

    it("should return 404 for non-existent payment", async () => {
      mockReq.params = { paymentId: "invalid-id" };

      (adminPaymentService.getPaymentDetail as any).mockRejectedValueOnce(
        new Error("Payment invalid-id not found")
      );

      await adminPaymentsController.getPaymentDetail(
        mockReq as any,
        mockRes as any,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "PAYMENT_NOT_FOUND" })
      );
    });

    it("should validate paymentId is provided", async () => {
      mockReq.params = {};

      await adminPaymentsController.getPaymentDetail(
        mockReq as any,
        mockRes as any,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "VALIDATION_ERROR" })
      );
    });
  });

  describe("searchPayments endpoint", () => {
    it("should search payments with query", async () => {
      mockReq.query = { query: "test@example.com" };

      (adminPaymentService.searchPayments as any).mockResolvedValueOnce([]);

      await adminPaymentsController.searchPayments(
        mockReq as any,
        mockRes as any,
        mockNext
      );

      expect(adminPaymentService.searchPayments).toHaveBeenCalledWith(
        "test@example.com",
        20
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [],
        count: 0
      });
    });

    it("should respect custom limit", async () => {
      mockReq.query = { query: "user-1", limit: 10 };

      (adminPaymentService.searchPayments as any).mockResolvedValueOnce([]);

      await adminPaymentsController.searchPayments(
        mockReq as any,
        mockRes as any,
        mockNext
      );

      expect(adminPaymentService.searchPayments).toHaveBeenCalledWith(
        "user-1",
        10
      );
    });

    it("should return validation error for missing query", async () => {
      mockReq.query = {};

      await adminPaymentsController.searchPayments(
        mockReq as any,
        mockRes as any,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(422);
    });

    it("should return validation error for empty query", async () => {
      mockReq.query = { query: "" };

      await adminPaymentsController.searchPayments(
        mockReq as any,
        mockRes as any,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(422);
    });
  });

  describe("getPaymentsByStatus endpoint", () => {
    it("should get payments by status", async () => {
      mockReq.params = { status: "COMPLETED" };

      (adminPaymentService.getPaymentsByStatus as any).mockResolvedValueOnce([]);

      await adminPaymentsController.getPaymentsByStatus(
        mockReq as any,
        mockRes as any,
        mockNext
      );

      expect(adminPaymentService.getPaymentsByStatus).toHaveBeenCalledWith(
        "COMPLETED",
        50
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [],
        count: 0
      });
    });

    it("should validate status is valid enum value", async () => {
      mockReq.params = { status: "INVALID" };

      await adminPaymentsController.getPaymentsByStatus(
        mockReq as any,
        mockRes as any,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(422);
    });

    it("should respect custom limit query parameter", async () => {
      mockReq.params = { status: "PENDING" };
      mockReq.query = { limit: "25" };

      (adminPaymentService.getPaymentsByStatus as any).mockResolvedValueOnce([]);

      await adminPaymentsController.getPaymentsByStatus(
        mockReq as any,
        mockRes as any,
        mockNext
      );

      expect(adminPaymentService.getPaymentsByStatus).toHaveBeenCalledWith(
        "PENDING",
        25
      );
    });
  });

  describe("getPaymentStats endpoint", () => {
    it("should get payment statistics", async () => {
      const mockStats = {
        total: 100,
        totalAmount: 1000000,
        byStatus: [
          { status: "COMPLETED", count: 80, amount: 800000 },
          { status: "PENDING", count: 20, amount: 200000 }
        ]
      };

      (adminPaymentService.getPaymentStats as any).mockResolvedValueOnce(
        mockStats
      );

      await adminPaymentsController.getPaymentStats(
        mockReq as any,
        mockRes as any,
        mockNext
      );

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockStats
      });
    });

    it("should filter stats by date range", async () => {
      mockReq.query = {
        startDate: "2024-01-01T00:00:00.000Z",
        endDate: "2024-12-31T23:59:59.999Z"
      };

      (adminPaymentService.getPaymentStats as any).mockResolvedValueOnce({
        total: 0,
        totalAmount: 0,
        byStatus: []
      });

      await adminPaymentsController.getPaymentStats(
        mockReq as any,
        mockRes as any,
        mockNext
      );

      expect(adminPaymentService.getPaymentStats).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date)
      );
    });
  });

  describe("createManualPayment endpoint", () => {
    it("should create manual payment successfully", async () => {
      mockReq.body = {
        userId: "user-1",
        packageId: "pkg-1",
        amount: 10000,
        reason: "Manual payment for testing"
      };

      const mockPayment = {
        id: "payment-1",
        userId: "user-1",
        packageId: "pkg-1",
        amountPiasters: 10000,
        status: "COMPLETED"
      };

      (adminPaymentManagementService.createManualPayment as any).mockResolvedValueOnce(
        mockPayment
      );

      await adminPaymentsController.createManualPayment(
        mockReq as any,
        mockRes as any,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockPayment
      });
    });

    it("should return 401 if admin not authenticated", async () => {
      mockReq.user = undefined;
      mockReq.body = {
        userId: "user-1",
        packageId: "pkg-1",
        amount: 10000,
        reason: "Manual payment"
      };

      await adminPaymentsController.createManualPayment(
        mockReq as any,
        mockRes as any,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "UNAUTHORIZED" })
      );
    });

    it("should validate required fields", async () => {
      mockReq.body = {
        userId: "user-1"
      };

      await adminPaymentsController.createManualPayment(
        mockReq as any,
        mockRes as any,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "VALIDATION_ERROR" })
      );
    });

    it("should validate amount is minimum 100", async () => {
      mockReq.body = {
        userId: "user-1",
        packageId: "pkg-1",
        amount: 50,
        reason: "Invalid amount"
      };

      await adminPaymentsController.createManualPayment(
        mockReq as any,
        mockRes as any,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(422);
    });

    it("should validate reason is at least 5 characters", async () => {
      mockReq.body = {
        userId: "user-1",
        packageId: "pkg-1",
        amount: 10000,
        reason: "abc"
      };

      await adminPaymentsController.createManualPayment(
        mockReq as any,
        mockRes as any,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(422);
    });
  });

  describe("overridePaymentStatus endpoint", () => {
    it("should override payment status", async () => {
      mockReq.params = { paymentId: "payment-1" };
      mockReq.body = {
        newStatus: "REFUNDED",
        reason: "Refund request"
      };

      const mockPayment = {
        id: "payment-1",
        status: "REFUNDED"
      };

      (adminPaymentManagementService.overridePaymentStatus as any).mockResolvedValueOnce(
        mockPayment
      );

      await adminPaymentsController.overridePaymentStatus(
        mockReq as any,
        mockRes as any,
        mockNext
      );

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockPayment
      });
    });

    it("should return 401 if admin not authenticated", async () => {
      mockReq.user = undefined;
      mockReq.params = { paymentId: "payment-1" };
      mockReq.body = { newStatus: "REFUNDED", reason: "Refund" };

      await adminPaymentsController.overridePaymentStatus(
        mockReq as any,
        mockRes as any,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it("should validate newStatus is valid enum", async () => {
      mockReq.params = { paymentId: "payment-1" };
      mockReq.body = {
        newStatus: "INVALID_STATUS",
        reason: "Test"
      };

      await adminPaymentsController.overridePaymentStatus(
        mockReq as any,
        mockRes as any,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(422);
    });
  });

  describe("revokePayment endpoint", () => {
    it("should revoke payment successfully", async () => {
      mockReq.params = { paymentId: "payment-1" };
      mockReq.body = { reason: "Refund request" };

      const mockPayment = {
        id: "payment-1",
        status: "REFUNDED"
      };

      (adminPaymentManagementService.revokePayment as any).mockResolvedValueOnce(
        mockPayment
      );

      await adminPaymentsController.revokePayment(
        mockReq as any,
        mockRes as any,
        mockNext
      );

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockPayment
      });
    });

    it("should return 401 if admin not authenticated", async () => {
      mockReq.user = undefined;
      mockReq.params = { paymentId: "payment-1" };
      mockReq.body = { reason: "Refund" };

      await adminPaymentsController.revokePayment(
        mockReq as any,
        mockRes as any,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it("should validate reason is at least 5 characters", async () => {
      mockReq.params = { paymentId: "payment-1" };
      mockReq.body = { reason: "abc" };

      await adminPaymentsController.revokePayment(
        mockReq as any,
        mockRes as any,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(422);
    });
  });
});
