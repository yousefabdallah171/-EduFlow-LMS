import type { EnrollmentType } from "@prisma/client";

import { redis } from "../config/redis.js";
import { enrollmentRepository } from "../repositories/enrollment.repository.js";

const enrollmentCacheKey = (userId: string) => `enrollment:${userId}`;

export const enrollmentService = {
  async enroll(userId: string, enrollmentType: EnrollmentType, paymentId?: string | null) {
    const existing = await enrollmentRepository.findByUserId(userId);

    const enrollment = existing
      ? await enrollmentRepository.updateStatus(userId, {
          status: "ACTIVE",
          enrollmentType,
          payment: paymentId ? { connect: { id: paymentId } } : { disconnect: true },
          revokedAt: null,
          revokedBy: { disconnect: true },
          enrolledAt: new Date()
        })
      : await enrollmentRepository.create({
          user: { connect: { id: userId } },
          enrollmentType,
          payment: paymentId ? { connect: { id: paymentId } } : undefined
        });

    await redis.set(enrollmentCacheKey(userId), JSON.stringify({ enrolled: true, status: enrollment.status }), "EX", 300);
    return enrollment;
  },

  async revoke(userId: string, revokedById?: string) {
    const enrollment = await enrollmentRepository.revoke(userId, revokedById);
    await redis.set(enrollmentCacheKey(userId), JSON.stringify({ enrolled: false, status: enrollment.status }), "EX", 300);
    return enrollment;
  },

  async getStatus(userId: string) {
    const cached = await redis.get(enrollmentCacheKey(userId));
    if (cached) {
      return JSON.parse(cached) as { enrolled: boolean; status?: string };
    }

    const enrollment = await enrollmentRepository.findByUserId(userId);
    const value = enrollment
      ? {
          enrolled: enrollment.status === "ACTIVE",
          status: enrollment.status,
          enrollmentType: enrollment.enrollmentType,
          enrolledAt: enrollment.enrolledAt
        }
      : { enrolled: false };

    await redis.set(enrollmentCacheKey(userId), JSON.stringify(value), "EX", 300);
    return value;
  }
};
