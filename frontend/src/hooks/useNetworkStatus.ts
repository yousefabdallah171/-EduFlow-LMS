import { useState, useEffect, useCallback } from "react";

export interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType?: "4g" | "3g" | "2g" | "slow-2g" | "unknown";
}

export interface UseNetworkStatusOptions {
  slowConnectionThreshold?: number; // ms - requests slower than this are "slow"
  checkInterval?: number; // ms - how often to check status
}

type NavigatorConnection = EventTarget & {
  effectiveType?: NetworkStatus["connectionType"];
};

type NavigatorWithConnection = Navigator & {
  connection?: NavigatorConnection;
  mozConnection?: NavigatorConnection;
  webkitConnection?: NavigatorConnection;
};

const getNavigatorConnection = () => {
  const nav = navigator as NavigatorWithConnection;
  return nav.connection ?? nav.mozConnection ?? nav.webkitConnection;
};

export function useNetworkStatus(options: UseNetworkStatusOptions = {}) {
  const {
    slowConnectionThreshold = 5000,
    checkInterval = 5000
  } = options;

  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    isSlowConnection: false,
    connectionType: "unknown"
  });

  // Check connection type
  useEffect(() => {
    const checkConnectionType = () => {
      if (typeof navigator === "undefined") return;

      const connection = getNavigatorConnection();
      if (connection) {
        setStatus((prev) => ({
          ...prev,
          connectionType: connection.effectiveType ?? "unknown"
        }));
      }
    };

    checkConnectionType();

    const connection = getNavigatorConnection();
    if (connection) {
      connection.addEventListener("change", checkConnectionType);
      return () => connection.removeEventListener("change", checkConnectionType);
    }
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setStatus((prev) => ({ ...prev, isOnline: true }));
    };

    const handleOffline = () => {
      setStatus((prev) => ({ ...prev, isOnline: false, isSlowConnection: true }));
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Check for slow connections by probing
  const checkConnectionSpeed = useCallback(async () => {
    if (!status.isOnline) {
      setStatus((prev) => ({ ...prev, isSlowConnection: true }));
      return;
    }

    try {
      const startTime = performance.now();
      const response = await fetch("/api/v1/health", {
        method: "GET",
        cache: "no-cache"
      });

      if (response.ok) {
        const elapsed = performance.now() - startTime;
        const isSlowConnection = elapsed > slowConnectionThreshold;
        setStatus((prev) => ({
          ...prev,
          isSlowConnection
        }));
      }
    } catch {
      // Fetch failed - assume offline or network issue
      setStatus((prev) => ({ ...prev, isOnline: false, isSlowConnection: true }));
    }
  }, [slowConnectionThreshold, status.isOnline]);

  // Periodically check connection speed
  useEffect(() => {
    checkConnectionSpeed();
    const interval = setInterval(checkConnectionSpeed, checkInterval);
    return () => clearInterval(interval);
  }, [checkConnectionSpeed, checkInterval]);

  return { ...status, checkConnectionSpeed };
}

/**
 * Hook to detect if a network request is slow
 * Useful for showing timeout messages
 */
export function useNetworkRequestStatus(
  requestPromise: Promise<unknown>,
  timeoutMs = 10000
) {
  const [status, setStatus] = useState<"idle" | "loading" | "slow" | "success" | "error">("idle");
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<unknown>(null);

  const execute = useCallback(async () => {
    setStatus("loading");
    setError(null);
    setResult(null);

    let timeoutId: NodeJS.Timeout | undefined;
    let hasTimeoutFired = false;

    try {
      // Race between request and timeout
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          hasTimeoutFired = true;
          reject(new Error(`Request timeout after ${timeoutMs}ms`));
        }, timeoutMs);
      });

      const response = await Promise.race([requestPromise, timeoutPromise]);
      clearTimeout(timeoutId);

      setResult(response);
      setStatus("success");
      return response;
    } catch (err) {
      clearTimeout(timeoutId);
      const error = err instanceof Error ? err : new Error("Unknown error");
      setError(error);
      setStatus(hasTimeoutFired ? "slow" : "error");
      throw error;
    }
  }, [requestPromise, timeoutMs]);

  return { status, error, result, execute };
}

/**
 * Hook to retry network requests with exponential backoff
 */
export function useNetworkRetry(options: {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
} = {}) {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
    backoffMultiplier = 2
  } = options;

  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const executeWithRetry = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
      setIsRetrying(true);
      setRetryCount(0);

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const result = await fn();
          setIsRetrying(false);
          return result;
        } catch (error) {
          setRetryCount(attempt + 1);

          // Don't retry on last attempt
          if (attempt === maxRetries) {
            setIsRetrying(false);
            throw error;
          }

          // Calculate delay with exponential backoff
          const delay = Math.min(
            initialDelayMs * Math.pow(backoffMultiplier, attempt),
            maxDelayMs
          );

          // Add jitter to prevent thundering herd
          const jitter = Math.random() * 0.1 * delay;
          const delayWithJitter = delay + jitter;

          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, delayWithJitter));
        }
      }

      throw new Error("Max retries exceeded");
    },
    [maxRetries, initialDelayMs, maxDelayMs, backoffMultiplier]
  );

  return {
    executeWithRetry,
    isRetrying,
    retryCount,
    maxRetries
  };
}
