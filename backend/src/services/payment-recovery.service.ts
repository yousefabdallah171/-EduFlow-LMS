import { prisma } from "../config/database.js";
import { paymentService } from "./payment.service.js";
import { enrollmentService } from "./enrollment.service.js";
import { queueFailedPaymentForRecovery } from "../jobs/failed-payment-recovery.job.js";
import { queueWebhookForRetry } from "../jobs/webhook-retry.job.js";
import { queueEmail } from "../jobs/email-queue.job.js";
import type { PaymentStatus } from "@prisma/client";

interface RecoveryResult {
  paymentId: string;
  recoveryAttempted: boolean;
  recovered: boolean;
  actions: string[];
  nextAction?: string;
  timestamp: Date;
}

// Main recovery orchestrator
export const paymentRecoveryService = {
  // Handle failed payment - determine and execute recovery strategy
  async handleFailedPayment(
    paymentId: string,
    failureReason: string,
    failureCode: string
  ): Promise<RecoveryResult> {
    const actions: string[] = [];
    const startTime = new Date();

    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          user: true,
          package: true,
          webhookRetryQueue: true,
          failedPaymentQueue: true
        }
      });

      if (!payment) {
        return {
          paymentId,
          recoveryAttempted: false,
          recovered: false,
          actions: ["Payment not found"],
          timestamp: startTime
        };
      }

      console.log(`[Payment Recovery] Handling failed payment ${paymentId}: ${failureCode}`);

      // Increment recovery attempt counter
      const recoveryAttempts = (payment.recoveryAttempts || 0) + 1;
      await prisma.payment.update({
        where: { id: paymentId },
        data: { recoveryAttempts }
      });

      // Determine recovery strategy based on failure code
      if (isPaymobError(failureCode)) {
        await handlePaymobError(paymentId, failureCode, actions);
      } else if (isNetworkError(failureCode)) {
        await handleNetworkError(paymentId, failureCode, actions);
      } else if (isCardError(failureCode)) {
        await handleCardError(paymentId, failureCode, actions);
      } else {
        await handleUnknownError(paymentId, failureCode, actions);
      }

      // Log all actions taken
      await logRecoveryAttempt(paymentId, failureCode, actions);

      return {
        paymentId,
        recoveryAttempted: true,
        recovered: false, // Actual recovery happens asynchronously in job queues
        actions,
        nextAction: determineNextAction(failureCode),
        timestamp: startTime
      };
    } catch (error) {
      console.error(`[Payment Recovery] Error handling failed payment ${paymentId}:`, error);
      throw error;
    }
  },

  // Query Paymob for latest payment status and reconcile
  async reconcileWithPaymob(paymentId: string): Promise<boolean> {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId }
      });

      if (!payment || !payment.paymobOrderId) {
        return false;
      }

      console.log(`[Payment Recovery] Reconciling payment ${paymentId} with Paymob`);

      // Query Paymob API for actual order status
      const paymobOrder = await paymentService.queryPaymobPaymentStatus(payment.paymobOrderId);

      if (paymobOrder?.success) {
        // Payment succeeded! Process webhook to update status
        await paymentService.processWebhook(
          {
            type: "transaction.success",
            obj: paymobOrder
          } as any,
          ""
        );

        console.log(`[Payment Recovery] Payment ${paymentId} reconciled successfully with Paymob`);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`[Payment Recovery] Error reconciling with Paymob:`, error);
      return false;
    }
  },

  // Attempt late webhook recovery
  async attemptLateWebhookRecovery(paymentId: string, payload: Record<string, unknown>, hmac: string): Promise<boolean> {
    try {
      console.log(`[Payment Recovery] Attempting late webhook recovery for payment ${paymentId}`);

      // Check if payment is still in failed state and worth recovering
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId }
      });

      if (!payment) {
        return false;
      }

      // If payment is already completed, webhook is late but unnecessary
      if (payment.status === "COMPLETED") {
        console.log(`[Payment Recovery] Payment ${paymentId} already completed, skipping late webhook`);
        return true;
      }

      // Process the webhook
      const result = await paymentService.processWebhook(payload, hmac);

      if (result.success) {
        console.log(`[Payment Recovery] Late webhook recovery succeeded for payment ${paymentId}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`[Payment Recovery] Error in late webhook recovery:`, error);
      return false;
    }
  },

  // Force retry of failed enrollment
  async retryEnrollment(paymentId: string): Promise<boolean> {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: { user: true }
      });

      if (!payment) {
        return false;
      }

      console.log(`[Payment Recovery] Retrying enrollment for payment ${paymentId}`);

      // Only attempt enrollment if payment is successfully paid
      if (payment.status !== "COMPLETED") {
        console.warn(`[Payment Recovery] Cannot enroll: payment ${paymentId} is not completed`);
        return false;
      }

      const enrollment = await enrollmentService.enrollUser(payment.userId, payment.packageId);

      if (enrollment && enrollment.status === "ENROLLED") {
        // Update enrollment status
        await prisma.payment.update({
          where: { id: paymentId },
          data: {
            enrollmentStatus: "ENROLLED"
          }
        });

        console.log(`[Payment Recovery] Enrollment succeeded for payment ${paymentId}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`[Payment Recovery] Error retrying enrollment:`, error);
      return false;
    }
  },

  // Get recovery status for a payment
  async getRecoveryStatus(paymentId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        failedPaymentQueue: true,
        webhookRetryQueue: true,
        emailQueue: {
          where: { status: { in: ["PENDING", "FAILED_PERMANENT", "DLQ"] } }
        }
      }
    });

    if (!payment) {
      return null;
    }

    return {
      paymentId,
      currentStatus: payment.status,
      recoveryAttempts: payment.recoveryAttempts || 0,
      failedPaymentQueue: payment.failedPaymentQueue,
      webhookRetryQueue: payment.webhookRetryQueue,
      pendingEmails: payment.emailQueue,
      lastFailureTime: payment.failureReason ? new Date() : null
    };
  }
};

// Helper functions

function isPaymobError(failureCode: string): boolean {
  return failureCode.startsWith("PAYMOB_");
}

function isNetworkError(failureCode: string): boolean {
  return failureCode.includes("NETWORK") || failureCode === "PAYMOB_TIMEOUT";
}

function isCardError(failureCode: string): boolean {
  const cardErrors = [
    "INSUFFICIENT_FUNDS",
    "CARD_EXPIRED",
    "INVALID_CARD",
    "FRAUD_SUSPECTED",
    "CARD_DECLINED",
    "THREE_D_SECURE_FAILED"
  ];
  return cardErrors.includes(failureCode);
}

async function handlePaymobError(paymentId: string, failureCode: string, actions: string[]) {
  console.log(`[Payment Recovery] Handling Paymob error ${failureCode} for payment ${paymentId}`);

  // Queue for automatic recovery with exponential backoff
  await queueFailedPaymentForRecovery(paymentId, "PAYMOB_ERROR", failureCode);
  actions.push(`Queued for automatic recovery (${failureCode})`);

  // If rate limited, add info about backoff
  if (failureCode === "PAYMOB_RATE_LIMITED") {
    actions.push("Rate limited - will retry with exponential backoff");
  }

  // If server error, retry might help
  if (failureCode === "PAYMOB_SERVER_ERROR") {
    actions.push("Server error detected - automatic retry in 10 minutes");
  }
}

async function handleNetworkError(paymentId: string, failureCode: string, actions: string[]) {
  console.log(`[Payment Recovery] Handling network error ${failureCode} for payment ${paymentId}`);

  // Queue for recovery
  await queueFailedPaymentForRecovery(paymentId, "PAYMOB_ERROR", failureCode);
  actions.push("Queued for automatic recovery (network timeout)");
  actions.push("Will query Paymob for actual payment status");
}

async function handleCardError(paymentId: string, failureCode: string, actions: string[]) {
  console.log(`[Payment Recovery] Handling card error ${failureCode} for payment ${paymentId}`);

  // Card errors are not automatically retryable
  actions.push(`Card declined (${failureCode}) - user must retry with different payment method`);

  // Send notification email to user
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { user: true }
  });

  if (payment && payment.user) {
    await queueEmail(
      payment.user.email,
      "PAYMENT_FAILED",
      "Your Payment Could Not Be Processed",
      "payment-failed",
      {
        userName: payment.user.name || "User",
        paymentId,
        failureReason: failureCode,
        amount: payment.amount,
        currency: payment.currency
      },
      paymentId
    );

    actions.push("Notification email queued");
  }
}

async function handleUnknownError(paymentId: string, failureCode: string, actions: string[]) {
  console.log(`[Payment Recovery] Handling unknown error ${failureCode} for payment ${paymentId}`);

  // Queue for manual review
  actions.push(`Unknown error (${failureCode}) - marked for manual review`);

  // Try general recovery anyway
  try {
    await queueFailedPaymentForRecovery(paymentId, "PAYMOB_ERROR", failureCode);
    actions.push("Queued for automatic recovery attempt");
  } catch (error) {
    console.error(`[Payment Recovery] Error queuing for recovery:`, error);
  }
}

function determineNextAction(failureCode: string): string {
  if (isPaymobError(failureCode)) {
    return "Automatic recovery will attempt to query Paymob payment status";
  }

  if (isNetworkError(failureCode)) {
    return "Will retry once network is restored";
  }

  if (isCardError(failureCode)) {
    return "User must retry with different payment method";
  }

  return "Will attempt automatic recovery";
}

async function logRecoveryAttempt(paymentId: string, failureCode: string, actions: string[]) {
  try {
    // Log recovery attempt to database
    await prisma.paymentEvent.create({
      data: {
        paymentId,
        eventType: "RECOVERY_INITIATED",
        status: "PENDING",
        metadata: {
          failureCode,
          recoveryActions: actions
        }
      }
    });

    console.log(`[Payment Recovery] Logged recovery attempt for payment ${paymentId}`);
  } catch (error) {
    console.error(`[Payment Recovery] Error logging recovery attempt:`, error);
  }
}

export default paymentRecoveryService;
