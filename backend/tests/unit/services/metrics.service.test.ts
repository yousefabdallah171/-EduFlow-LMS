import { describe, it, expect, beforeEach, vi } from "vitest";
import { metricsService } from "../../../src/services/metrics.service.js";
import {
  paymentCounter,
  paymentSuccessCounter,
  paymentFailureCounter,
  paymentAmountHistogram,
  paymentProcessingTimeHistogram,
  paymobApiTimeHistogram,
  activePaymentsGauge,
  refundCounter,
  webhookProcessingTimeHistogram,
  dbQueryTimeHistogram,
  enrollmentCounter,
  endpointRequestCounter,
  errorRateGauge
} from "../../../src/services/metrics.service.js";

// Mock prom-client metrics
vi.mock("prom-client", () => ({
  Counter: vi.fn().mockImplementation(() => ({
    inc: vi.fn()
  })),
  Gauge: vi.fn().mockImplementation(() => ({
    set: vi.fn()
  })),
  Histogram: vi.fn().mockImplementation(() => ({
    observe: vi.fn()
  }))
}));

describe("Metrics Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("recordPaymentOperation", () => {
    it("should record successful payment operation", () => {
      metricsService.recordPaymentOperation("success", "paymob", 1000, 10000);

      expect(paymentCounter.inc).toHaveBeenCalledWith({
        status: "success",
        method: "paymob"
      });
      expect(paymentSuccessCounter.inc).toHaveBeenCalledWith({
        method: "paymob"
      });
      expect(paymentAmountHistogram.observe).toHaveBeenCalledWith(
        { method: "paymob" },
        10000
      );
      expect(paymentProcessingTimeHistogram.observe).toHaveBeenCalledWith(
        { operation: "payment", status: "success" },
        1000
      );
    });

    it("should record failed payment with error code", () => {
      metricsService.recordPaymentOperation(
        "failure",
        "paymob",
        1500,
        10000,
        "CARD_DECLINED"
      );

      expect(paymentCounter.inc).toHaveBeenCalledWith({
        status: "failure",
        method: "paymob"
      });
      expect(paymentFailureCounter.inc).toHaveBeenCalledWith({
        error_code: "CARD_DECLINED",
        method: "paymob"
      });
      expect(paymentProcessingTimeHistogram.observe).toHaveBeenCalledWith(
        { operation: "payment", status: "failure" },
        1500
      );
    });

    it("should record pending payment status", () => {
      metricsService.recordPaymentOperation("pending", "paymob", 500, 5000);

      expect(paymentCounter.inc).toHaveBeenCalledWith({
        status: "pending",
        method: "paymob"
      });
      expect(paymentProcessingTimeHistogram.observe).toHaveBeenCalledWith(
        { operation: "payment", status: "pending" },
        500
      );
    });

    it("should record various payment amounts", () => {
      const amounts = [1000, 5000, 50000, 100000];

      amounts.forEach((amount) => {
        metricsService.recordPaymentOperation("success", "paymob", 1000, amount);
      });

      amounts.forEach((amount) => {
        expect(paymentAmountHistogram.observe).toHaveBeenCalledWith(
          { method: "paymob" },
          amount
        );
      });
    });
  });

  describe("recordPaymobApiCall", () => {
    it("should record successful API call", () => {
      metricsService.recordPaymobApiCall("/ecommerce/orders", 201, 500);

      expect(paymobApiTimeHistogram.observe).toHaveBeenCalledWith(
        { endpoint: "/ecommerce/orders", status_code: "201" },
        500
      );
    });

    it("should record API error responses", () => {
      metricsService.recordPaymobApiCall("/ecommerce/orders", 400, 100);
      metricsService.recordPaymobApiCall("/auth/tokens", 401, 150);
      metricsService.recordPaymobApiCall("/ecommerce/orders", 500, 200);

      expect(paymobApiTimeHistogram.observe).toHaveBeenCalledTimes(3);
    });

    it("should track different endpoints", () => {
      const endpoints = [
        "/auth/tokens",
        "/ecommerce/orders",
        "/acceptance/payments/process"
      ];

      endpoints.forEach((endpoint) => {
        metricsService.recordPaymobApiCall(endpoint, 200, 300);
      });

      endpoints.forEach((endpoint) => {
        expect(paymobApiTimeHistogram.observe).toHaveBeenCalledWith(
          { endpoint, status_code: "200" },
          300
        );
      });
    });
  });

  describe("updateActivePaymentsGauge", () => {
    it("should update active payments count by status", () => {
      metricsService.updateActivePaymentsGauge("PENDING", 10);
      metricsService.updateActivePaymentsGauge("COMPLETED", 150);
      metricsService.updateActivePaymentsGauge("FAILED", 5);

      expect(activePaymentsGauge.set).toHaveBeenCalledWith(
        { status: "PENDING" },
        10
      );
      expect(activePaymentsGauge.set).toHaveBeenCalledWith(
        { status: "COMPLETED" },
        150
      );
      expect(activePaymentsGauge.set).toHaveBeenCalledWith(
        { status: "FAILED" },
        5
      );
    });

    it("should handle zero counts", () => {
      metricsService.updateActivePaymentsGauge("WEBHOOK_PENDING", 0);

      expect(activePaymentsGauge.set).toHaveBeenCalledWith(
        { status: "WEBHOOK_PENDING" },
        0
      );
    });
  });

  describe("recordRefund", () => {
    it("should record full refund", () => {
      metricsService.recordRefund("full", "completed");

      expect(refundCounter.inc).toHaveBeenCalledWith({
        refund_type: "full",
        status: "completed"
      });
    });

    it("should record partial refund", () => {
      metricsService.recordRefund("partial", "processing");

      expect(refundCounter.inc).toHaveBeenCalledWith({
        refund_type: "partial",
        status: "processing"
      });
    });

    it("should record refund failures", () => {
      metricsService.recordRefund("full", "failed");

      expect(refundCounter.inc).toHaveBeenCalledWith({
        refund_type: "full",
        status: "failed"
      });
    });
  });

  describe("recordWebhookProcessing", () => {
    it("should record successful webhook", () => {
      metricsService.recordWebhookProcessing(
        "paymob_transaction_update",
        "success",
        100
      );

      expect(webhookProcessingTimeHistogram.observe).toHaveBeenCalledWith(
        { webhook_type: "paymob_transaction_update", status: "success" },
        100
      );
    });

    it("should record webhook failures", () => {
      metricsService.recordWebhookProcessing(
        "paymob_transaction_update",
        "failure",
        50
      );

      expect(webhookProcessingTimeHistogram.observe).toHaveBeenCalledWith(
        { webhook_type: "paymob_transaction_update", status: "failure" },
        50
      );
    });

    it("should track processing time", () => {
      const times = [50, 100, 200, 500];

      times.forEach((time) => {
        metricsService.recordWebhookProcessing(
          "paymob_refund",
          "success",
          time
        );
      });

      times.forEach((time) => {
        expect(webhookProcessingTimeHistogram.observe).toHaveBeenCalledWith(
          { webhook_type: "paymob_refund", status: "success" },
          time
        );
      });
    });
  });

  describe("recordDatabaseQuery", () => {
    it("should record database select query", () => {
      metricsService.recordDatabaseQuery("select", "Payment", 50);

      expect(dbQueryTimeHistogram.observe).toHaveBeenCalledWith(
        { operation: "select", table: "Payment" },
        50
      );
    });

    it("should record database insert query", () => {
      metricsService.recordDatabaseQuery("insert", "Payment", 100);

      expect(dbQueryTimeHistogram.observe).toHaveBeenCalledWith(
        { operation: "insert", table: "Payment" },
        100
      );
    });

    it("should track different tables", () => {
      const tables = ["Payment", "Enrollment", "PaymentEvent"];

      tables.forEach((table) => {
        metricsService.recordDatabaseQuery("select", table, 30);
      });

      tables.forEach((table) => {
        expect(dbQueryTimeHistogram.observe).toHaveBeenCalledWith(
          { operation: "select", table },
          30
        );
      });
    });
  });

  describe("recordEnrollment", () => {
    it("should record successful enrollment creation", () => {
      metricsService.recordEnrollment("create", "success");

      expect(enrollmentCounter.inc).toHaveBeenCalledWith({
        operation: "create",
        status: "success"
      });
    });

    it("should record enrollment revocation", () => {
      metricsService.recordEnrollment("revoke", "success");

      expect(enrollmentCounter.inc).toHaveBeenCalledWith({
        operation: "revoke",
        status: "success"
      });
    });

    it("should record enrollment failures", () => {
      metricsService.recordEnrollment("create", "failure");

      expect(enrollmentCounter.inc).toHaveBeenCalledWith({
        operation: "create",
        status: "failure"
      });
    });
  });

  describe("recordApiRequest", () => {
    it("should record successful API request", () => {
      metricsService.recordApiRequest("/api/v1/checkout", "POST", 201);

      expect(endpointRequestCounter.inc).toHaveBeenCalledWith({
        endpoint: "/api/v1/checkout",
        method: "POST",
        status_code: "201"
      });
    });

    it("should record API errors", () => {
      metricsService.recordApiRequest("/api/v1/payments", "GET", 500);

      expect(endpointRequestCounter.inc).toHaveBeenCalledWith({
        endpoint: "/api/v1/payments",
        method: "GET",
        status_code: "500"
      });
    });

    it("should track different HTTP methods", () => {
      metricsService.recordApiRequest("/api/v1/payments", "GET", 200);
      metricsService.recordApiRequest("/api/v1/payments", "POST", 201);
      metricsService.recordApiRequest("/api/v1/payments", "PATCH", 200);
      metricsService.recordApiRequest("/api/v1/payments", "DELETE", 204);

      expect(endpointRequestCounter.inc).toHaveBeenCalledTimes(4);
    });
  });

  describe("updateErrorRate", () => {
    it("should update error rate for operation", () => {
      metricsService.updateErrorRate("payment", "5m", 5.5);

      expect(errorRateGauge.set).toHaveBeenCalledWith(
        { operation: "payment", time_window: "5m" },
        5.5
      );
    });

    it("should track different time windows", () => {
      metricsService.updateErrorRate("payment", "5m", 5.5);
      metricsService.updateErrorRate("payment", "1h", 3.2);
      metricsService.updateErrorRate("payment", "24h", 1.8);

      expect(errorRateGauge.set).toHaveBeenCalledTimes(3);
    });

    it("should handle zero error rate", () => {
      metricsService.updateErrorRate("enrollment", "5m", 0);

      expect(errorRateGauge.set).toHaveBeenCalledWith(
        { operation: "enrollment", time_window: "5m" },
        0
      );
    });
  });
});
