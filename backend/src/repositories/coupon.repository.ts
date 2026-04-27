import type { Coupon, Prisma } from "@prisma/client";

import { prisma } from "../config/database.js";

export const couponRepository = {
  findByCode(code: string): Promise<Coupon | null> {
    return prisma.coupon.findFirst({
      where: {
        code,
        deletedAt: null
      }
    });
  },

  incrementUses(id: string): Promise<Coupon> {
    return prisma.coupon.update({
      where: { id },
      data: {
        usesCount: {
          increment: 1
        }
      }
    });
  },

  findAllActive(): Promise<Coupon[]> {
    return prisma.coupon.findMany({
      where: {
        deletedAt: null
      },
      orderBy: {
        createdAt: "desc"
      }
    });
  },

  findById(id: string): Promise<Coupon | null> {
    return prisma.coupon.findFirst({
      where: {
        id,
        deletedAt: null
      }
    });
  },

  create(data: Prisma.CouponCreateInput): Promise<Coupon> {
    return prisma.coupon.create({ data });
  },

  update(id: string, data: Prisma.CouponUpdateInput): Promise<Coupon> {
    return prisma.coupon.update({
      where: { id },
      data
    });
  }
};
