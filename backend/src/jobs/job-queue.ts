import Queue from "bull";
import { env } from "../config/env.js";

function queueRedisConfig() {
  const redisUrl = new URL(env.REDIS_URL);
  return {
    host: redisUrl.hostname,
    port: redisUrl.port ? parseInt(redisUrl.port, 10) : 6379,
    password: redisUrl.password || undefined,
    db: redisUrl.pathname && redisUrl.pathname !== "/" ? parseInt(redisUrl.pathname.slice(1), 10) : 0
  };
}

// Job queue instances
export const webhookRetryQueue = new Queue("webhook-retry", {
  redis: queueRedisConfig()
});

export const emailQueue = new Queue("email-queue", {
  redis: queueRedisConfig()
});

export const failedPaymentRecoveryQueue = new Queue("failed-payment-recovery", {
  redis: queueRedisConfig()
});

export const refundQueue = new Queue("refund-processing", {
  redis: queueRedisConfig()
});

export const videoProcessingQueue = new Queue("video-processing", {
  redis: queueRedisConfig()
});

// Event handlers for all queues
export function setupQueueErrorHandlers() {
  const queues = [webhookRetryQueue, emailQueue, failedPaymentRecoveryQueue, refundQueue, videoProcessingQueue];

  queues.forEach((queue) => {
    queue.on("error", (err) => {
      console.error(`[Queue: ${queue.name}] Error:`, err);
    });

    queue.on("failed", (job, err) => {
      console.error(`[Queue: ${queue.name}] Job ${job.id} failed:`, err.message);
    });

    queue.on("completed", (job) => {
      console.log(`[Queue: ${queue.name}] Job ${job.id} completed`);
    });

    queue.on("stalled", (job) => {
      console.warn(`[Queue: ${queue.name}] Job ${job.id} stalled`);
    });
  });
}

// Graceful shutdown of all queues
export async function closeAllQueues() {
  const queues = [webhookRetryQueue, emailQueue, failedPaymentRecoveryQueue, refundQueue, videoProcessingQueue];

  for (const queue of queues) {
    try {
      await queue.close();
      console.log(`[Queue: ${queue.name}] Closed successfully`);
    } catch (error) {
      console.error(`[Queue: ${queue.name}] Error closing:`, error);
    }
  }
}

// Get queue metrics
export async function getQueueMetrics() {
  return {
    webhookRetry: {
      name: webhookRetryQueue.name,
      counts: await webhookRetryQueue.getJobCounts(),
      paused: await webhookRetryQueue.isPaused()
    },
    email: {
      name: emailQueue.name,
      counts: await emailQueue.getJobCounts(),
      paused: await emailQueue.isPaused()
    },
    failedPaymentRecovery: {
      name: failedPaymentRecoveryQueue.name,
      counts: await failedPaymentRecoveryQueue.getJobCounts(),
      paused: await failedPaymentRecoveryQueue.isPaused()
    },
    refund: {
      name: refundQueue.name,
      counts: await refundQueue.getJobCounts(),
      paused: await refundQueue.isPaused()
    },
    videoProcessing: {
      name: videoProcessingQueue.name,
      counts: await videoProcessingQueue.getJobCounts(),
      paused: await videoProcessingQueue.isPaused()
    }
  };
}

export default {
  webhookRetryQueue,
  emailQueue,
  failedPaymentRecoveryQueue,
  refundQueue,
  setupQueueErrorHandlers,
  closeAllQueues,
  getQueueMetrics
};
