import { webhookRetryQueue, emailQueue, failedPaymentRecoveryQueue, getQueueMetrics } from "../jobs/job-queue.js";
import { prisma } from "../config/database.js";

interface QueueMetrics {
  timestamp: Date;
  webhookRetry: QueueStatus;
  email: QueueStatus;
  failedPaymentRecovery: QueueStatus;
  alerts: AlertItem[];
}

interface QueueStatus {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
  healthScore: number;
}

interface AlertItem {
  severity: "INFO" | "WARNING" | "CRITICAL";
  queue: string;
  message: string;
  timestamp: Date;
}

export const queueMonitoringService = {
  // Get current queue health metrics
  async getQueueHealth(): Promise<QueueMetrics> {
    try {
      const metrics = await getQueueMetrics();
      const alerts: AlertItem[] = [];

      // Process webhook retry queue
      const webhookRetry: QueueStatus = {
        name: metrics.webhookRetry.name,
        waiting: metrics.webhookRetry.counts.waiting || 0,
        active: metrics.webhookRetry.counts.active || 0,
        completed: metrics.webhookRetry.counts.completed || 0,
        failed: metrics.webhookRetry.counts.failed || 0,
        delayed: metrics.webhookRetry.counts.delayed || 0,
        paused: metrics.webhookRetry.paused,
        healthScore: 100
      };

      // Process email queue
      const email: QueueStatus = {
        name: metrics.email.name,
        waiting: metrics.email.counts.waiting || 0,
        active: metrics.email.counts.active || 0,
        completed: metrics.email.counts.completed || 0,
        failed: metrics.email.counts.failed || 0,
        delayed: metrics.email.counts.delayed || 0,
        paused: metrics.email.paused,
        healthScore: 100
      };

      // Process failed payment recovery queue
      const failedPaymentRecovery: QueueStatus = {
        name: metrics.failedPaymentRecovery.name,
        waiting: metrics.failedPaymentRecovery.counts.waiting || 0,
        active: metrics.failedPaymentRecovery.counts.active || 0,
        completed: metrics.failedPaymentRecovery.counts.completed || 0,
        failed: metrics.failedPaymentRecovery.counts.failed || 0,
        delayed: metrics.failedPaymentRecovery.counts.delayed || 0,
        paused: metrics.failedPaymentRecovery.paused,
        healthScore: 100
      };

      // Calculate health scores and generate alerts
      calculateHealthScore(webhookRetry, alerts, "webhook-retry");
      calculateHealthScore(email, alerts, "email");
      calculateHealthScore(failedPaymentRecovery, alerts, "failed-payment-recovery");

      // Check for stale jobs
      await checkForStaleJobs(alerts);

      // Check for queue bottlenecks
      await checkForBottlenecks(webhookRetry, email, failedPaymentRecovery, alerts);

      return {
        timestamp: new Date(),
        webhookRetry,
        email,
        failedPaymentRecovery,
        alerts
      };
    } catch (error) {
      console.error("[Queue Monitoring] Error getting queue health:", error);
      throw error;
    }
  },

  // Get queue history for analytics
  async getQueueHistory(hours: number = 24) {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      // Count webhook retry outcomes
      const webhookRetryStats = await prisma.webhookRetryQueue.groupBy({
        by: ["resolution"],
        where: {
          createdAt: { gte: since }
        },
        _count: true
      });

      // Count email queue outcomes
      const emailStats = await prisma.emailQueue.groupBy({
        by: ["status"],
        where: {
          createdAt: { gte: since }
        },
        _count: true
      });

      // Count recovery outcomes
      const recoveryStats = await prisma.failedPaymentQueue.groupBy({
        by: ["resolution"],
        where: {
          createdAt: { gte: since }
        },
        _count: true
      });

      return {
        period: `Last ${hours} hours`,
        webhookRetry: webhookRetryStats,
        email: emailStats,
        recovery: recoveryStats,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error("[Queue Monitoring] Error getting queue history:", error);
      throw error;
    }
  },

  // Get DLQ (Dead Letter Queue) statistics
  async getDLQStatistics() {
    try {
      // Count emails in DLQ
      const dlqEmails = await prisma.emailQueue.groupBy({
        by: ["errorCode"],
        where: {
          status: "DLQ"
        },
        _count: true
      });

      // Get total DLQ count
      const totalDLQ = await prisma.emailQueue.count({
        where: { status: "DLQ" }
      });

      // Get oldest DLQ email
      const oldestDLQEmail = await prisma.emailQueue.findFirst({
        where: { status: "DLQ" },
        orderBy: { createdAt: "asc" }
      });

      return {
        totalEmails: totalDLQ,
        byErrorCode: dlqEmails,
        oldestEmail: oldestDLQEmail ? {
          id: oldestDLQEmail.id,
          createdAt: oldestDLQEmail.createdAt,
          daysOld: Math.floor((Date.now() - oldestDLQEmail.createdAt.getTime()) / (1000 * 60 * 60 * 24))
        } : null,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error("[Queue Monitoring] Error getting DLQ statistics:", error);
      throw error;
    }
  },

  // Get payment recovery statistics
  async getRecoveryStatistics(hours: number = 24) {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      // Failed payments
      const failedPayments = await prisma.failedPaymentQueue.count({
        where: { createdAt: { gte: since } }
      });

      // Recovered payments
      const recoveredPayments = await prisma.failedPaymentQueue.count({
        where: {
          createdAt: { gte: since },
          resolution: "RECOVERED"
        }
      });

      // Recovery rate
      const recoveryRate = failedPayments > 0 ? (recoveredPayments / failedPayments) * 100 : 0;

      // Average recovery time
      const avgRecoveryTime = await prisma.failedPaymentQueue.aggregate({
        where: {
          createdAt: { gte: since },
          resolvedAt: { not: null }
        },
        _avg: {
          recoveryAttempts: true
        }
      });

      // Failed recoveries (manual review)
      const manualReviewRequired = await prisma.failedPaymentQueue.count({
        where: {
          createdAt: { gte: since },
          resolution: "MANUAL_REVIEW"
        }
      });

      return {
        period: `Last ${hours} hours`,
        totalFailed: failedPayments,
        totalRecovered: recoveredPayments,
        recoveryRate: `${recoveryRate.toFixed(2)}%`,
        manualReviewRequired,
        avgRecoveryAttempts: avgRecoveryTime._avg.recoveryAttempts || 0,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error("[Queue Monitoring] Error getting recovery statistics:", error);
      throw error;
    }
  }
};

// Helper functions

function calculateHealthScore(status: QueueStatus, alerts: AlertItem[], queueName: string) {
  let healthScore = 100;

  // Penalize for waiting jobs
  if (status.waiting > 100) {
    healthScore -= 30;
    alerts.push({
      severity: "WARNING",
      queue: queueName,
      message: `Queue backlog: ${status.waiting} jobs waiting`,
      timestamp: new Date()
    });
  }

  if (status.waiting > 500) {
    healthScore -= 40;
    alerts.push({
      severity: "CRITICAL",
      queue: queueName,
      message: `Critical backlog: ${status.waiting} jobs waiting`,
      timestamp: new Date()
    });
  }

  // Penalize for failed jobs
  if (status.failed > 10) {
    healthScore -= 20;
    alerts.push({
      severity: "WARNING",
      queue: queueName,
      message: `${status.failed} failed jobs detected`,
      timestamp: new Date()
    });
  }

  if (status.failed > 50) {
    healthScore -= 30;
    alerts.push({
      severity: "CRITICAL",
      queue: queueName,
      message: `${status.failed} failed jobs - investigate immediately`,
      timestamp: new Date()
    });
  }

  // Check if queue is paused
  if (status.paused) {
    healthScore -= 50;
    alerts.push({
      severity: "CRITICAL",
      queue: queueName,
      message: "Queue is paused - check why",
      timestamp: new Date()
    });
  }

  status.healthScore = Math.max(0, healthScore);
}

async function checkForStaleJobs(alerts: AlertItem[]) {
  try {
    // Find webhook retry jobs stuck for more than 24 hours
    const staleWebhooks = await prisma.webhookRetryQueue.count({
      where: {
        resolvedAt: null,
        lastAttempt: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    });

    if (staleWebhooks > 0) {
      alerts.push({
        severity: "WARNING",
        queue: "webhook-retry",
        message: `${staleWebhooks} webhook jobs stale (>24 hours)`,
        timestamp: new Date()
      });
    }

    // Find email jobs stuck for more than 48 hours
    const staleEmails = await prisma.emailQueue.count({
      where: {
        status: "PENDING",
        lastAttempt: {
          lt: new Date(Date.now() - 48 * 60 * 60 * 1000)
        }
      }
    });

    if (staleEmails > 0) {
      alerts.push({
        severity: "WARNING",
        queue: "email",
        message: `${staleEmails} email jobs stale (>48 hours)`,
        timestamp: new Date()
      });
    }

    // Find recovery jobs stuck for more than 72 hours
    const staleRecoveries = await prisma.failedPaymentQueue.count({
      where: {
        resolvedAt: null,
        lastAttempt: {
          lt: new Date(Date.now() - 72 * 60 * 60 * 1000)
        }
      }
    });

    if (staleRecoveries > 0) {
      alerts.push({
        severity: "CRITICAL",
        queue: "failed-payment-recovery",
        message: `${staleRecoveries} recovery jobs stale (>72 hours)`,
        timestamp: new Date()
      });
    }
  } catch (error) {
    console.error("[Queue Monitoring] Error checking for stale jobs:", error);
  }
}

async function checkForBottlenecks(
  webhookStatus: QueueStatus,
  emailStatus: QueueStatus,
  recoveryStatus: QueueStatus,
  alerts: AlertItem[]
) {
  try {
    const totalWaiting = webhookStatus.waiting + emailStatus.waiting + recoveryStatus.waiting;

    if (totalWaiting > 1000) {
      alerts.push({
        severity: "CRITICAL",
        queue: "all",
        message: `System bottleneck: ${totalWaiting} total jobs queued across all services`,
        timestamp: new Date()
      });
    }

    // Check active job ratios
    const emailActiveRatio = emailStatus.active / Math.max(1, emailStatus.waiting + emailStatus.active);
    if (emailStatus.waiting > 50 && emailActiveRatio < 0.2) {
      alerts.push({
        severity: "WARNING",
        queue: "email",
        message: "Email queue throughput low - only 1-2 jobs active despite backlog",
        timestamp: new Date()
      });
    }
  } catch (error) {
    console.error("[Queue Monitoring] Error checking for bottlenecks:", error);
  }
}

export default queueMonitoringService;
