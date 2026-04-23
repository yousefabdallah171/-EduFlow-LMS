import { Router } from "express";

import { prisma } from "../config/database.js";
import { analyticsService } from "../services/analytics.service.js";
import { deduplicationMiddleware } from "../middleware/deduplication.middleware.js";

const router = Router();

router.get(
  "/dashboard",
  deduplicationMiddleware({ key: () => "admin-dashboard" }),
  async (_req, res, next) => {
    try {
      const [kpis, totalStudents, totalRevenue, activeEnrollments, recentEnrollments] = await Promise.all([
        analyticsService.calculateKPIs("30d"),
        prisma.user.count({ where: { role: "STUDENT" } }),
        prisma.payment.aggregate({ where: { status: "COMPLETED" }, _sum: { amountPiasters: true } }),
        prisma.enrollment.count({ where: { status: "ACTIVE" } }),
        prisma.enrollment.findMany({
          orderBy: { enrolledAt: "desc" },
          take: 10,
          include: {
            user: { select: { id: true, fullName: true, email: true } }
          }
        })
      ]);

      res.json({
        stats: {
          totalStudents,
          totalRevenue: (totalRevenue._sum.amountPiasters ?? 0) / 100,
          activeEnrollments
        },
        recentEnrollments: recentEnrollments.map((enrollment) => ({
          student: enrollment.user,
          course: { id: "primary", title: "Yousef Abdallah Course" },
          date: enrollment.enrolledAt.toISOString()
        })),
        revenueChart: kpis.revenueTimeseries,
        topCourses: [
          {
            course: { id: "primary", title: "Yousef Abdallah Course" },
            enrollments: kpis.kpis.enrolledStudents.active,
            revenue: kpis.kpis.totalRevenue.amountEgp
          }
        ],
        alerts: [] as Array<{ type: string; message: string; date: string }>
      });
    } catch (error) {
      next(error);
    }
  }
);

export { router as adminDashboardRoutes };

