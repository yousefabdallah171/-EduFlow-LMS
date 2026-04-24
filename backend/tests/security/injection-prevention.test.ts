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
let testToken: string;

beforeAll(async () => {
  const appModule = await import("../../src/app.js");
  const databaseModule = await import("../../src/config/database.js");
  app = appModule.createApp();
  prisma = databaseModule.prisma;
});

beforeEach(async () => {
  await prisma.user.deleteMany({
    where: { email: { contains: "security-test" } }
  });
});

describe("Security: SQL Injection Prevention", () => {
  it("should reject SQL injection attempts in search queries", async () => {
    const injectionPayloads = [
      "'; DROP TABLE users; --",
      "1' OR '1'='1",
      "admin'--",
      "1'; UPDATE users SET role='ADMIN'--"
    ];

    for (const payload of injectionPayloads) {
      const response = await request(app)
        .get(`/api/v1/lessons?search=${encodeURIComponent(payload)}`)
        .expect([200, 400, 404]);

      // Should not execute SQL, just return no results or error
      expect(response.status).not.toBe(500);
    }
  });

  it("should safely handle special characters in email", async () => {
    const emails = [
      "test+alias@example.com",
      "test.name@example.com",
      "test_name@example.com"
    ];

    for (const email of emails) {
      const response = await request(app)
        .post("/api/v1/auth/register")
        .send({
          email,
          password: "SecurePass123",
          fullName: "Security Test"
        });

      // Should either accept or reject with validation error, not SQL error
      expect(response.status).not.toBe(500);
    }
  });
});

describe("Security: Email Injection Prevention", () => {
  it("should reject newlines in email addresses", async () => {
    const injectionPayloads = [
      "test@example.com\nBcc: attacker@evil.com",
      "test@example.com\r\nBcc: attacker@evil.com",
      "test@example.com\nTo: attacker@evil.com"
    ];

    for (const email of injectionPayloads) {
      const response = await request(app)
        .post("/api/v1/auth/register")
        .send({
          email,
          password: "SecurePass123",
          fullName: "Security Test"
        });

      // Should reject invalid email format
      expect(response.status).toBe(422);
    }
  });

  it("should reject control characters in contact form email", async () => {
    const response = await request(app)
      .post("/api/v1/contact")
      .send({
        name: "Test User",
        email: "test@example.com\r\nBcc: attacker@evil.com",
        message: "Test message"
      });

    expect(response.status).toBe(422);
  });
});

describe("Security: XSS Prevention", () => {
  it("should escape HTML in lesson titles and descriptions", async () => {
    const xssPayloads = [
      "<script>alert('xss')</script>",
      "<img src=x onerror=alert('xss')>",
      "<svg onload=alert('xss')>",
      "javascript:alert('xss')"
    ];

    // Create user and get token
    const user = await prisma.user.create({
      data: {
        email: "security-test@example.com",
        fullName: "Security Test",
        emailVerified: true,
        passwordHash: await bcrypt.hash("SecurePass123", 12),
        role: "ADMIN"
      }
    });

    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "security-test@example.com",
        password: "SecurePass123"
      });

    const token = loginRes.body.accessToken;

    // Try creating lesson with XSS payload
    for (const payload of xssPayloads) {
      const response = await request(app)
        .post("/api/v1/admin/lessons")
        .set("Authorization", `Bearer ${token}`)
        .send({
          titleEn: payload,
          titleAr: "درس",
          descriptionEn: payload,
          descriptionAr: "وصف"
        });

      // Should either reject or sanitize the payload
      if (response.status === 201) {
        const lesson = response.body.lesson;
        expect(lesson.titleEn).not.toContain("<script>");
        expect(lesson.titleEn).not.toContain("onerror=");
        expect(lesson.titleEn).not.toContain("onload=");
      }
    }
  });
});

describe("Security: Input Validation", () => {
  it("should reject invalid email formats", async () => {
    const invalidEmails = [
      "notanemail",
      "@example.com",
      "test@",
      "test @example.com",
      "test@example",
      ""
    ];

    for (const email of invalidEmails) {
      const response = await request(app)
        .post("/api/v1/auth/register")
        .send({
          email,
          password: "SecurePass123",
          fullName: "Test User"
        });

      expect(response.status).toBe(422);
      expect(response.body.error).toBe("VALIDATION_ERROR");
    }
  });

  it("should enforce password strength requirements", async () => {
    const weakPasswords = [
      "short",
      "nouppercase123",
      "NOLOWERCASE123",
      "NoNumbers",
      "12345678"
    ];

    for (const password of weakPasswords) {
      const response = await request(app)
        .post("/api/v1/auth/register")
        .send({
          email: "test@example.com",
          password,
          fullName: "Test User"
        });

      expect(response.status).toBe(422);
    }
  });

  it("should reject excessively long inputs", async () => {
    const longString = "a".repeat(10000);

    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({
        email: longString + "@example.com",
        password: "SecurePass123",
        fullName: "Test User"
      });

    expect(response.status).toBe(422);
  });
});

describe("Security: Authentication", () => {
  it("should reject expired access tokens", async () => {
    const expiredToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MDAwMDAwMDB9.test";

    const response = await request(app)
      .get("/api/v1/user/profile")
      .set("Authorization", `Bearer ${expiredToken}`);

    expect(response.status).toBe(401);
  });

  it("should reject malformed tokens", async () => {
    const malformedTokens = [
      "not-a-token",
      "Bearer invalid",
      "eyJhbGciOiJIUzI1NiJ9.invalid.signature",
      ""
    ];

    for (const token of malformedTokens) {
      const response = await request(app)
        .get("/api/v1/user/profile")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(401);
    }
  });
});

describe("Security: Path Traversal Prevention", () => {
  it("should reject path traversal attempts in segment requests", async () => {
    const traversalPayloads = [
      "../../../etc/passwd",
      "..\\..\\..\\windows\\system32",
      "....//....//....//etc/passwd",
      "%2e%2e%2f%2e%2e%2fetc%2fpasswd"
    ];

    for (const payload of traversalPayloads) {
      const response = await request(app)
        .get(`/api/v1/video/test-lesson/segment?file=${encodeURIComponent(payload)}`)
        .expect([400, 404]);

      // Should reject with 404 or 400, not serve the file
      expect([400, 404]).toContain(response.status);
    }
  });
});
