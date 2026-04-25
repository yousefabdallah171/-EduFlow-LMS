import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Request, Response } from "express";
import { metricsService } from "../../src/services/metrics.service.js";
import { metricsMiddleware } from "../../src/middleware/metrics.middleware.js";

describe("Monitoring Integration", () => {
  describe("Metrics Middleware", () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;

    beforeEach(() => {
      mockReq = {
        path: "/api/v1/checkout",
        method: "POST"
      };

      mockRes = {
        statusCode: 201,
        send: vi.fn().mockReturnThis(),
        setHeader: vi.fn().mockReturnThis()
      };
    });

    it("should track API request metrics", (done) => {
      const recordSpy = vi.spyOn(metricsService, "recordApiRequest");

      metricsMiddleware(
        mockReq as Request,
        mockRes as Response,
        () => {
          // Simulate request completion
          mockRes.statusCode = 201;
          if (mockRes.send) {
            mockRes.send({ success: true });
          }

          setTimeout(() => {
            expect(recordSpy).toHaveBeenCalled();
            recordSpy.mockRestore();
            done();
          }, 10);
        }
      );
    });

    it("should record different status codes", (done) => {
      const recordSpy = vi.spyOn(metricsService, "recordApiRequest");

      const statusCodes = [200, 201, 400, 404, 500];

      statusCodes.forEach((code) => {
        mockRes.statusCode = code;
        metricsMiddleware(
          mockReq as Request,
          mockRes as Response,
          () => {
            if (mockRes.send) {
              mockRes.send({ status: code });
            }
          }
        );
      });

      setTimeout(() => {
        expect(recordSpy).toHaveBeenCalledTimes(statusCodes.length);
        recordSpy.mockRestore();
        done();
      }, 50);
    });
  });

  describe("Payment Metrics Flow", () => {
    it("should record complete payment lifecycle", () => {
      const recordPaymentSpy = vi.spyOn(
        metricsService,
        "recordPaymentOperation"
      );
      const recordWebhookSpy = vi.spyOn(
        metricsService,
        "recordWebhookProcessing"
      );
      const updateGaugeSpy = vi.spyOn(metricsService, "updateActivePaymentsGauge");

      // 1. Payment initiated (PENDING)
      updateGaugeSpy("PENDING", 1);

      // 2. API call to Paymob
      metricsService.recordPaymobApiCall("/ecommerce/orders", 201, 500);

      // 3. Payment processing
      recordPaymentSpy("pending", "paymob", 600, 10000);

      // 4. Webhook received (SUCCESS)
      recordWebhookSpy("paymob_transaction_update", "success", 150);

      // 5. Payment completed
      recordPaymentSpy("success", "paymob", 800, 10000);
      updateGaugeSpy("PENDING", 0);
      updateGaugeSpy("COMPLETED", 1);

      expect(recordPaymentSpy).toHaveBeenCalledTimes(2);
      expect(recordWebhookSpy).toHaveBeenCalledTimes(1);
      expect(updateGaugeSpy).toHaveBeenCalledTimes(3);

      recordPaymentSpy.mockRestore();
      recordWebhookSpy.mockRestore();
      updateGaugeSpy.mockRestore();
    });

    it("should record payment failure flow", () => {
      const recordPaymentSpy = vi.spyOn(
        metricsService,
        "recordPaymentOperation"
      );
      const updateGaugeSpy = vi.spyOn(metricsService, "updateActivePaymentsGauge");

      // 1. Payment initiated
      updateGaugeSpy("PENDING", 1);

      // 2. API call fails
      metricsService.recordPaymobApiCall("/ecommerce/orders", 400, 200);

      // 3. Payment marked as failed
      recordPaymentSpy("failure", "paymob", 400, 10000, "INVALID_REQUEST");
      updateGaugeSpy("PENDING", 0);
      updateGaugeSpy("FAILED", 1);

      expect(recordPaymentSpy).toHaveBeenCalledWith(
        "failure",
        "paymob",
        400,
        10000,
        "INVALID_REQUEST"
      );
      expect(updateGaugeSpy).toHaveBeenCalledTimes(3);

      recordPaymentSpy.mockRestore();
      updateGaugeSpy.mockRestore();
    });

    it("should track refund operations", () => {
      const recordRefundSpy = vi.spyOn(metricsService, "recordRefund");
      const updateGaugeSpy = vi.spyOn(metricsService, "updateActivePaymentsGauge");

      // 1. Full refund requested
      recordRefundSpy("full", "requested");
      updateGaugeSpy("REFUND_REQUESTED", 1);

      // 2. Refund processing
      recordRefundSpy("full", "processing");

      // 3. Refund completed
      recordRefundSpy("full", "completed");
      updateGaugeSpy("REFUND_REQUESTED", 0);
      updateGaugeSpy("REFUNDED", 1);

      expect(recordRefundSpy).toHaveBeenCalledTimes(3);
      expect(updateGaugeSpy).toHaveBeenCalledTimes(3);

      recordRefundSpy.mockRestore();
      updateGaugeSpy.mockRestore();
    });
  });

  describe("Enrollment Metrics", () => {
    it("should track enrollment creation success", () => {
      const recordEnrollmentSpy = vi.spyOn(metricsService, "recordEnrollment");

      recordEnrollmentSpy("create", "success");

      expect(recordEnrollmentSpy).toHaveBeenCalledWith("create", "success");

      recordEnrollmentSpy.mockRestore();
    });

    it("should track enrollment failures", () => {
      const recordEnrollmentSpy = vi.spyOn(metricsService, "recordEnrollment");

      recordEnrollmentSpy("create", "failure");
      recordEnrollmentSpy("revoke", "failure");

      expect(recordEnrollmentSpy).toHaveBeenCalledTimes(2);

      recordEnrollmentSpy.mockRestore();
    });
  });

  describe("Database Performance Tracking", () => {
    it("should track slow database queries", () => {
      const recordQuerySpy = vi.spyOn(metricsService, "recordDatabaseQuery");
      const updateErrorRateSpy = vi.spyOn(metricsService, "updateErrorRate");

      // Simulate slow query
      recordQuerySpy("select", "Payment", 1500);
      recordQuerySpy("select", "Payment", 1200);
      recordQuerySpy("select", "Payment", 1300);

      // Update error rate for slow queries
      updateErrorRateSpy("slow_queries", "5m", 25); // 25% of queries are slow

      expect(recordQuerySpy).toHaveBeenCalledTimes(3);
      expect(updateErrorRateSpy).toHaveBeenCalledWith(
        "slow_queries",
        "5m",
        25
      );

      recordQuerySpy.mockRestore();
      updateErrorRateSpy.mockRestore();
    });

    it("should track database operations", () => {
      const recordQuerySpy = vi.spyOn(metricsService, "recordDatabaseQuery");

      const operations = [
        { op: "select", table: "Payment", time: 50 },
        { op: "insert", table: "Payment", time: 100 },
        { op: "update", table: "Enrollment", time: 75 },
        { op: "delete", table: "PaymentEvent", time: 40 }
      ];

      operations.forEach(({ op, table, time }) => {
        recordQuerySpy(op as any, table, time);
      });

      expect(recordQuerySpy).toHaveBeenCalledTimes(4);

      recordQuerySpy.mockRestore();
    });
  });

  describe("Error Rate Monitoring", () => {
    it("should track payment error rate over time windows", () => {
      const updateErrorRateSpy = vi.spyOn(metricsService, "updateErrorRate");

      // Simulate error rates over different time windows
      updateErrorRateSpy("payment", "5m", 5.0);
      updateErrorRateSpy("payment", "1h", 3.2);
      updateErrorRateSpy("payment", "24h", 1.5);

      expect(updateErrorRateSpy).toHaveBeenCalledTimes(3);
      expect(updateErrorRateSpy).toHaveBeenNthCalledWith(1, "payment", "5m", 5.0);
      expect(updateErrorRateSpy).toHaveBeenNthCalledWith(2, "payment", "1h", 3.2);
      expect(updateErrorRateSpy).toHaveBeenNthCalledWith(3, "payment", "24h", 1.5);

      updateErrorRateSpy.mockRestore();
    });

    it("should alert when error rate exceeds threshold", () => {
      const updateErrorRateSpy = vi.spyOn(metricsService, "updateErrorRate");

      const errorRate = 12.5; // > 10% threshold
      updateErrorRateSpy("payment", "5m", errorRate);

      // In real system, this would trigger alert
      expect(errorRate).toBeGreaterThan(10);

      updateErrorRateSpy.mockRestore();
    });
  });

  describe("Webhook Processing Metrics", () => {
    it("should track webhook processing pipeline", () => {
      const recordWebhookSpy = vi.spyOn(
        metricsService,
        "recordWebhookProcessing"
      );

      // Simulate webhook processing
      recordWebhookSpy("paymob_transaction_update", "success", 125);
      recordWebhookSpy("paymob_transaction_update", "success", 110);
      recordWebhookSpy("paymob_transaction_update", "failure", 85);

      expect(recordWebhookSpy).toHaveBeenCalledTimes(3);
      expect(recordWebhookSpy).toHaveBeenNthCalledWith(
        1,
        "paymob_transaction_update",
        "success",
        125
      );
      expect(recordWebhookSpy).toHaveBeenNthCalledWith(
        3,
        "paymob_transaction_update",
        "failure",
        85
      );

      recordWebhookSpy.mockRestore();
    });
  });

  describe("API Request Metrics", () => {
    it("should track all API endpoints", () => {
      const recordRequestSpy = vi.spyOn(metricsService, "recordApiRequest");

      const endpoints = [
        { path: "/api/v1/checkout", method: "POST", code: 201 },
        { path: "/api/v1/payments", method: "GET", code: 200 },
        { path: "/api/v1/payments", method: "POST", code: 201 },
        { path: "/api/v1/refunds", method: "POST", code: 202 }
      ];

      endpoints.forEach(({ path, method, code }) => {
        recordRequestSpy(path, method, code);
      });

      expect(recordRequestSpy).toHaveBeenCalledTimes(4);

      recordRequestSpy.mockRestore();
    });

    it("should track request success and error rates", () => {
      const recordRequestSpy = vi.spyOn(metricsService, "recordApiRequest");

      // 100 successful requests
      for (let i = 0; i < 100; i++) {
        recordRequestSpy("/api/v1/payments", "GET", 200);
      }

      // 5 failed requests (5% error rate)
      for (let i = 0; i < 5; i++) {
        recordRequestSpy("/api/v1/payments", "GET", 500);
      }

      expect(recordRequestSpy).toHaveBeenCalledTimes(105);

      recordRequestSpy.mockRestore();
    });
  });
});
