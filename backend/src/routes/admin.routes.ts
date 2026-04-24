import { Router } from "express";

import { adminAnalyticsController } from "../controllers/admin/analytics.controller.js";
import { adminAuditController } from "../controllers/admin/audit.controller.js";
import { adminCouponsController } from "../controllers/admin/coupons.controller.js";
import { adminLessonsController } from "../controllers/admin/lessons.controller.js";
import { adminNotificationsController } from "../controllers/admin/notifications.controller.js";
import { adminOrdersController } from "../controllers/admin/orders.controller.js";
import { adminPricingController } from "../controllers/admin/pricing.controller.js";
import { adminSettingsController } from "../controllers/admin/settings.controller.js";
import { adminStudentsController, verifyAdminCanAccessStudent } from "../controllers/admin/students.controller.js";
import { adminUploadsController } from "../controllers/admin/uploads.controller.js";
import { adminVideoSecurityController } from "../controllers/admin/video-security.controller.js";
import * as sectionsController from "../controllers/admin/sections.controller.js";
import { resourcesController as adminResourcesController } from "../controllers/resources.controller.js";
import { ticketsController } from "../controllers/tickets.controller.js";
import { adminRecoveryController } from "../controllers/admin-recovery.controller.js";
import { auditMiddleware } from "../middleware/audit.middleware.js";
import { requireRole } from "../middleware/rbac.middleware.js";
import { adminSearchRateLimit } from "../middleware/rate-limit.middleware.js";
import { adminDashboardRoutes } from "./admin-dashboard.routes.js";
import { courseAnalyticsRoutes } from "./course-analytics.routes.js";

const router = Router();

router.use(auditMiddleware);
router.use(adminDashboardRoutes);
router.use(courseAnalyticsRoutes);

router.get("/health", (_req, res) => {
  res.json({ scope: "admin" });
});
router.get("/students", adminStudentsController.list);
router.get("/students/search", adminSearchRateLimit, adminStudentsController.search);
router.get("/students/:studentId", verifyAdminCanAccessStudent, adminStudentsController.detail);
router.post("/students/:studentId/enroll", verifyAdminCanAccessStudent, adminStudentsController.enroll);
router.post("/students/:studentId/revoke", verifyAdminCanAccessStudent, adminStudentsController.revoke);
router.get("/coupons", adminCouponsController.list);
router.post("/coupons", adminCouponsController.create);
router.patch("/coupons/:couponId", adminCouponsController.update);
router.delete("/coupons/:couponId", adminCouponsController.remove);
router.get("/pricing", adminPricingController.get);
router.patch("/pricing", adminPricingController.update);
router.post("/pricing/packages", adminPricingController.createPackage);
router.patch("/pricing/packages/:packageId", adminPricingController.updatePackage);

// Sections
router.get("/sections", sectionsController.getAllSections);
router.get("/sections/:sectionId", sectionsController.getSectionById);
router.post("/sections", sectionsController.createSection);
router.put("/sections/:sectionId", sectionsController.updateSection);
router.delete("/sections/:sectionId", sectionsController.deleteSection);
router.post("/sections/reorder", sectionsController.reorderSections);

router.get("/lessons", adminLessonsController.list);
router.post("/lessons", adminLessonsController.create);
router.get("/lessons/:lessonId", adminLessonsController.detail);
router.put("/lessons/:lessonId", adminLessonsController.update);
router.patch("/lessons/:lessonId", adminLessonsController.update);
router.delete("/lessons/:lessonId", adminLessonsController.remove);
router.post("/lessons/reorder", adminLessonsController.reorder);
router.patch("/lessons/:lessonId/preview", adminLessonsController.togglePreview);
router.get("/lessons/:id/resources", adminResourcesController.list);
router.post("/lessons/:id/resources", adminResourcesController.create);
router.delete("/lessons/:id/resources/:resourceId", adminResourcesController.remove);
router.get("/uploads", adminUploadsController.list);
router.post("/uploads", adminUploadsController.create);
router.head("/uploads/:id", adminUploadsController.head);
router.patch("/uploads/:id", adminUploadsController.patch);
router.delete("/uploads/:id", adminUploadsController.remove);
router.get("/analytics", adminAnalyticsController.analytics);
router.get("/payments", adminAnalyticsController.payments);
router.post("/payments/:paymentId/mark-paid", adminAnalyticsController.markPaid);

// Orders
router.get("/orders/export-csv", adminOrdersController.exportCsv);
router.get("/orders", adminOrdersController.list);
router.get("/orders/:id", adminOrdersController.detail);
router.patch("/orders/:id/mark-paid", adminOrdersController.markPaid);

// Audit logs
router.get("/audit", adminAuditController.list);

// Video security
router.get("/video-security/events", adminVideoSecurityController.list);

// Support tickets (admin only)
router.get("/tickets", requireRole("ADMIN"), ticketsController.listAll);
router.patch("/tickets/:id/status", requireRole("ADMIN"), ticketsController.updateStatus);
router.post("/tickets/:id/reply", requireRole("ADMIN"), ticketsController.reply);

// Payment recovery (admin only)
router.get("/payments/:paymentId/recovery/status", requireRole("ADMIN"), adminRecoveryController.getRecoveryStatus);
router.post("/payments/:paymentId/recovery/override", requireRole("ADMIN"), adminRecoveryController.overridePaymentStatus);
router.post("/payments/:paymentId/recovery/retry", requireRole("ADMIN"), adminRecoveryController.retryPayment);
router.post("/payments/:paymentId/recovery/cancel", requireRole("ADMIN"), adminRecoveryController.cancelPayment);
router.post("/payments/:paymentId/recovery/reconcile", requireRole("ADMIN"), adminRecoveryController.reconcileWithPaymob);
router.get("/payments/:paymentId/recovery/audit-log", requireRole("ADMIN"), adminRecoveryController.getAuditLog);

// Settings
router.get("/settings/course", adminSettingsController.getCourse);
router.patch("/settings/course", adminSettingsController.updateCourse);
router.get("/settings/system", adminSettingsController.getSystem);
// SECURITY: Dynamic system configuration disabled - use environment variables instead
// router.patch("/settings/system", adminSettingsController.updateSystem);

// Notification templates
router.get("/notifications/templates", adminNotificationsController.list);
router.patch("/notifications/templates/:id", adminNotificationsController.update);
router.post("/notifications/broadcast", adminNotificationsController.broadcast);

export { router as adminRoutes };
