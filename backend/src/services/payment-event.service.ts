import type { PaymentEventType, PaymentStatus } from "@prisma/client";
import { paymentRepository } from "../repositories/payment.repository.js";
import { createPaymentLogger } from "../observability/payment-logger.js";

export const paymentEventService = {
  /**
   * Log a generic payment event
   */
  async logEvent(
    paymentId: string,
    eventType: PaymentEventType,
    status: PaymentStatus,
    errorCode?: string,
    errorMessage?: string,
    metadata?: Record<string, unknown>
  ) {
    try {
      const payment = await paymentRepository.findById(paymentId);
      const previousStatus = payment?.status;

      const event = await paymentRepository.addEvent(paymentId, {
        eventType,
        status,
        previousStatus,
        errorCode,
        errorMessage,
        metadata
      });

      const logger = createPaymentLogger(paymentId, payment?.userId);
      logger.debug(`Event logged: ${eventType}`, { status, errorCode });

      return event;
    } catch (error) {
      const logger = createPaymentLogger(paymentId);
      logger.error("Failed to log payment event", error as Error, {
        eventType
      });
      throw error;
    }
  },

  /**
   * Log a status change event
   */
  async logStatusChange(
    paymentId: string,
    newStatus: PaymentStatus,
    reason?: string,
    metadata?: Record<string, unknown>
  ) {
    const payment = await paymentRepository.findById(paymentId);
    if (!payment) {
      throw new Error(`Payment not found: ${paymentId}`);
    }

    return this.logEvent(
      paymentId,
      "STATUS_CHANGED",
      newStatus,
      undefined,
      reason,
      { previousStatus: payment.status, ...metadata }
    );
  },

  /**
   * Log an error event
   */
  async logError(
    paymentId: string,
    eventType: PaymentEventType,
    errorCode: string,
    errorMessage: string,
    metadata?: Record<string, unknown>
  ) {
    const payment = await paymentRepository.findById(paymentId);
    const logger = createPaymentLogger(paymentId, payment?.userId);

    logger.warn(`Payment error: ${errorCode}`, { errorMessage });

    return this.logEvent(
      paymentId,
      eventType,
      payment?.status || "INITIATED",
      errorCode,
      errorMessage,
      metadata
    );
  },

  /**
   * Get payment event timeline
   */
  async getTimeline(paymentId: string) {
    return paymentRepository.getPaymentTimeline(paymentId);
  },

  /**
   * Get payment with full timeline and reconciliation
   */
  async getPaymentWithTimeline(paymentId: string) {
    return paymentRepository.findByIdWithEvents(paymentId);
  },

  /**
   * Get payment history with all details
   */
  async getPaymentHistory(paymentId: string) {
    return paymentRepository.getDetailWithEvents(paymentId);
  },

  /**
   * Reconstruct payment state from event timeline
   */
  async reconstructPaymentState(paymentId: string) {
    const events = await this.getTimeline(paymentId);
    if (events.length === 0) {
      return null;
    }

    // Get the last status change event
    const lastEvent = events[events.length - 1];
    return {
      paymentId,
      currentStatus: lastEvent.status,
      lastEventType: lastEvent.eventType,
      lastEventAt: lastEvent.createdAt,
      eventCount: events.length,
      events
    };
  }
};
