import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Coupon } from "@prisma/client";

const couponRepositoryMock = vi.hoisted(() => ({
  findByCode: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn()
}));

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(async (callback: (client: typeof prismaMock) => unknown) => callback(prismaMock)),
  $queryRaw: vi.fn(),
  coupon: {
    findMany: vi.fn()
  }
}));

vi.mock("../../src/repositories/coupon.repository.js", () => ({
  couponRepository: couponRepositoryMock
}));

vi.mock("../../src/config/database.js", () => ({
  prisma: prismaMock
}));

const makeCoupon = (overrides: Partial<Coupon> = {}): Coupon => ({
  id: "coupon-1",
  code: "SAVE20",
  discountType: "PERCENTAGE",
  discountValue: 20 as never,
  maxUses: 10,
  usesCount: 0,
  expiryDate: new Date(Date.now() + 60_000),
  createdAt: new Date(),
  deletedAt: null,
  ...overrides
});

describe("couponService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects expired coupons during validation", async () => {
    const { couponService } = await import("../../src/services/coupon.service.js");
    prismaMock.$queryRaw.mockResolvedValue([
      makeCoupon({
        expiryDate: new Date(Date.now() - 60_000)
      })
    ]);

    await expect(couponService.applyCoupon("SAVE20", 49_900)).rejects.toMatchObject({
      code: "INVALID_COUPON"
    });
  });

  it("rejects coupons that exceed max uses", async () => {
    const { couponService } = await import("../../src/services/coupon.service.js");
    prismaMock.$queryRaw.mockResolvedValue([
      makeCoupon({
        maxUses: 1,
        usesCount: 1
      })
    ]);

    await expect(couponService.applyCoupon("SAVE20", 49_900)).rejects.toMatchObject({
      code: "INVALID_COUPON"
    });
  });

  it("locks the coupon row and computes percentage discounts", async () => {
    const { couponService } = await import("../../src/services/coupon.service.js");
    prismaMock.$queryRaw.mockResolvedValue([makeCoupon()]);

    const result = await couponService.applyCoupon("save20", 49_900);

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      discountPiasters: 9_980,
      discountedAmountPiasters: 39_920
    });
  });

  it("computes fixed discounts without dropping below zero", async () => {
    const { couponService } = await import("../../src/services/coupon.service.js");
    prismaMock.$queryRaw.mockResolvedValue([
      makeCoupon({
        discountType: "FIXED",
        discountValue: 100_000 as never
      })
    ]);

    const result = await couponService.applyCoupon("save20", 49_900);

    expect(result).toMatchObject({
      discountPiasters: 49_900,
      discountedAmountPiasters: 0
    });
  });
});
