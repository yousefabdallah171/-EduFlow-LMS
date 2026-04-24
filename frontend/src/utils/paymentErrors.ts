/**
 * Payment error code to user-friendly message mapping
 * Maps backend error codes to messages and suggestions for the UI
 */

export interface ErrorInfo {
  title: string;
  message: string;
  suggestion: string;
  errorCode: string;
  severity: "error" | "warning" | "info";
  actionable: boolean;
  retryable: boolean;
}

export const PAYMENT_ERRORS: Record<string, ErrorInfo> = {
  // Paymob API errors
  PAYMOB_AUTH_FAILED: {
    title: "Payment Service Error",
    message: "Our payment service is having authentication issues.",
    suggestion: "Please try again in a few minutes. If the problem persists, contact support.",
    errorCode: "PAYMOB_AUTH_FAILED",
    severity: "error",
    actionable: true,
    retryable: true
  },

  PAYMOB_TIMEOUT: {
    title: "Payment Request Timed Out",
    message: "The payment request took too long to complete.",
    suggestion: "Your card was not charged. Please try the payment again.",
    errorCode: "PAYMOB_TIMEOUT",
    severity: "error",
    actionable: true,
    retryable: true
  },

  PAYMOB_RATE_LIMITED: {
    title: "Too Many Payment Attempts",
    message: "The payment service is temporarily limiting requests.",
    suggestion: "Please wait a few minutes and try again. This usually resolves quickly.",
    errorCode: "PAYMOB_RATE_LIMITED",
    severity: "warning",
    actionable: true,
    retryable: true
  },

  PAYMOB_SERVER_ERROR: {
    title: "Payment Service Unavailable",
    message: "The payment service is temporarily unavailable.",
    suggestion: "Please try again in a few minutes. Your payment was not processed.",
    errorCode: "PAYMOB_SERVER_ERROR",
    severity: "error",
    actionable: true,
    retryable: true
  },

  PAYMOB_API_ERROR: {
    title: "Invalid Payment Request",
    message: "The payment information you provided is invalid.",
    suggestion: "Please check your details and try again. Contact support if the problem continues.",
    errorCode: "PAYMOB_API_ERROR",
    severity: "error",
    actionable: true,
    retryable: true
  },

  // Checkout flow errors
  CHECKOUT_IN_PROGRESS: {
    title: "Pending Checkout",
    message: "You already have a payment in progress.",
    suggestion: "Please wait 30 minutes for the pending payment to complete, or contact support to reset it.",
    errorCode: "CHECKOUT_IN_PROGRESS",
    severity: "warning",
    actionable: false,
    retryable: false
  },

  ALREADY_ENROLLED: {
    title: "Already Enrolled",
    message: "You're already enrolled in this course.",
    suggestion: "Go to your dashboard to access the course content immediately.",
    errorCode: "ALREADY_ENROLLED",
    severity: "info",
    actionable: true,
    retryable: false
  },

  USER_NOT_FOUND: {
    title: "User Not Found",
    message: "Your user account could not be found.",
    suggestion: "Please log out and log in again. If the problem persists, contact support.",
    errorCode: "USER_NOT_FOUND",
    severity: "error",
    actionable: false,
    retryable: false
  },

  // Coupon errors
  INVALID_COUPON: {
    title: "Invalid Coupon",
    message: "This coupon code is invalid, expired, or has reached its usage limit.",
    suggestion: "Try removing the coupon and checking the code again. Contact support for questions.",
    errorCode: "INVALID_COUPON",
    severity: "error",
    actionable: true,
    retryable: false
  },

  COUPON_EXPIRED: {
    title: "Coupon Expired",
    message: "This coupon code has expired.",
    suggestion: "Please use a valid coupon or check your email for a new code.",
    errorCode: "COUPON_EXPIRED",
    severity: "error",
    actionable: false,
    retryable: false
  },

  COUPON_LIMIT_REACHED: {
    title: "Coupon Limit Reached",
    message: "This coupon has been used by the maximum number of students.",
    suggestion: "This offer is no longer available. Please try again without the coupon.",
    errorCode: "COUPON_LIMIT_REACHED",
    severity: "warning",
    actionable: false,
    retryable: false
  },

  // Package/course errors
  COURSE_SETTINGS_MISSING: {
    title: "Course Configuration Error",
    message: "The course settings are not properly configured.",
    suggestion: "Contact support - this is a system configuration issue.",
    errorCode: "COURSE_SETTINGS_MISSING",
    severity: "error",
    actionable: false,
    retryable: false
  },

  PAYMENT_NOT_FOUND: {
    title: "Payment Not Found",
    message: "The payment could not be found in our system.",
    suggestion: "This might be a temporary issue. Please try again or contact support.",
    errorCode: "PAYMENT_NOT_FOUND",
    severity: "error",
    actionable: true,
    retryable: true
  },

  INVALID_WEBHOOK_PAYLOAD: {
    title: "Payment Update Error",
    message: "There was an error processing your payment confirmation.",
    suggestion: "This is usually temporary. Your payment may still be processing. Check back in a few minutes.",
    errorCode: "INVALID_WEBHOOK_PAYLOAD",
    severity: "warning",
    actionable: false,
    retryable: false
  },

  // Generic errors
  INTERNAL_SERVER_ERROR: {
    title: "Something Went Wrong",
    message: "An unexpected error occurred while processing your payment.",
    suggestion: "Please try again. If the problem continues, contact support with error code INTERNAL_SERVER_ERROR.",
    errorCode: "INTERNAL_SERVER_ERROR",
    severity: "error",
    actionable: true,
    retryable: true
  },

  NETWORK_ERROR: {
    title: "Connection Error",
    message: "There was a problem connecting to our service.",
    suggestion: "Please check your internet connection and try again.",
    errorCode: "NETWORK_ERROR",
    severity: "error",
    actionable: true,
    retryable: true
  },

  REQUEST_TIMEOUT: {
    title: "Request Timed Out",
    message: "The request took too long to complete.",
    suggestion: "Please try again. If this continues, try a different payment method.",
    errorCode: "REQUEST_TIMEOUT",
    severity: "error",
    actionable: true,
    retryable: true
  },

  // Default error
  UNKNOWN_ERROR: {
    title: "Payment Error",
    message: "An error occurred while processing your payment.",
    suggestion: "Please try again or contact support for assistance.",
    errorCode: "UNKNOWN_ERROR",
    severity: "error",
    actionable: true,
    retryable: true
  }
};

/**
 * Get user-friendly error information by error code
 */
export function getPaymentError(errorCode?: string): ErrorInfo {
  if (!errorCode) {
    return PAYMENT_ERRORS.UNKNOWN_ERROR;
  }

  return PAYMENT_ERRORS[errorCode] || {
    title: "Payment Error",
    message: `An error occurred: ${errorCode}`,
    suggestion: "Please try again or contact support.",
    errorCode,
    severity: "error",
    actionable: true,
    retryable: true
  };
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(errorCode?: string): boolean {
  if (!errorCode) return false;
  const error = PAYMENT_ERRORS[errorCode];
  return error?.retryable ?? false;
}

/**
 * Check if an error requires user action
 */
export function isActionableError(errorCode?: string): boolean {
  if (!errorCode) return false;
  const error = PAYMENT_ERRORS[errorCode];
  return error?.actionable ?? false;
}

/**
 * Get suggested action for an error
 */
export function getErrorSuggestion(errorCode?: string): string {
  const error = getPaymentError(errorCode);
  return error.suggestion;
}

/**
 * Check if user should be shown a "Try Again" button
 */
export function shouldShowRetryButton(errorCode?: string): boolean {
  const error = getPaymentError(errorCode);
  return error.retryable && error.actionable;
}

/**
 * Check if user should be shown a "Go to Dashboard" button
 */
export function shouldShowDashboardButton(errorCode?: string): boolean {
  return errorCode === "ALREADY_ENROLLED";
}

/**
 * Check if user should be shown a "Contact Support" button
 */
export function shouldShowSupportButton(errorCode?: string): boolean {
  const error = getPaymentError(errorCode);
  return error.severity === "error" || error.errorCode === "INTERNAL_SERVER_ERROR";
}
