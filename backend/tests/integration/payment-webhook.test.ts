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
process.env.PAYMOB_HMAC_SECRET ??= "test-hmac-secret";
process.env.PAYMOB_INTEGRATION_ID ??= "12345";
process.env.PAYMOB_IFRAME_ID ??= "67890";
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

beforeAll(async () => {
  const appModule = await import("../../src/app.js");
  const databaseModule = await import("../../src/config/database.js");
  app = appModule.createApp();
  prisma = databaseModule.prisma;
});

beforeEach(async () => {
  vi.restoreAllMocks();
  await prisma.enrollment.deleteMany({
    where: {
      user: { email: "paying-student@example.com" }
    }
  });
  await prisma.payment.deleteMany({
    where: {
      user: { email: "paying-student@example.com" }
    }
  });
  await prisma.coupon.deleteMany({
    where: { code: "SAVE20" }
  });
  await prisma.user.deleteMany({
    where: { email: "paying-student@example.com" }
  });
  await prisma.courseSettings.upsert({
    where: { id: 1 },
    update: {
      titleEn: "EduFlow Course",
      titleAr: "Ø¯ÙˆØ±Ø© EduFlow",
      pricePiasters: 49900,
      currency: "EGP",
      isEnrollmentOpen: true
    },
    create: {
      id: 1,
      titleEn: "EduFlow Course",
      titleAr: "Ø¯ÙˆØ±Ø© EduFlow",
      pricePiasters: 49900,
      currency: "EGP",
      isEnrollmentOpen: true
    }
  });
});

describe("US2 checkout and webhook enrollment", () => {
  it("initiates checkout and activates enrollment after a valid webhook", async () => {
    const password = "Securepass123";
    const student = await prisma.user.create({
      data: {
        email: "paying-student@example.com",
        fullName: "Paying Student",
        emailVerified: true,
        passwordHash: await bcrypt.hash(password, 12)
      }
    });

    await prisma.coupon.create({
      data: {
        code: "SAVE20",
        discountType: "PERCENTAGE",
        discountValue: 20,
        maxUses: 5
      }
    });

    const authModule = await import("../../src/services/auth.service.js");
    const session = await authModule.authService.issueSessionForUser(student);

    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("/auth/tokens")) {
        return new Response(JSON.stringify({ token: "paymob-token" }), { status: 200 });
      }

      if (url.includes("/ecommerce/orders")) {
        return new Response(JSON.stringify({ id: 112233 }), { status: 201 });
      }

      if (url.includes("/acceptance/payment_keys")) {
        return new Response(JSON.stringify({ token: "payment-key" }), { status: 201 });
      }

      return new Response("not found", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock as typeof fetch);

    const checkout = await request(app)
      .post("/api/v1/checkout")
      .set("Authorization", `Bearer ${session.accessToken}`)
      .send({ couponCode: "SAVE20" })
      .expect(200);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(checkout.body).toMatchObject({
      paymentKey: "payment-key",
      amount: 39920,
      discountApplied: 9980,
      iframeId: "67890",
      currency: "EGP"
    });

    const payment = await prisma.payment.findUnique({
      where: { id: checkout.body.orderId }
    });
    expect(payment?.status).toBe("PENDING");

    const hmacModule = await import("../../src/utils/hmac.js");
    const webhookPayload = {
      obj: {
        amount_cents: "39920",
        created_at: "2026-04-12T18:00:00Z",
        currency: "EGP",
        error_occured: false,
        has_parent_transaction: false,
        id: 555777,
        integration_id: 12345,
        is_3d_secure: true,
        is_auth: false,
        is_capture: false,
        is_refunded: false,
        is_standalone_payment: true,
        is_voided: false,
        order: { id: 112233, merchant_order_id: checkout.body.orderId },
        owner: 321,
        pending: false,
        source_data: {
          pan: "4242",
          sub_type: "MasterCard",
          type: "card"
        },
        success: true
      }
    };

    const hmac = hmacModule.computePaymobHmac(webhookPayload, process.env.PAYMOB_HMAC_SECRET!);

    await request(app)
      .post("/api/v1/webhooks/paymob")
      .query({ hmac })
      .send(webhookPayload)
      .expect(200, { received: true });

    const completedPayment = await prisma.payment.findUnique({
      where: { id: checkout.body.orderId }
    });
    expect(completedPayment?.status).toBe("COMPLETED");
    expect(completedPayment?.paymobTransactionId).toBe("555777");

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId: student.id }
    });
    expect(enrollment?.status).toBe("ACTIVE");
    expect(enrollment?.enrollmentType).toBe("PAID");

    const coupon = await prisma.coupon.findUnique({
      where: { code: "SAVE20" }
    });
    expect(coupon?.usesCount).toBe(1);

    await request(app)
      .post("/api/v1/webhooks/paymob")
      .query({ hmac: "tampered" })
      .send({
        ...webhookPayload,
        obj: {
          ...webhookPayload.obj,
          id: 999888
        }
      })
      .expect(400);

    const allEnrollments = await prisma.enrollment.findMany({
      where: { userId: student.id }
    });
    expect(allEnrollments).toHaveLength(1);
  });
});

