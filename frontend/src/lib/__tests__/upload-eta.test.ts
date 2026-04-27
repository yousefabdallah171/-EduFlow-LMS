import { describe, expect, it } from "vitest";

import { UploadTelemetryTracker, formatEta } from "@/lib/upload-eta";

describe("UploadTelemetryTracker", () => {
  it("computes progress, speed, and eta from rolling samples", () => {
    const tracker = new UploadTelemetryTracker(1_000_000);
    const t0 = 1_000;
    const t1 = 2_000;
    const t2 = 4_000;

    tracker.track(100_000, t0);
    const s1 = tracker.track(350_000, t1);
    const s2 = tracker.track(700_000, t2);

    expect(s1.progressPercent).toBeGreaterThan(0);
    expect(s1.instantaneousSpeedBytesPerSecond).toBeGreaterThan(0);
    expect(s1.etaSeconds).not.toBeNull();

    expect(s2.progressPercent).toBeGreaterThan(s1.progressPercent);
    expect((s2.etaSeconds ?? Number.MAX_SAFE_INTEGER)).toBeLessThan(s1.etaSeconds ?? Number.MAX_SAFE_INTEGER);
  });

  it("returns null eta when no effective speed is available", () => {
    const tracker = new UploadTelemetryTracker(5_000);
    const snapshot = tracker.track(0, 1000);
    expect(snapshot.etaSeconds).toBeNull();
  });
});

describe("formatEta", () => {
  it("formats short and long eta values", () => {
    expect(formatEta(null)).toBe("--");
    expect(formatEta(45)).toBe("45s");
    expect(formatEta(125)).toBe("2m 5s");
  });
});
