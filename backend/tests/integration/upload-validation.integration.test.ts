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

const adminEmail = "upload-validation-admin@example.com";
const adminPassword = "Admin1234!";

let app: Express;
let prisma: PrismaClient;

const loginAsAdmin = async () => {
  const response = await request(app)
    .post("/api/v1/auth/login")
    .send({ email: adminEmail, password: adminPassword })
    .expect(200);
  return response.body.accessToken as string;
};

beforeAll(async () => {
  const appModule = await import("../../src/app.js");
  const databaseModule = await import("../../src/config/database.js");
  app = appModule.createApp();
  prisma = databaseModule.prisma;
});

beforeEach(async () => {
  await prisma.lessonMediaAttachment.deleteMany();
  await prisma.mediaValidationResult.deleteMany();
  await prisma.uploadChunkCheckpoint.deleteMany();
  await prisma.batchOperationReport.deleteMany();
  await prisma.mediaFile.deleteMany();
  await prisma.videoUpload.deleteMany();
  await prisma.uploadSession.deleteMany();
  await prisma.videoSecurityEvent.deleteMany();
  await prisma.videoToken.deleteMany();
  await prisma.lessonProgress.deleteMany();
  await prisma.note.deleteMany();
  await prisma.lessonResource.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.adminAuditLog.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany({ where: { email: adminEmail } });

  await prisma.user.create({
    data: {
      email: adminEmail,
      fullName: "Validation Admin",
      role: "ADMIN",
      emailVerified: true,
      passwordHash: await bcrypt.hash(adminPassword, 12)
    }
  });
});

describe("Upload pre-validation", () => {
  it("rejects unsupported mime types", async () => {
    const token = await loginAsAdmin();

    const response = await request(app)
      .post("/api/v1/admin/uploads/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        fileName: "not-video.exe",
        fileSizeBytes: 1000,
        mimeType: "application/x-msdownload"
      })
      .expect(415);

    expect(response.body.error).toBe("UPLOAD_UNSUPPORTED_FILE_TYPE");
  });

  it("rejects oversized files", async () => {
    const token = await loginAsAdmin();

    const response = await request(app)
      .post("/api/v1/admin/uploads/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        fileName: "big.mp4",
        fileSizeBytes: 10 * 1024 * 1024 * 1024,
        mimeType: "video/mp4"
      })
      .expect(413);

    expect(response.body.error).toBe("UPLOAD_FILE_TOO_LARGE");
  });
});
