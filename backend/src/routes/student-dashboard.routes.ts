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

      const [summary, user, course, enrollmentStatus] = await Promise.all([
        dashboardService.getStudentDashboard(userId),
        prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, fullName: true, email: true, avatarUrl: true }
        }),
        courseService.getPublicCourse(),
        enrollmentService.getStatus(userId)
      ]);

      const totalWatchTimeSeconds = summary.totalWatchTimeSeconds;
      const lessonsWatched = summary.lessonsWatched;

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
        progress: summary.progress,
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
