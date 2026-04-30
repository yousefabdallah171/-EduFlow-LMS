import type { Request, Response } from "express";
import { prisma } from "../config/database.js";
import { refundService } from "../services/refund.service.js";
import { PaymentError, PaymentErrorCodes } from "../types/payment.types.js";

export const refundController = {
  // USER ENDPOINTS

  // Initiate refund (user)
  async initiateRefund(req: Request, res: Response) {
    try {
      const userId = (req.user as { userId?: string })?.userId;
      const { paymentId, amount, reason } = req.body;

      if (!userId) {
        throw new PaymentError("UNAUTHORIZED", "User not authenticated", 401);
      }

      // Verify user owns the payment
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        select: { userId: true }
      });

      if (!payment || payment.userId !== userId) {
        throw new PaymentError(
          PaymentErrorCodes.PAYMENT_NOT_FOUND,
          "Payment not found or you don't have access",
          404
        );
      }

      // Initiate refund
      const refund = await refundService.initiateRefund(
        { paymentId, amount, reason: reason || "User-initiated refund" },
        undefined // No admin context
      );

      res.json({
        success: true,
        refund,
        message: "Refund initiated successfully"
      });
    } catch (error) {
      const err = error as { statusCode?: number; code?: string; message?: string };
      const statusCode = err.statusCode || 400;
      res.status(statusCode).json({
        error: err.code || "REFUND_FAILED",
        message: err.message || "Failed to initiate refund"
      });
    }
  },

  // Get refund status (user)
  async getRefundStatus(req: Request, res: Response) {
    try {
      const userId = (req.user as { userId?: string })?.userId;
      const paymentIdParam = req.params.paymentId;
      const paymentId = Array.isArray(paymentIdParam) ? paymentIdParam[0] : paymentIdParam;

      if (!userId) {
        throw new PaymentError("UNAUTHORIZED", "User not authenticated", 401);
      }

      // Verify user owns the payment
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        select: { userId: true }
      });

      if (!payment || payment.userId !== userId) {
        throw new PaymentError(
          PaymentErrorCodes.PAYMENT_NOT_FOUND,
          "Payment not found or you don't have access",
          404
        );
      }

      const status = await refundService.getRefundStatus(paymentId);

      if (!status) {
        return res.status(404).json({
          error: "NO_REFUND",
          message: "No refund found for this payment"
        });
      }

      res.json(status);
    } catch (error) {
      const err = error as { statusCode?: number; code?: string; message?: string };
      const statusCode = err.statusCode || 400;
      res.status(statusCode).json({
        error: err.code || "REFUND_STATUS_FAILED",
        message: err.message || "Failed to get refund status"
      });
    }
  },

  // Cancel refund (user)
  async cancelRefund(req: Request, res: Response) {
    try {
      const userId = (req.user as { userId?: string })?.userId;
      const paymentIdParam = req.params.paymentId;
      const paymentId = Array.isArray(paymentIdParam) ? paymentIdParam[0] : paymentIdParam;
      const { reason } = req.body;

      if (!userId) {
        throw new PaymentError("UNAUTHORIZED", "User not authenticated", 401);
      }

      // Verify user owns the payment
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        select: { userId: true }
      });

      if (!payment || payment.userId !== userId) {
        throw new PaymentError(
          PaymentErrorCodes.PAYMENT_NOT_FOUND,
          "Payment not found or you don't have access",
          404
        );
      }

      const success = await refundService.cancelRefund(
        paymentId,
        reason || "User-initiated cancellation"
      );

      res.json({
        success,
        message: "Refund cancelled successfully"
      });
    } catch (error) {
      const err = error as { statusCode?: number; code?: string; message?: string };
      const statusCode = err.statusCode || 400;
      res.status(statusCode).json({
        error: err.code || "CANCEL_REFUND_FAILED",
        message: err.message || "Failed to cancel refund"
      });
    }
  },

  // Get refund history (user)
  async getRefundHistory(req: Request, res: Response) {
    try {
      const userId = (req.user as { userId?: string })?.userId;
      const paymentIdParam = req.params.paymentId;
      const paymentId = Array.isArray(paymentIdParam) ? paymentIdParam[0] : paymentIdParam;

      if (!userId) {
        throw new PaymentError("UNAUTHORIZED", "User not authenticated", 401);
      }

      // Verify user owns the payment
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        select: { userId: true }
      });

      if (!payment || payment.userId !== userId) {
        throw new PaymentError(
          PaymentErrorCodes.PAYMENT_NOT_FOUND,
          "Payment not found or you don't have access",
          404
        );
      }

      const history = await refundService.getRefundHistory(paymentId);

      res.json({
        paymentId,
        refundCount: history.length,
        refunds: history
      });
    } catch (error) {
      const err = error as { statusCode?: number; code?: string; message?: string };
      const statusCode = err.statusCode || 400;
      res.status(statusCode).json({
        error: err.code || "GET_HISTORY_FAILED",
        message: err.message || "Failed to get refund history"
      });
    }
  },

  // ADMIN ENDPOINTS

  // Admin initiate refund
  async adminInitiateRefund(req: Request, res: Response) {
    try {
      const adminId = (req.user as { userId?: string })?.userId;
      const { paymentId, amount, reason } = req.body;

      if (!adminId) {
        throw new PaymentError("UNAUTHORIZED", "Admin not authenticated", 401);
      }

      // Check payment exists
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId }
      });

      if (!payment) {
        throw new PaymentError(
          PaymentErrorCodes.PAYMENT_NOT_FOUND,
          "Payment not found",
          404
        );
      }

      // Initiate refund with admin context
      const refund = await refundService.initiateRefund(
        { paymentId, amount, reason: reason || "Admin-initiated refund" },
        adminId
      );

      // Log admin action
      await prisma.adminAuditLog.create({
        data: {
          adminId,
          action: "INITIATE_REFUND",
          paymentId,
          reason: reason || "Admin refund",
          metadata: {
            refundAmount: amount || payment.amountPiasters,
            refundType: amount ? "PARTIAL" : "FULL"
          }
        }
      });

      res.json({
        success: true,
        refund,
        message: "Refund initiated by admin"
      });
    } catch (error) {
      const err = error as { statusCode?: number; code?: string; message?: string };
      const statusCode = err.statusCode || 400;
      res.status(statusCode).json({
        error: err.code || "ADMIN_REFUND_FAILED",
        message: err.message || "Failed to initiate refund"
      });
    }
  },

  // Admin get refund history
  async adminGetRefundHistory(req: Request, res: Response) {
    try {
      const paymentIdParam = req.params.paymentId;
      const paymentId = Array.isArray(paymentIdParam) ? paymentIdParam[0] : paymentIdParam;

      // Check payment exists
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId }
      });

      if (!payment) {
        throw new PaymentError(
          PaymentErrorCodes.PAYMENT_NOT_FOUND,
          "Payment not found",
          404
        );
      }

      const history = await refundService.getRefundHistory(paymentId);

      res.json({
        paymentId,
        userId: payment.userId,
        paymentAmount: payment.amountPiasters,
        refundCount: history.length,
        refunds: history
      });
    } catch (error) {
      const err = error as { statusCode?: number; code?: string; message?: string };
      const statusCode = err.statusCode || 400;
      res.status(statusCode).json({
        error: err.code || "ADMIN_HISTORY_FAILED",
        message: err.message || "Failed to get refund history"
      });
    }
  },

  // Admin list all refunds
  async adminListRefunds(req: Request, res: Response) {
    try {
      const page = parseInt((req.query.page as string) || "1");
      const limit = parseInt((req.query.limit as string) || "20");
      const status = req.query.status as string;

      const skip = (page - 1) * limit;

      // Build filter
      const where: { refundStatus?: string } = {};
      if (status) {
        where.refundStatus = status;
      }

      // Get refunds
      const refunds = await prisma.payment.findMany({
        where: {
          ...where,
          refundStatus: { not: null }
        },
        select: {
          id: true,
          userId: true,
          user: { select: { email: true, fullName: true } },
          amountPiasters: true,
          refundStatus: true,
          refundAmount: true,
          refundInitiatedAt: true,
          refundCompletedAt: true,
          createdAt: true
        },
        orderBy: { refundInitiatedAt: "desc" },
        skip,
        take: limit
      });

      // Get total count
      const total = await prisma.payment.count({
        where: { ...where, refundStatus: { not: null } }
      });

      res.json({
        refunds,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      const err = error as { statusCode?: number; code?: string; message?: string };
      const statusCode = err.statusCode || 400;
      res.status(statusCode).json({
        error: err.code || "LIST_REFUNDS_FAILED",
        message: err.message || "Failed to list refunds"
      });
    }
  }
};
