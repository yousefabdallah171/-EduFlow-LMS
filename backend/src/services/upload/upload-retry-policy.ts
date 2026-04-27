import { env } from "../../config/env.js";

export type RetryPolicyInput = {
  attempt: number;
  reason?: string;
};

export type RetryPolicyResult = {
  shouldRetry: boolean;
  nextDelayMs: number;
  nextRetryAt: Date | null;
  reason: string;
};

const toMilliseconds = (seconds: number) => seconds * 1000;

const normalizeAttempt = (attempt: number) => {
  if (!Number.isFinite(attempt) || attempt < 0) {
    return 0;
  }

  return Math.floor(attempt);
};

export const uploadRetryPolicy = {
  getRetryDecision(input: RetryPolicyInput): RetryPolicyResult {
    const normalizedAttempt = normalizeAttempt(input.attempt);
    const maxAttempts = env.UPLOAD_MAX_RETRY_ATTEMPTS;

    if (normalizedAttempt >= maxAttempts) {
      return {
        shouldRetry: false,
        nextDelayMs: 0,
        nextRetryAt: null,
        reason: "MAX_RETRY_EXCEEDED"
      };
    }

    const baseDelayMs = toMilliseconds(env.UPLOAD_RETRY_INITIAL_DELAY_SECONDS);
    const maxDelayMs = toMilliseconds(env.UPLOAD_RETRY_MAX_DELAY_SECONDS);
    const exponentialDelayMs = baseDelayMs * Math.pow(2, normalizedAttempt);
    const jitterMs = Math.floor(Math.random() * 1000);
    const nextDelayMs = Math.min(exponentialDelayMs + jitterMs, maxDelayMs);

    return {
      shouldRetry: true,
      nextDelayMs,
      nextRetryAt: new Date(Date.now() + nextDelayMs),
      reason: input.reason ?? "RETRY_SCHEDULED"
    };
  }
};
