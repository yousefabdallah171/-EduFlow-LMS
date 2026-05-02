import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type PaymentStatus = "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED" | "WEBHOOK_PENDING";

interface PaymentStatusResponse {
  id: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  createdAt: string;
  completedAt?: string;
  errorCode?: string;
  errorMessage?: string;
}

interface UsePaymentStatusOptions {
  enabled?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * Hook to poll payment status until completion
 * Auto-stops polling when payment reaches final state
 */
export function usePaymentStatus(
  orderId: string,
  pollInterval: number = 2000,
  options: UsePaymentStatusOptions = {}
) {
  const { enabled = true, maxRetries = 5, retryDelay = 1000 } = options;
  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const retryCountRef = useRef(0);

  // Final states where polling should stop
  const isFinalState = (s: PaymentStatus | null) => {
    return s === "COMPLETED" || s === "FAILED" || s === "CANCELLED";
  };

  // Query to fetch payment status
  const { data: paymentData, isLoading, error: queryError } = useQuery({
    queryKey: ["payment-status", orderId],
    queryFn: async () => {
      if (!orderId) throw new Error("Order ID is required");

      const response = await api.get<PaymentStatusResponse>(
        `/checkout/status/${orderId}`
      );
      return response.data;
    },
    enabled: enabled && !!orderId && !isFinalState(status),
    refetchInterval: isFinalState(status) ? false : pollInterval,
    refetchOnWindowFocus: false,
    retry: (failureCount) => failureCount < maxRetries,
    retryDelay: (attemptIndex) => {
      // Exponential backoff: 1s, 2s, 4s, 8s, 16s
      return retryDelay * Math.pow(2, attemptIndex);
    }
  });

  // Update local status when data changes
  useEffect(() => {
    if (paymentData?.status) {
      setStatus(paymentData.status);
      retryCountRef.current = 0;
      setError(null);

      // Log final status
      if (isFinalState(paymentData.status)) {
        console.info(`Payment ${orderId} reached final state: ${paymentData.status}`);
      }
    }
  }, [paymentData, orderId]);

  // Handle query errors
  useEffect(() => {
    if (queryError) {
      retryCountRef.current++;
      const errorMessage = queryError instanceof Error
        ? queryError.message
        : "Failed to fetch payment status";

      setError(errorMessage);

      // Log error with retry count
      console.warn(
        `Payment status fetch failed (attempt ${retryCountRef.current}/${maxRetries}):`,
        errorMessage
      );
    }
  }, [queryError, maxRetries]);

  return {
    status,
    amount: paymentData?.amount,
    currency: paymentData?.currency,
    error,
    isLoading,
    isFinal: isFinalState(status),
    data: paymentData
  };
}

/**
 * Check a single payment status (no polling)
 */
export async function fetchPaymentStatus(orderId: string) {
  if (!orderId) {
    throw new Error("Order ID is required");
  }

  const response = await api.get<PaymentStatusResponse>(
    `/checkout/status/${orderId}`
  );
  return response.data;
}

/**
 * Poll until payment reaches final state
 */
export async function pollPaymentStatus(
  orderId: string,
  options: {
    maxWaitTime?: number;
    pollInterval?: number;
    onStatusChange?: (status: PaymentStatus) => void;
  } = {}
) {
  const {
    maxWaitTime = 5 * 60 * 1000, // 5 minutes
    pollInterval = 2000, // 2 seconds
    onStatusChange
  } = options;

  const startTime = Date.now();
  let lastStatus: PaymentStatus | null = null;

  return new Promise<PaymentStatusResponse>((resolve, reject) => {
    const poll = async () => {
      try {
        // Check timeout
        if (Date.now() - startTime > maxWaitTime) {
          reject(new Error("Payment status check timeout"));
          return;
        }

        const data = await fetchPaymentStatus(orderId);

        // Report status changes
        if (data.status !== lastStatus) {
          lastStatus = data.status;
          onStatusChange?.(data.status);
        }

        // Check if final state
        if (data.status === "COMPLETED" || data.status === "FAILED" || data.status === "CANCELLED") {
          resolve(data);
          return;
        }

        // Schedule next poll
        setTimeout(poll, pollInterval);
      } catch (err) {
        reject(err);
      }
    };

    // Start polling
    poll();
  });
}
