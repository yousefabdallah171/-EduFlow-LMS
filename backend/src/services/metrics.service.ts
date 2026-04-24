import { Counter, Gauge, Histogram } from "prom-client";
import { registry } from "../observability/prometheus.js";

// Payment operation counters
export const paymentCounter = new Counter({
  name: "eduflow_payments_total",
  help: "Total number of payment operations by status",
  labelNames: ["status", "method"],
  registers: [registry]
});

export const paymentSuccessCounter = new Counter({
  name: "eduflow_payments_success_total",
  help: "Total number of successful payments",
  labelNames: ["method"],
  registers: [registry]
});

export const paymentFailureCounter = new Counter({
  name: "eduflow_payments_failure_total",
  help: "Total number of failed payments by error code",
  labelNames: ["error_code", "method"],
  registers: [registry]
});

// Payment amount histogram (in piasters)
export const paymentAmountHistogram = new Histogram({
  name: "eduflow_payment_amount_piasters",
  help: "Distribution of payment amounts in piasters",
  buckets: [1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000],
  labelNames: ["method"],
  registers: [registry]
});

// Payment processing time histogram (in milliseconds)
export const paymentProcessingTimeHistogram = new Histogram({
  name: "eduflow_payment_processing_time_ms",
  help: "Payment processing time in milliseconds",
  buckets: [100, 250, 500, 1000, 2500, 5000, 10000],
  labelNames: ["operation", "status"],
  registers: [registry]
});

// Paymob API request time
export const paymobApiTimeHistogram = new Histogram({
  name: "eduflow_paymob_api_request_time_ms",
  help: "Paymob API request time in milliseconds",
  buckets: [50, 100, 250, 500, 1000, 2500, 5000],
  labelNames: ["endpoint", "status_code"],
  registers: [registry]
});

// Active payments gauge (by status)
export const activePaymentsGauge = new Gauge({
  name: "eduflow_active_payments",
  help: "Number of active payments by status",
  labelNames: ["status"],
  registers: [registry]
});

// Refund counter
export const refundCounter = new Counter({
  name: "eduflow_refunds_total",
  help: "Total number of refunds by status",
  labelNames: ["refund_type", "status"],
  registers: [registry]
});

// Webhook processing time
export const webhookProcessingTimeHistogram = new Histogram({
  name: "eduflow_webhook_processing_time_ms",
  help: "Webhook processing time in milliseconds",
  buckets: [10, 50, 100, 250, 500],
  labelNames: ["webhook_type", "status"],
  registers: [registry]
});

// Database query time
export const dbQueryTimeHistogram = new Histogram({
  name: "eduflow_db_query_time_ms",
  help: "Database query time in milliseconds",
  buckets: [1, 5, 10, 50, 100, 500, 1000],
  labelNames: ["operation", "table"],
  registers: [registry]
});

// Enrollment operations
export const enrollmentCounter = new Counter({
  name: "eduflow_enrollments_total",
  help: "Total enrollment operations",
  labelNames: ["operation", "status"],
  registers: [registry]
});

// API endpoint request count
export const endpointRequestCounter = new Counter({
  name: "eduflow_api_requests_total",
  help: "Total API requests by endpoint and method",
  labelNames: ["endpoint", "method", "status_code"],
  registers: [registry]
});

// Error rate gauge
export const errorRateGauge = new Gauge({
  name: "eduflow_error_rate",
  help: "Current error rate percentage",
  labelNames: ["operation", "time_window"],
  registers: [registry]
});

export const metricsService = {
  recordPaymentOperation(
    status: "success" | "failure" | "pending",
    method: string,
    processingTimeMs: number,
    amountPiasters: number,
    errorCode?: string
  ) {
    paymentCounter.inc({ status, method });
    paymentAmountHistogram.observe({ method }, amountPiasters);
    paymentProcessingTimeHistogram.observe({ operation: "payment", status }, processingTimeMs);

    if (status === "success") {
      paymentSuccessCounter.inc({ method });
    } else if (status === "failure" && errorCode) {
      paymentFailureCounter.inc({ error_code: errorCode, method });
    }
  },

  recordPaymobApiCall(endpoint: string, statusCode: number, timeMs: number) {
    paymobApiTimeHistogram.observe({ endpoint, status_code: statusCode.toString() }, timeMs);
  },

  updateActivePaymentsGauge(status: string, count: number) {
    activePaymentsGauge.set({ status }, count);
  },

  recordRefund(refundType: "full" | "partial", status: "requested" | "processing" | "completed" | "failed") {
    refundCounter.inc({ refund_type: refundType, status });
  },

  recordWebhookProcessing(webhookType: string, status: "success" | "failure", timeMs: number) {
    webhookProcessingTimeHistogram.observe({ webhook_type: webhookType, status }, timeMs);
  },

  recordDatabaseQuery(operation: string, table: string, timeMs: number) {
    dbQueryTimeHistogram.observe({ operation, table }, timeMs);
  },

  recordEnrollment(operation: "create" | "revoke", status: "success" | "failure") {
    enrollmentCounter.inc({ operation, status });
  },

  recordApiRequest(endpoint: string, method: string, statusCode: number) {
    endpointRequestCounter.inc({ endpoint, method, status_code: statusCode.toString() });
  },

  updateErrorRate(operation: string, timeWindow: string, errorRatePercent: number) {
    errorRateGauge.set({ operation, time_window: timeWindow }, errorRatePercent);
  }
};

export default metricsService;
