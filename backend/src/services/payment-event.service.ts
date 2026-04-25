import { prisma } from "../config/database.js";
import {
  PaymentEventDTO,
  PaymentStatus,
  PaymentEventType,
  PaymentLogContext,
} from "../types/payment.types.js";
import { logger } from "../observability/logger.js";

export class PaymentEventService {
  /**
   * Log a payment event with optional status change
   */
  async logEvent(
    paymentId: string,
    eventType: PaymentEventType,
    options?: {
      previousStatus?: PaymentStatus;
      newStatus?: PaymentStatus;
      errorCode?: string;
      errorMessage?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    try {
      await prisma.paymentEvent.create({
        data: {
          paymentId,
          eventType,
          previousStatus: options?.previousStatus,
          newStatus: options?.newStatus,
          errorCode: options?.errorCode,
          errorMessage: options?.errorMessage,
          metadata: options?.metadata || {},
        },
      });

      logger.info("Payment event logged", {
        paymentId,
        eventType,
        newStatus: options?.newStatus,
        errorCode: options?.errorCode,
      });
    } catch (error) {
      logger.error("Failed to log payment event", error as Error, {
        paymentId,
        eventType,
      });
      throw error;
    }
  }

  /**
   * Log a status change event
   */
  async logStatusChange(
    paymentId: string,
    previousStatus: PaymentStatus,
    newStatus: PaymentStatus,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logEvent(paymentId, "STATUS_CHANGED" as PaymentEventType, {
      previousStatus,
      newStatus,
      metadata,
    });
  }

  /**
   * Log an error event
   */
  async logError(
    paymentId: string,
    eventType: PaymentEventType,
    errorCode: string,
    errorMessage: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logEvent(paymentId, eventType, {
      errorCode,
      errorMessage,
      metadata,
    });
  }

  /**
   * Get payment event history
   */
  async getPaymentHistory(paymentId: string): Promise<PaymentEventDTO[]> {
    try {
      const events = await prisma.paymentEvent.findMany({
        where: { paymentId },
        orderBy: { createdAt: "asc" },
      });

      return events.map((event) => ({
        id: event.id,
        eventType: event.eventType,
        previousStatus: event.previousStatus,
        newStatus: event.newStatus,
        errorCode: event.errorCode,
        errorMessage: event.errorMessage,
        metadata: event.metadata as Record<string, any>,
        createdAt: event.createdAt,
      }));
    } catch (error) {
      logger.error("Failed to get payment history", error as Error, {
        paymentId,
      });
      throw error;
    }
  }

  /**
   * Get last event of a specific type
   */
  async getLastEventOfType(
    paymentId: string,
    eventType: PaymentEventType
  ): Promise<PaymentEventDTO | null> {
    try {
      const event = await prisma.paymentEvent.findFirst({
        where: {
          paymentId,
          eventType,
        },
        orderBy: { createdAt: "desc" },
      });

      if (!event) return null;

      return {
        id: event.id,
        eventType: event.eventType,
        previousStatus: event.previousStatus,
        newStatus: event.newStatus,
        errorCode: event.errorCode,
        errorMessage: event.errorMessage,
        metadata: event.metadata as Record<string, any>,
        createdAt: event.createdAt,
      };
    } catch (error) {
      logger.error("Failed to get last event of type", error as Error, {
        paymentId,
        eventType,
      });
      throw error;
    }
  }

  /**
   * Reconstruct payment status from event log
   */
  async reconstructStatus(paymentId: string): Promise<PaymentStatus | null> {
    try {
      const lastStatusChange = await prisma.paymentEvent.findFirst({
        where: {
          paymentId,
          eventType: "STATUS_CHANGED" as PaymentEventType,
        },
        orderBy: { createdAt: "desc" },
      });

      return lastStatusChange?.newStatus ?? null;
    } catch (error) {
      logger.error("Failed to reconstruct status", error as Error, {
        paymentId,
      });
      throw error;
    }
  }

  /**
   * Get events in a time range
   */
  async getEventsInRange(
    paymentId: string,
    startDate: Date,
    endDate: Date
  ): Promise<PaymentEventDTO[]> {
    try {
      const events = await prisma.paymentEvent.findMany({
        where: {
          paymentId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { createdAt: "asc" },
      });

      return events.map((event) => ({
        id: event.id,
        eventType: event.eventType,
        previousStatus: event.previousStatus,
        newStatus: event.newStatus,
        errorCode: event.errorCode,
        errorMessage: event.errorMessage,
        metadata: event.metadata as Record<string, any>,
        createdAt: event.createdAt,
      }));
    } catch (error) {
      logger.error("Failed to get events in range", error as Error, {
        paymentId,
      });
      throw error;
    }
  }
}

export const paymentEventService = new PaymentEventService();
