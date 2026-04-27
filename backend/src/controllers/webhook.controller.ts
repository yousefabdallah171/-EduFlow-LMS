import type { NextFunction, Request, Response } from "express";

import { paymentService } from "../services/payment.service.js";
import { refundService } from "../services/refund.service.js";
import { metricsService } from "../services/metrics.service.js";
import { prisma } from "../config/database.js";

export const webhookController = {
  async paymob(req: Request, res: Response, next: NextFunction) {
    try {
      await paymentService.processWebhook(req.body, String(req.query.hmac ?? req.body?.hmac ?? ""));
      res.json({ received: true });
    } catch (error) {
      if (error instanceof paymentService.PaymentError) {
        res.status(error.status).json({
          error: error.code,
          message: error.message
        });
        return;
      }

      next(error);
    }
  },

  async paymobRefund(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    try {
      const { type, data } = req.body;

      if (!type || !data) {
        metricsService.recordWebhookProcessing("refund", "failure", Date.now() - startTime, "INVALID_WEBHOOK");
        res.status(400).json({
          error: "INVALID_WEBHOOK",
          message: "Missing type or data in webhook payload"
        });
        return;
      }

      // Extract refund ID and payment info from webhook
      const refundId = data.id;
      const success = data.success === true;

      // Find payment by Paymob refund ID
      const refundQueue = await prisma.refundQueue.findFirst({
        where: {
          paymobRefundId: String(refundId)
        }
      });

      if (!refundQueue) {
        // Refund not found, but acknowledge webhook
        metricsService.recordWebhookProcessing("refund", "success", Date.now() - startTime);
        res.json({ received: true });
        return;
      }

      const paymentId = refundQueue.paymentId;

      if (success) {
        // Refund succeeded
        await refundService.completeRefund(paymentId, String(refundId));
        metricsService.recordWebhookProcessing("refund", "success", Date.now() - startTime);
        console.log(`[Webhook] Refund ${refundId} completed for payment ${paymentId}`);
      } else {
        // Refund failed
        await refundService.failRefund(
          paymentId,
          data.error_message || "Paymob refund failed"
        );
        metricsService.recordWebhookProcessing("refund", "failure", Date.now() - startTime, data.error_message || "PAYMOB_REFUND_FAILED");
        console.log(`[Webhook] Refund ${refundId} failed for payment ${paymentId}`);
      }

      res.json({ received: true });
    } catch (error) {
      metricsService.recordWebhookProcessing("refund", "failure", Date.now() - startTime, "WEBHOOK_ERROR");
      console.error("[Webhook] Error processing refund webhook:", error);
      next(error);
    }
  }
};
