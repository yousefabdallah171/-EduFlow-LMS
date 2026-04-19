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
import { paymentRateLimit } from "../middleware/rate-limit.middleware.js";
import { requireRole } from "../middleware/rbac.middleware.js";

const router = Router();

router.get("/student/dashboard", authenticate, requireRole("STUDENT"), studentController.dashboard);

router.get("/course", async (_req, res, next) => {
  try {
    const [settings, lessons, packages] = await Promise.all([
      prisma.courseSettings.findUnique({ where: { id: 1 } }),
      prisma.lesson.findMany({
        where: { isPublished: true },
        select: { id: true, titleEn: true, titleAr: true, durationSeconds: true, sortOrder: true },
        orderBy: { sortOrder: "asc" }
      }),
      prisma.coursePackage.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" }
      })
    ]);

    const primaryPackage = packages[0];

    res.json({
      title: settings?.titleEn ?? "AI Workflow: From Idea to Production",
      titleEn: settings?.titleEn ?? "AI Workflow: From Idea to Production",
      titleAr: settings?.titleAr ?? "AI Workflow: من الفكرة إلى الـ Production",
      descriptionHtml: settings?.descriptionEn ?? "",
      descriptionHtmlEn: settings?.descriptionEn ?? "",
      descriptionHtmlAr: settings?.descriptionAr ?? "",
      priceEgp: primaryPackage ? primaryPackage.pricePiasters / 100 : settings ? settings.pricePiasters / 100 : 0,
      currency: primaryPackage?.currency ?? settings?.currency ?? "EGP",
      lessonCount: lessons.length,
      totalDurationSeconds: lessons.reduce((total, lesson) => total + (lesson.durationSeconds ?? 0), 0),
      isEnrollmentOpen: settings?.isEnrollmentOpen ?? false,
      enrolled: false,
      lessons: lessons.map((l) => ({
        id: l.id,
        title: l.titleEn,
        titleAr: l.titleAr,
        durationSeconds: l.durationSeconds,
        sortOrder: l.sortOrder
      })),
      packages: packages.map((coursePackage) => ({
        id: coursePackage.id,
        titleEn: coursePackage.titleEn,
        titleAr: coursePackage.titleAr,
        descriptionEn: coursePackage.descriptionEn,
        descriptionAr: coursePackage.descriptionAr,
        priceEgp: coursePackage.pricePiasters / 100,
        currency: coursePackage.currency,
        sortOrder: coursePackage.sortOrder
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
router.get("/lessons/grouped", authenticate, requireRole("STUDENT"), lessonController.getAllLessonsGrouped);
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
    const payments = await prisma.payment.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, amountPiasters: true, currency: true, status: true, createdAt: true }
    });
    res.json({ orders: payments.map(p => ({ ...p, amountEgp: p.amountPiasters / 100 })) });
  } catch (e) { next(e); }
});

// Support tickets
router.get("/student/tickets", authenticate, requireRole("STUDENT"), ticketsController.listMine);
router.post("/student/tickets", authenticate, requireRole("STUDENT"), ticketsController.create);

export { router as studentRoutes };
