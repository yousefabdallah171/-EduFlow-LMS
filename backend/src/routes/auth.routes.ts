import { Router } from "express";

import { authController } from "../controllers/auth.controller.js";
import { authRateLimit } from "../middleware/rate-limit.middleware.js";

const router = Router();

router.use(authRateLimit);
router.get("/health", (_req, res) => {
  res.json({ ok: true });
});
router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/oauth/google", authController.googleStart);
router.get("/oauth/google/callback", authController.googleCallback);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.get("/verify-email", authController.verifyEmail);

export { router as authRoutes };
