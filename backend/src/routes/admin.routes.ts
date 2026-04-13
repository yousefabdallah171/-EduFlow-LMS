import { Router } from "express";

import { adminAnalyticsController } from "../controllers/admin/analytics.controller.js";
import { adminCouponsController } from "../controllers/admin/coupons.controller.js";
import { adminLessonsController } from "../controllers/admin/lessons.controller.js";
import { adminPricingController } from "../controllers/admin/pricing.controller.js";
import { adminStudentsController } from "../controllers/admin/students.controller.js";
import { adminUploadsController } from "../controllers/admin/uploads.controller.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ scope: "admin" });
});
router.get("/students", adminStudentsController.list);
router.get("/students/search", adminStudentsController.search);
router.post("/students/:studentId/enroll", adminStudentsController.enroll);
router.post("/students/:studentId/revoke", adminStudentsController.revoke);
router.get("/coupons", adminCouponsController.list);
router.post("/coupons", adminCouponsController.create);
router.patch("/coupons/:couponId", adminCouponsController.update);
router.delete("/coupons/:couponId", adminCouponsController.remove);
router.get("/pricing", adminPricingController.get);
router.patch("/pricing", adminPricingController.update);
router.get("/lessons", adminLessonsController.list);
router.post("/lessons", adminLessonsController.create);
router.patch("/lessons/:lessonId", adminLessonsController.update);
router.delete("/lessons/:lessonId", adminLessonsController.remove);
router.post("/lessons/reorder", adminLessonsController.reorder);
router.get("/uploads", adminUploadsController.list);
router.post("/uploads", adminUploadsController.create);
router.head("/uploads/:id", adminUploadsController.head);
router.patch("/uploads/:id", adminUploadsController.patch);
router.delete("/uploads/:id", adminUploadsController.remove);
router.get("/analytics", adminAnalyticsController.analytics);
router.get("/payments", adminAnalyticsController.payments);
router.post("/payments/:paymentId/mark-paid", adminAnalyticsController.markPaid);

export { router as adminRoutes };
