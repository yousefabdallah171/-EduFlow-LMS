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
const adminEmail = "orders-admin@example.com";
const studentEmail = "orders-student@example.com";

beforeAll(async () => {
  const appModule = await import("../../src/app.js");
  const databaseModule = await import("../../src/config/database.js");
  app = appModule.createApp();
  prisma = databaseModule.prisma;
});

beforeEach(async () => {
  await prisma.auditLog.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.payment.deleteMany({ where: { user: { email: studentEmail } } });
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany({ where: { email: { in: [adminEmail, studentEmail] } } });
});

describe("Admin Orders", () => {
  it("marks a pending payment as paid, enrolls the student, and records an audit log", async () => {
    await prisma.user.create({
      data: {
        email: adminEmail,
        fullName: "Orders Admin",
        role: "ADMIN",
        emailVerified: true,
        passwordHash: await bcrypt.hash(password, 12)
      }
    });

    const student = await prisma.user.create({
      data: {
        email: studentEmail,
        fullName: "Orders Student",
        emailVerified: true,
        passwordHash: await bcrypt.hash("Securepass123", 12)
      }
    });

    const payment = await prisma.payment.create({
      data: {
        userId: student.id,
        amountPiasters: 49900,
        status: "PENDING"
      }
    });

    const login = await request(app).post("/api/v1/auth/login").send({ email: adminEmail, password }).expect(200);
    const adminToken = login.body.accessToken as string;

    const response = await request(app)
      .patch(`/api/v1/admin/orders/${payment.id}/mark-paid`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.payment).toMatchObject({
      id: payment.id,
      status: "COMPLETED"
    });

    await expect(prisma.enrollment.findUnique({ where: { userId: student.id } })).resolves.toMatchObject({
      status: "ACTIVE",
      enrollmentType: "PAID",
      paymentId: payment.id
    });

    await vi.waitFor(async () => {
      const auditCount = await prisma.auditLog.count({
        where: {
          action: `PATCH /orders/${payment.id}/mark-paid`
        }
      });
      expect(auditCount).toBeGreaterThan(0);
    });
  });
});
