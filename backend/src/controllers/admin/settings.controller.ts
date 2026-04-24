import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../config/database.js";
import { auditService } from "../../services/audit.service.js";
import { courseService } from "../../services/course.service.js";
import { BRAND_CONSTANTS } from "../../constants/branding.js";

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
      const oldSettings = await prisma.courseSettings.findUnique({ where: { id: 1 } });
      const settings = await prisma.courseSettings.upsert({
        where: { id: 1 },
        update: data,
        create: {
          id: 1,
          titleEn: data.titleEn ?? BRAND_CONSTANTS.COURSE_NAME_FULL,
          titleAr: data.titleAr ?? BRAND_CONSTANTS.COURSE_NAME_AR,
          pricePiasters: 0,
          ...data
        }
      });

      const changes: Record<string, { oldValue: unknown; newValue: unknown }> = {};
      if (data.titleEn !== undefined && oldSettings?.titleEn !== data.titleEn) {
        changes.titleEn = { oldValue: oldSettings?.titleEn, newValue: data.titleEn };
      }
      if (data.titleAr !== undefined && oldSettings?.titleAr !== data.titleAr) {
        changes.titleAr = { oldValue: oldSettings?.titleAr, newValue: data.titleAr };
      }
      if (data.descriptionEn !== undefined && oldSettings?.descriptionEn !== data.descriptionEn) {
        changes.descriptionEn = { oldValue: oldSettings?.descriptionEn, newValue: data.descriptionEn };
      }
      if (data.descriptionAr !== undefined && oldSettings?.descriptionAr !== data.descriptionAr) {
        changes.descriptionAr = { oldValue: oldSettings?.descriptionAr, newValue: data.descriptionAr };
      }

      if (Object.keys(changes).length > 0) {
        await auditService.logSettingsUpdate(req.user!.userId, changes);
      }

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
