import { Router } from "express";

import { analyticsService } from "../services/analytics.service.js";
import { deduplicationMiddleware } from "../middleware/deduplication.middleware.js";

const router = Router();

router.get(
  "/analytics/course/:courseId",
  deduplicationMiddleware({ key: (req) => `admin-course-analytics:${req.params.courseId ?? "primary"}` }),
  async (req, res, next) => {
    try {
      const courseId = req.params.courseId || "primary";
      const analytics = await analyticsService.calculateKPIs("30d");

      res.json({
        courseId,
        period: analytics.period,
        generatedAt: analytics.generatedAt,
        kpis: analytics.kpis,
        revenueTimeseries: analytics.revenueTimeseries,
        enrollmentTimeseries: analytics.enrollmentTimeseries,
        topLessons: analytics.topLessons,
        dropOffLessons: analytics.dropOffLessons
      });
    } catch (error) {
      next(error);
    }
  }
);

export { router as courseAnalyticsRoutes };

