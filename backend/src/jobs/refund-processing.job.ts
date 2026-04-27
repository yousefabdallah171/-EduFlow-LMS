import type { Job } from "bull";
import { refundQueue } from "./job-queue.js";
import { refundService } from "../services/refund.service.js";
import { prisma } from "../config/database.js";

interface RefundJobData {
  paymentId: string;
  refundType: "FULL" | "PARTIAL";
  refundAmount: number;
  reason?: string;
  retryCount: number;
}

// Register refund processing job processor
export function setupRefundProcessor() {
  refundQueue.process(5, async (job: Job<RefundJobData>) => {
    const { paymentId, retryCount } = job.data;

    try {
      console.log(`[Refund Queue] Processing refund ${paymentId}, attempt ${retryCount + 1}`);

      // Process refund with Paymob
      await refundService.processPaymobRefund(paymentId);

      // Mark as processing in queue
      await prisma.refundQueue.update({
        where: { paymentId },
        data: { retryCount: retryCount + 1 }
      });

      console.log(`[Refund Queue] ✅ Refund ${paymentId} API call succeeded`);
      return { refundId: paymentId, status: "PROCESSING" };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const maxRetries = 3;

      console.error(`[Refund Queue] ❌ Refund ${paymentId} processing failed:`, errorMessage);

      // Determine if we should retry
      if (retryCount < maxRetries - 1) {
        // Exponential backoff: 5min, 15min, 1hr
        const backoffMs = [5 * 60 * 1000, 15 * 60 * 1000, 60 * 60 * 1000][retryCount];

        console.log(`[Refund Queue] Scheduling retry for ${paymentId} in ${backoffMs / 1000 / 60} minutes`);

        const nextRetryAt = new Date(Date.now() + backoffMs);
        await prisma.refundQueue.update({
          where: { paymentId },
          data: {
            retryCount: retryCount + 1,
            nextRetry: nextRetryAt,
            lastAttempt: new Date(),
            errorDetails: {
              lastError: errorMessage,
              lastAttemptAt: new Date().toISOString()
            }
          }
        });

        throw new Error(`Refund retry will be rescheduled. Next attempt in ${backoffMs / 1000 / 60} minutes`);
      } else {
        // Max retries exceeded
        console.error(`[Refund Queue] 🔴 Max retries exceeded for refund ${paymentId}`);

        await refundService.failRefund(paymentId, errorMessage);

        await prisma.refundQueue.update({
          where: { paymentId },
          data: {
            resolution: "FAILED",
            resolvedAt: new Date(),
            retryCount: retryCount + 1,
            errorDetails: { finalError: errorMessage }
          }
        });

        throw new Error(`Refund max retries exceeded for ${paymentId}`);
      }
    }
  });

  refundQueue.on("completed", (job) => {
    console.log(`[Refund Queue Job] Job ${job.id} completed successfully`);
  });

  refundQueue.on("failed", (job, err) => {
    console.error(`[Refund Queue Job] Job ${job.id} failed:`, err.message);
  });
}

// Queue a refund for processing
export async function queueRefundForProcessing(
  paymentId: string,
  refundType: "FULL" | "PARTIAL",
  refundAmount: number,
  reason?: string
) {
  try {
    // Create queue entry in database
    const queueEntry = await prisma.refundQueue.create({
      data: {
        paymentId,
        refundType,
        refundAmount,
        reason,
        retryCount: 0,
        maxRetries: 3,
        firstAttempt: new Date(),
        nextRetry: new Date(Date.now() + 30 * 1000) // First retry in 30 seconds
      }
    });

    // Add to Bull queue with delay
    await refundQueue.add(
      {
        paymentId,
        refundType,
        refundAmount,
        reason,
        retryCount: 0
      },
      {
        delay: 30 * 1000, // 30 second delay before first attempt
        attempts: 1, // Bull will handle retries via our logic
        backoff: {
          type: "fixed",
          delay: 1000
        },
        jobId: `refund-${paymentId}` // Unique job ID for idempotency
      }
    );

    console.log(`[Refund Queue] Queued refund ${paymentId} (${refundType}, ${refundAmount} piasters)`);
    return queueEntry;
  } catch (error) {
    console.error(`[Refund Queue] Failed to queue refund:`, error);
    throw error;
  }
}

export default {
  setupRefundProcessor,
  queueRefundForProcessing
};
