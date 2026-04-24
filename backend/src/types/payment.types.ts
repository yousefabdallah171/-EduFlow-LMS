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
  ALREADY_ENROLLED: "ALREADY_ENROLLED",
  INVALID_COUPON: "INVALID_COUPON",
  PAYMOB_API_ERROR: "PAYMOB_API_ERROR",
  CHECKOUT_IN_PROGRESS: "CHECKOUT_IN_PROGRESS",
  PACKAGE_NOT_FOUND: "PACKAGE_NOT_FOUND",
  PAYMENT_NOT_FOUND: "PAYMENT_NOT_FOUND",
  INVALID_WEBHOOK_HMAC: "INVALID_WEBHOOK_HMAC",
  WEBHOOK_PROCESSING_FAILED: "WEBHOOK_PROCESSING_FAILED",
  ENROLLMENT_FAILED: "ENROLLMENT_FAILED",
  EMAIL_FAILED: "EMAIL_FAILED",
  REFUND_FAILED: "REFUND_FAILED",
  RECONCILIATION_FAILED: "RECONCILIATION_FAILED"
} as const;
