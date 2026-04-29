import { describe, expect, it, vi } from "vitest";

import { LockoutService } from "@/services/lockout.service";

const redisMock = () => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn()
});

describe("LockoutService", () => {
  it("applies and checks lockout", async () => {
    const redis = redisMock();
    const service = new LockoutService(redis as never);

    await service.apply("ip", "1.1.1.1", 1);
    expect(redis.set).toHaveBeenCalled();

    const expiresAt = new Date(Date.now() + 60_000).toISOString();
    redis.get.mockResolvedValue(JSON.stringify({ expiresAt, level: 1 }));

    const state = await service.check("ip", "1.1.1.1");
    expect(state?.level).toBe(1);
    expect((state?.retryAfterSeconds ?? 0) > 0).toBe(true);
  });

  it("returns null for missing or expired lockout", async () => {
    const redis = redisMock();
    const service = new LockoutService(redis as never);

    redis.get.mockResolvedValueOnce(null);
    expect(await service.check("ip", "x")).toBeNull();

    redis.get.mockResolvedValueOnce(JSON.stringify({ expiresAt: new Date(Date.now() - 1000).toISOString(), level: 1 }));
    expect(await service.check("ip", "x")).toBeNull();
  });
});
