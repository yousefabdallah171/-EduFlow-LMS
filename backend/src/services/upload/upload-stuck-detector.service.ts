import { prisma } from "../../config/database.js";
import { env } from "../../config/env.js";

export const uploadStuckDetectorService = {
  async detectStuckSessions() {
    const thresholdDate = new Date(Date.now() - env.UPLOAD_QUEUE_STUCK_THRESHOLD_SECONDS * 1000);

    const stuckSessions = await prisma.uploadSession.findMany({
      where: {
        status: {
          in: ["UPLOADING", "PROCESSING", "PAUSED"]
        },
        updatedAt: {
          lt: thresholdDate
        }
      },
      orderBy: { updatedAt: "asc" },
      take: 100
    });

    return {
      thresholdSeconds: env.UPLOAD_QUEUE_STUCK_THRESHOLD_SECONDS,
      stuckCount: stuckSessions.length,
      stuckSessionIds: stuckSessions.map((session) => session.id)
    };
  }
};
