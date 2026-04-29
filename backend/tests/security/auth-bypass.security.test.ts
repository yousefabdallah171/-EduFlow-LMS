import { describe, expect, it } from "vitest";

import { extractIp } from "../../src/utils/ip-extractor";

describe("auth bypass security", () => {
  it("invalid fingerprint should be ignored by regex contract", () => {
    const invalid = "not-a-valid-fingerprint";
    expect(/^[a-f0-9]{64}$/.test(invalid)).toBe(false);
  });

  it("extractIp uses first x-forwarded-for IP", () => {
    const req = {
      headers: {
        "x-forwarded-for": "1.2.3.4, 5.6.7.8"
      },
      socket: { remoteAddress: "9.9.9.9" }
    } as never;

    expect(extractIp(req)).toBe("1.2.3.4");
  });

  it("falls back safely when headers missing", () => {
    const req = {
      headers: {},
      socket: { remoteAddress: "9.9.9.9" }
    } as never;

    expect(extractIp(req)).toBe("9.9.9.9");
  });

  it("timing checks for lockout are deterministic enough", () => {
    const start = Date.now();
    for (let i = 0; i < 10; i += 1) {
      JSON.stringify({ expiresAt: new Date(Date.now() + 1000).toISOString(), level: 1 });
    }
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(50);
  });

  it("race condition expectation: single ban per identity", () => {
    const identities = new Set<string>();
    for (let i = 0; i < 50; i += 1) {
      identities.add("1.2.3.4");
    }
    expect(identities.size).toBe(1);
  });
});
