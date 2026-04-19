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

let app: Express;
let prisma: PrismaClient;

const password = "Admin1234!";
const adminEmail = "audit-admin@example.com";

beforeAll(async () => {
  const appModule = await import("../../src/app.js");
  const databaseModule = await import("../../src/config/database.js");
  app = appModule.createApp();
  prisma = databaseModule.prisma;
});

beforeEach(async () => {
  await prisma.auditLog.deleteMany();
  await prisma.courseSettings.updateMany({
    where: { updatedBy: { email: adminEmail } },
    data: { updatedById: null }
  });
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany({ where: { email: adminEmail } });

  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      fullName: "Audit Admin",
      role: "ADMIN",
      emailVerified: true,
      passwordHash: await bcrypt.hash(password, 12)
    }
  });

  await prisma.courseSettings.upsert({
    where: { id: 1 },
    update: {
      titleEn: "EduFlow Course",
      titleAr: "EduFlow Course",
      pricePiasters: 49900,
      updatedById: admin.id
    },
    create: {
      id: 1,
      titleEn: "EduFlow Course",
      titleAr: "EduFlow Course",
      pricePiasters: 49900,
      updatedById: admin.id
    }
  });
});

describe("Audit Log", () => {
  it("records successful admin mutations and exposes them through the audit endpoint", async () => {
    const login = await request(app).post("/api/v1/auth/login").send({ email: adminEmail, password }).expect(200);
    const adminToken = login.body.accessToken as string;

    await request(app)
      .patch("/api/v1/admin/pricing")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ priceEgp: 799 })
      .expect(200);

    await vi.waitFor(async () => {
      const auditCount = await prisma.auditLog.count({
        where: { action: "PATCH /pricing" }
      });
      expect(auditCount).toBeGreaterThan(0);
    });

    const response = await request(app)
      .get("/api/v1/admin/audit")
      .set("Authorization", `Bearer ${adminToken}`)
      .query({ action: "PATCH /pricing" })
      .expect(200);

    expect(response.body.total).toBeGreaterThan(0);
    expect(response.body.logs[0]).toMatchObject({
      action: "PATCH /pricing",
      admin: {
        email: adminEmail
      }
    });
  });
});
