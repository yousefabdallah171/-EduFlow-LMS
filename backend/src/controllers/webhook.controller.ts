import type { NextFunction, Request, Response } from "express";

import { paymentService } from "../services/payment.service.js";

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
  }
};
