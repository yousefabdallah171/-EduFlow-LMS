import { describe, it, expect, beforeEach, vi } from "vitest";
import type { PaymentEvent } from "@prisma/client";
import { paymentEventService } from "../../../src/services/payment-event.service";

// Mock repositories
vi.mock("../../../src/repositories/payment.repository", () => ({
  paymentRepository: {
    addEvent: vi.fn(),
    findById: vi.fn(),
    findByIdWithEvents: vi.fn(),
    getPaymentTimeline: vi.fn()
  }
}));

vi.mock("../../../src/observability/payment-logger", () => ({
  createPaymentLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn()
  }))
}));

import { paymentRepository } from "../../../src/repositories/payment.repository";
import { createPaymentLogger } from "../../../src/observability/payment-logger";

const mockPaymentId = "payment_123";
const mockUserId = "user_123";

const mockPaymentEvent: PaymentEvent = {
  id: "event_123",
  paymentId: mockPaymentId,
  eventType: "INITIATED",
  status: "INITIATED",
  message: "Payment initiated",
  metadata: {},
  createdAt: new Date()
};

describe("PaymentEventService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("logEvent", () => {
    it("should log a payment event", async () => {
      vi.mocked(paymentRepository.addEvent).mockResolvedValue(mockPaymentEvent);
      vi.mocked(paymentRepository.findById).mockResolvedValue({
        id: mockPaymentId,
        userId: mockUserId
      } as any);

      const result = await paymentEventService.logEvent(
        mockPaymentId,
        "INITIATED",
        "INITIATED",
        "Payment initiated",
        {}
      );

      expect(result).toEqual(mockPaymentEvent);
      expect(paymentRepository.addEvent).toHaveBeenCalledWith(
        mockPaymentId,
        expect.objectContaining({
          eventType: "INITIATED",
          status: "INITIATED",
          message: "Payment initiated"
        })
      );
    });

    it("should handle event logging errors gracefully", async () => {
      const error = new Error("Database error");
      vi.mocked(paymentRepository.addEvent).mockRejectedValue(error);
      vi.mocked(paymentRepository.findById).mockResolvedValue(null);

      await expect(
        paymentEventService.logEvent(
          mockPaymentId,
          "INITIATED",
          "INITIATED",
          "Test message"
        )
      ).rejects.toThrow("Database error");

      expect(createPaymentLogger).toHaveBeenCalledWith(mockPaymentId);
    });
  });

  describe("getTimeline", () => {
    it("should get payment timeline", async () => {
      const events = [mockPaymentEvent];
      vi.mocked(paymentRepository.getPaymentTimeline).mockResolvedValue(events);

      const result = await paymentEventService.getTimeline(mockPaymentId);

      expect(result).toEqual(events);
      expect(paymentRepository.getPaymentTimeline).toHaveBeenCalledWith(
        mockPaymentId
      );
    });
  });

  describe("getPaymentWithTimeline", () => {
    it("should get payment with its timeline", async () => {
      const paymentWithEvents = {
        id: mockPaymentId,
        userId: mockUserId,
        events: [mockPaymentEvent]
      };

      vi.mocked(paymentRepository.findByIdWithEvents).mockResolvedValue(
        paymentWithEvents as any
      );

      const result = await paymentEventService.getPaymentWithTimeline(
        mockPaymentId
      );

      expect(result).toEqual(paymentWithEvents);
      expect(paymentRepository.findByIdWithEvents).toHaveBeenCalledWith(
        mockPaymentId
      );
    });
  });
});
