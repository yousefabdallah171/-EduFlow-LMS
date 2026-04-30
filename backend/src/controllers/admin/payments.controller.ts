import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { adminPaymentService } from "../../services/admin-payment.service.js";
import { adminPaymentManagementService } from "../../services/admin-payment-management.service.js";

const listPaymentsSchema = z.object({
  status: z.enum(["PENDING", "COMPLETED", "FAILED", "WEBHOOK_PENDING", "REFUND_REQUESTED", "REFUNDED"]).optional(),
  userId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  minAmount: z.coerce.number().int().min(0).optional(),
  maxAmount: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0)
});

const getPaymentDetailSchema = z.object({
  paymentId: z.string().min(1)
});

const searchPaymentsSchema = z.object({
  query: z.string().min(1).max(100),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});

const getPaymentStatsSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

const createManualPaymentSchema = z.object({
  userId: z.string().min(1),
  packageId: z.string().min(1),
  amount: z.number().int().min(100),
  reason: z.string().min(5).max(500),
  adminNotes: z.string().max(1000).optional()
});

const overridePaymentStatusSchema = z.object({
  newStatus: z.enum(["PENDING", "COMPLETED", "FAILED", "WEBHOOK_PENDING", "REFUND_REQUESTED", "REFUNDED"]),
  reason: z.string().min(5).max(500),
  adminNotes: z.string().max(1000).optional()
});

interface AdminRequest extends Request {
  user?: { id: string; role: string };
}

const handlePaymentError = (error: unknown, res: Response, next: NextFunction) => {
  if (error instanceof z.ZodError) {
    res.status(422).json({
      error: "VALIDATION_ERROR",
      fields: Object.fromEntries(error.issues.map((issue) => [issue.path.join("."), issue.message]))
    });
    return;
  }

  if (error instanceof Error && error.message.includes("not found")) {
    res.status(404).json({
      error: "PAYMENT_NOT_FOUND",
      message: error.message
    });
    return;
  }

  console.error("[Admin Payments Controller] Error:", error);
  next(error);
};

export const adminPaymentsController = {
  // List all payments with filters
  async listPayments(req: AdminRequest, res: Response, next: NextFunction) {
    try {
      const query = listPaymentsSchema.parse(req.query);

      const filters = {
        status: query.status as "PENDING" | "COMPLETED" | "FAILED" | "WEBHOOK_PENDING" | "REFUND_REQUESTED" | "REFUNDED" | undefined,
        userId: query.userId,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
        minAmount: query.minAmount,
        maxAmount: query.maxAmount,
        limit: query.limit,
        offset: query.offset
      };

      const result = await adminPaymentService.listPayments(filters);

      console.log(`[Admin Payments Controller] Listed payments for admin ${req.user?.id}`);
      res.json({ success: true, data: result });
    } catch (error) {
      handlePaymentError(error, res, next);
    }
  },

  // Get detailed payment information
  async getPaymentDetail(req: AdminRequest, res: Response, next: NextFunction) {
    try {
      const { paymentId } = getPaymentDetailSchema.parse(req.params);

      const payment = await adminPaymentService.getPaymentDetail(paymentId);

      console.log(`[Admin Payments Controller] Retrieved payment detail for ${paymentId} by admin ${req.user?.id}`);
      res.json({ success: true, data: payment });
    } catch (error) {
      handlePaymentError(error, res, next);
    }
  },

  // Search payments
  async searchPayments(req: AdminRequest, res: Response, next: NextFunction) {
    try {
      const { query, limit } = searchPaymentsSchema.parse(req.query);

      const payments = await adminPaymentService.searchPayments(query, limit);

      console.log(`[Admin Payments Controller] Searched payments with query "${query}" by admin ${req.user?.id}`);
      res.json({ success: true, data: payments, count: payments.length });
    } catch (error) {
      handlePaymentError(error, res, next);
    }
  },

  // Get payments by status
  async getPaymentsByStatus(req: AdminRequest, res: Response, next: NextFunction) {
    try {
      const { status } = z.object({
        status: z.enum(["PENDING", "COMPLETED", "FAILED", "WEBHOOK_PENDING", "REFUND_REQUESTED", "REFUNDED"])
      }).parse(req.params);

      const limit = parseInt(req.query.limit as string) || 50;

      const payments = await adminPaymentService.getPaymentsByStatus(status as "PENDING" | "COMPLETED" | "FAILED" | "WEBHOOK_PENDING" | "REFUND_REQUESTED" | "REFUNDED", limit);

      console.log(`[Admin Payments Controller] Retrieved ${payments.length} payments with status ${status} by admin ${req.user?.id}`);
      res.json({ success: true, data: payments, count: payments.length });
    } catch (error) {
      handlePaymentError(error, res, next);
    }
  },

  // Get payment statistics
  async getPaymentStats(req: AdminRequest, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = getPaymentStatsSchema.parse(req.query);

      const stats = await adminPaymentService.getPaymentStats(
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined
      );

      console.log(`[Admin Payments Controller] Retrieved payment statistics by admin ${req.user?.id}`);
      res.json({ success: true, data: stats });
    } catch (error) {
      handlePaymentError(error, res, next);
    }
  },

  // Create manual payment (admin marks payment complete)
  async createManualPayment(req: AdminRequest, res: Response, next: NextFunction) {
    try {
      const data = createManualPaymentSchema.parse(req.body);
      const adminId = req.user?.id;

      if (!adminId) {
        res.status(401).json({ error: "UNAUTHORIZED", message: "Admin not authenticated" });
        return;
      }

      const payment = await adminPaymentManagementService.createManualPayment(data, adminId);

      console.log(`[Admin Payments Controller] Manual payment created for user ${data.userId} by admin ${adminId}`);
      res.status(201).json({ success: true, data: payment });
    } catch (error) {
      handlePaymentError(error, res, next);
    }
  },

  // Override payment status
  async overridePaymentStatus(req: AdminRequest, res: Response, next: NextFunction) {
    try {
      const { paymentId } = getPaymentDetailSchema.parse(req.params);
      const { newStatus, reason, adminNotes } = overridePaymentStatusSchema.parse(req.body);
      const adminId = req.user?.id;

      if (!adminId) {
        res.status(401).json({ error: "UNAUTHORIZED", message: "Admin not authenticated" });
        return;
      }

      const payment = await adminPaymentManagementService.overridePaymentStatus(
        { paymentId, newStatus: newStatus as "PENDING" | "COMPLETED" | "FAILED" | "WEBHOOK_PENDING" | "REFUND_REQUESTED" | "REFUNDED", reason, adminNotes },
        adminId
      );

      console.log(`[Admin Payments Controller] Payment ${paymentId} status overridden by admin ${adminId}`);
      res.json({ success: true, data: payment });
    } catch (error) {
      handlePaymentError(error, res, next);
    }
  },

  // Revoke payment
  async revokePayment(req: AdminRequest, res: Response, next: NextFunction) {
    try {
      const { paymentId } = getPaymentDetailSchema.parse(req.params);
      const { reason } = z.object({ reason: z.string().min(5).max(500) }).parse(req.body);
      const adminId = req.user?.id;

      if (!adminId) {
        res.status(401).json({ error: "UNAUTHORIZED", message: "Admin not authenticated" });
        return;
      }

      const payment = await adminPaymentManagementService.revokePayment(paymentId, reason, adminId);

      console.log(`[Admin Payments Controller] Payment ${paymentId} revoked by admin ${adminId}`);
      res.json({ success: true, data: payment });
    } catch (error) {
      handlePaymentError(error, res, next);
    }
  }
};

export default adminPaymentsController;
