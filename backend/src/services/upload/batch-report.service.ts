import { prisma } from "../../config/database.js";

type RetryBatchInput = {
  initiatedByUserId: string;
  scheduledItems: number;
  totalFailedItems: number;
};

export const batchReportService = {
  async createRetryFailedReport(input: RetryBatchInput) {
    return prisma.batchOperationReport.create({
      data: {
        operationType: "RETRY_FAILED",
        initiatedByUserId: input.initiatedByUserId,
        totalItems: input.totalFailedItems,
        acceptedItems: input.scheduledItems,
        completedItems: input.scheduledItems,
        failedItems: Math.max(input.totalFailedItems - input.scheduledItems, 0),
        rejectedItems: 0,
        retriedItems: input.scheduledItems,
        pendingItems: 0,
        startedAt: new Date(),
        finishedAt: new Date(),
        summaryJson: {
          type: "retry-failed",
          scheduledItems: input.scheduledItems,
          totalFailedItems: input.totalFailedItems
        }
      }
    });
  },

  async getLatestSummary(initiatedByUserId: string, limit = 10) {
    return prisma.batchOperationReport.findMany({
      where: { initiatedByUserId },
      orderBy: { startedAt: "desc" },
      take: limit
    });
  }
};
