import { beforeAll, beforeEach, describe, expect, it } from "vitest";
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

let app: Express;
let prisma: PrismaClient;

const password = "Securepass123";
const studentEmail = "progress-student@example.com";

beforeAll(async () => {
  const appModule = await import("../../src/app.js");
  const databaseModule = await import("../../src/config/database.js");
  app = appModule.createApp();
  prisma = databaseModule.prisma;
});

beforeEach(async () => {
  await prisma.lessonProgress.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany({ where: { role: "STUDENT" } });
  await prisma.lesson.deleteMany();

  const student = await prisma.user.create({
    data: {
      email: studentEmail,
      fullName: "Progress Student",
      emailVerified: true,
      passwordHash: await bcrypt.hash(password, 12)
    }
  });

  await prisma.enrollment.create({
    data: {
      userId: student.id,
      enrollmentType: "PAID"
    }
  });

  await prisma.lesson.createMany({
    data: [
      {
        id: "progress-lesson-1",
        titleEn: "Lesson One",
        titleAr: "Lesson One",
        durationSeconds: 100,
        isPublished: true,
        sortOrder: 1
      },
      {
        id: "progress-lesson-2",
        titleEn: "Lesson Two",
        titleAr: "Lesson Two",
        durationSeconds: 100,
        isPublished: true,
        sortOrder: 2
      }
    ]
  });
});

describe("US3 lesson progress", () => {
  it("updates progress and marks completion once watch time reaches 90 percent", async () => {
    const login = await request(app).post("/api/v1/auth/login").send({ email: studentEmail, password }).expect(200);
    const accessToken = login.body.accessToken as string;

    const partial = await request(app)
      .post("/api/v1/lessons/progress-lesson-1/progress")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        lastPositionSeconds: 20,
        watchTimeSeconds: 20,
        completed: false
      })
      .expect(200);

    expect(partial.body.completedAt).toBeNull();
    expect(partial.body.courseCompletionPercentage).toBe(0);

    const complete = await request(app)
      .post("/api/v1/lessons/progress-lesson-1/progress")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        lastPositionSeconds: 95,
        watchTimeSeconds: 95,
        completed: false
      })
      .expect(200);

    expect(complete.body.completedAt).toEqual(expect.any(String));
    expect(complete.body.courseCompletionPercentage).toBe(50);
  });
});
