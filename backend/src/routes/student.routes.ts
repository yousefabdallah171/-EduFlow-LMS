import { Router } from "express";

import { prisma } from "../config/database.js";
import { lessonController } from "../controllers/lesson.controller.js";
import { paymentController } from "../controllers/payment.controller.js";
import { webhookController } from "../controllers/webhook.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { validatePaymobHmac } from "../middleware/hmac.middleware.js";
import { paymentRateLimit } from "../middleware/rate-limit.middleware.js";
import { requireRole } from "../middleware/rbac.middleware.js";

const router = Router();

router.get("/course", async (_req, res, next) => {
  try {
    const [settings, lessons] = await Promise.all([
      prisma.courseSettings.findUnique({ where: { id: 1 } }),
      prisma.lesson.findMany({
        where: { isPublished: true },
        select: { id: true, titleEn: true, titleAr: true, durationSeconds: true, sortOrder: true },
        orderBy: { sortOrder: "asc" }
      })
    ]);

    res.json({
      title: settings?.titleEn ?? "EduFlow Course",
      descriptionHtml: settings?.descriptionEn ?? "",
      priceEgp: settings ? settings.pricePiasters / 100 : 0,
      currency: settings?.currency ?? "EGP",
      lessonCount: lessons.length,
      totalDurationSeconds: 0,
      isEnrollmentOpen: settings?.isEnrollmentOpen ?? false,
      enrolled: false,
      lessons: lessons.map((l) => ({
        id: l.id,
        title: l.titleEn,
        titleAr: l.titleAr,
        durationSeconds: l.durationSeconds,
        sortOrder: l.sortOrder
      }))
    });
  } catch (error) {
    next(error);
  }
});

router.post("/webhooks/paymob", validatePaymobHmac, webhookController.paymob);
router.get("/enrollment", authenticate, requireRole("STUDENT"), paymentController.getEnrollmentStatus);
router.post("/checkout", authenticate, requireRole("STUDENT"), paymentRateLimit, paymentController.checkout);
router.get("/lessons/preview", lessonController.preview);
router.get("/lessons", authenticate, requireRole("STUDENT"), lessonController.list);
router.get("/lessons/:id", authenticate, requireRole("STUDENT"), lessonController.detail);
router.post("/lessons/:id/progress", authenticate, requireRole("STUDENT"), lessonController.updateProgress);
router.get("/video/:id/playlist.m3u8", lessonController.playlist);
router.get("/video/:id/key", lessonController.key);
router.get("/video/:id/segment", lessonController.segment);
router.get("/video/:id/:segment", lessonController.segment);
router.post(
  "/checkout/validate-coupon",
  authenticate,
  requireRole("STUDENT"),
  paymentRateLimit,
  paymentController.validateCoupon
);

export { router as studentRoutes };
