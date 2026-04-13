import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import { couponService } from "../../services/coupon.service.js";

const getFirstValue = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const createCouponSchema = z.object({
  code: z.string().trim().min(3).max(50),
  discountType: z.enum(["PERCENTAGE", "FIXED"]),
  discountValue: z.coerce.number(),
  maxUses: z.coerce.number().int().positive().nullable().optional(),
  expiryDate: z.string().datetime().optional().nullable()
});

const updateCouponSchema = z.object({
  maxUses: z.coerce.number().int().positive().nullable().optional(),
  expiryDate: z.string().datetime().optional().nullable()
});

const handleCouponError = (error: unknown, res: Response, next: NextFunction) => {
  if (error instanceof z.ZodError) {
    res.status(422).json({
      error: "VALIDATION_ERROR",
      fields: Object.fromEntries(error.issues.map((issue) => [issue.path.join("."), issue.message]))
    });
    return;
  }

  if (error instanceof couponService.CouponError) {
    res.status(error.status).json({
      error: error.code,
      message: error.message
    });
    return;
  }

  next(error);
};

export const adminCouponsController = {
  async list(_req: Request, res: Response, next: NextFunction) {
    try {
      res.json({
        coupons: await couponService.listCoupons()
      });
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const body = createCouponSchema.parse(req.body);
      const coupon = await couponService.createCoupon({
        code: body.code,
        discountType: body.discountType,
        discountValue: body.discountValue,
        maxUses: body.maxUses ?? null,
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : null
      });
      res.status(201).json(coupon);
    } catch (error) {
      handleCouponError(error, res, next);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const couponId = getFirstValue(req.params.couponId);
      if (!couponId) {
        res.status(400).json({ error: "COUPON_ID_REQUIRED" });
        return;
      }

      const body = updateCouponSchema.parse(req.body);
      res.json(
        await couponService.updateCoupon(couponId, {
          maxUses: body.maxUses ?? null,
          expiryDate: body.expiryDate ? new Date(body.expiryDate) : null
        })
      );
    } catch (error) {
      handleCouponError(error, res, next);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const couponId = getFirstValue(req.params.couponId);
      if (!couponId) {
        res.status(400).json({ error: "COUPON_ID_REQUIRED" });
        return;
      }

      await couponService.deleteCoupon(couponId);
      res.json({ message: "Coupon deleted." });
    } catch (error) {
      handleCouponError(error, res, next);
    }
  }
};
