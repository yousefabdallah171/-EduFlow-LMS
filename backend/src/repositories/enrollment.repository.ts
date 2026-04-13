import type { Enrollment, Prisma } from "@prisma/client";

import { prisma } from "../config/database.js";

export const enrollmentRepository = {
  create(data: Prisma.EnrollmentCreateInput): Promise<Enrollment> {
    return prisma.enrollment.create({ data });
  },

  findByUserId(userId: string): Promise<Enrollment | null> {
    return prisma.enrollment.findUnique({ where: { userId } });
  },

  updateStatus(userId: string, data: Prisma.EnrollmentUpdateInput): Promise<Enrollment> {
    return prisma.enrollment.update({
      where: { userId },
      data
    });
  },

  revoke(userId: string, revokedById?: string): Promise<Enrollment> {
    return prisma.enrollment.update({
      where: { userId },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
        revokedById: revokedById ?? null
      }
    });
  }
};
