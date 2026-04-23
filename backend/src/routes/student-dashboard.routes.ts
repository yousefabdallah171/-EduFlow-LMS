import { Router } from "express";

import { prisma } from "../config/database.js";
import { dashboardService } from "../services/dashboard.service.js";
import { courseService } from "../services/course.service.js";
import { enrollmentService } from "../services/enrollment.service.js";
import { deduplicationMiddleware } from "../middleware/deduplication.middleware.js";

const router = Router();

router.get(
  "/",
  deduplicationMiddleware({ key: (req) => `${req.user?.userId ?? "anon"}:student-dashboard` }),
  async (req, res, next) => {
    try {
      const userId = req.user!.userId;

      const [summary, user, course, enrollmentStatus, progressRows] = await Promise.all([
        dashboardService.getStudentDashboard(userId),
        prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, fullName: true, email: true, avatarUrl: true }
        }),
        courseService.getPublicCourse(),
        enrollmentService.getStatus(userId),
        prisma.lessonProgress.findMany({
          where: {
            userId,
            lesson: { isPublished: true }
          },
          select: {
            lessonId: true,
            watchTimeSeconds: true,
            completedAt: true
          }
        })
      ]);

      const totalWatchTimeSeconds = progressRows.reduce((sum, row) => sum + row.watchTimeSeconds, 0);
      const lessonsWatched = progressRows.filter((row) => row.watchTimeSeconds > 0).length;

      res.json({
        // Backward-compatible keys used by current frontend
        ...summary,

        // Consolidated Phase 3 payload
        user: user
          ? {
              id: user.id,
              name: user.fullName,
              email: user.email,
              avatar: user.avatarUrl
            }
          : null,
        course: {
          title: course.title,
          description: course.descriptionHtml,
          packages: course.packages
        },
        enrollments: [
          {
            courseId: "primary",
            status: enrollmentStatus.status ?? null,
            enrolledAt: enrollmentStatus.enrolledAt ? enrollmentStatus.enrolledAt.toISOString() : null
          }
        ],
        progress: progressRows.map((row) => ({
          lessonId: row.lessonId,
          watchTime: row.watchTimeSeconds,
          completed: row.completedAt !== null
        })),
        stats: {
          lessonsWatched,
          totalWatchTime: totalWatchTimeSeconds,
          coursesEnrolled: enrollmentStatus.enrolled ? 1 : 0
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

export { router as studentDashboardRoutes };
