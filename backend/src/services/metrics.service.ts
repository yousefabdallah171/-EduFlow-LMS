import * as client from "prom-client";
import { env } from "../config/env.js";

const enabled = env.PROMETHEUS_METRICS_ENABLED;
const registry = new client.Registry();

// Payment metrics
const paymentsTotal = new client.Counter({
  name: "eduflow_payments_total",
  help: "Total payment operations",
  labelNames: ["status", "method"] as const
});

const paymentAmount = new client.Histogram({
  name: "eduflow_payment_amount_piasters",
  help: "Payment amount distribution in piasters",
  labelNames: ["method"] as const,
  buckets: [100, 500, 1000, 5000, 10000, 50000, 100000, 500000]
});

const paymentProcessingTime = new client.Histogram({
  name: "eduflow_payment_processing_time_ms",
  help: "Payment processing time in milliseconds",
  labelNames: ["status"] as const,
  buckets: [100, 500, 1000, 2000, 5000, 10000]
});

const activePayments = new client.Gauge({
  name: "eduflow_active_payments",
  help: "Number of active/in-progress payments",
  labelNames: ["status"] as const
});

// Refund metrics
const refundsTotal = new client.Counter({
  name: "eduflow_refunds_total",
  help: "Total refund operations",
  labelNames: ["type", "status"] as const
});

const refundAmount = new client.Histogram({
  name: "eduflow_refund_amount_piasters",
  help: "Refund amount distribution in piasters",
  labelNames: ["type"] as const,
  buckets: [100, 500, 1000, 5000, 10000, 50000, 100000, 500000]
});

const refundProcessingTime = new client.Histogram({
  name: "eduflow_refund_processing_time_ms",
  help: "Refund processing time in milliseconds",
  labelNames: ["type", "status"] as const,
  buckets: [100, 500, 1000, 2000, 5000, 10000]
});

// Paymob API metrics
const paymobApiTime = new client.Histogram({
  name: "eduflow_paymob_api_request_time_ms",
  help: "Paymob API request time in milliseconds",
  labelNames: ["endpoint", "status"] as const,
  buckets: [100, 250, 500, 1000, 2000, 5000]
});

const paymobApiErrors = new client.Counter({
  name: "eduflow_paymob_api_errors_total",
  help: "Total Paymob API errors",
  labelNames: ["endpoint", "errorCode"] as const
});

// Database metrics
const dbQueryTime = new client.Histogram({
  name: "eduflow_db_query_time_ms",
  help: "Database query time in milliseconds",
  labelNames: ["operation", "table"] as const,
  buckets: [1, 5, 10, 25, 50, 100, 250, 500]
});

const dbQueryErrors = new client.Counter({
  name: "eduflow_db_query_errors_total",
  help: "Database query errors",
  labelNames: ["operation", "table"] as const
});

// Webhook metrics
const webhookProcessingTime = new client.Histogram({
  name: "eduflow_webhook_processing_time_ms",
  help: "Webhook processing time in milliseconds",
  labelNames: ["type", "status"] as const,
  buckets: [100, 250, 500, 1000, 2000, 5000]
});

const webhookErrors = new client.Counter({
  name: "eduflow_webhook_errors_total",
  help: "Webhook processing errors",
  labelNames: ["type", "errorCode"] as const
});

// Enrollment metrics
const enrollmentsTotal = new client.Counter({
  name: "eduflow_enrollments_total",
  help: "Total enrollment operations",
  labelNames: ["operation", "status"] as const
});

const enrollmentProcessingTime = new client.Histogram({
  name: "eduflow_enrollment_processing_time_ms",
  help: "Enrollment operation time in milliseconds",
  labelNames: ["operation", "status"] as const,
  buckets: [50, 100, 250, 500, 1000, 2000]
});

const apiRequestsTotal = new client.Counter({
  name: "eduflow_api_requests_total",
  help: "Total API requests by path/method/status",
  labelNames: ["path", "method", "status"] as const
});

const errorRateGauge = new client.Gauge({
  name: "eduflow_error_rate_percent",
  help: "Error rate percent by category/time window",
  labelNames: ["category", "window"] as const
});

// Register all metrics
const metrics: Array<client.Counter<any> | client.Histogram<any> | client.Gauge<any>> = [
  paymentsTotal,
  paymentAmount,
  paymentProcessingTime,
  activePayments,
  refundsTotal,
  refundAmount,
  refundProcessingTime,
  paymobApiTime,
  paymobApiErrors,
  dbQueryTime,
  dbQueryErrors,
  webhookProcessingTime,
  webhookErrors,
  enrollmentsTotal,
  enrollmentProcessingTime,
  apiRequestsTotal,
  errorRateGauge
];

metrics.forEach(metric => {
  try {
    registry.registerMetric(metric as any);
  } catch {
    // Metric already registered
  }
});

export const metricsService = {
  recordApiRequest(path: string, method: string, statusCode: number) {
    if (!enabled) return;
    try {
      apiRequestsTotal.inc({ path, method, status: String(statusCode) });
    } catch {
      // ignore metrics failures
    }
  },

  recordPaymentOperation(status: "pending" | "success" | "failure", method: string = "paymob", durationMs: number = 0, amountPiasters: number = 0) {
    if (!enabled) return;
    try {
      paymentsTotal.inc({ status, method });
      if (durationMs > 0) {
        paymentProcessingTime.observe({ status }, durationMs);
      }
      if (amountPiasters > 0) {
        paymentAmount.observe({ method }, amountPiasters);
      }
    } catch {
      // ignore metrics failures
    }
  },

  recordRefund(type: "full" | "partial", status: "requested" | "processing" | "completed" | "failed" | "cancelled", durationMs: number = 0, amountPiasters: number = 0) {
    if (!enabled) return;
    try {
      refundsTotal.inc({ type, status });
      if (durationMs > 0) {
        refundProcessingTime.observe({ type, status }, durationMs);
      }
      if (amountPiasters > 0) {
        refundAmount.observe({ type }, amountPiasters);
      }
    } catch {
      // ignore metrics failures
    }
  },

  recordPaymobApiCall(endpoint: string, statusCode: number, durationMs: number) {
    if (!enabled) return;
    try {
      const status = statusCode >= 200 && statusCode < 300 ? "success" : "error";
      paymobApiTime.observe({ endpoint, status }, durationMs);
      if (status === "error") {
        paymobApiErrors.inc({ endpoint, errorCode: String(statusCode) });
      }
    } catch {
      // ignore metrics failures
    }
  },

  recordDatabaseQuery(operation: "select" | "create" | "update" | "delete", table: string, durationMs: number, errorCode?: string) {
    if (!enabled) return;
    try {
      dbQueryTime.observe({ operation, table }, durationMs);
      if (errorCode) {
        dbQueryErrors.inc({ operation, table });
      }
    } catch {
      // ignore metrics failures
    }
  },

  recordWebhookProcessing(type: "paymob" | "refund", status: "success" | "failure", durationMs: number, errorCode?: string) {
    if (!enabled) return;
    try {
      webhookProcessingTime.observe({ type, status }, durationMs);
      if (errorCode) {
        webhookErrors.inc({ type, errorCode });
      }
    } catch {
      // ignore metrics failures
    }
  },

  recordEnrollment(operation: "create" | "revoke" | "activate", status: "success" | "failure", durationMs: number = 0) {
    if (!enabled) return;
    try {
      enrollmentsTotal.inc({ operation, status });
      if (durationMs > 0) {
        enrollmentProcessingTime.observe({ operation, status }, durationMs);
      }
    } catch {
      // ignore metrics failures
    }
  },

  updateActivePaymentsGauge(status: string, value: number) {
    if (!enabled) return;
    try {
      activePayments.set({ status: status.toLowerCase() }, value);
    } catch {
      // ignore metrics failures
    }
  },

  updateActivePayments(status: "pending" | "processing", delta: number) {
    if (!enabled) return;
    try {
      if (delta > 0) {
        activePayments.inc({ status }, delta);
      } else if (delta < 0) {
        activePayments.dec({ status }, Math.abs(delta));
      }
    } catch {
      // ignore metrics failures
    }
  },

  updateErrorRate(category: string, timeWindow: string, ratePercent: number) {
    if (!enabled) return;
    try {
      errorRateGauge.set({ category, window: timeWindow }, ratePercent);
    } catch {
      // ignore metrics failures
    }
  },

  getRegistry() {
    return registry;
  }
};
