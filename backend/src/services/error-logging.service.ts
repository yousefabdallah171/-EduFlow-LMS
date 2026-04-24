import { prisma } from "../config/database.js";

interface ErrorContext {
  requestId: string;
  userId?: string;
  paymentId?: string;
  endpoint?: string;
  method?: string;
  ip?: string;
  userAgent?: string;
  timestamp: Date;
  duration?: number;
}

interface PaymentTimeline {
  paymentId: string;
  createdAt: Date;
  events: TimelineEvent[];
  currentStatus: string;
  totalDuration: number;
}

interface TimelineEvent {
  time: Date;
  type: string;
  description: string;
  status?: string;
  errorCode?: string;
  metadata?: Record<string, unknown>;
  durationSinceStart: number;
  durationSinceLastEvent: number;
}

export const errorLoggingService = {
  // Log error with full context
  async logPaymentError(
    paymentId: string,
    errorCode: string,
    errorMessage: string,
    context: Partial<ErrorContext> = {}
  ) {
    try {
      const fullContext: ErrorContext = {
        requestId: context.requestId || generateRequestId(),
        userId: context.userId,
        paymentId,
        endpoint: context.endpoint,
        method: context.method,
        ip: context.ip,
        userAgent: context.userAgent,
        timestamp: new Date(),
        duration: context.duration
      };

      // Get payment for context
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: { events: true }
      });

      // Log to console with context
      console.error(`[Payment Error] [${fullContext.requestId}] Payment ${paymentId}:`, {
        error: errorCode,
        message: errorMessage,
        userId: fullContext.userId,
        endpoint: fullContext.endpoint,
        previousStatus: payment?.status,
        eventCount: payment?.events.length || 0,
        timestamp: fullContext.timestamp
      });

      // Create error log entry with context
      const errorLog = await prisma.paymentEvent.create({
        data: {
          paymentId,
          eventType: "ERROR_LOGGED",
          status: payment?.status || "UNKNOWN",
          metadata: {
            errorCode,
            errorMessage,
            requestId: fullContext.requestId,
            context: {
              endpoint: fullContext.endpoint,
              method: fullContext.method,
              ip: fullContext.ip,
              duration: fullContext.duration,
              userId: fullContext.userId
            },
            stackTrace: new Error().stack
          }
        }
      });

      return {
        requestId: fullContext.requestId,
        errorLogId: errorLog.id,
        timestamp: fullContext.timestamp
      };
    } catch (error) {
      console.error("[Error Logging Service] Failed to log payment error:", error);
    }
  },

  // Get payment timeline - reconstruct full sequence of events
  async getPaymentTimeline(paymentId: string): Promise<PaymentTimeline | null> {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          events: {
            orderBy: { createdAt: "asc" }
          },
          webhookRetryQueue: true,
          emailQueue: true,
          failedPaymentQueue: true
        }
      });

      if (!payment) {
        return null;
      }

      const timeline: TimelineEvent[] = [];
      let previousTime = payment.createdAt;

      // Add payment created event
      timeline.push({
        time: payment.createdAt,
        type: "PAYMENT_CREATED",
        description: "Payment created",
        status: payment.status,
        metadata: {
          amount: payment.amount,
          currency: payment.currency,
          packageId: payment.packageId
        },
        durationSinceStart: 0,
        durationSinceLastEvent: 0
      });

      // Add all payment events
      for (const event of payment.events) {
        const durationSinceStart = event.createdAt.getTime() - payment.createdAt.getTime();
        const durationSinceLastEvent = event.createdAt.getTime() - previousTime.getTime();

        timeline.push({
          time: event.createdAt,
          type: event.eventType,
          description: describeEventType(event.eventType),
          status: event.status,
          errorCode: (event.metadata as any)?.errorCode,
          metadata: event.metadata as Record<string, unknown>,
          durationSinceStart,
          durationSinceLastEvent
        });

        previousTime = event.createdAt;
      }

      // Add queue status events
      if (payment.webhookRetryQueue) {
        timeline.push({
          time: payment.webhookRetryQueue.createdAt,
          type: "WEBHOOK_QUEUED",
          description: "Webhook retry queued",
          status: payment.webhookRetryQueue.resolution || "PENDING",
          metadata: {
            retryCount: payment.webhookRetryQueue.retryCount,
            resolvedAt: payment.webhookRetryQueue.resolvedAt
          },
          durationSinceStart: payment.webhookRetryQueue.createdAt.getTime() - payment.createdAt.getTime(),
          durationSinceLastEvent: payment.webhookRetryQueue.createdAt.getTime() - previousTime.getTime()
        });
      }

      if (payment.failedPaymentQueue) {
        timeline.push({
          time: payment.failedPaymentQueue.createdAt,
          type: "RECOVERY_QUEUED",
          description: "Payment recovery queued",
          status: payment.failedPaymentQueue.resolution || "PENDING",
          metadata: {
            failureType: payment.failedPaymentQueue.failureType,
            failureCode: payment.failedPaymentQueue.failureCode,
            retryCount: payment.failedPaymentQueue.retryCount,
            resolvedAt: payment.failedPaymentQueue.resolvedAt
          },
          durationSinceStart: payment.failedPaymentQueue.createdAt.getTime() - payment.createdAt.getTime(),
          durationSinceLastEvent: payment.failedPaymentQueue.createdAt.getTime() - previousTime.getTime()
        });
      }

      // Sort by time
      timeline.sort((a, b) => a.time.getTime() - b.time.getTime());

      const totalDuration = previousTime.getTime() - payment.createdAt.getTime();

      return {
        paymentId,
        createdAt: payment.createdAt,
        events: timeline,
        currentStatus: payment.status,
        totalDuration
      };
    } catch (error) {
      console.error("[Error Logging Service] Failed to get payment timeline:", error);
      return null;
    }
  },

  // Get error statistics
  async getErrorStatistics(hours: number = 24) {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      // Count errors by code
      const errorsByCode = await prisma.paymentEvent.groupBy({
        by: ["eventType"],
        where: {
          createdAt: { gte: since },
          eventType: "ERROR_LOGGED"
        },
        _count: true
      });

      // Get most common errors
      const commonErrors = await prisma.paymentEvent.findMany({
        where: {
          createdAt: { gte: since },
          eventType: "ERROR_LOGGED"
        },
        select: { metadata: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 100
      });

      // Parse and count error codes
      const errorCodeCounts: Record<string, number> = {};
      for (const event of commonErrors) {
        const errorCode = (event.metadata as any)?.errorCode;
        if (errorCode) {
          errorCodeCounts[errorCode] = (errorCodeCounts[errorCode] || 0) + 1;
        }
      }

      // Sort by frequency
      const topErrors = Object.entries(errorCodeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([code, count]) => ({ code, count }));

      // Calculate error rate
      const totalPayments = await prisma.payment.count({
        where: { createdAt: { gte: since } }
      });

      const failedPayments = await prisma.payment.count({
        where: {
          createdAt: { gte: since },
          status: { in: ["FAILED", "CANCELLED"] }
        }
      });

      const errorRate = totalPayments > 0 ? (failedPayments / totalPayments) * 100 : 0;

      return {
        period: `Last ${hours} hours`,
        totalPayments,
        failedPayments,
        errorRate: `${errorRate.toFixed(2)}%`,
        topErrors,
        errorsByCode: errorsByCode.map(e => ({ type: e.eventType, count: e._count }))
      };
    } catch (error) {
      console.error("[Error Logging Service] Failed to get error statistics:", error);
      throw error;
    }
  },

  // Get error details for debugging
  async getErrorDetails(paymentId: string) {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          },
          events: {
            where: { eventType: "ERROR_LOGGED" },
            orderBy: { createdAt: "desc" }
          },
          webhookRetryQueue: true,
          failedPaymentQueue: true,
          emailQueue: {
            where: { status: { in: ["FAILED_PERMANENT", "DLQ"] } }
          }
        }
      });

      if (!payment) {
        return null;
      }

      // Get timeline
      const timeline = await this.getPaymentTimeline(paymentId);

      // Build error summary
      const errorEvents = payment.events.filter(e => e.eventType === "ERROR_LOGGED");
      const firstError = errorEvents[errorEvents.length - 1];
      const lastError = errorEvents[0];

      return {
        paymentId,
        user: payment.user,
        payment: {
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          createdAt: payment.createdAt,
          lastStatusChange: payment.lastStatusChange
        },
        errorSummary: {
          totalErrors: errorEvents.length,
          firstError: {
            time: firstError?.createdAt,
            code: (firstError?.metadata as any)?.errorCode,
            message: (firstError?.metadata as any)?.errorMessage
          },
          lastError: {
            time: lastError?.createdAt,
            code: (lastError?.metadata as any)?.errorCode,
            message: (lastError?.metadata as any)?.errorMessage
          }
        },
        queueStatus: {
          webhookRetry: payment.webhookRetryQueue ? {
            retryCount: payment.webhookRetryQueue.retryCount,
            resolution: payment.webhookRetryQueue.resolution,
            resolvedAt: payment.webhookRetryQueue.resolvedAt
          } : null,
          failedPaymentRecovery: payment.failedPaymentQueue ? {
            failureType: payment.failedPaymentQueue.failureType,
            retryCount: payment.failedPaymentQueue.retryCount,
            resolution: payment.failedPaymentQueue.resolution,
            resolvedAt: payment.failedPaymentQueue.resolvedAt
          } : null,
          failedEmails: payment.emailQueue.length
        },
        timeline
      };
    } catch (error) {
      console.error("[Error Logging Service] Failed to get error details:", error);
      return null;
    }
  }
};

// Helper functions

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function describeEventType(eventType: string): string {
  const descriptions: Record<string, string> = {
    "PAYMENT_CREATED": "Payment created",
    "PAYMENT_PENDING": "Payment pending",
    "PAYMENT_COMPLETED": "Payment completed",
    "PAYMENT_FAILED": "Payment failed",
    "PAYMENT_CANCELLED": "Payment cancelled",
    "WEBHOOK_RECEIVED": "Webhook received",
    "WEBHOOK_PROCESSED": "Webhook processed",
    "WEBHOOK_FAILED": "Webhook processing failed",
    "ENROLLMENT_INITIATED": "Enrollment initiated",
    "ENROLLMENT_COMPLETED": "Enrollment completed",
    "ENROLLMENT_FAILED": "Enrollment failed",
    "RECOVERY_INITIATED": "Recovery initiated",
    "PAYMENT_OVERRIDDEN": "Payment status overridden by admin",
    "PAYMENT_RETRY_INITIATED": "Payment retry initiated",
    "PAYMENT_CANCELLED": "Payment cancelled",
    "ERROR_LOGGED": "Error logged"
  };

  return descriptions[eventType] || eventType;
}

export default errorLoggingService;
