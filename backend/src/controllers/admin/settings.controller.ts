import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../config/database.js";
import { courseService } from "../../services/course.service.js";

/**
 * SECURITY CONFIGURATION POLICY
 *
 * Environment variables (SMTP, Payment API keys, etc.) cannot be modified at runtime.
 * This prevents attackers from:
 * 1. Injecting malicious SMTP credentials (email spoofing)
 * 2. Hijacking payment processing via API key replacement
 * 3. Enabling other credential-based attacks
 *
 * Configuration must be set via:
 * - Development: .env file
 * - Production: Docker/K8s environment variables or secrets manager
 *
 * All configuration changes require application restart.
 */

const courseSchema = z.object({
  titleEn: z.string().min(1).optional(),
  titleAr: z.string().min(1).optional(),
  descriptionEn: z.string().optional(),
  descriptionAr: z.string().optional()
});

export const adminSettingsController = {
  async getCourse(_req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await prisma.courseSettings.findUnique({ where: { id: 1 } });
      res.json(settings ?? {});
    } catch (e) { next(e); }
  },
  async updateCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const data = courseSchema.parse(req.body);
      const settings = await prisma.courseSettings.upsert({
        where: { id: 1 },
        update: data,
        create: {
          id: 1,
          titleEn: data.titleEn ?? "Yousef Abdallah Course: From Idea to Production",
          titleAr: data.titleAr ?? "كورس يوسف عبدالله: من الفكرة إلى الـ Production",
          pricePiasters: 0,
          ...data
        }
      });
      await courseService.invalidatePublicCourseCache();
      res.json(settings);
    } catch (e) { next(e); }
  },
  async getSystem(_req: Request, res: Response) {
    // SECURITY: Return only status, not actual values (read-only)
    // Configuration must be set via environment variables at deployment
    res.json({
      smtpConfigured: !!process.env.SMTP_HOST,
      paymobConfigured: !!process.env.PAYMOB_API_KEY,
      storageConfigured: !!process.env.STORAGE_BUCKET,
      timestamp: new Date()
    });
  },
  async updateSystem(_req: Request, res: Response) {
    // SECURITY: Dynamic configuration updates are disabled to prevent unauthorized modification
    // Environment variables must be configured via:
    // 1. .env file (development)
    // 2. Docker/K8s environment (production)
    // 3. Infrastructure secrets manager (AWS Secrets, GCP Secret Manager, etc.)
    //
    // Runtime mutation is a security risk that could allow:
    // - SMTP spoofing via admin panel compromise
    // - Payment API key injection
    // - Other credential-based attacks
    //
    // Application restart is required for configuration changes to take effect.
    return res.status(403).json({
      error: "Dynamic configuration updates are disabled",
      message: "Configure environment variables via deployment settings",
      documentation: "See README.md for configuration instructions"
    });
  }
};
