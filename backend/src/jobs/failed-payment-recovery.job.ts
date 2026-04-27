import type { Job } from "bull";
import { failedPaymentRecoveryQueue } from "./job-queue.js";
import { paymentService } from "../services/payment.service.js";
import { enrollmentService } from "../services/enrollment.service.js";
import { prisma } from "../config/database.js";

interface FailedPaymentRecoveryJobData {
  paymentId: string;
  failureType: "PAYMOB_ERROR" | "WEBHOOK_FAILED" | "ENROLLMENT_FAILED";
  failureCode: string;
  retryCount: number;
}

// Register failed payment recovery job processor
export function setupFailedPaymentRecoveryProcessor() {
  failedPaymentRecoveryQueue.process(3, async (job: Job<FailedPaymentRecoveryJobData>) => {
    const { paymentId, failureType, failureCode, retryCount } = job.data;

    try {
      console.log(`[Failed Payment Recovery] Processing payment ${paymentId}, failure type: ${failureType}, attempt ${retryCount + 1}`);

      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: { webhookRetryQueue: true }
      });

      if (!payment) {
        throw new Error(`Payment ${paymentId} not found`);
      }

      // Determine recovery action based on failure type and code
      let recoverySuccess = false;

      switch (failureType) {
        case "PAYMOB_ERROR":
          // For Paymob errors, check if the error is recoverable
          if (isRecoverablePaymobError(failureCode)) {
            recoverySuccess = await recoverFromPaymobError(paymentId, failureCode);
          } else {
            // Non-recoverable Paymob error - move to manual review
            await markForManualReview(paymentId, `Non-recoverable Paymob error: ${failureCode}`);
          }
          break;

        case "WEBHOOK_FAILED":
          // If webhook is still in retry queue, wait for it
          if (payment.webhookRetryQueue && payment.webhookRetryQueue.resolvedAt === null) {
            console.log(`[Failed Payment Recovery] Webhook still in retry queue for ${paymentId}. Deferring recovery.`);
            throw new Error("Webhook still in retry queue");
          }

          // If webhook resolved as failed, attempt late webhook recovery
          if (payment.webhookRetryQueue?.resolution === "FAILED") {
            recoverySuccess = await attemptLateWebhookRecovery(paymentId);
          }
          break;

        case "ENROLLMENT_FAILED":
          // Retry enrollment with exponential backoff
          recoverySuccess = await retryEnrollmentRecovery(paymentId, payment.enrollmentRetryCount || 0);
          break;
      }

      if (recoverySuccess) {
        // Mark as recovered
        await prisma.failedPaymentQueue.update({
          where: { paymentId },
          data: {
            resolvedAt: new Date(),
            resolution: "RECOVERED",
            retryCount: retryCount + 1
          }
        });

        console.log(`[Failed Payment Recovery] ✅ Payment ${paymentId} recovered successfully`);
        return { recovered: true };
      } else {
        // Still not recovered - check if we should retry
        const maxRetries = 3;

        if (retryCount < maxRetries - 1) {
          // Exponential backoff: 10min, 30min, 1hr
          const backoffMs = [10 * 60 * 1000, 30 * 60 * 1000, 60 * 60 * 1000][retryCount];

          console.log(`[Failed Payment Recovery] Scheduling retry for payment ${paymentId} in ${backoffMs / 1000 / 60} minutes`);

          // Update next retry time
          const nextRetryAt = new Date(Date.now() + backoffMs);
          await prisma.failedPaymentQueue.update({
            where: { paymentId },
            data: {
              retryCount: retryCount + 1,
              nextRetry: nextRetryAt
            }
          });

          // Re-queue for later
          throw new Error(`Payment recovery will be rescheduled. Next attempt in ${backoffMs / 1000 / 60} minutes`);
        } else {
          // Max retries exceeded - mark for manual review
          console.error(`[Failed Payment Recovery] 🔴 Max retries exceeded for payment ${paymentId}. Marking for manual review.`);

          await markForManualReview(paymentId, "Max automatic recovery attempts exceeded");

          await prisma.failedPaymentQueue.update({
            where: { paymentId },
            data: {
              resolvedAt: new Date(),
              resolution: "MANUAL_REVIEW",
              retryCount: retryCount + 1
            }
          });

          throw new Error(`Payment recovery max retries exceeded for ${paymentId}`);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`[Failed Payment Recovery] Error processing payment ${paymentId}:`, errorMessage);
      throw error;
    }
  });

  failedPaymentRecoveryQueue.on("completed", (job) => {
    console.log(`[Failed Payment Recovery Job] Job ${job.id} completed successfully`);
  });

  failedPaymentRecoveryQueue.on("failed", (job, err) => {
    console.error(`[Failed Payment Recovery Job] Job ${job.id} failed:`, err.message);
  });
}

// Check if a Paymob error is recoverable
function isRecoverablePaymobError(failureCode: string): boolean {
  const recoverableErrors = [
    "PAYMOB_RATE_LIMITED", // Can retry after waiting
    "PAYMOB_TIMEOUT", // Network timeout - might succeed on retry
    "PAYMOB_SERVER_ERROR" // 5xx errors - might be transient
  ];

  return recoverableErrors.includes(failureCode);
}

// Recover from Paymob API errors by attempting to query payment status
async function recoverFromPaymobError(paymentId: string, failureCode: string): Promise<boolean> {
  try {
    console.log(`[Failed Payment Recovery] Attempting to recover from Paymob error ${failureCode} for payment ${paymentId}`);

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId }
    });

    if (!payment) {
      return false;
    }

    // Query Paymob for actual payment status
    const paymobPayment = await paymentService.queryPaymobPaymentStatus(payment.paymobOrderId);

    if (paymobPayment && paymobPayment.success) {
      // Payment actually succeeded! Update status
      console.log(`[Failed Payment Recovery] Payment ${paymentId} actually succeeded on Paymob. Updating status.`);

      await paymentService.processWebhook(
        {
          type: "transaction.success",
          obj: paymobPayment
        } as Record<string, unknown>,
        "" // HMAC not needed for recovery
      );

      return true;
    }

    return false;
  } catch (error) {
    console.error(`[Failed Payment Recovery] Error recovering from Paymob error:`, error);
    return false;
  }
}

// Attempt late webhook recovery (webhook arrives after payment marked FAILED)
async function attemptLateWebhookRecovery(paymentId: string): Promise<boolean> {
  try {
    console.log(`[Failed Payment Recovery] Attempting late webhook recovery for payment ${paymentId}`);

    const webhookRetry = await prisma.webhookRetryQueue.findUnique({
      where: { paymentId }
    });

    if (!webhookRetry) {
      return false;
    }

    // Re-process the webhook payload
    const result = await paymentService.processWebhook(webhookRetry.payload as Record<string, unknown>, "");

    if (result.success) {
      console.log(`[Failed Payment Recovery] Late webhook recovery succeeded for payment ${paymentId}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`[Failed Payment Recovery] Error in late webhook recovery:`, error);
    return false;
  }
}

// Retry enrollment with exponential backoff
async function retryEnrollmentRecovery(paymentId: string, previousRetryCount: number): Promise<boolean> {
  try {
    console.log(`[Failed Payment Recovery] Attempting enrollment recovery for payment ${paymentId}`);

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId }
    });

    if (!payment) {
      return false;
    }

    // Attempt to enroll user in package
    const enrollment = await enrollmentService.enrollUser(payment.userId, payment.packageId);

    if (enrollment && enrollment.status === "ENROLLED") {
      console.log(`[Failed Payment Recovery] Enrollment recovery succeeded for payment ${paymentId}`);

      // Update payment status to indicate enrollment happened
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          enrollmentStatus: "ENROLLED",
          enrollmentRetryCount: previousRetryCount + 1,
          enrollmentLastRetryAt: new Date()
        }
      });

      return true;
    }

    // Update retry count for next attempt
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        enrollmentRetryCount: previousRetryCount + 1,
        enrollmentLastRetryAt: new Date(),
        enrollmentNextRetryAt: calculateNextRetryTime(previousRetryCount)
      }
    });

    return false;
  } catch (error) {
    console.error(`[Failed Payment Recovery] Error in enrollment recovery:`, error);
    return false;
  }
}

// Calculate exponential backoff time for enrollment retry
function calculateNextRetryTime(retryCount: number): Date {
  // 5min, 15min, 1hr backoff
  const backoffMs = [5 * 60 * 1000, 15 * 60 * 1000, 60 * 60 * 1000][retryCount] || 60 * 60 * 1000;
  return new Date(Date.now() + backoffMs);
}

// Mark payment for manual review
async function markForManualReview(paymentId: string, reason: string) {
  try {
    // Create notification for admin dashboard
    console.log(`[Failed Payment Recovery] Payment ${paymentId} marked for manual review: ${reason}`);

    // In real implementation, this would send alert to admin panel
    // For now just log it
  } catch (error) {
    console.error(`[Failed Payment Recovery] Error marking for manual review:`, error);
  }
}

// Queue a failed payment for recovery
export async function queueFailedPaymentForRecovery(
  paymentId: string,
  failureType: "PAYMOB_ERROR" | "WEBHOOK_FAILED" | "ENROLLMENT_FAILED",
  failureCode: string
) {
  try {
    // Create queue entry in database
    const queueEntry = await prisma.failedPaymentQueue.create({
      data: {
        paymentId,
        failureType,
        failureCode,
        retryCount: 0,
        maxRetries: 3,
        firstAttempt: new Date(),
        nextRetry: new Date(Date.now() + 10 * 60 * 1000) // First retry in 10 minutes
      }
    });

    // Add to Bull queue with delay
    await failedPaymentRecoveryQueue.add(
      {
        paymentId,
        failureType,
        failureCode,
        retryCount: 0
      },
      {
        delay: 10 * 60 * 1000, // 10 minute delay before first recovery attempt
        attempts: 1, // Bull will handle retries via our logic
        backoff: {
          type: "fixed",
          delay: 1000
        },
        jobId: `recovery-${paymentId}` // Unique job ID for idempotency
      }
    );

    console.log(`[Failed Payment Recovery] Queued payment ${paymentId} for recovery (${failureType})`);
    return queueEntry;
  } catch (error) {
    console.error(`[Failed Payment Recovery] Failed to queue payment for recovery:`, error);
    throw error;
  }
}

export default {
  setupFailedPaymentRecoveryProcessor,
  queueFailedPaymentForRecovery
};
