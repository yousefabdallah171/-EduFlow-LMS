import type { Payment, PaymentEvent, PaymentReconciliation, PaymentStatus, PaymentEventType, PaymentMethod } from "@prisma/client";

/**
 * Type aliases for Prisma models
 */
export type PaymentRecord = Payment;
export type PaymentEventRecord = PaymentEvent;
export type PaymentReconciliationRecord = PaymentReconciliation;

/**
 * Enum type aliases
 */
export type PaymentStatusType = PaymentStatus;
export type PaymentEventTypeEnum = PaymentEventType;
export type PaymentMethodEnum = PaymentMethod;

/**
 * Request/Response DTOs
 */

export interface CreateCheckoutRequest {
  packageId: string;
  couponCode?: string;
}

export interface CheckoutResponse {
  orderId: string;
  paymentKey: string;
  amount: number;
  currency: string;
  discountApplied: number;
  iframeId: string;
}

export interface PaymentStatusResponse {
  id: string;
  status: PaymentStatus;
  enrolled: boolean;
  failureReason?: string;
}

export interface PaymentHistoryItem {
  id: string;
  amount: number;
  status: PaymentStatus;
  createdAt: string;
  refundStatus?: string;
}

export interface PaymentHistoryResponse {
  payments: PaymentHistoryItem[];
}

/**
 * Webhook payload types
 */

export interface PaymobWebhookPayload {
  type: string;
  obj: {
    success: boolean;
    id: number;
    created_at: string;
    amount_cents: number;
    order: {
      id: number;
      merchant_order_id: string;
      amount_cents: number;
      created_at: string;
    };
    error?: {
      code: string;
      message: string;
    };
  };
}

/**
 * Internal service types
 */

export interface PaymentEventData {
  eventType: PaymentEventType;
  status: PaymentStatus;
  previousStatus?: PaymentStatus;
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentStatusChangeEvent {
  paymentId: string;
  oldStatus: PaymentStatus;
  newStatus: PaymentStatus;
  timestamp: Date;
  reason?: string;
}

export interface WebhookProcessingResult {
  success: boolean;
  paymentId: string;
  previousStatus: PaymentStatus;
  newStatus: PaymentStatus;
  enrollmentTriggered: boolean;
  error?: string;
}

export interface ReconciliationResult {
  paymentId: string;
  isReconciled: boolean;
  amountMatch: boolean;
  statusMatch: boolean;
  notes?: string;
}

/**
 * Admin types
 */

export interface PaymentListFilter {
  status?: PaymentStatus;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface AdminPaymentDetails {
  id: string;
  userId: string;
  amount: number;
  status: PaymentStatus;
  createdAt: Date;
  events: PaymentEventRecord[];
  reconciliation?: PaymentReconciliationRecord;
}

export interface RefundRequest {
  paymentId: string;
  amount?: number;
  reason: string;
}

export interface ManualOverrideRequest {
  paymentId: string;
  newStatus: PaymentStatus;
  reason: string;
  adminNotes?: string;
}

/**
 * Refund types (Phase 5)
 */

export interface InitiateRefundRequest {
  paymentId: string;
  amount?: number; // undefined = full refund, number = partial
  reason: string;
}

export interface RefundResponse {
  paymentId: string;
  refundId: string;
  status: string; // REQUESTED, PROCESSING, COMPLETED, FAILED
  amount: number;
  refundType: "FULL" | "PARTIAL";
  initiatedAt: Date;
  enrollmentRevoked: boolean;
}

export interface RefundStatusResponse {
  paymentId: string;
  refundId: string;
  status: string;
  amount: number;
  paymobRefundId?: string;
  initiatedAt: Date;
  completedAt?: Date;
  reason?: string;
}

export interface RefundHistoryItem {
  refundId: string;
  paymentId: string;
  amount: number;
  status: string;
  refundType: "FULL" | "PARTIAL";
  initiatedAt: Date;
  completedAt?: Date;
  reason?: string;
}

export interface RefundHistoryResponse {
  paymentId: string;
  refunds: RefundHistoryItem[];
}

/**
 * Error types
 */

export class PaymentError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = "PaymentError";
  }
}

export const PaymentErrorCodes = {
  // User enrollment errors
  ALREADY_ENROLLED: "ALREADY_ENROLLED",

  // Coupon errors
  INVALID_COUPON: "INVALID_COUPON",
  COUPON_EXPIRED: "COUPON_EXPIRED",
  COUPON_LIMIT_EXCEEDED: "COUPON_LIMIT_EXCEEDED",

  // Checkout flow errors
  CHECKOUT_IN_PROGRESS: "CHECKOUT_IN_PROGRESS",
  PACKAGE_NOT_FOUND: "PACKAGE_NOT_FOUND",
  PAYMENT_NOT_FOUND: "PAYMENT_NOT_FOUND",

  // Paymob API errors
  PAYMOB_API_ERROR: "PAYMOB_API_ERROR",
  PAYMOB_AUTH_FAILED: "PAYMOB_AUTH_FAILED",
  PAYMOB_RATE_LIMITED: "PAYMOB_RATE_LIMITED",
  PAYMOB_SERVER_ERROR: "PAYMOB_SERVER_ERROR",
  PAYMOB_TIMEOUT: "PAYMOB_TIMEOUT",

  // Payment failure reasons (Phase 4)
  INSUFFICIENT_FUNDS: "INSUFFICIENT_FUNDS",
  CARD_EXPIRED: "CARD_EXPIRED",
  INVALID_CARD: "INVALID_CARD",
  FRAUD_SUSPECTED: "FRAUD_SUSPECTED",
  CARD_DECLINED: "CARD_DECLINED",
  NETWORK_ERROR: "NETWORK_ERROR",
  THREE_D_SECURE_FAILED: "THREE_D_SECURE_FAILED",

  // Webhook errors
  INVALID_WEBHOOK_HMAC: "INVALID_WEBHOOK_HMAC",
  WEBHOOK_PROCESSING_FAILED: "WEBHOOK_PROCESSING_FAILED",
  WEBHOOK_RETRY_FAILED: "WEBHOOK_RETRY_FAILED",
  WEBHOOK_CIRCUIT_BREAKER_OPEN: "WEBHOOK_CIRCUIT_BREAKER_OPEN",

  // Enrollment errors
  ENROLLMENT_FAILED: "ENROLLMENT_FAILED",
  ENROLLMENT_RETRY_FAILED: "ENROLLMENT_RETRY_FAILED",

  // Email errors
  EMAIL_FAILED: "EMAIL_FAILED",
  EMAIL_QUEUE_FULL: "EMAIL_QUEUE_FULL",
  EMAIL_BOUNCE_DETECTED: "EMAIL_BOUNCE_DETECTED",

  // Refund errors (Phase 5)
  REFUND_FAILED: "REFUND_FAILED",
  REFUND_INVALID_AMOUNT: "REFUND_INVALID_AMOUNT",
  REFUND_ALREADY_PROCESSED: "REFUND_ALREADY_PROCESSED",
  REFUND_PAYMOB_ERROR: "REFUND_PAYMOB_ERROR",
  REFUND_INSUFFICIENT_FUNDS: "REFUND_INSUFFICIENT_FUNDS",
  REFUND_TIMEOUT: "REFUND_TIMEOUT",
  REFUND_RETRY_FAILED: "REFUND_RETRY_FAILED",
  REFUND_ENROLLMENT_REVOCATION_FAILED: "REFUND_ENROLLMENT_REVOCATION_FAILED",

  // Recovery errors
  RECONCILIATION_FAILED: "RECONCILIATION_FAILED",
  RECOVERY_FAILED: "RECOVERY_FAILED",

  // System errors
  DATABASE_ERROR: "DATABASE_ERROR",
  EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR"
} as const;
