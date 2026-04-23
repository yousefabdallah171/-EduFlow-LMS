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

vi.mock("../../src/utils/email.js", () => ({
  sendPasswordResetEmail: vi.fn(),
  sendVerificationEmail: vi.fn()
}));

let app: Express;
let prisma: PrismaClient;

const testEmails = ["auth-student@example.com", "rotation-student@example.com"];

const cookieHeader = (cookie: string[] | string | undefined) => (Array.isArray(cookie) ? cookie : cookie ? [cookie] : []);

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
  await prisma.user.deleteMany({
    where: {
      email: {
        in: testEmails
      }
    }
  });
});

describe("US1 auth registration", () => {
  it("registers a student and rejects a duplicate email", async () => {
    const payload = {
      email: "AUTH-STUDENT@example.com",
      password: "Securepass123",
      fullName: "Auth Student"
    };

    const created = await request(app).post("/api/v1/auth/register").send(payload).expect(201);

    expect(created.body.user).toMatchObject({
      email: "auth-student@example.com",
      fullName: "Auth Student"
    });
    expect(created.body.user.passwordHash).toBeUndefined();

    const persisted = await prisma.user.findUnique({
      where: { email: "auth-student@example.com" }
    });

    expect(persisted?.role).toBe("STUDENT");
    expect(persisted?.emailVerified).toBe(false);
    expect(persisted?.emailVerifyToken).toBeTruthy();
    expect(persisted?.passwordHash).not.toBe(payload.password);

    const duplicate = await request(app).post("/api/v1/auth/register").send(payload).expect(409);

    expect(duplicate.body).toMatchObject({
      error: "EMAIL_EXISTS"
    });
  });
});

describe("US1 refresh token rotation", () => {
  it("rotates refresh tokens and revokes a reused token family", async () => {
    const password = "Securepass123";
    await prisma.user.create({
      data: {
        email: "rotation-student@example.com",
        fullName: "Rotation Student",
        emailVerified: true,
        passwordHash: await bcrypt.hash(password, 12)
      }
    });

    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "rotation-student@example.com", password })
      .expect(200);

    const firstCookie = login.headers["set-cookie"];
    expect(cookieHeader(firstCookie).join(";")).toContain("refresh_token=");

    const refresh = await request(app).post("/api/v1/auth/refresh").set("Cookie", cookieHeader(firstCookie)).expect(200);

    expect(refresh.body.accessToken).toEqual(expect.any(String));
    const rotatedCookie = refresh.headers["set-cookie"];
    expect(cookieHeader(rotatedCookie).join(";")).toContain("refresh_token=");

    const reuse = await request(app).post("/api/v1/auth/refresh").set("Cookie", cookieHeader(firstCookie)).expect(403);
    expect(reuse.body).toMatchObject({ error: "TOKEN_REUSE_DETECTED" });

    await request(app).post("/api/v1/auth/refresh").set("Cookie", cookieHeader(rotatedCookie)).expect(403);
  });
});

