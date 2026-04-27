import { Router } from "express";

import { authController } from "../controllers/auth.controller.js";
import { authRateLimit, refreshRateLimit } from "../middleware/rate-limit.middleware.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ ok: true });
});
router.post("/register", authRateLimit, authController.register);
router.post("/login", authRateLimit, authController.login);
router.get("/oauth/google", authController.googleStart);
router.get("/oauth/google/callback", authController.googleCallback);
router.post("/refresh", refreshRateLimit, authController.refresh);
router.post("/logout", authController.logout);
router.post("/forgot-password", authRateLimit, authController.forgotPassword);
router.post("/resend-verification", authRateLimit, authController.resendVerification);
router.post("/reset-password", authRateLimit, authController.resetPassword);
router.get("/verify-email", authController.verifyEmail);

export { router as authRoutes };
