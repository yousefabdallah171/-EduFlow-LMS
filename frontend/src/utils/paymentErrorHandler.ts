import { getPaymentError, isRetryableError } from "./paymentErrors";

export interface ErrorContext {
  userId?: string;
  orderId?: string;
  attemptNumber?: number;
  isOnline?: boolean;
  connectionType?: string;
}

export class PaymentErrorHandler {
  private static instance: PaymentErrorHandler;
  private errorLog: Array<{
    timestamp: Date;
    error: Error;
    context: ErrorContext;
    code?: string;
  }> = [];

  static getInstance(): PaymentErrorHandler {
    if (!this.instance) {
      this.instance = new PaymentErrorHandler();
    }
    return this.instance;
  }

  /**
   * Handle payment error with context
   */
  handle(error: Error | string, context: ErrorContext = {}): {
    userMessage: string;
    suggestion: string;
    code: string;
    retryable: boolean;
    shouldShowRetryButton: boolean;
  } {
    const message = typeof error === "string" ? error : error.message;
    const code = this.extractErrorCode(message);

    // Log error for debugging
    this.logError(error, code, context);

    // Get user-friendly error info
    const errorInfo = getPaymentError(code);

    // Determine if retryable
    const retryable = isRetryableError(code);

    // Check if offline
    if (!context.isOnline) {
      return {
        userMessage: "You appear to be offline. Please check your internet connection.",
        suggestion: "Wait for your connection to be restored, then try again.",
        code: "NETWORK_OFFLINE",
        retryable: true,
        shouldShowRetryButton: true
      };
    }

    // Check for timeout
    if (message.includes("timeout") || message.includes("took too long")) {
      return {
        userMessage: "Payment processing took too long.",
        suggestion: "Your payment may still be processing. Please check your email for confirmation.",
        code: "PAYMENT_TIMEOUT",
        retryable: false,
        shouldShowRetryButton: false
      };
    }

    return {
      userMessage: errorInfo.message,
      suggestion: errorInfo.suggestion,
      code,
      retryable,
      shouldShowRetryButton: retryable && !context.isOnline === false
    };
  }

  /**
   * Extract error code from message
   */
  private extractErrorCode(message: string): string {
    // Try to extract error code from message
    const match = message.match(/ERROR_([A-Z_]+)|([A-Z_]+)_ERROR/);
    if (match) {
      return match[1] || match[2];
    }

    // Map common messages to codes
    if (message.includes("declined") || message.includes("card")) return "PAYMOB_DECLINED";
    if (message.includes("timeout") || message.includes("took too long")) return "PAYMOB_TIMEOUT";
    if (message.includes("offline") || message.includes("network")) return "NETWORK_ERROR";
    if (message.includes("already enrolled")) return "ALREADY_ENROLLED";

    return "UNKNOWN_ERROR";
  }

  /**
   * Log error for debugging and analytics
   */
  private logError(error: Error | string, code: string, context: ErrorContext): void {
    const errorEntry = {
      timestamp: new Date(),
      error: typeof error === "string" ? new Error(error) : error,
      context,
      code
    };

    this.errorLog.push(errorEntry);

    // Keep only last 50 errors
    if (this.errorLog.length > 50) {
      this.errorLog.shift();
    }

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.error(`[Payment Error] ${code}:`, error, context);
    }

    // Send to error tracking service in production
    if (process.env.NODE_ENV === "production") {
      this.reportToTracking(errorEntry);
    }
  }

  /**
   * Report error to tracking service (Sentry, etc.)
   */
  private reportToTracking(errorEntry: any): void {
    try {
      // Send to backend for error tracking
      navigator.sendBeacon("/api/v1/logs/error", JSON.stringify(errorEntry));
    } catch {
      // Silently fail if tracking unavailable
    }
  }

  /**
   * Get all logged errors
   */
  getErrorLog() {
    return [...this.errorLog];
  }

  /**
   * Clear error log
   */
  clearErrorLog() {
    this.errorLog = [];
  }

  /**
   * Export error log
   */
  exportErrorLog(): string {
    return JSON.stringify(this.errorLog, null, 2);
  }

  /**
   * Download error log as file
   */
  downloadErrorLog(): void {
    const data = this.exportErrorLog();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `payment-errors-${new Date().toISOString()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/**
 * Global instance
 */
export const paymentErrorHandler = PaymentErrorHandler.getInstance();

/**
 * Helper to handle payment API errors
 */
export async function handlePaymentApiError(response: Response): Promise<never> {
  let errorData: any;

  try {
    errorData = await response.json();
  } catch {
    errorData = { message: response.statusText };
  }

  const error = new Error(errorData.message || `HTTP ${response.status}`);
  const handled = paymentErrorHandler.handle(error, {
    isOnline: navigator.onLine
  });

  throw {
    status: response.status,
    ...handled,
    originalError: errorData
  };
}

/**
 * Wrapper for payment API calls with error handling
 */
export async function callPaymentApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const response = await fetch(endpoint, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });

    if (!response.ok) {
      await handlePaymentApiError(response);
    }

    return response.json();
  } catch (error) {
    const context: ErrorContext = {
      isOnline: navigator.onLine
    };

    const handled = paymentErrorHandler.handle(error as Error, context);
    throw {
      ...handled,
      originalError: error
    };
  }
}
