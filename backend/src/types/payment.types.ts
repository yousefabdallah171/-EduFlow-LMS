import {
  Payment,
  PaymentStatus,
  PaymentEvent,
  PaymentEventType,
  PaymentReconciliation,
} from "@prisma/client";

// Exported types
export type {
  Payment,
  PaymentStatus,
  PaymentEvent,
  PaymentEventType,
  PaymentReconciliation,
};

// DTOs
export interface CreatePaymentDTO {
  userId: string;
  packageId: string;
  amountPiasters: number;
  couponId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface PaymentCheckoutDTO {
  paymentId: string;
  paymobOrderId: string;
  paymobPaymentKey: string;
  iframeUrl: string;
}

export interface PaymentStatusDTO {
  id: string;
  status: PaymentStatus;
  amountPiasters: number;
  paymobTransactionId?: string;
  errorCode?: string;
  errorMessage?: string;
  completedAt?: Date;
  enrollmentId?: string;
}

export interface PaymentHistoryDTO {
  id: string;
  status: PaymentStatus;
  amountPiasters: number;
  discountPiasters: number;
  currency: string;
  package?: {
    id: string;
    titleEn: string;
    titleAr: string;
  };
  createdAt: Date;
  updatedAt: Date;
  errorCode?: string;
  errorMessage?: string;
}

export interface PaymentDetailDTO {
  id: string;
  userId: string;
  status: PaymentStatus;
  amountPiasters: number;
  discountPiasters: number;
  currency: string;
  paymobOrderId?: string;
  paymobTransactionId?: string;
  errorCode?: string;
  errorMessage?: string;
  refundInitiatedAt?: Date;
  refundAmount?: number;
  refundCompletedAt?: Date;
  disputedAt?: Date;
  disputeReason?: string;
  webhookReceivedAt?: Date;
  webhookRetryCount: number;
  createdAt: Date;
  updatedAt: Date;
  events?: PaymentEventDTO[];
}

export interface PaymentEventDTO {
  id: string;
  eventType: PaymentEventType;
  previousStatus?: PaymentStatus;
  newStatus?: PaymentStatus;
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

// Webhook
export interface PaymobWebhookPayload {
  type: string;
  obj: {
    id: number;
    amount_cents: number;
    success: boolean;
    is_auth: boolean;
    is_capture: boolean;
    is_standalone_payment: boolean;
    is_voided: boolean;
    is_refunded: boolean;
    is_disputed: boolean;
    is_hidden: boolean;
    is_paid: boolean;
    is_amount_check_passed: boolean;
    created_at: string;
    updated_at: string;
    is_settled: boolean;
    settlement_date: string | null;
    links: Array<{ rel: string; href: string }>;
    statuses: Record<string, any>;
    data: {
      token: string;
      order: string;
      first_payment_notification: any;
      message: string;
      webhook_id: number;
      webhook_signature: string;
      gateway_integration_pk: number;
    };
  };
}

// Admin endpoints
export interface PaymentListFilters {
  status?: PaymentStatus;
  userId?: string;
  createdFrom?: Date;
  createdTo?: Date;
  errorCodeFilter?: string;
  page?: number;
  limit?: number;
}

export interface PaymentListResponse {
  payments: PaymentDetailDTO[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface PaymentRefundRequest {
  paymentId: string;
  amount?: number;
  reason?: string;
}

export interface PaymentRefundResponse {
  success: boolean;
  refundId?: string;
  status: PaymentStatus;
  message?: string;
}

export interface ManualPaymentOverrideRequest {
  paymentId: string;
  notes?: string;
}

// Logging
export interface PaymentLogContext {
  paymentId: string;
  userId: string;
  status?: PaymentStatus;
  errorCode?: string;
  [key: string]: any;
}

// Error codes
export enum PaymentErrorCode {
  PAYMOB_API_ERROR = "PAYMOB_API_ERROR",
  PAYMOB_AUTH_FAILED = "PAYMOB_AUTH_FAILED",
  PAYMOB_TIMEOUT = "PAYMOB_TIMEOUT",
  PAYMOB_RATE_LIMITED = "PAYMOB_RATE_LIMITED",
  CHECKOUT_FAILED = "CHECKOUT_FAILED",
  WEBHOOK_PROCESSING_ERROR = "WEBHOOK_PROCESSING_ERROR",
  WEBHOOK_VERIFICATION_FAILED = "WEBHOOK_VERIFICATION_FAILED",
  ENROLLMENT_FAILED = "ENROLLMENT_FAILED",
  EMAIL_FAILED = "EMAIL_FAILED",
  DATABASE_ERROR = "DATABASE_ERROR",
  REDIS_ERROR = "REDIS_ERROR",
  PAYMENT_RECONCILIATION_MISMATCH = "PAYMENT_RECONCILIATION_MISMATCH",
  NETWORK_TIMEOUT = "NETWORK_TIMEOUT",
  CONNECTION_REFUSED = "CONNECTION_REFUSED",
  DNS_LOOKUP_ERROR = "DNS_LOOKUP_ERROR",
  CARD_DECLINED = "CARD_DECLINED",
  INVALID_CARD = "INVALID_CARD",
  EXPIRED_CARD = "EXPIRED_CARD",
  DUPLICATE_WEBHOOK = "DUPLICATE_WEBHOOK",
  IDEMPOTENCY_KEY_CONFLICT = "IDEMPOTENCY_KEY_CONFLICT",
}
