import { Router } from "express";

import { prisma } from "../config/database.js";
import { lessonController } from "../controllers/lesson.controller.js";
import { notesController } from "../controllers/notes.controller.js";
import { paymentController } from "../controllers/payment.controller.js";
import { profileController } from "../controllers/profile.controller.js";
import { resourcesController } from "../controllers/resources.controller.js";
import { studentController } from "../controllers/student.controller.js";
import { ticketsController } from "../controllers/tickets.controller.js";
import { webhookController } from "../controllers/webhook.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { validatePaymobHmac } from "../middleware/hmac.middleware.js";
import { paymentRateLimit, videoIpRateLimit } from "../middleware/rate-limit.middleware.js";
import { requireRole } from "../middleware/rbac.middleware.js";
import { courseService } from "../services/course.service.js";
import { studentDashboardRoutes } from "./student-dashboard.routes.js";
import { paymentService } from "../services/payment.service.js";
import { lessonDetailRoutes } from "./lesson-detail.routes.js";

const router = Router();

router.get("/student/dashboard/summary", authenticate, requireRole("STUDENT"), studentController.dashboard);
router.use("/student/dashboard", authenticate, requireRole("STUDENT"), studentDashboardRoutes);

router.get("/course", async (_req, res, next) => {
  try {
    const course = await courseService.getPublicCourse();
    res.json(course);
  } catch (error) {
    next(error);
  }
});

router.post("/webhooks/paymob", validatePaymobHmac, webhookController.paymob);
router.get("/enrollment", authenticate, requireRole("STUDENT"), paymentController.getEnrollmentStatus);
router.post("/checkout", authenticate, requireRole("STUDENT"), paymentRateLimit, paymentController.checkout);
router.get("/lessons/preview", lessonController.preview);
router.get("/lessons/grouped", authenticate, requireRole("STUDENT"), lessonController.getAllLessonsGrouped);
router.get("/lessons", authenticate, requireRole("STUDENT"), lessonController.list);
router.use("/lessons/:id", authenticate, requireRole("STUDENT"), lessonDetailRoutes);
router.get("/lessons/:id", authenticate, requireRole("STUDENT"), (req, res, next) => {
  res.setHeader("Deprecation", "true");
  res.setHeader("Link", '</api/v1/lessons/:id/detail>; rel="successor-version"');
  void lessonController.detail(req, res, next);
});
router.post("/lessons/:id/progress", authenticate, requireRole("STUDENT"), lessonController.updateProgress);
router.get("/video/:id/playlist.m3u8", videoIpRateLimit, lessonController.playlist);
router.get("/video/:id/key", videoIpRateLimit, lessonController.key);
router.get("/video/:id/segment", videoIpRateLimit, lessonController.segment);
router.get("/video/:id/:segment", videoIpRateLimit, lessonController.segment);
router.post(
  "/checkout/validate-coupon",
  authenticate,
  requireRole("STUDENT"),
  paymentRateLimit,
  paymentController.validateCoupon
);

// Notes routes (export must come before parameterized routes)
router.get("/student/notes/export", authenticate, requireRole("STUDENT"), notesController.export_);
router.get("/student/notes", authenticate, requireRole("STUDENT"), notesController.list);
router.post("/student/notes", authenticate, requireRole("STUDENT"), notesController.create);
router.patch("/student/notes/:id", authenticate, requireRole("STUDENT"), notesController.update);
router.delete("/student/notes/:id", authenticate, requireRole("STUDENT"), notesController.remove);

// Lesson resources
router.get("/lessons/:id/resources", authenticate, requireRole("STUDENT"), resourcesController.list);

// Profile routes
router.get("/student/profile", authenticate, requireRole("STUDENT"), profileController.get);
router.patch("/student/profile", authenticate, requireRole("STUDENT"), profileController.update);
router.patch("/student/profile/password", authenticate, requireRole("STUDENT"), profileController.updatePassword);

// Orders route
router.get("/student/orders", authenticate, requireRole("STUDENT"), async (req, res, next) => {
  try {
    const payments = await paymentService.listPaymentHistory(req.user!.userId);
    res.json({
      orders: payments.map((p) => ({
        id: p.id,
        amountEgp: p.amountEgp,
        currency: "EGP",
        status: p.status,
        createdAt: p.createdAt
      }))
    });
  } catch (e) { next(e); }
});

// Support tickets
router.get("/student/tickets", authenticate, requireRole("STUDENT"), ticketsController.listMine);
router.post("/student/tickets", authenticate, requireRole("STUDENT"), ticketsController.create);

export { router as studentRoutes };
