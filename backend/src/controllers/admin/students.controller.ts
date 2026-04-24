import crypto from "node:crypto";

import type { Enrollment, EnrollmentStatus, EnrollmentType, User } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import { prisma } from "../../config/database.js";
import { env } from "../../config/env.js";
import { redis } from "../../config/redis.js";
import { refreshTokenRepository } from "../../repositories/refresh-token.repository.js";
import { enrollmentService } from "../../services/enrollment.service.js";
import { lessonService } from "../../services/lesson.service.js";
import { videoTokenService } from "../../services/video-token.service.js";
import { sendEnrollmentActivatedEmail, sendEnrollmentRevokedEmail } from "../../utils/email.js";

const getFirstValue = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["ACTIVE", "REVOKED", "NONE"]).optional(),
  sort: z.enum(["name_asc", "name_desc", "enrolled_at_desc"]).default("enrolled_at_desc")
});

const searchQuerySchema = z.object({
  q: z.string().trim().min(2).max(100),
  limit: z.coerce.number().int().min(1).max(20).default(20)
});

type StudentWithRelations = User & {
  enrollments: Enrollment[];
  lessonProgress: Array<{ completedAt: Date | null; updatedAt: Date }>;
};

const searchVersionKey = "student-search:version";
const SEARCH_CACHE_TTL_SECONDS = env.CACHE_TTL_SEARCH_SECONDS;

const getSearchCacheVersion = async () => (await redis.get(searchVersionKey)) ?? "0";

const bumpSearchCacheVersion = async () => {
  try {
    const pipeline = redis.pipeline();
    pipeline.incr(searchVersionKey);
    pipeline.expire(searchVersionKey, SEARCH_CACHE_TTL_SECONDS);
    await pipeline.exec();
  } catch {
    // ignore redis failures
  }
};

const searchCacheKey = (query: string, limit: number, version: string) => {
  const hash = crypto.createHash("sha256").update(`${version}:${query.toLowerCase()}:${limit}`).digest("hex");
  return `student-search:${hash}`;
};

const sessionCacheKey = (userId: string, sessionId: string) => `session:${userId}:${sessionId}`;

const handleStudentAdminError = (error: unknown, res: Response, next: NextFunction) => {
  if (error instanceof z.ZodError) {
    res.status(422).json({
      error: "VALIDATION_ERROR",
      fields: Object.fromEntries(error.issues.map((issue) => [issue.path.join("."), issue.message]))
    });
    return;
  }

  next(error);
};

const buildStudentPayload = (student: StudentWithRelations, totalPublishedLessons: number) => {
  const enrollment = student.enrollments[0] ?? null;
  const completedLessons = student.lessonProgress.filter((progress) => progress.completedAt).length;
  const lastActiveAt = student.lessonProgress
    .map((progress) => progress.updatedAt)
    .sort((a, b) => b.getTime() - a.getTime())[0];

  return {
    id: student.id,
    email: student.email,
    fullName: student.fullName,
    avatarUrl: student.avatarUrl,
    enrollmentStatus: enrollment?.status ?? "NONE",
    enrollmentType: enrollment?.enrollmentType ?? null,
    enrolledAt: enrollment?.enrolledAt ?? null,
    courseCompletion: totalPublishedLessons > 0 ? Math.round((completedLessons / totalPublishedLessons) * 1000) / 10 : 0,
    lastActiveAt: lastActiveAt ?? null
  };
};

const verifyAdminCanAccessStudent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = getFirstValue(req.params.studentId);

    if (!studentId) {
      res.status(400).json({ error: "STUDENT_ID_REQUIRED" });
      return;
    }

    const student = await prisma.user.findFirst({
      where: { id: studentId, role: "STUDENT" }
    });

    if (!student) {
      res.status(404).json({ error: "STUDENT_NOT_FOUND" });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};

const statusWhere = (status: "ACTIVE" | "REVOKED" | "NONE" | undefined) => {
  if (status === "NONE") {
    return { enrollments: { none: {} } };
  }

  if (status) {
    return { enrollments: { some: { status: status as EnrollmentStatus } } };
  }

  return {};
};

const sortOrder = (sort: "name_asc" | "name_desc" | "enrolled_at_desc") => {
  if (sort === "name_asc") {
    return [{ fullName: "asc" as const }];
  }

  if (sort === "name_desc") {
    return [{ fullName: "desc" as const }];
  }

  return [{ createdAt: "desc" as const }];
};

const listStudentsByEnrollmentDate = async (
  status: "ACTIVE" | "REVOKED" | "NONE" | undefined,
  page: number,
  limit: number
) => {
  const skip = (page - 1) * limit;

  if (status === "NONE") {
    return prisma.user.findMany({
      where: {
        role: "STUDENT",
        enrollments: { none: {} }
      },
      skip,
      take: limit,
      orderBy: [{ createdAt: "desc" }],
      include: {
        enrollments: true,
        lessonProgress: {
          select: {
            completedAt: true,
            updatedAt: true
          }
        }
      }
    });
  }

  const enrollmentWhere = {
    user: { role: "STUDENT" as const },
    ...(status ? { status: status as EnrollmentStatus } : {})
  };

  const enrolledCount = await prisma.enrollment.count({ where: enrollmentWhere });
  const enrollments = await prisma.enrollment.findMany({
    where: enrollmentWhere,
    skip: Math.min(skip, enrolledCount),
    take: limit,
    orderBy: [{ enrolledAt: "desc" }],
    include: {
      user: {
        include: {
          enrollments: true,
          lessonProgress: {
            select: {
              completedAt: true,
              updatedAt: true
            }
          }
        }
      }
    }
  });

  const students = enrollments.map((enrollment) => enrollment.user);

  if (status || students.length === limit) {
    return students;
  }

  const unenrolledSkip = Math.max(skip - enrolledCount, 0);
  const unenrolled = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      enrollments: { none: {} }
    },
    skip: unenrolledSkip,
    take: limit - students.length,
    orderBy: [{ createdAt: "desc" }],
    include: {
      enrollments: true,
      lessonProgress: {
        select: {
          completedAt: true,
          updatedAt: true
        }
      }
    }
  });

  return [...students, ...unenrolled];
};

const findStudent = async (studentId: string) =>
  prisma.user.findFirst({
    where: {
      id: studentId,
      role: "STUDENT"
    },
    include: {
      enrollments: true
    }
  });

const enrollmentResponse = (enrollment: Enrollment) => ({
  id: enrollment.id,
  userId: enrollment.userId,
  status: enrollment.status,
  enrollmentType: enrollment.enrollmentType as EnrollmentType,
  enrolledAt: enrollment.enrolledAt,
  revokedAt: enrollment.revokedAt
});

export const adminStudentsController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = listQuerySchema.parse(req.query);
      const where = {
        role: "STUDENT" as const,
        ...statusWhere(query.status)
      };

      const [students, total, totalPublishedLessons] = await Promise.all([
        query.sort === "enrolled_at_desc"
          ? listStudentsByEnrollmentDate(query.status, query.page, query.limit)
          : prisma.user.findMany({
              where,
              skip: (query.page - 1) * query.limit,
              take: query.limit,
              orderBy: sortOrder(query.sort),
              include: {
                enrollments: true,
                lessonProgress: {
                  select: {
                    completedAt: true,
                    updatedAt: true
                  }
                }
              }
            }),
        prisma.user.count({ where }),
        lessonService.getPublishedLessonCount()
      ]);

      res.json({
        data: students.map((student) => buildStudentPayload(student, totalPublishedLessons)),
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit)
        }
      });
    } catch (error) {
      handleStudentAdminError(error, res, next);
    }
  },

  async search(req: Request, res: Response, next: NextFunction) {
    try {
      const query = searchQuerySchema.parse(req.query);
      const cacheKey = searchCacheKey(query.q, query.limit, await getSearchCacheVersion());
      const cached = await redis.get(cacheKey);
      if (cached) {
        res.json(JSON.parse(cached));
        return;
      }

      const students = await prisma.user.findMany({
        where: {
          role: "STUDENT",
          OR: [
            { fullName: { contains: query.q, mode: "insensitive" } },
            { email: { contains: query.q, mode: "insensitive" } }
          ]
        },
        take: query.limit,
        orderBy: [{ fullName: "asc" }, { email: "asc" }],
        include: {
          enrollments: true
        }
      });

      const payload = {
        results: students.map((student) => ({
          id: student.id,
          email: student.email,
          fullName: student.fullName,
          enrollmentStatus: student.enrollments[0]?.status ?? "NONE"
        }))
      };

      await redis.set(cacheKey, JSON.stringify(payload), "EX", SEARCH_CACHE_TTL_SECONDS);
      res.json(payload);
    } catch (error) {
      handleStudentAdminError(error, res, next);
    }
  },

  async detail(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = getFirstValue(req.params.studentId);
      if (!studentId) {
        res.status(400).json({ error: "STUDENT_ID_REQUIRED" });
        return;
      }

      const [student, totalPublishedLessons] = await Promise.all([
        prisma.user.findFirst({
          where: {
            id: studentId,
            role: "STUDENT"
          },
          include: {
            enrollments: {
              orderBy: { enrolledAt: "desc" }
            },
            lessonProgress: {
              orderBy: { updatedAt: "desc" },
              include: {
                lesson: {
                  select: {
                    id: true,
                    titleEn: true,
                    titleAr: true,
                    sortOrder: true
                  }
                }
              }
            }
          }
        }),
        lessonService.getPublishedLessonCount()
      ]);

      if (!student) {
        res.status(404).json({ error: "STUDENT_NOT_FOUND" });
        return;
      }

      res.json({
        ...buildStudentPayload(student, totalPublishedLessons),
        enrollments: student.enrollments.map(enrollmentResponse),
        progress: student.lessonProgress.map((progress) => ({
          lessonId: progress.lessonId,
          lessonTitleEn: progress.lesson.titleEn,
          lessonTitleAr: progress.lesson.titleAr,
          lessonSortOrder: progress.lesson.sortOrder,
          watchTimeSeconds: progress.watchTimeSeconds,
          completedAt: progress.completedAt,
          updatedAt: progress.updatedAt
        }))
      });
    } catch (error) {
      next(error);
    }
  },

  async enroll(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = getFirstValue(req.params.studentId);
      if (!studentId) {
        res.status(400).json({ error: "STUDENT_ID_REQUIRED" });
        return;
      }

      const student = await findStudent(studentId);
      if (!student) {
        res.status(404).json({ error: "STUDENT_NOT_FOUND" });
        return;
      }

      if (student.enrollments[0]?.status === "ACTIVE") {
        res.status(409).json({
          error: "ALREADY_ENROLLED",
          message: "Student already has an active enrollment."
        });
        return;
      }

      const enrollment = await enrollmentService.enroll(student.id, "ADMIN_ENROLLED");
      await bumpSearchCacheVersion();

      try {
        await sendEnrollmentActivatedEmail(student.email, student.fullName, `${env.FRONTEND_URL}/dashboard`);
      } catch {
        // ignore email failures - not critical to enrollment
      }

      res.status(201).json({
        enrollment: enrollmentResponse(enrollment),
        message: "Student enrolled successfully."
      });
    } catch (error) {
      next(error);
    }
  },

  async revoke(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = getFirstValue(req.params.studentId);
      if (!studentId) {
        res.status(400).json({ error: "STUDENT_ID_REQUIRED" });
        return;
      }

      const student = await findStudent(studentId);
      if (!student) {
        res.status(404).json({ error: "STUDENT_NOT_FOUND" });
        return;
      }

      if (student.enrollments[0]?.status !== "ACTIVE") {
        res.status(404).json({ error: "NO_ACTIVE_ENROLLMENT" });
        return;
      }

      const activeSessions = await refreshTokenRepository.findActiveByUser(student.id);
      const enrollment = await enrollmentService.revoke(student.id, req.user!.userId);
      await refreshTokenRepository.revokeByUser(student.id);
      if (activeSessions.length > 0) {
        await redis.del(...activeSessions.map((session) => sessionCacheKey(session.userId, session.sessionId)));
      }
      await videoTokenService.revokeUser(student.id);
      await bumpSearchCacheVersion();

      try {
        await sendEnrollmentRevokedEmail(student.email, student.fullName, `${env.FRONTEND_URL}/help`);
      } catch {
        // ignore email failures - not critical to revocation
      }

      res.json({
        enrollment: enrollmentResponse(enrollment),
        message: "Student access revoked."
      });
    } catch (error) {
      next(error);
    }
  }
};

export { verifyAdminCanAccessStudent };
