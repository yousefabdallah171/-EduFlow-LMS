import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import { enrollmentService } from "../services/enrollment.service.js";
import { paymentService } from "../services/payment.service.js";

const couponSchema = z.object({
  couponCode: z.string().trim().optional(),
  packageId: z.string().trim().optional()
});

const handlePaymentError = (error: unknown, res: Response, next: NextFunction) => {
  if (error instanceof z.ZodError) {
    res.status(422).json({
      error: "VALIDATION_ERROR",
      fields: Object.fromEntries(error.issues.map((issue) => [issue.path.join("."), issue.message]))
    });
    return;
  }

  if (error instanceof paymentService.PaymentError) {
    res.status(error.status).json({
      error: error.code,
      message: error.message
    });
    return;
  }

  next(error);
};

export const paymentController = {
  async checkout(req: Request, res: Response, next: NextFunction) {
    try {
      const body = couponSchema.parse(req.body ?? {});
      const result = await paymentService.createPaymobOrderWithRetry(req.user!.userId, body.couponCode, body.packageId);
      res.json(result);
    } catch (error) {
      handlePaymentError(error, res, next);
    }
  },

  async validateCoupon(req: Request, res: Response, next: NextFunction) {
    try {
      const body = couponSchema.parse(req.body ?? {});
      res.json(await paymentService.validateCouponPreview(body.couponCode, body.packageId));
    } catch (error) {
      handlePaymentError(error, res, next);
    }
  },

  async getEnrollmentStatus(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await enrollmentService.getStatus(req.user!.userId));
    } catch (error) {
      next(error);
    }
  }
};
