import type { Request, Response, NextFunction } from "express";
import { paymentService } from "../services/payment.service.js";

export const checkoutController = {
  /**
   * Get payment status for polling
   * GET /api/v1/checkout/status/:orderId
   */
  async getPaymentStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { orderId } = req.params;

      if (!orderId) {
        res.status(400).json({
          error: "INVALID_ORDER_ID",
          message: "Order ID is required"
        });
        return;
      }

      const payment = await (req as any).db?.payment?.findUnique?.({
        where: { id: orderId }
      });

      if (!payment) {
        res.status(404).json({
          error: "PAYMENT_NOT_FOUND",
          message: "Payment record not found"
        });
        return;
      }

      // Return payment status
      res.json({
        id: payment.id,
        status: payment.status,
        amount: payment.amountPiasters,
        currency: payment.currency,
        createdAt: payment.createdAt.toISOString(),
        completedAt: payment.completedAt?.toISOString(),
        errorCode: payment.errorCode,
        errorMessage: payment.errorMessage
      });
    } catch (error) {
      next(error);
    }
  }
};
