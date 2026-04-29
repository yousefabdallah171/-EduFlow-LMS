import { describe, expect, it, vi } from "vitest";

import { AttemptCounterService } from "@/services/attempt-counter.service";

const redisMock = () => ({
  get: vi.fn(),
  incr: vi.fn(),
  expire: vi.fn(),
  del: vi.fn(),
  set: vi.fn(),
  sadd: vi.fn(),
  scard: vi.fn()
});

describe("AttemptCounterService", () => {
  it("increments and resets counters", async () => {
    const redis = redisMock();
    redis.incr.mockResolvedValueOnce(1).mockResolvedValueOnce(2);
    redis.get.mockResolvedValue("2");

    const service = new AttemptCounterService(redis as never);

    expect(await service.increment("ip", "1.1.1.1")).toBe(1);
    expect(await service.increment("ip", "1.1.1.1")).toBe(2);
    expect(await service.getCount("ip", "1.1.1.1")).toBe(2);

    await service.reset("ip", "1.1.1.1", 0);
    expect(redis.del).toHaveBeenCalled();

    await service.reset("ip", "1.1.1.1", 11);
    expect(redis.set).toHaveBeenCalled();
  });

  it("tracks captcha and email distinct ips", async () => {
    const redis = redisMock();
    redis.get.mockResolvedValue("1");
    redis.scard.mockResolvedValue(3);

    const service = new AttemptCounterService(redis as never);
    await service.setCaptchaRequired("email", "a@b.com");
    expect(await service.isCaptchaRequired("email", "a@b.com")).toBe(true);

    expect(await service.trackEmailIp("a@b.com", "1.2.3.4")).toBe(3);
  });

  it("fails open on redis errors", async () => {
    const redis = redisMock();
    redis.get.mockRejectedValue(new Error("redis down"));
    redis.incr.mockRejectedValue(new Error("redis down"));

    const service = new AttemptCounterService(redis as never);
    await expect(service.getCount("ip", "x")).resolves.toBe(0);
    await expect(service.increment("ip", "x")).resolves.toBe(0);
  });
});
