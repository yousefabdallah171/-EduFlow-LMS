import { prisma } from "../config/database.js";
import { redis } from "../config/redis.js";
import { env } from "../config/env.js";
import { ENROLLMENT_STATUS } from "../constants/index.js";
import { prometheus } from "../observability/prometheus.js";

export type StudentDashboardPayload = {
  lastLessonId: string | null;
  completionPercent: number;
  enrolled: boolean;
  status: string | null;
  enrolledAt: string | null;
  totalWatchTimeSeconds: number;
  lessonsWatched: number;
  progress: Array<{
    lessonId: string;
    watchTime: number;
    completed: boolean;
  }>;
};

const DASHBOARD_CACHE_TTL_SECONDS = env.CACHE_TTL_DASHBOARD_SECONDS;

const dashboardCacheKey = (userId: string) => `student:dashboard:${userId}`;

export const dashboardService = {
  async getStudentDashboard(userId: string): Promise<StudentDashboardPayload> {
    try {
      const cached = await redis.get(dashboardCacheKey(userId));
      if (cached) {
        try {
          prometheus.recordCacheHit("student_dashboard");
          return JSON.parse(cached) as StudentDashboardPayload;
        } catch {
          // Fall through to DB.
        }
      }
      prometheus.recordCacheMiss("student_dashboard");
    } catch {
      // ignore redis failures
    }

    const [enrollment, allLessons, progress] = await Promise.all([
      prisma.enrollment.findUnique({ where: { userId } }),
      prisma.lesson.findMany({ where: { isPublished: true }, select: { id: true } }),
      prisma.lessonProgress.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" }
      })
    ]);

    const completed = progress.filter((p) => p.completedAt !== null).length;
    const total = allLessons.length;
    const completionPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
    const lastLesson = progress[0];
    const totalWatchTimeSeconds = progress.reduce((sum, p) => sum + p.watchTimeSeconds, 0);
    const lessonsWatched = progress.filter((p) => p.watchTimeSeconds > 0).length;

    const payload: StudentDashboardPayload = {
      lastLessonId: lastLesson?.lessonId ?? null,
      completionPercent,
      enrolled: enrollment?.status === ENROLLMENT_STATUS.ACTIVE,
      status: enrollment?.status ?? null,
      enrolledAt: enrollment?.enrolledAt?.toISOString() ?? null,
      totalWatchTimeSeconds,
      lessonsWatched,
      progress: progress.map((p) => ({
        lessonId: p.lessonId,
        watchTime: p.watchTimeSeconds,
        completed: p.completedAt !== null
      }))
    };

    try {
      await redis.set(dashboardCacheKey(userId), JSON.stringify(payload), "EX", DASHBOARD_CACHE_TTL_SECONDS, "NX");
    } catch {
      // ignore redis failures
    }
    return payload;
  },

  async invalidateStudentDashboard(userId: string) {
    try {
      await redis.del(dashboardCacheKey(userId));
    } catch {
      // ignore redis failures
    }
  }
};
