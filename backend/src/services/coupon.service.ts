import type { Coupon, CouponDiscountType, Prisma, PrismaClient } from "@prisma/client";
import { Prisma as PrismaNamespace } from "@prisma/client";

import { prisma } from "../config/database.js";
import { redis } from "../config/redis.js";
import { prometheus } from "../observability/prometheus.js";
import { couponRepository } from "../repositories/coupon.repository.js";
import { cacheVersioningService } from "./cache-versioning.service.js";

type CouponPayload = {
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  maxUses: number | null;
  expiryDate: Date | null;
};

type CouponSummary = {
  id: string;
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  maxUses: number | null;
  usesCount: number;
  expiryDate: string | null;
  revenueGenerated: number;
  status: "ACTIVE" | "EXPIRED";
};

type CouponApplication = {
  coupon: Coupon;
  originalAmountPiasters: number;
  discountedAmountPiasters: number;
  discountPiasters: number;
};

type CouponValidationResult =
  | { valid: false; reason: "NOT_FOUND" | "EXPIRED" | "MAX_USES_REACHED" }
  | {
      valid: true;
      discountType: CouponDiscountType;
      discountValue: number;
      originalAmountEgp: number;
      discountedAmountEgp: number;
    };

class CouponError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

type CouponDbClient = Prisma.TransactionClient | PrismaClient;

const normalizeCode = (code: string) => code.trim().toUpperCase();

const toNumericValue = (value: PrismaNamespace.Decimal | number | string) => Number(value);

const COUPON_VALIDATION_CACHE_TTL_SECONDS = 60 * 60;
const COUPON_VALIDATION_NEGATIVE_TTL_SECONDS = 5 * 60;

const couponValidationCacheKey = (code: string) => `coupon:valid:${normalizeCode(code)}`;

const getDiscountAmount = (
  coupon: Pick<Coupon, "discountType"> & { discountValue: PrismaNamespace.Decimal | number | string },
  originalAmountPiasters: number
) => {
  if (coupon.discountType === "PERCENTAGE") {
    return Math.min(originalAmountPiasters, Math.round((originalAmountPiasters * toNumericValue(coupon.discountValue)) / 100));
  }

  return Math.min(originalAmountPiasters, Math.round(toNumericValue(coupon.discountValue)));
};

const ensureCouponIsUsable = (coupon: Coupon | null) => {
  if (!coupon) {
    throw new CouponError("INVALID_COUPON", 400, "This coupon is invalid.");
  }

  if (coupon.deletedAt) {
    throw new CouponError("INVALID_COUPON", 400, "This coupon is invalid.");
  }

  if (coupon.expiryDate && coupon.expiryDate <= new Date()) {
    throw new CouponError("INVALID_COUPON", 400, "This coupon is expired.");
  }

  if (coupon.maxUses !== null && coupon.usesCount >= coupon.maxUses) {
    throw new CouponError("INVALID_COUPON", 400, "This coupon has reached its usage limit.");
  }
};

const toCouponSummary = (
  coupon: Coupon & {
    payments?: Array<{ amountPiasters: number }>;
  }
): CouponSummary => ({
  id: coupon.id,
  code: coupon.code,
  discountType: coupon.discountType,
  discountValue: toNumericValue(coupon.discountValue),
  maxUses: coupon.maxUses,
  usesCount: coupon.usesCount,
  expiryDate: coupon.expiryDate?.toISOString() ?? null,
  revenueGenerated: coupon.payments?.reduce((sum, payment) => sum + payment.amountPiasters, 0) ?? 0,
  status: coupon.expiryDate && coupon.expiryDate <= new Date() ? "EXPIRED" : "ACTIVE"
});

const lockCouponByCode = async (db: CouponDbClient, code: string) => {
  const rows = await db.$queryRaw<Coupon[]>`
    SELECT *
    FROM "Coupon"
    WHERE "code" = ${code}
      AND "deletedAt" IS NULL
    FOR UPDATE
  `;

  return rows[0] ?? null;
};

const parseCouponPayload = (payload: CouponPayload) => {
  const normalizedCode = normalizeCode(payload.code);
  const normalizedValue = Number(payload.discountValue);

  if (!/^[A-Z0-9-]{3,50}$/.test(normalizedCode)) {
    throw new CouponError("VALIDATION_ERROR", 422, "Coupon code must be 3-50 characters and use letters, numbers, or dashes.");
  }

  if (payload.discountType === "PERCENTAGE" && (normalizedValue <= 0 || normalizedValue > 100)) {
    throw new CouponError("VALIDATION_ERROR", 422, "Percentage coupons must be between 1 and 100.");
  }

  if (payload.discountType === "FIXED" && normalizedValue <= 0) {
    throw new CouponError("VALIDATION_ERROR", 422, "Fixed discount coupons must be greater than zero.");
  }

  if (payload.maxUses !== null && payload.maxUses <= 0) {
    throw new CouponError("VALIDATION_ERROR", 422, "maxUses must be greater than zero.");
  }

  if (payload.expiryDate && payload.expiryDate <= new Date()) {
    throw new CouponError("VALIDATION_ERROR", 422, "Expiry date must be in the future.");
  }

  return {
    code: normalizedCode,
    discountType: payload.discountType,
    discountValue: normalizedValue,
    maxUses: payload.maxUses,
    expiryDate: payload.expiryDate
  };
};

export const couponService = {
  async invalidateCouponCache() {
    await cacheVersioningService.bumpVersion("coupon");
  },

  async validateCoupon(code: string | undefined, originalAmountPiasters: number): Promise<CouponValidationResult> {
    if (!code?.trim()) {
      return { valid: false as const, reason: "NOT_FOUND" as const };
    }

    const version = await cacheVersioningService.getVersion("coupon");
    const key = couponValidationCacheKey(code);

    try {
      const cached = await redis.get(key);
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as
            | ({ v: string } & { valid: false; reason: "NOT_FOUND" | "EXPIRED" | "MAX_USES_REACHED" })
            | ({ v: string } & { valid: true; discountType: CouponDiscountType; discountValue: number; expiryDate: string | null });

          if (parsed.v === version) {
            prometheus.recordCacheHit("coupon_validation");
            if (!parsed.valid) {
              return { valid: false, reason: parsed.reason };
            }

            const discountPiasters = getDiscountAmount(
              { discountType: parsed.discountType, discountValue: parsed.discountValue },
              originalAmountPiasters
            );

            return {
              valid: true,
              discountType: parsed.discountType,
              discountValue: parsed.discountValue,
              originalAmountEgp: originalAmountPiasters / 100,
              discountedAmountEgp: (originalAmountPiasters - discountPiasters) / 100
            };
          }
        } catch {
          // Fall through to DB validation.
        }
      }
    } catch {
      // ignore redis failures
    }
    prometheus.recordCacheMiss("coupon_validation");

    const coupon = await couponRepository.findByCode(normalizeCode(code));

    try {
      ensureCouponIsUsable(coupon);
    } catch (error) {
      if (error instanceof CouponError) {
        const payload: CouponValidationResult = {
          valid: false,
          reason: error.message.includes("expired") ? "EXPIRED" : "MAX_USES_REACHED"
        };
        try {
          await redis.set(
            key,
            JSON.stringify({ v: version, valid: false as const, reason: payload.reason }),
            "EX",
            COUPON_VALIDATION_NEGATIVE_TTL_SECONDS
          );
        } catch {
          // ignore redis failures
        }
        return payload;
      }

      throw error;
    }

    const resolvedCoupon = coupon as Coupon;
    const discountPiasters = getDiscountAmount(resolvedCoupon, originalAmountPiasters);

    const payload: CouponValidationResult = {
      valid: true as const,
      discountType: resolvedCoupon.discountType,
      discountValue: toNumericValue(resolvedCoupon.discountValue),
      originalAmountEgp: originalAmountPiasters / 100,
      discountedAmountEgp: (originalAmountPiasters - discountPiasters) / 100
    };

    const secondsUntilExpiry = resolvedCoupon.expiryDate
      ? Math.floor((resolvedCoupon.expiryDate.getTime() - Date.now()) / 1000)
      : null;
    const ttlSeconds =
      typeof secondsUntilExpiry === "number"
        ? Math.max(1, Math.min(COUPON_VALIDATION_CACHE_TTL_SECONDS, secondsUntilExpiry))
        : COUPON_VALIDATION_CACHE_TTL_SECONDS;

    try {
      await redis.set(
        key,
        JSON.stringify({
          v: version,
          valid: true as const,
          discountType: payload.discountType,
          discountValue: payload.discountValue,
          expiryDate: resolvedCoupon.expiryDate?.toISOString() ?? null
        }),
        "EX",
        ttlSeconds
      );
    } catch {
      // ignore redis failures
    }

    return payload;
  },

  async applyCoupon(
    code: string | undefined,
    originalAmountPiasters: number,
    db?: CouponDbClient
  ): Promise<CouponApplication | null> {
    if (!code?.trim()) {
      return null;
    }

    const execute = async (client: CouponDbClient) => {
      const coupon = await lockCouponByCode(client, normalizeCode(code));
      ensureCouponIsUsable(coupon);

      const resolvedCoupon = coupon as Coupon;
      const discountPiasters = getDiscountAmount(resolvedCoupon, originalAmountPiasters);

      return {
        coupon: resolvedCoupon,
        originalAmountPiasters,
        discountedAmountPiasters: originalAmountPiasters - discountPiasters,
        discountPiasters
      };
    };

    if (db) {
      return execute(db);
    }

    return prisma.$transaction((client) => execute(client));
  },

  async listCoupons(): Promise<CouponSummary[]> {
    const coupons = await prisma.coupon.findMany({
      where: {
        deletedAt: null
      },
      include: {
        payments: {
          where: {
            status: "COMPLETED"
          },
          select: {
            amountPiasters: true
          }
        }
      },
      orderBy: [{ createdAt: "desc" }]
    });

    return coupons.map(toCouponSummary);
  },

  async createCoupon(payload: CouponPayload) {
    const parsed = parseCouponPayload(payload);
    const existing = await couponRepository.findByCode(parsed.code);

    if (existing) {
      throw new CouponError("COUPON_CODE_EXISTS", 409, "Coupon code already exists.");
    }

    const coupon = await couponRepository.create({
      code: parsed.code,
      discountType: parsed.discountType,
      discountValue: new PrismaNamespace.Decimal(parsed.discountValue),
      maxUses: parsed.maxUses,
      expiryDate: parsed.expiryDate
    });

    await couponService.invalidateCouponCache();
    return toCouponSummary(coupon);
  },

  async updateCoupon(id: string, payload: Pick<CouponPayload, "maxUses" | "expiryDate">) {
    const coupon = await couponRepository.findById(id);
    if (!coupon) {
      throw new CouponError("COUPON_NOT_FOUND", 404, "Coupon not found.");
    }

    if (payload.maxUses !== null && payload.maxUses <= 0) {
      throw new CouponError("VALIDATION_ERROR", 422, "maxUses must be greater than zero.");
    }

    if (payload.expiryDate && payload.expiryDate <= new Date()) {
      throw new CouponError("VALIDATION_ERROR", 422, "Expiry date must be in the future.");
    }

    const updated = await couponRepository.update(id, {
      maxUses: payload.maxUses,
      expiryDate: payload.expiryDate
    });

    await couponService.invalidateCouponCache();
    return toCouponSummary(updated);
  },

  async deleteCoupon(id: string) {
    const coupon = await couponRepository.findById(id);
    if (!coupon) {
      throw new CouponError("COUPON_NOT_FOUND", 404, "Coupon not found.");
    }

    await couponRepository.update(id, {
      deletedAt: new Date()
    });

    await couponService.invalidateCouponCache();
  },

  getDiscountAmount,
  CouponError
};
