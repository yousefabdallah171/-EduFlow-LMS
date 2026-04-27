import type { Response } from "express";

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR"
  | "BAD_REQUEST"
  | "UNPROCESSABLE_ENTITY"
  | "TOO_MANY_REQUESTS"
  | "SERVICE_UNAVAILABLE";

export interface ApiErrorResponse {
  error: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiListResponse<T> {
  success: true;
  data: T[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

const getStatusCode = (errorCode: ErrorCode): number => {
  const statusMap: Record<ErrorCode, number> = {
    VALIDATION_ERROR: 422,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    BAD_REQUEST: 400,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
  };
  return statusMap[errorCode] || 500;
};

const getErrorMessage = (errorCode: ErrorCode): string => {
  const messageMap: Record<ErrorCode, string> = {
    VALIDATION_ERROR: "Validation failed",
    UNAUTHORIZED: "Authentication required",
    FORBIDDEN: "Access denied",
    NOT_FOUND: "Resource not found",
    CONFLICT: "Resource conflict",
    BAD_REQUEST: "Invalid request",
    UNPROCESSABLE_ENTITY: "Request cannot be processed",
    TOO_MANY_REQUESTS: "Too many requests, please try again later",
    INTERNAL_ERROR: "Internal server error",
    SERVICE_UNAVAILABLE: "Service temporarily unavailable"
  };
  return messageMap[errorCode] || "An error occurred";
};

export const sendError = (
  res: Response,
  errorCode: ErrorCode,
  customMessage?: string,
  details?: Record<string, unknown>
): Response => {
  const statusCode = getStatusCode(errorCode);
  const message = customMessage || getErrorMessage(errorCode);

  const errorResponse: ApiErrorResponse = {
    error: errorCode,
    message,
    timestamp: new Date().toISOString()
  };

  if (details && Object.keys(details).length > 0) {
    errorResponse.details = details;
  }

  return res.status(statusCode).json(errorResponse);
};

export const sendSuccess = <T>(res: Response, data: T, statusCode = 200): Response => {
  return res.status(statusCode).json({
    success: true,
    data
  });
};

export const sendList = <T>(
  res: Response,
  data: T[],
  pagination?: { page: number; limit: number; total: number },
  statusCode = 200
): Response => {
  const response: ApiListResponse<T> = {
    success: true,
    data
  };

  if (pagination) {
    response.pagination = {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      pages: Math.ceil(pagination.total / pagination.limit)
    };
  }

  return res.status(statusCode).json(response);
};
