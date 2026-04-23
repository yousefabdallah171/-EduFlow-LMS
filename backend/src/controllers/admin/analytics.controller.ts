import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import { analyticsService } from "../../services/analytics.service.js";

const getFirstValue = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const analyticsQuerySchema = z.object({
  period: z.enum(["7d", "30d", "90d", "all"]).default("30d")
});

const paymentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["PENDING", "COMPLETED", "FAILED", "REFUNDED"]).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional()
});

const markPaidSchema = z.object({
  reason: z.string().trim().min(3).max(500)
});

const handleAnalyticsError = (error: unknown, res: Response, next: NextFunction) => {
  if (error instanceof z.ZodError) {
    res.status(422).json({
      error: "VALIDATION_ERROR",
      fields: Object.fromEntries(error.issues.map((issue) => [issue.path.join("."), issue.message]))
    });
    return;
  }

  if (error instanceof analyticsService.AnalyticsError) {
    res.status(error.status).json({
      error: error.code,
      message: error.message
    });
    return;
  }

  next(error);
};

export const adminAnalyticsController = {
  async analytics(req: Request, res: Response, next: NextFunction) {
    try {
      const query = analyticsQuerySchema.parse(req.query);
      res.json(await analyticsService.calculateKPIs(query.period));
    } catch (error) {
      handleAnalyticsError(error, res, next);
    }
  },

  async payments(req: Request, res: Response, next: NextFunction) {
    try {
      const query = paymentsQuerySchema.parse(req.query);
      res.json(
        await analyticsService.listPayments({
          page: query.page,
          limit: query.limit,
          status: query.status,
          from: query.from ? new Date(query.from) : undefined,
          to: query.to ? new Date(query.to) : undefined
        })
      );
    } catch (error) {
      handleAnalyticsError(error, res, next);
    }
  },

  async markPaid(req: Request, res: Response, next: NextFunction) {
    try {
      markPaidSchema.parse(req.body ?? {});
      const paymentId = getFirstValue(req.params.paymentId);
      if (!paymentId) {
        res.status(400).json({ error: "PAYMENT_ID_REQUIRED" });
        return;
      }

      const result = await analyticsService.markPaymentPaid(paymentId);
      res.json({
        payment: {
          id: result.payment.id,
          status: result.payment.status
        },
        enrollment: {
          status: result.enrollment.status,
          enrollmentType: result.enrollment.enrollmentType
        },
        message: "Payment marked as completed. Student enrolled."
      });
    } catch (error) {
      handleAnalyticsError(error, res, next);
    }
  }
};
