import { logger } from "./logger.js";

export function createPaymentLogger(paymentId: string, userId?: string) {
  return {
    info: (msg: string, data?: Record<string, unknown>) =>
      logger.info(msg, { paymentId, userId, ...data }),

    error: (msg: string, error: Error, data?: Record<string, unknown>) =>
      logger.error(msg, { paymentId, userId, error: error.message, stack: error.stack, ...data }),

    debug: (msg: string, data?: Record<string, unknown>) =>
      logger.debug(msg, { paymentId, userId, ...data }),

    warn: (msg: string, data?: Record<string, unknown>) =>
      logger.warn(msg, { paymentId, userId, ...data })
  };
}

export const paymentLogger = {
  initiated: (paymentId: string, userId: string, amount: number) =>
    createPaymentLogger(paymentId, userId).info("Payment initiated", { amount }),

  paymobOrderCreated: (paymentId: string, userId: string, paymobOrderId: string) =>
    createPaymentLogger(paymentId, userId).info("Paymob order created", { paymobOrderId }),

  webhookReceived: (paymentId: string, status: string) =>
    createPaymentLogger(paymentId).info("Webhook received", { status }),

  enrollmentTriggered: (paymentId: string, userId: string) =>
    createPaymentLogger(paymentId, userId).info("Enrollment triggered"),

  error: (paymentId: string, userId: string, error: Error, context?: string) =>
    createPaymentLogger(paymentId, userId).error(
      `Payment error${context ? `: ${context}` : ""}`,
      error
    )
};
