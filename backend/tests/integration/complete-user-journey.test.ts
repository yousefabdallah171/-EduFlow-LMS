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

vi.mock("../../src/utils/email.js", () => ({
  sendPasswordResetEmail: vi.fn(),
  sendVerificationEmail: vi.fn(),
  sendEnrollmentActivatedEmail: vi.fn(),
  sendEnrollmentRevokedEmail: vi.fn()
}));

let app: Express;
let prisma: PrismaClient;

beforeAll(async () => {
  const appModule = await import("../../src/app.js");
  const databaseModule = await import("../../src/config/database.js");
  app = appModule.createApp();
  prisma = databaseModule.prisma;
});

beforeEach(async () => {
  await prisma.lessonProgress.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.user.deleteMany({
    where: { email: { contains: "journey-test" } }
  });
});

describe("Complete User Journey E2E", () => {
  it("should complete full user flow: register -> verify -> login -> enroll -> access lesson -> progress", async () => {
    const userEmail = "journey-test@example.com";
    const password = "SecurePass123";
    const fullName = "Journey Test User";

    // Step 1: Register user
    const registerRes = await request(app)
      .post("/api/v1/auth/register")
      .send({
        email: userEmail,
        password,
        fullName
      })
      .expect(201);

    expect(registerRes.body.user).toMatchObject({
      email: userEmail,
      fullName
    });

    const userId = registerRes.body.user.id;

    // Step 2: Verify email by setting emailVerified = true
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true }
    });

    // Step 3: Login
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: userEmail,
        password
      })
      .expect(200);

    const accessToken = loginRes.body.accessToken;
    expect(accessToken).toBeTruthy();

    // Step 4: Get user profile to verify logged-in state
    const profileRes = await request(app)
      .get("/api/v1/user/profile")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(profileRes.body.user.email).toBe(userEmail);

    // Step 5: Check enrollment status (should be NONE)
    const enrollmentRes = await request(app)
      .get("/api/v1/dashboard")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(enrollmentRes.body.enrolled).toBe(false);

    // Step 6: Create a lesson for testing
    const lesson = await prisma.lesson.create({
      data: {
        titleEn: "Test Lesson",
        titleAr: "درس اختبار",
        isPublished: true,
        videoStatus: "READY",
        videoHlsPath: "/videos/test-lesson/playlist.m3u8",
        sortOrder: 1
      }
    });

    // Step 7: Enroll in course (as admin would do)
    const enrollment = await prisma.enrollment.create({
      data: {
        userId,
        status: "ACTIVE",
        enrollmentType: "PAID"
      }
    });

    expect(enrollment.status).toBe("ACTIVE");

    // Step 8: Check dashboard shows enrollment
    const dashboardRes = await request(app)
      .get("/api/v1/dashboard")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(dashboardRes.body.enrolled).toBe(true);
    expect(dashboardRes.body.completionPercent).toBe(0);

    // Step 9: Record lesson progress
    const progress = await prisma.lessonProgress.create({
      data: {
        userId,
        lessonId: lesson.id,
        watchTimeSeconds: 300
      }
    });

    expect(progress.watchTimeSeconds).toBe(300);

    // Step 10: Check progress is recorded in dashboard
    const progressRes = await request(app)
      .get("/api/v1/dashboard")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(progressRes.body.totalWatchTimeSeconds).toBeGreaterThan(0);
    expect(progressRes.body.lessonsWatched).toBe(1);

    // Step 11: Mark lesson as completed
    await prisma.lessonProgress.update({
      where: { id: progress.id },
      data: { completedAt: new Date() }
    });

    // Step 12: Verify completion percentage updated
    const finalDashboardRes = await request(app)
      .get("/api/v1/dashboard")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(finalDashboardRes.body.completionPercent).toBeGreaterThan(0);
  });

  it("should handle RBAC: student cannot access admin endpoints", async () => {
    const userEmail = "student-rbac@example.com";
    const password = "SecurePass123";

    // Register and login as student
    const registerRes = await request(app)
      .post("/api/v1/auth/register")
      .send({
        email: userEmail,
        password,
        fullName: "RBAC Test Student"
      })
      .expect(201);

    await prisma.user.update({
      where: { id: registerRes.body.user.id },
      data: { emailVerified: true }
    });

    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: userEmail, password })
      .expect(200);

    const studentToken = loginRes.body.accessToken;

    // Try to access admin endpoint (should fail)
    await request(app)
      .get("/api/v1/admin/students")
      .set("Authorization", `Bearer ${studentToken}`)
      .expect(403);
  });

  it("should prevent unauthenticated access to protected endpoints", async () => {
    await request(app)
      .get("/api/v1/dashboard")
      .expect(401);

    await request(app)
      .get("/api/v1/user/profile")
      .expect(401);
  });
});
