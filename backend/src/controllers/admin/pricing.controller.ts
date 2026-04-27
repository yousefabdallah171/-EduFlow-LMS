import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import { prisma } from "../../config/database.js";
import { courseService } from "../../services/course.service.js";

const updatePricingSchema = z.object({
  priceEgp: z.coerce.number().positive().max(100000)
});

const packageSchema = z.object({
  id: z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/).optional(),
  titleEn: z.string().trim().min(2).max(140),
  titleAr: z.string().trim().min(2).max(140),
  descriptionEn: z.string().trim().max(600).optional().nullable(),
  descriptionAr: z.string().trim().max(600).optional().nullable(),
  priceEgp: z.coerce.number().positive().max(100000),
  currency: z.string().trim().min(2).max(8).default("EGP"),
  isActive: z.coerce.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(1000).default(0)
});

const handlePricingError = (error: unknown, res: Response, next: NextFunction) => {
  if (error instanceof z.ZodError) {
    res.status(422).json({
      error: "VALIDATION_ERROR",
      fields: Object.fromEntries(error.issues.map((issue) => [issue.path.join("."), issue.message]))
    });
    return;
  }

  next(error);
};

export const adminPricingController = {
  async get(_req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await prisma.courseSettings.findUnique({ where: { id: 1 } });
      if (!settings) {
        res.status(404).json({ error: "COURSE_SETTINGS_MISSING" });
        return;
      }

      res.json({
        priceEgp: settings.pricePiasters / 100,
        pricePiasters: settings.pricePiasters,
        currency: settings.currency,
        updatedAt: settings.updatedAt,
        packages: (await prisma.coursePackage.findMany({ orderBy: { sortOrder: "asc" } })).map((coursePackage) => ({
          id: coursePackage.id,
          titleEn: coursePackage.titleEn,
          titleAr: coursePackage.titleAr,
          descriptionEn: coursePackage.descriptionEn,
          descriptionAr: coursePackage.descriptionAr,
          priceEgp: coursePackage.pricePiasters / 100,
          pricePiasters: coursePackage.pricePiasters,
          currency: coursePackage.currency,
          isActive: coursePackage.isActive,
          sortOrder: coursePackage.sortOrder,
          updatedAt: coursePackage.updatedAt
        }))
      });
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const body = updatePricingSchema.parse(req.body);
      const settings = await prisma.courseSettings.update({
        where: { id: 1 },
        data: {
          pricePiasters: Math.round(body.priceEgp * 100),
          updatedBy: { connect: { id: req.user!.userId } }
        }
      });

      await courseService.invalidatePublicCourseCache();

      res.json({
        priceEgp: settings.pricePiasters / 100,
        updatedAt: settings.updatedAt
      });
    } catch (error) {
      handlePricingError(error, res, next);
    }
  },

  async createPackage(req: Request, res: Response, next: NextFunction) {
    try {
      const body = packageSchema.parse(req.body);
      const coursePackage = await prisma.coursePackage.create({
        data: {
          id: body.id ?? body.titleEn.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
          titleEn: body.titleEn,
          titleAr: body.titleAr,
          descriptionEn: body.descriptionEn,
          descriptionAr: body.descriptionAr,
          pricePiasters: Math.round(body.priceEgp * 100),
          currency: body.currency,
          isActive: body.isActive,
          sortOrder: body.sortOrder
        }
      });

      await courseService.invalidatePublicCourseCache();

      res.status(201).json(coursePackage);
    } catch (error) {
      handlePricingError(error, res, next);
    }
  },

  async updatePackage(req: Request, res: Response, next: NextFunction) {
    try {
      const packageId = Array.isArray(req.params.packageId) ? req.params.packageId[0] : req.params.packageId;
      if (!packageId) {
        res.status(400).json({ error: "PACKAGE_ID_REQUIRED" });
        return;
      }

      const body = packageSchema.omit({ id: true }).partial().parse(req.body);
      const coursePackage = await prisma.coursePackage.update({
        where: { id: packageId },
        data: {
          titleEn: body.titleEn,
          titleAr: body.titleAr,
          descriptionEn: body.descriptionEn,
          descriptionAr: body.descriptionAr,
          pricePiasters: body.priceEgp === undefined ? undefined : Math.round(body.priceEgp * 100),
          currency: body.currency,
          isActive: body.isActive,
          sortOrder: body.sortOrder
        }
      });

      await courseService.invalidatePublicCourseCache();

      res.json(coursePackage);
    } catch (error) {
      handlePricingError(error, res, next);
    }
  }
};
