import type { Payment } from "@prisma/client";
import type { PaymobWebhookPayload } from "../utils/hmac.js";

import { env } from "../config/env.js";
import { couponRepository } from "../repositories/coupon.repository.js";
import { paymentRepository } from "../repositories/payment.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { prisma } from "../config/database.js";
import { couponService } from "./coupon.service.js";
import { enrollmentService } from "./enrollment.service.js";

class PaymentError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

const PAYMOB_BASE_URL = "https://accept.paymob.com/api";

const paymobRequest = async <T>(path: string, body: Record<string, unknown>) => {
  const response = await fetch(`${PAYMOB_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new PaymentError("PAYMOB_REQUEST_FAILED", 502, "Paymob request failed.");
  }

  return (await response.json()) as T;
};

export const paymentService = {
  async validateCouponPreview(couponCode: string | undefined) {
    const settings = await prisma.courseSettings.findUnique({ where: { id: 1 } });
    if (!settings) {
      throw new PaymentError("COURSE_SETTINGS_MISSING", 500, "Course settings are not configured.");
    }

    if (!couponCode?.trim()) {
      return { valid: false, reason: "NOT_FOUND" };
    }

    return couponService.validateCoupon(couponCode, settings.pricePiasters);
  },

  async createPaymobOrder(userId: string, couponCode?: string) {
    const student = await userRepository.findById(userId);
    if (!student) {
      throw new PaymentError("USER_NOT_FOUND", 404, "Student not found.");
    }

    const enrollmentStatus = await enrollmentService.getStatus(userId);
    if (enrollmentStatus.enrolled) {
      throw new PaymentError("ALREADY_ENROLLED", 409, "Student is already enrolled.");
    }

    const settings = await prisma.courseSettings.findUnique({ where: { id: 1 } });
    if (!settings) {
      throw new PaymentError("COURSE_SETTINGS_MISSING", 500, "Course settings are not configured.");
    }

    const payment = await prisma.$transaction(async (db) => {
      let couponApplication = null;

      if (couponCode?.trim()) {
        try {
          couponApplication = await couponService.applyCoupon(couponCode, settings.pricePiasters, db);
        } catch (error) {
          if (error instanceof couponService.CouponError) {
            throw new PaymentError("INVALID_COUPON", 400, "This coupon is expired or has reached its usage limit.");
          }

          throw error;
        }
      }

      return db.payment.create({
        data: {
          user: { connect: { id: userId } },
          amountPiasters: couponApplication?.discountedAmountPiasters ?? settings.pricePiasters,
          currency: settings.currency,
          discountPiasters: couponApplication?.discountPiasters ?? 0,
          coupon: couponApplication ? { connect: { id: couponApplication.coupon.id } } : undefined
        }
      });
    });

    const auth = await paymobRequest<{ token: string }>("/auth/tokens", {
      api_key: env.PAYMOB_API_KEY
    });

    const order = await paymobRequest<{ id: number }>("/ecommerce/orders", {
      auth_token: auth.token,
      delivery_needed: false,
      amount_cents: payment.amountPiasters,
      currency: payment.currency,
      merchant_order_id: payment.id,
      items: []
    });

    await paymentRepository.update(payment.id, {
      paymobOrderId: String(order.id)
    });

    const paymentKey = await paymobRequest<{ token: string }>("/acceptance/payment_keys", {
      auth_token: auth.token,
      amount_cents: payment.amountPiasters,
      expiration: 3600,
      order_id: order.id,
      billing_data: {
        apartment: "NA",
        email: student.email,
        floor: "NA",
        first_name: student.fullName.split(" ")[0] ?? student.fullName,
        street: "NA",
        building: "NA",
        phone_number: "NA",
        shipping_method: "NA",
        postal_code: "NA",
        city: "Cairo",
        country: "EG",
        last_name: student.fullName.split(" ").slice(1).join(" ") || student.fullName,
        state: "Cairo"
      },
      currency: payment.currency,
      integration_id: Number(env.PAYMOB_INTEGRATION_ID)
    });

    return {
      paymentKey: paymentKey.token,
      orderId: payment.id,
      amount: payment.amountPiasters,
      currency: payment.currency,
      discountApplied: payment.discountPiasters,
      iframeId: env.PAYMOB_IFRAME_ID
    };
  },

  async processWebhook(payload: PaymobWebhookPayload, hmac: string) {
    const transaction = payload.obj;
    if (!transaction) {
      throw new PaymentError("INVALID_WEBHOOK_PAYLOAD", 400, "Webhook payload is missing transaction details.");
    }

    const merchantOrderId = String(transaction?.order?.merchant_order_id ?? "");
    const paymobTransactionId = String(transaction?.id ?? "");

    if (!merchantOrderId || !paymobTransactionId) {
      throw new PaymentError("INVALID_WEBHOOK_PAYLOAD", 400, "Webhook payload is missing payment identifiers.");
    }

    const existingTx = await paymentRepository.findByPaymobTxId(paymobTransactionId);
    if (existingTx) {
      return existingTx;
    }

    const payment = await paymentRepository.findById(merchantOrderId);
    if (!payment) {
      throw new PaymentError("PAYMENT_NOT_FOUND", 404, "Payment record not found.");
    }

    const nextStatus: Payment["status"] = transaction.success ? "COMPLETED" : "FAILED";
    const updatedPayment = await paymentRepository.updateStatus(payment.id, nextStatus, {
      paymobTransactionId,
      webhookReceivedAt: new Date(),
      webhookHmac: hmac
    });

    if (updatedPayment.status === "COMPLETED") {
      await enrollmentService.enroll(payment.userId, "PAID", payment.id);
      if (payment.couponId) {
        await couponRepository.incrementUses(payment.couponId);
      }
    }

    return updatedPayment;
  },

  async getCoupon(couponCode?: string) {
    if (!couponCode?.trim()) {
      return null;
    }

    return couponRepository.findByCode(couponCode.trim().toUpperCase());
  },

  PaymentError
};
