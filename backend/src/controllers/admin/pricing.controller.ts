import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import { prisma } from "../../config/database.js";

const updatePricingSchema = z.object({
  priceEgp: z.coerce.number().positive().max(100000)
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
        updatedAt: settings.updatedAt
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

      res.json({
        priceEgp: settings.pricePiasters / 100,
        updatedAt: settings.updatedAt
      });
    } catch (error) {
      handlePricingError(error, res, next);
    }
  }
};
