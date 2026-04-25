import { AlertCircle, AlertTriangle, Info, X } from "lucide-react";
import { ReactNode } from "react";
import {
  getPaymentError,
  shouldShowRetryButton,
  shouldShowDashboardButton,
  shouldShowSupportButton
} from "../utils/paymentErrors";

interface PaymentErrorMessageProps {
  errorCode?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  showCode?: boolean;
  customMessage?: string;
  customSuggestion?: string;
  actions?: ReactNode;
}

export function PaymentErrorMessage({
  errorCode,
  onRetry,
  onDismiss,
  showCode = true,
  customMessage,
  customSuggestion,
  actions
}: PaymentErrorMessageProps) {
  if (!errorCode && !customMessage) return null;

  const error = getPaymentError(errorCode);
  const message = customMessage || error.message;
  const suggestion = customSuggestion || error.suggestion;

  const getSeverityIcon = () => {
    switch (error.severity) {
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case "info":
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getSeverityStyles = () => {
    switch (error.severity) {
      case "error":
        return "bg-red-50 border-red-200 text-red-900";
      case "warning":
        return "bg-yellow-50 border-yellow-200 text-yellow-900";
      case "info":
        return "bg-blue-50 border-blue-200 text-blue-900";
    }
  };

  const showRetryButton = errorCode && shouldShowRetryButton(errorCode);
  const showDashboardButton = errorCode && shouldShowDashboardButton(errorCode);
  const showSupportButton = errorCode && shouldShowSupportButton(errorCode);

  return (
    <div
      className={`border rounded-lg p-4 ${getSeverityStyles()}`}
      role="alert"
    >
      <div className="flex gap-4">
        <div className="flex-shrink-0">{getSeverityIcon()}</div>

        <div className="flex-1">
          <h3 className="font-semibold mb-1">{error.title}</h3>
          <p className="text-sm mb-2">{message}</p>
          <p className="text-sm opacity-90 mb-3">{suggestion}</p>

          {showCode && errorCode && (
            <p className="text-xs opacity-75 font-mono">
              Error Code: {errorCode}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 mt-4">
            {showRetryButton && onRetry && (
              <button
                onClick={onRetry}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm font-medium"
              >
                Try Again
              </button>
            )}

            {showDashboardButton && (
              <a
                href="/dashboard"
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm font-medium inline-block"
              >
                Go to Dashboard
              </a>
            )}

            {showSupportButton && (
              <a
                href="mailto:support@eduflow.com"
                className="px-4 py-2 border border-current rounded hover:bg-white/20 transition text-sm font-medium"
              >
                Contact Support
              </a>
            )}

            {actions}

            {onDismiss && (
              <button
                onClick={onDismiss}
                className="ml-auto text-sm font-medium hover:opacity-75 transition"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 opacity-50 hover:opacity-100 transition"
            aria-label="Close error message"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Inline error variant for form fields
 */
interface InlineErrorProps {
  errorCode?: string;
  customMessage?: string;
}

export function InlinePaymentError({ errorCode, customMessage }: InlineErrorProps) {
  if (!errorCode && !customMessage) return null;

  const error = getPaymentError(errorCode);
  const message = customMessage || error.message;

  return (
    <div className="mt-2 text-sm text-red-600 flex items-center gap-2">
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}

/**
 * Alert banner for payment errors
 */
interface ErrorBannerProps {
  errorCode?: string;
  onDismiss?: () => void;
  onRetry?: () => void;
}

export function PaymentErrorBanner({
  errorCode,
  onDismiss,
  onRetry
}: ErrorBannerProps) {
  if (!errorCode) return null;

  const error = getPaymentError(errorCode);
  const showRetryButton = shouldShowRetryButton(errorCode);

  return (
    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-red-900">{error.title}</h4>
            <p className="text-sm text-red-800 mt-1">{error.message}</p>
            <p className="text-sm text-red-700 mt-2">{error.suggestion}</p>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-600 hover:text-red-700"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {showRetryButton && onRetry && (
        <div className="mt-4">
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm font-medium"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
