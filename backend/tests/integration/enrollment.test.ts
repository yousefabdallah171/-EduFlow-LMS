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
process.env.PAYMOB_API_KEY ??= "test";
process.env.PAYMOB_HMAC_SECRET ??= "test";
process.env.PAYMOB_INTEGRATION_ID ??= "1";
process.env.PAYMOB_IFRAME_ID ??= "1";
process.env.GOOGLE_CLIENT_ID ??= "test";
process.env.GOOGLE_CLIENT_SECRET ??= "test";
process.env.SMTP_HOST ??= "localhost";
process.env.SMTP_PORT ??= "1025";
process.env.SMTP_USER ??= "test@example.com";
process.env.SMTP_PASS ??= "password";

vi.mock("../../src/config/redis.js", () => {
  const store = new Map<string, string>();
  return {
    redis: {
      get: vi.fn(async (key: string) => store.get(key) ?? null),
      set: vi.fn(async (key: string, value: string) => {
        store.set(key, value);
        return "OK";
      }),
      del: vi.fn(async (...keys: string[]) => {
        keys.forEach((key) => store.delete(key));
        return keys.length;
      })
    }
  };
});

let app: Express;
let prisma: PrismaClient;

const password = "Securepass123";
const adminEmail = "enrollment-admin@example.com";
const studentEmail = "manual-enrollment-student@example.com";
const lessonId = "manual-enrollment-lesson";

beforeAll(async () => {
  const appModule = await import("../../src/app.js");
  const databaseModule = await import("../../src/config/database.js");
  app = appModule.createApp();
  prisma = databaseModule.prisma;
});

beforeEach(async () => {
  await prisma.videoToken.deleteMany();
  await prisma.lessonProgress.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany({ where: { email: { in: [adminEmail, studentEmail] } } });
  await prisma.lesson.deleteMany({ where: { id: lessonId } });

  await prisma.user.create({
    data: {
      email: adminEmail,
      fullName: "Enrollment Admin",
      role: "ADMIN",
      emailVerified: true,
      passwordHash: await bcrypt.hash(password, 12)
    }
  });

  await prisma.user.create({
    data: {
      email: studentEmail,
      fullName: "Manual Enrollment Student",
      emailVerified: true,
      passwordHash: await bcrypt.hash(password, 12)
    }
  });

  await prisma.lesson.create({
    data: {
      id: lessonId,
      titleEn: "Manual Enrollment Lesson",
      titleAr: "Manual Enrollment Lesson",
      durationSeconds: 120,
      isPublished: true,
      sortOrder: 1,
      videoStatus: "READY"
    }
  });
});

describe("US5 admin manual enrollment", () => {
  it("enrolls and revokes a student, invalidating course access and active video tokens", async () => {
    const adminLogin = await request(app).post("/api/v1/auth/login").send({ email: adminEmail, password }).expect(200);
    const adminToken = adminLogin.body.accessToken as string;

    const studentLogin = await request(app).post("/api/v1/auth/login").send({ email: studentEmail, password }).expect(200);
    const studentToken = studentLogin.body.accessToken as string;
    const student = await prisma.user.findUniqueOrThrow({ where: { email: studentEmail } });

    await request(app)
      .get("/api/v1/admin/students/search")
      .set("Authorization", `Bearer ${adminToken}`)
      .query({ q: "manual-enrollment" })
      .expect(200)
      .expect((response) => {
        expect(response.body.results[0]).toMatchObject({
          id: student.id,
          email: studentEmail,
          enrollmentStatus: "NONE"
        });
      });

    const enrolled = await request(app)
      .post(`/api/v1/admin/students/${student.id}/enroll`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(201);

    expect(enrolled.body.enrollment).toMatchObject({
      userId: student.id,
      status: "ACTIVE",
      enrollmentType: "ADMIN_ENROLLED"
    });

    await request(app).get("/api/v1/lessons").set("Authorization", `Bearer ${studentToken}`).expect(200);

    const lesson = await request(app)
      .get(`/api/v1/lessons/${lessonId}`)
      .set("Authorization", `Bearer ${studentToken}`)
      .expect(200);
    expect(lesson.body.videoToken).toEqual(expect.any(String));

    const revoked = await request(app)
      .post(`/api/v1/admin/students/${student.id}/revoke`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(revoked.body.enrollment).toMatchObject({
      status: "REVOKED"
    });

    await request(app).get("/api/v1/lessons").set("Authorization", `Bearer ${studentToken}`).expect(403);

    const activeTokenCount = await prisma.videoToken.count({
      where: {
        userId: student.id,
        revokedAt: null
      }
    });
    expect(activeTokenCount).toBe(0);

    const activeRefreshTokenCount = await prisma.refreshToken.count({
      where: {
        userId: student.id,
        revokedAt: null
      }
    });
    expect(activeRefreshTokenCount).toBe(0);
  });
});

