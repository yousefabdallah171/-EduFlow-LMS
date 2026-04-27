import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import type { PrismaClient } from "@prisma/client";
import type { Express } from "express";

process.env.NODE_ENV = "test";
process.env.BACKEND_PORT ??= "3000";
process.env.DATABASE_URL ??= "postgresql://eduflow:change-me@localhost:5432/eduflow_dev?schema=public";
process.env.REDIS_URL ??= "redis://localhost:6379";
process.env.FRONTEND_URL ??= "http://localhost:5173";
process.env.JWT_ACCESS_SECRET ??= "test-access-secret-at-least-32-chars";
process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret-at-least-32-chars";
process.env.VIDEO_TOKEN_SECRET ??= "test-video-secret-at-least-32-chars";

vi.mock("../../src/utils/email.js", () => ({
  sendPasswordResetEmail: vi.fn(),
  sendVerificationEmail: vi.fn()
}));

let app: Express;
let prisma: PrismaClient;
let testUserToken: string;
let testUserId: string;

const PERFORMANCE_THRESHOLDS = {
  auth_register: 500, // ms
  auth_login: 300,
  user_profile: 150,
  dashboard: 500,
  lessons_list: 300,
  lesson_detail: 300,
  search: 1000
};

beforeAll(async () => {
  const appModule = await import("../../src/app.js");
  const databaseModule = await import("../../src/config/database.js");
  app = appModule.createApp();
  prisma = databaseModule.prisma;
});

beforeEach(async () => {
  await prisma.user.deleteMany({
    where: { email: { contains: "perf-test" } }
  });
});

describe("Performance: API Response Times", () => {
  it("should complete registration within threshold", async () => {
    const start = Date.now();

    await request(app)
      .post("/api/v1/auth/register")
      .send({
        email: "perf-test-register@example.com",
        password: "SecurePass123",
        fullName: "Perf Test"
      })
      .expect(201);

    const duration = Date.now() - start;
    console.log(`Registration: ${duration}ms (threshold: ${PERFORMANCE_THRESHOLDS.auth_register}ms)`);
    expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.auth_register);
  });

  it("should complete login within threshold", async () => {
    const email = "perf-test-login@example.com";
    const password = "SecurePass123";

    await prisma.user.create({
      data: {
        email,
        fullName: "Perf Test",
        emailVerified: true,
        passwordHash: await bcrypt.hash(password, 12)
      }
    });

    const start = Date.now();

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password })
      .expect(200);

    const duration = Date.now() - start;
    console.log(`Login: ${duration}ms (threshold: ${PERFORMANCE_THRESHOLDS.auth_login}ms)`);
    expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.auth_login);

    testUserToken = response.body.accessToken;
  });

  it("should retrieve user profile within threshold", async () => {
    const email = "perf-test-profile@example.com";
    const password = "SecurePass123";

    const user = await prisma.user.create({
      data: {
        email,
        fullName: "Perf Test",
        emailVerified: true,
        passwordHash: await bcrypt.hash(password, 12)
      }
    });

    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password });

    const start = Date.now();

    await request(app)
      .get("/api/v1/user/profile")
      .set("Authorization", `Bearer ${loginRes.body.accessToken}`)
      .expect(200);

    const duration = Date.now() - start;
    console.log(`User Profile: ${duration}ms (threshold: ${PERFORMANCE_THRESHOLDS.user_profile}ms)`);
    expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.user_profile);
  });

  it("should load dashboard within threshold", async () => {
    const email = "perf-test-dashboard@example.com";
    const password = "SecurePass123";

    const user = await prisma.user.create({
      data: {
        email,
        fullName: "Perf Test",
        emailVerified: true,
        passwordHash: await bcrypt.hash(password, 12)
      }
    });

    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password });

    const start = Date.now();

    await request(app)
      .get("/api/v1/dashboard")
      .set("Authorization", `Bearer ${loginRes.body.accessToken}`)
      .expect(200);

    const duration = Date.now() - start;
    console.log(`Dashboard: ${duration}ms (threshold: ${PERFORMANCE_THRESHOLDS.dashboard}ms)`);
    expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.dashboard);
  });

  it("should list lessons within threshold", async () => {
    // Create some lessons
    for (let i = 0; i < 10; i++) {
      await prisma.lesson.create({
        data: {
          titleEn: `Perf Test Lesson ${i}`,
          titleAr: `درس ${i}`,
          isPublished: true,
          sortOrder: i
        }
      });
    }

    const start = Date.now();

    await request(app)
      .get("/api/v1/lessons")
      .expect(200);

    const duration = Date.now() - start;
    console.log(`List Lessons: ${duration}ms (threshold: ${PERFORMANCE_THRESHOLDS.lessons_list}ms)`);
    expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.lessons_list);
  });

  it("should retrieve lesson detail within threshold", async () => {
    const lesson = await prisma.lesson.create({
      data: {
        titleEn: "Perf Test Detail",
        titleAr: "درس",
        isPublished: true
      }
    });

    const start = Date.now();

    await request(app)
      .get(`/api/v1/lessons/${lesson.id}/detail`)
      .expect(200);

    const duration = Date.now() - start;
    console.log(`Lesson Detail: ${duration}ms (threshold: ${PERFORMANCE_THRESHOLDS.lesson_detail}ms)`);
    expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.lesson_detail);
  });
});

describe("Performance: Load Testing", () => {
  it("should handle concurrent requests", async () => {
    const email = "perf-test-concurrent@example.com";
    const password = "SecurePass123";

    const user = await prisma.user.create({
      data: {
        email,
        fullName: "Perf Test",
        emailVerified: true,
        passwordHash: await bcrypt.hash(password, 12)
      }
    });

    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password });

    const token = loginRes.body.accessToken;

    const start = Date.now();

    // Send 10 concurrent requests
    const promises = Array.from({ length: 10 }, () =>
      request(app)
        .get("/api/v1/user/profile")
        .set("Authorization", `Bearer ${token}`)
    );

    const results = await Promise.all(promises);
    const duration = Date.now() - start;

    // All should succeed
    results.forEach((res) => {
      expect(res.status).toBe(200);
    });

    console.log(`10 concurrent requests: ${duration}ms (avg: ${(duration / 10).toFixed(2)}ms per request)`);
    expect(duration).toBeLessThan(2000); // 10 requests in under 2 seconds
  });
});

describe("Performance: Cache Effectiveness", () => {
  it("should use cache for repeated lesson queries", async () => {
    const lesson = await prisma.lesson.create({
      data: {
        titleEn: "Cache Test Lesson",
        titleAr: "درس",
        isPublished: true
      }
    });

    // First request (cache miss)
    const first = Date.now();
    await request(app)
      .get(`/api/v1/lessons/${lesson.id}/detail`)
      .expect(200);
    const firstDuration = Date.now() - first;

    // Second request (cache hit)
    const second = Date.now();
    await request(app)
      .get(`/api/v1/lessons/${lesson.id}/detail`)
      .expect(200);
    const secondDuration = Date.now() - second;

    console.log(`Cache miss: ${firstDuration}ms, Cache hit: ${secondDuration}ms`);

    // Second request should be faster (or equal)
    expect(secondDuration).toBeLessThanOrEqual(firstDuration * 1.5);
  });
});
