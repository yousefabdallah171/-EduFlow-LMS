import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Payment, PaymentEvent } from "@prisma/client";
import { paymentRepository } from "../../../src/repositories/payment.repository";

// Mock Prisma
vi.mock("../../../src/config/database", () => ({
  prisma: {
    payment: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn()
    },
    paymentEvent: {
      create: vi.fn(),
      findMany: vi.fn()
    }
  }
}));

import { prisma } from "../../../src/config/database";

const mockPaymentId = "payment_123";
const mockUserId = "user_123";
const mockPayment: Payment = {
  id: mockPaymentId,
  userId: mockUserId,
  packageId: "pkg_123",
  amountPiasters: 50000,
  currency: "EGP",
  paymobOrderId: "order_123",
  paymobTransactionId: "tx_123",
  couponId: null,
  discountPiasters: 0,
  status: "INITIATED",
  paymentMethod: null,
  webhookReceivedAt: null,
  webhookHmac: null,
  createdAt: new Date(),
  updatedAt: new Date()
};

const mockPaymentEvent: PaymentEvent = {
  id: "event_123",
  paymentId: mockPaymentId,
  eventType: "INITIATED",
  status: "INITIATED",
  message: "Payment initiated",
  metadata: {},
  createdAt: new Date()
};

describe("PaymentRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("should create a new payment", async () => {
      vi.mocked(prisma.payment.create).mockResolvedValue(mockPayment);

      const result = await paymentRepository.create({
        userId: mockUserId,
        amountPiasters: 50000,
        status: "INITIATED"
      } as any);

      expect(result).toEqual(mockPayment);
      expect(prisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: mockUserId,
            amountPiasters: 50000
          })
        })
      );
    });
  });

  describe("findById", () => {
    it("should find a payment by ID", async () => {
      vi.mocked(prisma.payment.findUnique).mockResolvedValue(mockPayment);

      const result = await paymentRepository.findById(mockPaymentId);

      expect(result).toEqual(mockPayment);
      expect(prisma.payment.findUnique).toHaveBeenCalledWith({
        where: { id: mockPaymentId }
      });
    });

    it("should return null when payment not found", async () => {
      vi.mocked(prisma.payment.findUnique).mockResolvedValue(null);

      const result = await paymentRepository.findById("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("findByIdWithEvents", () => {
    it("should find a payment with its events", async () => {
      const paymentWithEvents = {
        ...mockPayment,
        events: [mockPaymentEvent]
      };

      vi.mocked(prisma.payment.findUnique).mockResolvedValue(paymentWithEvents as any);

      const result = await paymentRepository.findByIdWithEvents(mockPaymentId);

      expect(result).toEqual(paymentWithEvents);
      expect(prisma.payment.findUnique).toHaveBeenCalledWith({
        where: { id: mockPaymentId },
        include: { events: { orderBy: { createdAt: "asc" } } }
      });
    });
  });

  describe("updateStatus", () => {
    it("should update payment status", async () => {
      const updatedPayment = { ...mockPayment, status: "COMPLETED" as const };
      vi.mocked(prisma.payment.update).mockResolvedValue(updatedPayment);

      const result = await paymentRepository.updateStatus(
        mockPaymentId,
        "COMPLETED"
      );

      expect(result.status).toBe("COMPLETED");
      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockPaymentId },
          data: expect.objectContaining({
            status: "COMPLETED"
          })
        })
      );
    });
  });

  describe("findByPaymobTxId", () => {
    it("should find a payment by Paymob transaction ID", async () => {
      vi.mocked(prisma.payment.findUnique).mockResolvedValue(mockPayment);

      const result = await paymentRepository.findByPaymobTxId("tx_123");

      expect(result).toEqual(mockPayment);
      expect(prisma.payment.findUnique).toHaveBeenCalledWith({
        where: { paymobTransactionId: "tx_123" }
      });
    });
  });

  describe("findByPaymobOrderId", () => {
    it("should find a payment by Paymob order ID", async () => {
      vi.mocked(prisma.payment.findFirst).mockResolvedValue(mockPayment);

      const result = await paymentRepository.findByPaymobOrderId("order_123");

      expect(result).toEqual(mockPayment);
      expect(prisma.payment.findFirst).toHaveBeenCalledWith({
        where: { paymobOrderId: "order_123" }
      });
    });
  });

  describe("findByUserId", () => {
    it("should find all payments for a user", async () => {
      const payments = [mockPayment];
      vi.mocked(prisma.payment.findMany).mockResolvedValue(payments as any);

      const result = await paymentRepository.findByUserId(mockUserId);

      expect(result).toEqual(payments);
      expect(prisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: mockUserId },
          orderBy: { createdAt: "desc" }
        })
      );
    });
  });

  describe("addEvent", () => {
    it("should add a payment event", async () => {
      vi.mocked(prisma.paymentEvent.create).mockResolvedValue(mockPaymentEvent);

      const result = await paymentRepository.addEvent(mockPaymentId, {
        eventType: "INITIATED",
        status: "INITIATED",
        message: "Payment initiated"
      } as any);

      expect(result).toEqual(mockPaymentEvent);
      expect(prisma.paymentEvent.create).toHaveBeenCalled();
    });
  });

  describe("countByStatus", () => {
    it("should count payments by status", async () => {
      vi.mocked(prisma.payment.count).mockResolvedValue(5);

      const result = await paymentRepository.countByStatus("COMPLETED");

      expect(result).toBe(5);
      expect(prisma.payment.count).toHaveBeenCalledWith({
        where: { status: "COMPLETED" }
      });
    });
  });
});
