import { describe, expect, it } from "vitest";

import { adaptiveChunking } from "@/lib/adaptive-chunking";

describe("adaptiveChunking.nextChunkSize", () => {
  it("reduces to small chunks for slow speeds", () => {
    const nextChunkSize = adaptiveChunking.nextChunkSize({
      currentChunkSizeBytes: 5 * 1024 * 1024,
      rollingSpeedBytesPerSecond: 80 * 1024,
      retryAttempt: 0
    });

    expect(nextChunkSize).toBe(1 * 1024 * 1024);
  });

  it("keeps medium chunks for moderate speeds", () => {
    const nextChunkSize = adaptiveChunking.nextChunkSize({
      currentChunkSizeBytes: 5 * 1024 * 1024,
      rollingSpeedBytesPerSecond: 600 * 1024,
      retryAttempt: 0
    });

    expect(nextChunkSize).toBe(5 * 1024 * 1024);
  });

  it("increases chunk size on fast links", () => {
    const nextChunkSize = adaptiveChunking.nextChunkSize({
      currentChunkSizeBytes: 5 * 1024 * 1024,
      rollingSpeedBytesPerSecond: 2 * 1024 * 1024,
      retryAttempt: 0
    });

    expect(nextChunkSize).toBe(10 * 1024 * 1024);
  });

  it("decreases chunk size after retry attempts", () => {
    const nextChunkSize = adaptiveChunking.nextChunkSize({
      currentChunkSizeBytes: 10 * 1024 * 1024,
      rollingSpeedBytesPerSecond: 2 * 1024 * 1024,
      retryAttempt: 1
    });

    expect(nextChunkSize).toBeLessThan(10 * 1024 * 1024);
  });

  it("respects server hint chunk size when provided", () => {
    const nextChunkSize = adaptiveChunking.nextChunkSize({
      currentChunkSizeBytes: 10 * 1024 * 1024,
      rollingSpeedBytesPerSecond: 2 * 1024 * 1024,
      retryAttempt: 0,
      serverHintChunkSizeBytes: 2 * 1024 * 1024
    });

    expect(nextChunkSize).toBe(2 * 1024 * 1024);
  });
});
