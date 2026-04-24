import type { Payment } from "@prisma/client";
import type { PaymobWebhookPayload } from "../utils/hmac.js";

import { env } from "../config/env.js";
import { redis } from "../config/redis.js";
import { couponRepository } from "../repositories/coupon.repository.js";
import { paymentRepository } from "../repositories/payment.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { prisma } from "../config/database.js";
import { couponService } from "./coupon.service.js";
import { courseService } from "./course.service.js";
import { enrollmentService } from "./enrollment.service.js";
import { prometheus } from "../observability/prometheus.js";
import { sendEnrollmentActivatedEmail, sendPaymentReceiptEmail } from "../utils/email.js";

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
const PAYMENTS_CACHE_TTL_SECONDS = 60 * 60;
const paymentsCacheKey = (userId: string) => `student:payments:${userId}`;
const CONCURRENT_CHECKOUT_TIMEOUT_MINUTES = 30;
const PAYMOB_REQUEST_TIMEOUT_MS = 10000;

type RetryableErrorCode = "PAYMOB_SERVER_ERROR" | "PAYMOB_RATE_LIMITED" | "PAYMOB_TIMEOUT";

const isRetryableError = (code: string): code is RetryableErrorCode => {
  return ["PAYMOB_SERVER_ERROR", "PAYMOB_RATE_LIMITED", "PAYMOB_TIMEOUT"].includes(code);
};

const paymobRequest = async <T>(
  path: string,
  body: Record<string, unknown>,
  timeoutMs = PAYMOB_REQUEST_TIMEOUT_MS
): Promise<T> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${PAYMOB_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    if (!response.ok) {
      const status = response.status;
      let errorCode = "PAYMOB_API_ERROR";
      let errorMessage = "Paymob API request failed";

      if (status === 401) {
        errorCode = "PAYMOB_AUTH_FAILED";
        errorMessage = "Paymob authentication failed. Check API key.";
      } else if (status === 429) {
        errorCode = "PAYMOB_RATE_LIMITED";
        errorMessage = "Paymob API rate limit exceeded. Please try again later.";
      } else if (status >= 500) {
        errorCode = "PAYMOB_SERVER_ERROR";
        errorMessage = "Paymob server error. Please try again.";
      }

      throw new PaymentError(errorCode, status, errorMessage);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new PaymentError(
        "PAYMOB_TIMEOUT",
        504,
        "Paymob request timeout. Please try again."
      );
    }

    if (error instanceof PaymentError) {
      throw error;
    }

    throw new PaymentError(
      "PAYMOB_REQUEST_FAILED",
      502,
      "Paymob request failed. Please try again."
    );
  } finally {
    clearTimeout(timeout);
  }
};

const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelayMs = 1000
): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (error instanceof PaymentError && !isRetryableError(error.code)) {
        throw error;
      }

      if (attempt === maxRetries - 1) {
        throw error;
      }

      const delayMs = initialDelayMs * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
};

export const paymentService = {
  async invalidatePaymentHistoryCache(userId: string) {
    try {
      await redis.del(paymentsCacheKey(userId));
    } catch {
      // ignore redis failures
    }
  },

  async listPaymentHistory(userId: string) {
    try {
      const cached = await redis.get(paymentsCacheKey(userId));
      if (cached) {
        prometheus.recordCacheHit("student_payments");
        return JSON.parse(cached) as Array<{
          id: string;
          amountEgp: number;
          status: Payment["status"];
          createdAt: string;
        }>;
      }
      prometheus.recordCacheMiss("student_payments");
    } catch {
      // ignore redis failures
    }

    const rows = await prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        amountPiasters: true,
        status: true,
        createdAt: true
      }
    });

    const payload = rows.map((row) => ({
      id: row.id,
      amountEgp: row.amountPiasters / 100,
      status: row.status,
      createdAt: row.createdAt.toISOString()
    }));

    try {
      await redis.set(paymentsCacheKey(userId), JSON.stringify(payload), "EX", PAYMENTS_CACHE_TTL_SECONDS);
    } catch {
      // ignore redis failures
    }

    return payload;
  },

  async getCheckoutPackage(packageId?: string) {
    const packages = await courseService.getCoursePackagesCached();
    const coursePackage = packageId ? packages.find((entry) => entry.id === packageId) ?? null : packages[0] ?? null;

    if (coursePackage) {
      return coursePackage;
    }

    const settings = await courseService.getCourseSettingsCached();
    if (!settings) {
      throw new PaymentError("COURSE_SETTINGS_MISSING", 500, "Course settings are not configured.");
    }

    return {
      id: null,
      pricePiasters: settings.pricePiasters,
      currency: settings.currency
    };
  },

  async validateCouponPreview(couponCode: string | undefined, packageId?: string) {
    const coursePackage = await this.getCheckoutPackage(packageId);

    if (!couponCode?.trim()) {
      return { valid: false, reason: "NOT_FOUND" };
    }

    return couponService.validateCoupon(couponCode, coursePackage.pricePiasters);
  },

  async createPaymobOrder(userId: string, couponCode?: string, packageId?: string) {
    const student = await userRepository.findById(userId);
    if (!student) {
      throw new PaymentError("USER_NOT_FOUND", 404, "Student not found.");
    }

    const enrollmentStatus = await enrollmentService.getStatus(userId);
    if (enrollmentStatus.enrolled) {
      throw new PaymentError("ALREADY_ENROLLED", 409, "Student is already enrolled.");
    }

    // Check for concurrent checkout attempts
    const pendingPayments = await paymentRepository.findPendingByUserId(userId);
    if (pendingPayments.length > 0) {
      const newestPending = pendingPayments[0];
      const ageMinutes = (Date.now() - newestPending.createdAt.getTime()) / 60000;
      if (ageMinutes < CONCURRENT_CHECKOUT_TIMEOUT_MINUTES) {
        const waitMinutes = Math.ceil(CONCURRENT_CHECKOUT_TIMEOUT_MINUTES - ageMinutes);
        throw new PaymentError(
          "CHECKOUT_IN_PROGRESS",
          409,
          `You have a checkout in progress. Please try again in ${waitMinutes} minute${waitMinutes > 1 ? "s" : ""}.`
        );
      }
    }

    const coursePackage = await this.getCheckoutPackage(packageId);

    const payment = await prisma.$transaction(async (db) => {
      let couponApplication = null;

      if (couponCode?.trim()) {
        try {
          couponApplication = await couponService.applyCoupon(couponCode, coursePackage.pricePiasters, db);
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
          package: coursePackage.id ? { connect: { id: coursePackage.id } } : undefined,
          amountPiasters: couponApplication?.discountedAmountPiasters ?? coursePackage.pricePiasters,
          currency: coursePackage.currency,
          discountPiasters: couponApplication?.discountPiasters ?? 0,
          coupon: couponApplication ? { connect: { id: couponApplication.coupon.id } } : undefined
        }
      });
    });

    await paymentService.invalidatePaymentHistoryCache(userId);

    try {
      const auth = await retryWithBackoff(
        () => paymobRequest<{ token: string }>("/auth/tokens", {
          api_key: env.PAYMOB_API_KEY
        })
      );

      const order = await retryWithBackoff(
        () => paymobRequest<{ id: number }>("/ecommerce/orders", {
          auth_token: auth.token,
          delivery_needed: false,
          amount_cents: payment.amountPiasters,
          currency: payment.currency,
          merchant_order_id: payment.id,
          items: []
        })
      );

      await paymentRepository.update(payment.id, {
        paymobOrderId: String(order.id)
      });

      const paymentKey = await retryWithBackoff(
        () => paymobRequest<{ token: string }>("/acceptance/payment_keys", {
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
        })
      );

      return {
        paymentKey: paymentKey.token,
        orderId: payment.id,
        amount: payment.amountPiasters,
        currency: payment.currency,
        discountApplied: payment.discountPiasters,
        iframeId: env.PAYMOB_IFRAME_ID
      };
    } catch (error) {
      if (error instanceof PaymentError) {
        await paymentRepository.update(payment.id, {
          status: "FAILED",
          errorCode: error.code,
          errorMessage: error.message,
          errorDetails: { originalError: error.toString() } as any
        });
      }
      throw error;
    }
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

    await paymentService.invalidatePaymentHistoryCache(payment.userId);

    if (updatedPayment.status === "COMPLETED") {
      await enrollmentService.enroll(payment.userId, "PAID", payment.id);
      if (payment.couponId) {
        await couponRepository.incrementUses(payment.couponId);
        await couponService.invalidateCouponCache();
      }

      try {
        const student = await userRepository.findById(payment.userId);
        if (student) {
          await sendPaymentReceiptEmail({
            to: student.email,
            fullName: student.fullName,
            paymentId: updatedPayment.id,
            amountEgp: updatedPayment.amountPiasters / 100,
            currency: updatedPayment.currency,
            purchasedAt: updatedPayment.createdAt,
            dashboardUrl: `${env.FRONTEND_URL}/dashboard`
          });
          await sendEnrollmentActivatedEmail(student.email, student.fullName, `${env.FRONTEND_URL}/dashboard`);
        }
      } catch {
        // Ignore email failures - not critical to payment processing
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
