import { toast } from "sonner";

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "TOO_MANY_REQUESTS"
  | "INTERNAL_ERROR"
  | "NETWORK_ERROR"
  | "UNKNOWN_ERROR";

export interface ApiError {
  error: ApiErrorCode;
  message: string;
  details?: Record<string, unknown>;
  timestamp?: string;
}

export interface HandledError {
  code: ApiErrorCode;
  message: string;
  userMessage: string;
  details?: Record<string, unknown>;
  shouldLog: boolean;
}

const getUserMessage = (code: ApiErrorCode, message: string): string => {
  const messages: Record<ApiErrorCode, string> = {
    VALIDATION_ERROR: "Please check your input and try again",
    UNAUTHORIZED: "Your session has expired. Please log in again",
    FORBIDDEN: "You don't have permission to perform this action",
    NOT_FOUND: "The resource you're looking for doesn't exist",
    CONFLICT: "This resource already exists",
    TOO_MANY_REQUESTS: "You're doing that too often. Please wait a moment",
    INTERNAL_ERROR: "Something went wrong. Please try again later",
    NETWORK_ERROR: "Unable to connect to the server. Check your connection",
    UNKNOWN_ERROR: "An unexpected error occurred"
  };

  return messages[code] || message;
};

export const handleApiError = (error: unknown): HandledError => {
  // Network error
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return {
      code: "NETWORK_ERROR",
      message: "Network error",
      userMessage: getUserMessage("NETWORK_ERROR", ""),
      shouldLog: false
    };
  }

  // API error response
  if (error && typeof error === "object" && "error" in error) {
    const apiError = error as ApiError;
    return {
      code: apiError.error as ApiErrorCode,
      message: apiError.message,
      userMessage: getUserMessage(apiError.error as ApiErrorCode, apiError.message),
      details: apiError.details,
      shouldLog: !["VALIDATION_ERROR", "UNAUTHORIZED", "FORBIDDEN"].includes(apiError.error)
    };
  }

  // Fallback
  return {
    code: "UNKNOWN_ERROR",
    message: error instanceof Error ? error.message : "Unknown error",
    userMessage: getUserMessage("UNKNOWN_ERROR", ""),
    shouldLog: true
  };
};

export const showErrorToast = (error: unknown, customMessage?: string) => {
  const handled = handleApiError(error);

  const displayMessage = customMessage || handled.userMessage;

  if (handled.code === "VALIDATION_ERROR" && handled.details) {
    // Show validation errors for specific fields
    Object.entries(handled.details).forEach(([field, message]) => {
      toast.error(`${field}: ${message}`);
    });
  } else {
    toast.error(displayMessage);
  }

  // Log to console in development
  if (handled.shouldLog && process.env.NODE_ENV === "development") {
    console.error(`[${handled.code}]`, handled.message, handled.details);
  }
};

export const showSuccessToast = (message: string) => {
  toast.success(message);
};

export const showLoadingToast = (message: string, duration = 0) => {
  return toast.loading(message, { duration: duration || undefined });
};

// Type guard for API errors
export const isApiError = (error: unknown): error is ApiError => {
  return (
    error !== null &&
    typeof error === "object" &&
    "error" in error &&
    "message" in error &&
    typeof (error as any).error === "string"
  );
};

// Handle different error scenarios
export const handleErrorByType = (
  error: unknown,
  scenarios?: {
    onValidation?: (details: Record<string, unknown>) => void;
    onUnauthorized?: () => void;
    onForbidden?: () => void;
    onNotFound?: () => void;
    onConflict?: () => void;
    onRateLimit?: () => void;
  }
) => {
  const handled = handleApiError(error);

  switch (handled.code) {
    case "VALIDATION_ERROR":
      scenarios?.onValidation?.(handled.details || {});
      break;
    case "UNAUTHORIZED":
      scenarios?.onUnauthorized?.();
      break;
    case "FORBIDDEN":
      scenarios?.onForbidden?.();
      break;
    case "NOT_FOUND":
      scenarios?.onNotFound?.();
      break;
    case "CONFLICT":
      scenarios?.onConflict?.();
      break;
    case "TOO_MANY_REQUESTS":
      scenarios?.onRateLimit?.();
      break;
  }

  showErrorToast(error);
};
