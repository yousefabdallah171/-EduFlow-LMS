import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import type { Express } from "express";
import type { PrismaClient } from "@prisma/client";

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
process.env.ENFORCE_SINGLE_SESSION ??= "true";

let app: Express;
let prisma: PrismaClient;

const email = "single-session-student@example.com";

beforeAll(async () => {
  const appModule = await import("../../src/app.js");
  const databaseModule = await import("../../src/config/database.js");
  app = appModule.createApp();
  prisma = databaseModule.prisma;
});

beforeEach(async () => {
  await prisma.videoSecurityEvent.deleteMany();
  await prisma.lessonProgress.deleteMany();
  await prisma.refreshToken.deleteMany({ where: { user: { email } } });
  await prisma.user.deleteMany({ where: { email } });
});

describe("US8 single active session", () => {
  it("invalidates the previous access token after a new login", async () => {
    const password = "Securepass123";
    await prisma.user.create({
      data: {
        email,
        fullName: "Single Session Student",
        role: "STUDENT",
        locale: "en",
        theme: "light",
        emailVerified: true,
        passwordHash: await bcrypt.hash(password, 12)
      }
    });

    const loginA = await request(app).post("/api/v1/auth/login").send({ email, password }).expect(200);
    const tokenA = loginA.body.accessToken as string;
    expect(tokenA).toEqual(expect.any(String));

    await request(app)
      .get("/api/v1/student/dashboard")
      .set("Authorization", `Bearer ${tokenA}`)
      .expect(200);

    const loginB = await request(app).post("/api/v1/auth/login").send({ email, password }).expect(200);
    const tokenB = loginB.body.accessToken as string;
    expect(tokenB).toEqual(expect.any(String));
    expect(tokenB).not.toEqual(tokenA);

    await request(app)
      .get("/api/v1/student/dashboard")
      .set("Authorization", `Bearer ${tokenA}`)
      .expect(401)
      .then((res) => expect(res.body).toMatchObject({ error: "SESSION_INVALIDATED" }));

    await request(app)
      .get("/api/v1/student/dashboard")
      .set("Authorization", `Bearer ${tokenB}`)
      .expect(200);
  });
});

