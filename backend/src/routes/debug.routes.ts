import type { Request, Response } from "express";
import { Router as createRouter } from "express";

import { env } from "../config/env.js";
import { paymentService } from "../services/payment.service.js";
import { computePaymobHmac } from "../utils/hmac.js";

const router = createRouter();

// Guard: Only available in development
const devOnly = (req: Request, res: Response, next: (error?: Error) => void) => {
  if (env.NODE_ENV !== "development") {
    res.status(403).json({
      error: "FORBIDDEN",
      message: "Debug endpoints are only available in development"
    });
    return;
  }
  next();
};

router.use(devOnly);

/**
 * Simulate a successful Paymob webhook for testing
 * POST /dev/payments/:id/webhook/success
 */
router.post("/payments/:id/webhook/success", async (req: Request, res: Response, next: (error?: Error) => void) => {
  try {
    const { id: paymentId } = req.params;

    // Construct mock webhook payload
    const payload = {
      obj: {
        id: Date.now(), // Mock Paymob transaction ID
        success: true,
        order: {
          merchant_order_id: paymentId
        }
      }
    };

    // Calculate HMAC
    const hmac = computePaymobHmac(payload, env.PAYMOB_WEBHOOK_SECRET || "test-secret");

    // Call actual webhook handler
    const result = await paymentService.processWebhook(payload as unknown as Record<string, unknown>, hmac);

    res.json({
      success: true,
      message: "Webhook simulated successfully",
      payment: {
        id: result.id,
        status: result.status,
        paymobTransactionId: result.paymobTransactionId,
        webhookReceivedAt: result.webhookReceivedAt
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Simulate a failed Paymob webhook for testing
 * POST /dev/payments/:id/webhook/failure
 */
router.post("/payments/:id/webhook/failure", async (req: Request, res: Response, next: (error?: Error) => void) => {
  try {
    const { id: paymentId } = req.params;

    // Construct mock webhook payload with success: false
    const payload = {
      obj: {
        id: Date.now(), // Mock Paymob transaction ID
        success: false,
        order: {
          merchant_order_id: paymentId
        }
      }
    };

    // Calculate HMAC
    const hmac = computePaymobHmac(payload, env.PAYMOB_WEBHOOK_SECRET || "test-secret");

    // Call actual webhook handler
    const result = await paymentService.processWebhook(payload as unknown as Record<string, unknown>, hmac);

    res.json({
      success: true,
      message: "Failed webhook simulated successfully",
      payment: {
        id: result.id,
        status: result.status,
        paymobTransactionId: result.paymobTransactionId,
        webhookReceivedAt: result.webhookReceivedAt
      }
    });
  } catch (error) {
    next(error);
  }
});

export const debugRoutes = router;
