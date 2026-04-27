import type { Job } from "bull";
import { webhookRetryQueue } from "./job-queue.js";
import { paymentService } from "../services/payment.service.js";
import { prisma } from "../config/database.js";

interface WebhookRetryJobData {
  paymentId: string;
  payload: Record<string, unknown>;
  hmac: string;
  retryCount: number;
}

// Register webhook retry job processor
export function setupWebhookRetryProcessor() {
  webhookRetryQueue.process(5, async (job: Job<WebhookRetryJobData>) => {
    const { paymentId, payload, hmac, retryCount } = job.data;

    try {
      console.log(`[Webhook Retry] Processing payment ${paymentId}, attempt ${retryCount + 1}`);

      // Attempt to process webhook
      const result = await paymentService.processWebhook(payload as Record<string, unknown>, hmac);

      // Mark as resolved in queue
      await prisma.webhookRetryQueue.update({
        where: { paymentId },
        data: {
          resolvedAt: new Date(),
          resolution: "SUCCESS"
        }
      });

      console.log(`[Webhook Retry] ✅ Payment ${paymentId} webhook processed successfully`);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const maxRetries = 3;

      console.error(`[Webhook Retry] ❌ Payment ${paymentId} webhook processing failed:`, errorMessage);

      // Determine if we should retry
      if (retryCount < maxRetries - 1) {
        // Calculate exponential backoff (5min, 15min, 1hr)
        const backoffMs = [5 * 60 * 1000, 15 * 60 * 1000, 60 * 60 * 1000][retryCount];

        console.log(`[Webhook Retry] Scheduling retry for payment ${paymentId} in ${backoffMs / 1000 / 60} minutes`);

        // Update next retry time
        const nextRetryAt = new Date(Date.now() + backoffMs);
        await prisma.webhookRetryQueue.update({
          where: { paymentId },
          data: {
            retryCount: retryCount + 1,
            nextRetryAt,
            lastAttempt: new Date(),
            errorDetails: {
              lastError: errorMessage,
              lastAttemptAt: new Date().toISOString()
            }
          }
        });

        // Re-queue for later
        throw new Error(`Webhook retry will be rescheduled. Next attempt in ${backoffMs / 1000 / 60} minutes`);
      } else {
        // Max retries exceeded
        console.error(`[Webhook Retry] 🔴 Max retries exceeded for payment ${paymentId}`);

        await prisma.webhookRetryQueue.update({
          where: { paymentId },
          data: {
            resolvedAt: new Date(),
            resolution: "FAILED",
            retryCount: retryCount + 1
          }
        });

        throw new Error(`Webhook retry max retries exceeded for payment ${paymentId}`);
      }
    }
  });

  webhookRetryQueue.on("completed", (job) => {
    console.log(`[Webhook Retry Job] Job ${job.id} completed successfully`);
  });

  webhookRetryQueue.on("failed", (job, err) => {
    console.error(`[Webhook Retry Job] Job ${job.id} failed:`, err.message);
  });
}

// Queue a failed webhook for retry
export async function queueWebhookForRetry(
  paymentId: string,
  payload: Record<string, unknown>,
  hmac: string,
  error: Error
) {
  try {
    // Create queue entry in database
    const queueEntry = await prisma.webhookRetryQueue.create({
      data: {
        paymentId,
        payload,
        errorDetails: {
          error: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString()
        },
        retryCount: 0,
        nextRetryAt: new Date(Date.now() + 5 * 60 * 1000) // First retry in 5 minutes
      }
    });

    // Add to Bull queue with delay
    await webhookRetryQueue.add(
      {
        paymentId,
        payload,
        hmac,
        retryCount: 0
      },
      {
        delay: 5 * 60 * 1000, // 5 minute delay before first retry
        attempts: 1, // Bull will handle retries via our logic
        backoff: {
          type: "fixed",
          delay: 1000
        },
        jobId: `webhook-retry-${paymentId}` // Unique job ID for idempotency
      }
    );

    console.log(`[Webhook Retry] Queued payment ${paymentId} for retry`);
    return queueEntry;
  } catch (error) {
    console.error(`[Webhook Retry] Failed to queue webhook for retry:`, error);
    throw error;
  }
}

export default {
  setupWebhookRetryProcessor,
  queueWebhookForRetry
};
