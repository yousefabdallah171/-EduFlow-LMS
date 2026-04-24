import type { EnrollmentType } from "@prisma/client";

import { redis } from "../config/redis.js";
import { env } from "../config/env.js";
import { ENROLLMENT_STATUS } from "../constants/index.js";
import { enrollmentRepository } from "../repositories/enrollment.repository.js";
import { dashboardService } from "./dashboard.service.js";
import { prometheus } from "../observability/prometheus.js";

const DEFAULT_COURSE_ID = env.DEFAULT_COURSE_ID;
const enrollmentStatusCacheKey = (userId: string, courseId: string) => `enrollment:status:${userId}:${courseId}`;
const ENROLLMENT_CACHE_TTL_SECONDS = env.CACHE_TTL_ENROLLMENT_SECONDS;

export type EnrollmentStatusResponse =
  | {
      enrolled: true;
      status: string;
      enrollmentType?: EnrollmentType;
      enrolledAt?: Date;
    }
  | {
      enrolled: false;
      status?: string;
      enrollmentType?: EnrollmentType;
      enrolledAt?: Date;
    };

export const enrollmentService = {
  async enroll(userId: string, enrollmentType: EnrollmentType, paymentId?: string | null) {
    const existing = await enrollmentRepository.findByUserId(userId);

    const enrollment = existing
      ? await enrollmentRepository.updateStatus(userId, {
          status: ENROLLMENT_STATUS.ACTIVE,
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

    const payload = { enrolled: true, status: enrollment.status };
    try {
      await redis.set(enrollmentStatusCacheKey(userId, DEFAULT_COURSE_ID), JSON.stringify(payload), "EX", ENROLLMENT_CACHE_TTL_SECONDS);
    } catch {
      // ignore redis failures
    }
    await dashboardService.invalidateStudentDashboard(userId);
    return enrollment;
  },

  async revoke(userId: string, revokedById?: string) {
    const enrollment = await enrollmentRepository.revoke(userId, revokedById);
    const payload = { enrolled: false, status: enrollment.status };
    try {
      await redis.set(enrollmentStatusCacheKey(userId, DEFAULT_COURSE_ID), JSON.stringify(payload), "EX", ENROLLMENT_CACHE_TTL_SECONDS);
    } catch {
      // ignore redis failures
    }
    await dashboardService.invalidateStudentDashboard(userId);
    return enrollment;
  },

  async getStatus(userId: string): Promise<EnrollmentStatusResponse> {
    try {
      const cached = await redis.get(enrollmentStatusCacheKey(userId, DEFAULT_COURSE_ID));
      if (cached) {
        prometheus.recordCacheHit("enrollment_status");
        return JSON.parse(cached) as EnrollmentStatusResponse;
      }
    } catch {
      // ignore redis failures
    }
    prometheus.recordCacheMiss("enrollment_status");

    const enrollment = await enrollmentRepository.findByUserId(userId);
    const value: EnrollmentStatusResponse = enrollment
      ? {
          enrolled: enrollment.status === ENROLLMENT_STATUS.ACTIVE,
          status: enrollment.status,
          enrollmentType: enrollment.enrollmentType,
          enrolledAt: enrollment.enrolledAt
        }
      : { enrolled: false };

    try {
      await redis.set(
        enrollmentStatusCacheKey(userId, DEFAULT_COURSE_ID),
        JSON.stringify(value),
        "EX",
        ENROLLMENT_CACHE_TTL_SECONDS
      );
    } catch {
      // ignore redis failures
    }
    return value;
  },

  getStatusForCourse(userId: string, courseId: string) {
    if (!courseId.trim() || courseId === DEFAULT_COURSE_ID) {
      return enrollmentService.getStatus(userId);
    }

    return (async () => {
      try {
        const cached = await redis.get(enrollmentStatusCacheKey(userId, courseId));
        if (cached) {
          return JSON.parse(cached) as EnrollmentStatusResponse;
        }
      } catch {
        // ignore redis failures
      }

      const value = await enrollmentService.getStatus(userId);
      try {
        await redis.set(enrollmentStatusCacheKey(userId, courseId), JSON.stringify(value), "EX", ENROLLMENT_CACHE_TTL_SECONDS);
      } catch {
        // ignore redis failures
      }
      return value;
    })();
  }
};
