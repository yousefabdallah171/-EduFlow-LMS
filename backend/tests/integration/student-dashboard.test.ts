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
const studentEmail = "dashboard-student@example.com";
const lessonIds = ["dashboard-lesson-1", "dashboard-lesson-2"];

beforeAll(async () => {
  const appModule = await import("../../src/app.js");
  const databaseModule = await import("../../src/config/database.js");
  app = appModule.createApp();
  prisma = databaseModule.prisma;
});

beforeEach(async () => {
  await prisma.ticketMessage.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.videoSecurityEvent.deleteMany();
  await prisma.lessonProgress.deleteMany();
  await prisma.note.deleteMany();
  await prisma.videoToken.deleteMany();
  await prisma.videoUpload.deleteMany();
  await prisma.lessonResource.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany({ where: { email: studentEmail } });
  await prisma.lesson.deleteMany();

  const student = await prisma.user.create({
    data: {
      email: studentEmail,
      fullName: "Dashboard Student",
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
    data: lessonIds.map((id, index) => ({
      id,
      titleEn: `Dashboard Lesson ${index + 1}`,
      titleAr: `Dashboard Lesson ${index + 1}`,
      durationSeconds: 100,
      isPublished: true,
      sortOrder: index + 1
    }))
  });

  await prisma.lessonProgress.create({
    data: {
      userId: student.id,
      lessonId: lessonIds[0],
      watchTimeSeconds: 95,
      lastPositionSeconds: 95,
      completedAt: new Date()
    }
  });
});

describe("Student Dashboard", () => {
  it("returns enrollment state, last lesson, and course completion summary", async () => {
    const login = await request(app).post("/api/v1/auth/login").send({ email: studentEmail, password }).expect(200);
    const accessToken = login.body.accessToken as string;

    const dashboard = await request(app)
      .get("/api/v1/student/dashboard")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(dashboard.body).toMatchObject({
      lastLessonId: lessonIds[0],
      completionPercent: 50,
      enrolled: true,
      status: "ACTIVE"
    });
    expect(dashboard.body.enrolledAt).toEqual(expect.any(String));
  });
});
