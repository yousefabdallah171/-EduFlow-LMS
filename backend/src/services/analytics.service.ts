import { prisma } from "../config/database.js";
import { redis } from "../config/redis.js";

type AnalyticsPeriod = "7d" | "30d" | "90d" | "all";

class AnalyticsError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

const cacheKey = (period: AnalyticsPeriod) => `analytics:${period}`;

const periodToStartDate = (period: AnalyticsPeriod) => {
  if (period === "all") {
    return null;
  }

  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
};

const formatDate = (value: Date) => value.toISOString().slice(0, 10);

const rangeDates = (startDate: Date, endDate: Date) => {
  const dates: string[] = [];
  const cursor = new Date(startDate);
  cursor.setUTCHours(0, 0, 0, 0);
  const limit = new Date(endDate);
  limit.setUTCHours(0, 0, 0, 0);

  while (cursor <= limit) {
    dates.push(formatDate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
};

export const analyticsService = {
  async calculateKPIs(period: AnalyticsPeriod): Promise<{
    period: AnalyticsPeriod;
    generatedAt: string;
    kpis: {
      totalRevenue: {
        amountEgp: number;
        currency: string;
        changePercent: number;
      };
      enrolledStudents: {
        total: number;
        active: number;
        revoked: number;
        newThisPeriod: number;
      };
      courseCompletion: {
        averagePercent: number;
        fullyCompleted: number;
      };
      videoEngagement: {
        averageWatchTimeSeconds: number;
        totalWatchTimeSeconds: number;
      };
    };
    revenueTimeseries: Array<{ date: string; revenueEgp: number }>;
    enrollmentTimeseries: Array<{ date: string; newEnrollments: number }>;
    topLessons: Array<{
      lessonId: string;
      titleEn: string;
      titleAr: string;
      completionRate: number;
      averageWatchTimeSeconds: number;
    }>;
    dropOffLessons: Array<{
      lessonId: string;
      titleEn: string;
      titleAr: string;
      dropOffRate: number;
      averageExitPositionSeconds: number;
    }>;
  }> {
    const cached = await redis.get(cacheKey(period));
    if (cached) {
      return JSON.parse(cached) as Awaited<ReturnType<typeof analyticsService.calculateKPIs>>;
    }

    const startDate = periodToStartDate(period);
    const paymentWhere = {
      status: "COMPLETED" as const,
      ...(startDate ? { createdAt: { gte: startDate } } : {})
    };
    const enrollmentWhere = startDate ? { enrolledAt: { gte: startDate } } : {};

    const previousStartDate = startDate
      ? new Date(startDate.getTime() - (Date.now() - startDate.getTime()))
      : null;

    const [payments, enrollments, allEnrollments, publishedLessons, previousRevenueAggregate] = await Promise.all([
      prisma.payment.findMany({
        where: paymentWhere,
        orderBy: { createdAt: "asc" }
      }),
      prisma.enrollment.findMany({
        where: enrollmentWhere,
        orderBy: { enrolledAt: "asc" }
      }),
      prisma.enrollment.findMany(),
      prisma.lesson.findMany({
        where: {
          isPublished: true
        },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          titleEn: true,
          titleAr: true,
          durationSeconds: true,
          sortOrder: true
        }
      }),
      previousStartDate
        ? prisma.payment.aggregate({
            where: {
              status: "COMPLETED",
              createdAt: {
                gte: previousStartDate,
                lt: startDate ?? new Date()
              }
            },
            _sum: {
              amountPiasters: true
            }
          })
        : Promise.resolve(null)
    ]);

    const totalRevenuePiasters = payments.reduce((sum, payment) => sum + payment.amountPiasters, 0);
    const previousRevenuePiasters =
      previousStartDate && previousRevenueAggregate?._sum?.amountPiasters != null
        ? previousRevenueAggregate._sum.amountPiasters
        : totalRevenuePiasters;

    const revenueChangePercent =
      previousRevenuePiasters === 0 ? (totalRevenuePiasters > 0 ? 100 : 0) : ((totalRevenuePiasters - previousRevenuePiasters) / previousRevenuePiasters) * 100;

    const activeEnrollments = allEnrollments.filter((entry) => entry.status === "ACTIVE").length;
    const revokedEnrollments = allEnrollments.filter((entry) => entry.status === "REVOKED").length;

    const publishedLessonIds = publishedLessons.map((lesson) => lesson.id);
    const progressForPublishedLessons = publishedLessonIds.length
      ? await prisma.lessonProgress.findMany({
          where: {
            lessonId: { in: publishedLessonIds }
          },
          select: {
            userId: true,
            lessonId: true,
            watchTimeSeconds: true,
            lastPositionSeconds: true,
            completedAt: true
          }
        })
      : [];

    const progressAggByLesson = new Map<
      string,
      { total: number; completed: number; watchTimeSeconds: number; exitPositionSeconds: number }
    >();
    const completedPerUser = new Map<string, number>();
    for (const progress of progressForPublishedLessons) {
      const bucket = progressAggByLesson.get(progress.lessonId) ?? {
        total: 0,
        completed: 0,
        watchTimeSeconds: 0,
        exitPositionSeconds: 0
      };
      bucket.total += 1;
      bucket.watchTimeSeconds += progress.watchTimeSeconds;
      bucket.exitPositionSeconds += progress.lastPositionSeconds;
      if (progress.completedAt) {
        bucket.completed += 1;
        completedPerUser.set(progress.userId, (completedPerUser.get(progress.userId) ?? 0) + 1);
      }
      progressAggByLesson.set(progress.lessonId, bucket);
    }

    const totalWatchTimeSeconds = progressForPublishedLessons.reduce((sum, progress) => sum + progress.watchTimeSeconds, 0);
    const totalUsersWithProgress = new Set(progressForPublishedLessons.map((progress) => progress.userId)).size;

    const totalLessons = publishedLessons.length;
    const completionPercentages = totalLessons
      ? [...completedPerUser.values()].map((count) => (count / totalLessons) * 100)
      : [];
    const averageCompletion =
      completionPercentages.length > 0
        ? completionPercentages.reduce((sum, value) => sum + value, 0) / completionPercentages.length
        : 0;
    const fullyCompleted = [...completedPerUser.values()].filter((count) => totalLessons > 0 && count >= totalLessons).length;

    const seriesStartDate = startDate ?? (payments[0]?.createdAt ?? enrollments[0]?.enrolledAt ?? new Date());
    const dates = rangeDates(seriesStartDate, new Date());
    const revenueByDate = new Map<string, number>();
    for (const payment of payments) {
      const key = formatDate(payment.createdAt);
      revenueByDate.set(key, (revenueByDate.get(key) ?? 0) + payment.amountPiasters / 100);
    }
    const enrollmentByDate = new Map<string, number>();
    for (const enrollment of enrollments) {
      const key = formatDate(enrollment.enrolledAt);
      enrollmentByDate.set(key, (enrollmentByDate.get(key) ?? 0) + 1);
    }

    const lessonStats = publishedLessons.map((lesson) => {
      const stats = progressAggByLesson.get(lesson.id);
      const completionRate = stats?.total ? (stats.completed / stats.total) * 100 : 0;
      const averageWatchTimeSeconds = stats?.total ? stats.watchTimeSeconds / stats.total : 0;
      const durationSeconds = lesson.durationSeconds ?? 1;
      const averageExitPositionSeconds = stats?.total ? stats.exitPositionSeconds / stats.total : 0;
      const dropOffRate = Math.max(0, Math.min(100, 100 - (averageExitPositionSeconds / durationSeconds) * 100));

      return {
        lessonId: lesson.id,
        titleEn: lesson.titleEn,
        titleAr: lesson.titleAr,
        completionRate: Math.round(completionRate * 10) / 10,
        averageWatchTimeSeconds: Math.round(averageWatchTimeSeconds),
        dropOffRate: Math.round(dropOffRate * 10) / 10,
        averageExitPositionSeconds: Math.round(averageExitPositionSeconds)
      };
    });

    const payload = {
      period,
      generatedAt: new Date().toISOString(),
      kpis: {
        totalRevenue: {
          amountEgp: totalRevenuePiasters / 100,
          currency: "EGP",
          changePercent: Math.round(revenueChangePercent * 10) / 10
        },
        enrolledStudents: {
          total: allEnrollments.length,
          active: activeEnrollments,
          revoked: revokedEnrollments,
          newThisPeriod: enrollments.length
        },
        courseCompletion: {
          averagePercent: Math.round(averageCompletion * 10) / 10,
          fullyCompleted
        },
        videoEngagement: {
          averageWatchTimeSeconds: totalUsersWithProgress > 0 ? Math.round(totalWatchTimeSeconds / totalUsersWithProgress) : 0,
          totalWatchTimeSeconds
        }
      },
      revenueTimeseries: dates.map((date) => ({
        date,
        revenueEgp: Math.round((revenueByDate.get(date) ?? 0) * 100) / 100
      })),
      enrollmentTimeseries: dates.map((date) => ({
        date,
        newEnrollments: enrollmentByDate.get(date) ?? 0
      })),
      topLessons: [...lessonStats]
        .sort((left, right) => right.completionRate - left.completionRate)
        .slice(0, 5)
        .map(({ lessonId, titleEn, titleAr, completionRate, averageWatchTimeSeconds }) => ({
          lessonId,
          titleEn,
          titleAr,
          completionRate,
          averageWatchTimeSeconds
        })),
      dropOffLessons: [...lessonStats]
        .sort((left, right) => right.dropOffRate - left.dropOffRate)
        .slice(0, 5)
        .map(({ lessonId, titleEn, titleAr, dropOffRate, averageExitPositionSeconds }) => ({
          lessonId,
          titleEn,
          titleAr,
          dropOffRate,
          averageExitPositionSeconds
        }))
    };

    await redis.set(cacheKey(period), JSON.stringify(payload), "EX", 3600);

    return payload;
  },

  async listPayments(params: {
    page: number;
    limit: number;
    status?: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
    from?: Date;
    to?: Date;
  }) {
    const where = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.from || params.to
        ? {
            createdAt: {
              ...(params.from ? { gte: params.from } : {}),
              ...(params.to ? { lte: params.to } : {})
            }
          }
        : {})
    };

    const [payments, total, summaryByStatus] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          },
          coupon: {
            select: {
              code: true
            }
          }
        },
        orderBy: { createdAt: "desc" },
        skip: (params.page - 1) * params.limit,
        take: params.limit
      }),
      prisma.payment.count({ where }),
      prisma.payment.groupBy({
        by: ["status"],
        where,
        _count: { _all: true },
        _sum: { amountPiasters: true }
      })
    ]);

    const completedSummary = summaryByStatus.find((entry) => entry.status === "COMPLETED");
    const failedSummary = summaryByStatus.find((entry) => entry.status === "FAILED");

    return {
      data: payments.map((payment) => ({
        id: payment.id,
        student: payment.user,
        amountEgp: payment.amountPiasters / 100,
        discountEgp: payment.discountPiasters / 100,
        couponCode: payment.coupon?.code ?? null,
        paymobTransactionId: payment.paymobTransactionId,
        status: payment.status,
        createdAt: payment.createdAt
      })),
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / params.limit))
      },
      summary: {
        totalRevenue: (completedSummary?._sum?.amountPiasters ?? 0) / 100,
        completedCount: completedSummary?._count?._all ?? 0,
        failedCount: failedSummary?._count?._all ?? 0
      }
    };
  },

  async markPaymentPaid(paymentId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId }
    });

    if (!payment) {
      throw new AnalyticsError("PAYMENT_NOT_FOUND", 404, "Payment record not found.");
    }

    if (payment.status === "COMPLETED") {
      throw new AnalyticsError("PAYMENT_ALREADY_COMPLETED", 409, "Payment is already completed.");
    }

    const existingEnrollment = await prisma.enrollment.findUnique({
      where: { userId: payment.userId }
    });
    if (existingEnrollment?.status === "ACTIVE") {
      throw new AnalyticsError("ALREADY_ENROLLED", 409, "Student already has an active enrollment.");
    }

    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: "COMPLETED",
        webhookReceivedAt: new Date()
      }
    });

    const enrollment = existingEnrollment
      ? await prisma.enrollment.update({
          where: { userId: payment.userId },
          data: {
            status: "ACTIVE",
            enrollmentType: "PAID",
            paymentId: payment.id,
            revokedAt: null,
            revokedById: null,
            enrolledAt: new Date()
          }
        })
      : await prisma.enrollment.create({
          data: {
            userId: payment.userId,
            status: "ACTIVE",
            enrollmentType: "PAID",
            paymentId: payment.id
          }
        });

    await analyticsService.invalidateCache();

    return {
      payment: updatedPayment,
      enrollment
    };
  },

  async invalidateCache() {
    await redis.del(cacheKey("7d"), cacheKey("30d"), cacheKey("90d"), cacheKey("all"));
  },

  AnalyticsError
};
