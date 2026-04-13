import { beforeEach, describe, expect, it, vi } from "vitest";

const redisStore = new Map<string, string>();

const prismaMock = vi.hoisted(() => ({
  payment: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    count: vi.fn()
  },
  enrollment: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn()
  },
  lesson: {
    findMany: vi.fn()
  },
  lessonProgress: {
    findMany: vi.fn()
  }
}));

vi.mock("../../src/config/database.js", () => ({
  prisma: prismaMock
}));

vi.mock("../../src/config/redis.js", () => ({
  redis: {
    get: vi.fn(async (key: string) => redisStore.get(key) ?? null),
    set: vi.fn(async (key: string, value: string) => {
      redisStore.set(key, value);
      return "OK";
    }),
    del: vi.fn(async (...keys: string[]) => {
      keys.forEach((key) => redisStore.delete(key));
      return keys.length;
    })
  }
}));

describe("analyticsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisStore.clear();
  });

  it("calculates KPI aggregates correctly", async () => {
    const { analyticsService } = await import("../../src/services/analytics.service.js");

    prismaMock.payment.findMany
      .mockResolvedValueOnce([
        { amountPiasters: 49_900, createdAt: new Date("2026-04-10"), status: "COMPLETED" },
        { amountPiasters: 39_900, createdAt: new Date("2026-04-11"), status: "COMPLETED" }
      ])
      .mockResolvedValueOnce([{ amountPiasters: 20_000, createdAt: new Date("2026-03-01"), status: "COMPLETED" }]);
    prismaMock.enrollment.findMany
      .mockResolvedValueOnce([
        { enrolledAt: new Date("2026-04-10"), status: "ACTIVE" },
        { enrolledAt: new Date("2026-04-11"), status: "ACTIVE" }
      ])
      .mockResolvedValueOnce([
        { status: "ACTIVE" },
        { status: "ACTIVE" },
        { status: "REVOKED" }
      ]);
    prismaMock.lesson.findMany.mockResolvedValue([
      { id: "lesson-1", titleEn: "Intro", titleAr: "مقدمة", durationSeconds: 100, sortOrder: 1, isPublished: true },
      { id: "lesson-2", titleEn: "Deep Dive", titleAr: "تعمق", durationSeconds: 200, sortOrder: 2, isPublished: true }
    ]);
    prismaMock.lessonProgress.findMany.mockResolvedValue([
      {
        userId: "user-1",
        lessonId: "lesson-1",
        watchTimeSeconds: 90,
        lastPositionSeconds: 100,
        completedAt: new Date("2026-04-10"),
        lesson: { id: "lesson-1", titleEn: "Intro", titleAr: "مقدمة", durationSeconds: 100, isPublished: true }
      },
      {
        userId: "user-1",
        lessonId: "lesson-2",
        watchTimeSeconds: 100,
        lastPositionSeconds: 120,
        completedAt: null,
        lesson: { id: "lesson-2", titleEn: "Deep Dive", titleAr: "تعمق", durationSeconds: 200, isPublished: true }
      },
      {
        userId: "user-2",
        lessonId: "lesson-1",
        watchTimeSeconds: 80,
        lastPositionSeconds: 85,
        completedAt: new Date("2026-04-11"),
        lesson: { id: "lesson-1", titleEn: "Intro", titleAr: "مقدمة", durationSeconds: 100, isPublished: true }
      }
    ]);

    const result = await analyticsService.calculateKPIs("30d");

    expect(result.kpis.totalRevenue.amountEgp).toBe(898);
    expect(result.kpis.enrolledStudents).toMatchObject({
      total: 3,
      active: 2,
      revoked: 1,
      newThisPeriod: 2
    });
    expect(result.kpis.courseCompletion.averagePercent).toBe(50);
    expect(result.kpis.videoEngagement.totalWatchTimeSeconds).toBe(270);
    expect(result.topLessons[0]).toMatchObject({
      lessonId: "lesson-1"
    });
  });

  it("marks pending payments as paid and creates enrollment", async () => {
    const { analyticsService } = await import("../../src/services/analytics.service.js");

    prismaMock.payment.findUnique.mockResolvedValue({
      id: "payment-1",
      userId: "student-1",
      status: "PENDING"
    });
    prismaMock.enrollment.findUnique.mockResolvedValue(null);
    prismaMock.payment.update.mockResolvedValue({
      id: "payment-1",
      status: "COMPLETED"
    });
    prismaMock.enrollment.create.mockResolvedValue({
      status: "ACTIVE",
      enrollmentType: "PAID"
    });

    const result = await analyticsService.markPaymentPaid("payment-1");

    expect(result.payment.status).toBe("COMPLETED");
    expect(result.enrollment).toMatchObject({
      status: "ACTIVE",
      enrollmentType: "PAID"
    });
  });
});
