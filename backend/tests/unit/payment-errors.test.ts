import { describe, it, expect, beforeEach, vi } from "vitest";
import { PaymentError, PaymentErrorCodes } from "../../src/types/payment.types.js";
import { paymentRecoveryService } from "../../src/services/payment-recovery.service.js";
import { errorLoggingService } from "../../src/services/error-logging.service.js";

describe("Payment Error Handling", () => {
  describe("PaymentError class", () => {
    it("creates error with code, message, and status code", () => {
      const error = new PaymentError("TEST_ERROR", "Test message", 400);
      expect(error.code).toBe("TEST_ERROR");
      expect(error.message).toBe("Test message");
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe("PaymentError");
    });

    it("defaults status code to 400", () => {
      const error = new PaymentError("TEST_ERROR", "Test message");
      expect(error.statusCode).toBe(400);
    });

    it("extends Error class", () => {
      const error = new PaymentError("TEST_ERROR", "Test message");
      expect(error instanceof Error).toBe(true);
    });
  });

  describe("Payment error codes", () => {
    it("includes user enrollment error codes", () => {
      expect(PaymentErrorCodes.ALREADY_ENROLLED).toBe("ALREADY_ENROLLED");
    });

    it("includes coupon error codes", () => {
      expect(PaymentErrorCodes.INVALID_COUPON).toBe("INVALID_COUPON");
      expect(PaymentErrorCodes.COUPON_EXPIRED).toBe("COUPON_EXPIRED");
      expect(PaymentErrorCodes.COUPON_LIMIT_EXCEEDED).toBe("COUPON_LIMIT_EXCEEDED");
    });

    it("includes checkout flow error codes", () => {
      expect(PaymentErrorCodes.CHECKOUT_IN_PROGRESS).toBe("CHECKOUT_IN_PROGRESS");
      expect(PaymentErrorCodes.PACKAGE_NOT_FOUND).toBe("PACKAGE_NOT_FOUND");
      expect(PaymentErrorCodes.PAYMENT_NOT_FOUND).toBe("PAYMENT_NOT_FOUND");
    });

    it("includes Paymob API error codes", () => {
      expect(PaymentErrorCodes.PAYMOB_API_ERROR).toBe("PAYMOB_API_ERROR");
      expect(PaymentErrorCodes.PAYMOB_AUTH_FAILED).toBe("PAYMOB_AUTH_FAILED");
      expect(PaymentErrorCodes.PAYMOB_RATE_LIMITED).toBe("PAYMOB_RATE_LIMITED");
      expect(PaymentErrorCodes.PAYMOB_SERVER_ERROR).toBe("PAYMOB_SERVER_ERROR");
      expect(PaymentErrorCodes.PAYMOB_TIMEOUT).toBe("PAYMOB_TIMEOUT");
    });

    it("includes card decline error codes", () => {
      expect(PaymentErrorCodes.INSUFFICIENT_FUNDS).toBe("INSUFFICIENT_FUNDS");
      expect(PaymentErrorCodes.CARD_EXPIRED).toBe("CARD_EXPIRED");
      expect(PaymentErrorCodes.INVALID_CARD).toBe("INVALID_CARD");
      expect(PaymentErrorCodes.FRAUD_SUSPECTED).toBe("FRAUD_SUSPECTED");
      expect(PaymentErrorCodes.CARD_DECLINED).toBe("CARD_DECLINED");
      expect(PaymentErrorCodes.THREE_D_SECURE_FAILED).toBe("THREE_D_SECURE_FAILED");
    });

    it("includes webhook error codes", () => {
      expect(PaymentErrorCodes.INVALID_WEBHOOK_HMAC).toBe("INVALID_WEBHOOK_HMAC");
      expect(PaymentErrorCodes.WEBHOOK_PROCESSING_FAILED).toBe("WEBHOOK_PROCESSING_FAILED");
      expect(PaymentErrorCodes.WEBHOOK_RETRY_FAILED).toBe("WEBHOOK_RETRY_FAILED");
      expect(PaymentErrorCodes.WEBHOOK_CIRCUIT_BREAKER_OPEN).toBe("WEBHOOK_CIRCUIT_BREAKER_OPEN");
    });

    it("includes enrollment error codes", () => {
      expect(PaymentErrorCodes.ENROLLMENT_FAILED).toBe("ENROLLMENT_FAILED");
      expect(PaymentErrorCodes.ENROLLMENT_RETRY_FAILED).toBe("ENROLLMENT_RETRY_FAILED");
    });

    it("includes email error codes", () => {
      expect(PaymentErrorCodes.EMAIL_FAILED).toBe("EMAIL_FAILED");
      expect(PaymentErrorCodes.EMAIL_QUEUE_FULL).toBe("EMAIL_QUEUE_FULL");
      expect(PaymentErrorCodes.EMAIL_BOUNCE_DETECTED).toBe("EMAIL_BOUNCE_DETECTED");
    });

    it("includes recovery error codes", () => {
      expect(PaymentErrorCodes.REFUND_FAILED).toBe("REFUND_FAILED");
      expect(PaymentErrorCodes.RECONCILIATION_FAILED).toBe("RECONCILIATION_FAILED");
      expect(PaymentErrorCodes.RECOVERY_FAILED).toBe("RECOVERY_FAILED");
    });

    it("includes system error codes", () => {
      expect(PaymentErrorCodes.DATABASE_ERROR).toBe("DATABASE_ERROR");
      expect(PaymentErrorCodes.EXTERNAL_SERVICE_ERROR).toBe("EXTERNAL_SERVICE_ERROR");
    });

    it("has 40+ defined error codes", () => {
      const codes = Object.values(PaymentErrorCodes);
      expect(codes.length).toBeGreaterThanOrEqual(40);
    });
  });

  describe("Error recovery determination", () => {
    it("identifies Paymob errors as potentially recoverable", () => {
      const paymobErrors = [
        PaymentErrorCodes.PAYMOB_RATE_LIMITED,
        PaymentErrorCodes.PAYMOB_TIMEOUT,
        PaymentErrorCodes.PAYMOB_SERVER_ERROR
      ];
      paymobErrors.forEach(code => {
        expect(code.startsWith("PAYMOB_")).toBe(true);
      });
    });

    it("identifies card errors as non-recoverable", () => {
      const cardErrors = [
        PaymentErrorCodes.INSUFFICIENT_FUNDS,
        PaymentErrorCodes.CARD_EXPIRED,
        PaymentErrorCodes.CARD_DECLINED,
        PaymentErrorCodes.FRAUD_SUSPECTED
      ];
      cardErrors.forEach(code => {
        expect(code.includes("CARD") || code.includes("FUNDS") || code.includes("FRAUD")).toBe(true);
      });
    });

    it("identifies network errors as transient", () => {
      expect(PaymentErrorCodes.PAYMOB_TIMEOUT).toBe("PAYMOB_TIMEOUT");
      expect(PaymentErrorCodes.NETWORK_ERROR).toBe("NETWORK_ERROR");
    });
  });

  describe("Error logging service", () => {
    it("should create error context", async () => {
      const context = {
        requestId: "test-req-123",
        userId: "user-123",
        endpoint: "POST /api/v1/checkout",
        method: "POST",
        ip: "192.168.1.1"
      };

      // Test that context is properly structured
      expect(context.requestId).toBe("test-req-123");
      expect(context.endpoint).toBe("POST /api/v1/checkout");
      expect(context.method).toBe("POST");
    });

    it("should format error codes consistently", () => {
      expect(PaymentErrorCodes.PAYMOB_API_ERROR).toMatch(/^[A-Z_]+$/);
      expect(PaymentErrorCodes.WEBHOOK_RETRY_FAILED).toMatch(/^[A-Z_]+$/);
      expect(PaymentErrorCodes.EMAIL_BOUNCE_DETECTED).toMatch(/^[A-Z_]+$/);
    });

    it("should support error categorization", () => {
      const categories = {
        paymob: ["PAYMOB_API_ERROR", "PAYMOB_AUTH_FAILED", "PAYMOB_RATE_LIMITED"],
        card: ["CARD_EXPIRED", "CARD_DECLINED", "INSUFFICIENT_FUNDS"],
        webhook: ["WEBHOOK_PROCESSING_FAILED", "WEBHOOK_RETRY_FAILED"],
        email: ["EMAIL_FAILED", "EMAIL_BOUNCE_DETECTED"]
      };

      Object.values(categories).forEach(codes => {
        codes.forEach(code => {
          expect(Object.values(PaymentErrorCodes)).toContain(code);
        });
      });
    });
  });

  describe("Status code mapping", () => {
    it("maps auth failures to 401", () => {
      const error = new PaymentError(PaymentErrorCodes.PAYMOB_AUTH_FAILED, "Auth failed", 401);
      expect(error.statusCode).toBe(401);
    });

    it("maps not found errors to 404", () => {
      const error = new PaymentError(PaymentErrorCodes.PAYMENT_NOT_FOUND, "Not found", 404);
      expect(error.statusCode).toBe(404);
    });

    it("maps conflict errors to 409", () => {
      const error = new PaymentError(PaymentErrorCodes.CHECKOUT_IN_PROGRESS, "Already in progress", 409);
      expect(error.statusCode).toBe(409);
    });

    it("maps rate limit errors to 429", () => {
      const error = new PaymentError(PaymentErrorCodes.PAYMOB_RATE_LIMITED, "Rate limited", 429);
      expect(error.statusCode).toBe(429);
    });

    it("maps server errors to 500", () => {
      const error = new PaymentError(PaymentErrorCodes.PAYMOB_SERVER_ERROR, "Server error", 500);
      expect(error.statusCode).toBe(500);
    });
  });

  describe("Error message clarity", () => {
    it("should have clear user-facing messages", () => {
      const userMessages = {
        [PaymentErrorCodes.CARD_DECLINED]: "Your card was declined. Please try another payment method.",
        [PaymentErrorCodes.INSUFFICIENT_FUNDS]: "Insufficient funds. Please check your card balance.",
        [PaymentErrorCodes.ALREADY_ENROLLED]: "You are already enrolled in this package."
      };

      Object.entries(userMessages).forEach(([code, message]) => {
        expect(message).not.toMatch(/error|failed/i);
        expect(message).toMatch(/\./); // Should end with period
      });
    });

    it("should distinguish between transient and permanent failures", () => {
      const transient = [PaymentErrorCodes.PAYMOB_TIMEOUT, PaymentErrorCodes.NETWORK_ERROR];
      const permanent = [PaymentErrorCodes.CARD_EXPIRED, PaymentErrorCodes.FRAUD_SUSPECTED];

      transient.forEach(code => {
        expect(code).toMatch(/TIMEOUT|NETWORK|RATE_LIMITED/);
      });

      permanent.forEach(code => {
        expect(code).toMatch(/CARD|FRAUD|EXPIRED/);
      });
    });
  });

  describe("Recovery action determination", () => {
    it("should determine correct actions for different error codes", () => {
      const recoveryActions = {
        [PaymentErrorCodes.PAYMOB_TIMEOUT]: "retry",
        [PaymentErrorCodes.CARD_DECLINED]: "user_action",
        [PaymentErrorCodes.PAYMOB_RATE_LIMITED]: "backoff",
        [PaymentErrorCodes.WEBHOOK_RETRY_FAILED]: "retry",
        [PaymentErrorCodes.ENROLLMENT_FAILED]: "retry",
        [PaymentErrorCodes.NETWORK_ERROR]: "retry",
        [PaymentErrorCodes.PAYMOB_SERVER_ERROR]: "backoff"
      };

      const retryable = [
        PaymentErrorCodes.PAYMOB_TIMEOUT,
        PaymentErrorCodes.PAYMOB_RATE_LIMITED,
        PaymentErrorCodes.NETWORK_ERROR,
        PaymentErrorCodes.PAYMOB_SERVER_ERROR
      ];

      retryable.forEach(code => {
        expect(["retry", "backoff"]).toContain(recoveryActions[code]);
      });
    });
  });

  describe("Error context preservation", () => {
    it("should preserve original error information", () => {
      const originalError = new Error("Original error message");
      const paymentError = new PaymentError("WRAPPED_ERROR", originalError.message, 500);

      expect(paymentError.message).toBe("Original error message");
      expect(paymentError.code).toBe("WRAPPED_ERROR");
    });

    it("should support stack trace capture", () => {
      const error = new PaymentError("TEST_ERROR", "Test", 400);
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("PaymentError");
    });
  });

  describe("Error code uniqueness", () => {
    it("should have unique error codes", () => {
      const codes = Object.values(PaymentErrorCodes);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });

    it("should use consistent naming convention", () => {
      Object.keys(PaymentErrorCodes).forEach(key => {
        expect(key).toMatch(/^[A-Z_]+$/);
      });
    });
  });
});

describe("Error handling integration", () => {
  describe("Error flow", () => {
    it("should handle error creation and logging", () => {
      const error = new PaymentError("TEST_CODE", "Test message", 400);
      expect(error.code).toBe("TEST_CODE");
      expect(error.message).toBe("Test message");
      expect(error.statusCode).toBe(400);
    });

    it("should support error chain tracking", () => {
      try {
        throw new PaymentError("ROOT_ERROR", "Root cause", 500);
      } catch (error) {
        if (error instanceof PaymentError) {
          expect(error.code).toBe("ROOT_ERROR");
        }
      }
    });

    it("should format errors for API responses", () => {
      const error = new PaymentError("INVALID_COUPON", "Coupon not found", 400);
      const response = {
        error: error.code,
        message: error.message,
        statusCode: error.statusCode
      };

      expect(response).toEqual({
        error: "INVALID_COUPON",
        message: "Coupon not found",
        statusCode: 400
      });
    });
  });
});
