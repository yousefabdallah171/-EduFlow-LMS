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

const adminEmail = "lesson-attachment-contract-admin@example.com";
const adminPassword = "Admin1234!";

let app: Express;
let prisma: PrismaClient;
let lessonId = "";
let mediaAssetId = "";

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

  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      fullName: "Attachment Contract Admin",
      role: "ADMIN",
      emailVerified: true,
      passwordHash: await bcrypt.hash(adminPassword, 12)
    }
  });

  const lesson = await prisma.lesson.create({
    data: {
      titleEn: "Lesson 01",
      titleAr: "Lesson 01",
      sortOrder: 1
    }
  });
  lessonId = lesson.id;

  const mediaAsset = await prisma.mediaFile.create({
    data: {
      title: "Lesson 01 Video",
      type: "VIDEO",
      status: "READY",
      originalFilename: "lesson-01.mp4",
      mimeType: "video/mp4",
      sizeBytes: BigInt(2048),
      uploadedById: admin.id
    }
  });
  mediaAssetId = mediaAsset.id;
});

describe("Lesson attachment contract", () => {
  it("supports auto-map and bulk-attach contracts", async () => {
    const token = await loginAsAdmin();

    const autoMap = await request(app)
      .post("/api/v1/admin/lessons/media/auto-map")
      .set("Authorization", `Bearer ${token}`)
      .send({
        lessonIds: [lessonId],
        mediaAssetIds: [mediaAssetId],
        strategy: "FILENAME_NORMALIZED"
      })
      .expect(200);

    expect(autoMap.body.matches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          lessonId,
          mediaAssetId
        })
      ])
    );

    const bulkAttach = await request(app)
      .post("/api/v1/admin/lessons/media/bulk-attach")
      .set("Authorization", `Bearer ${token}`)
      .send({
        attachments: [
          {
            lessonId,
            mediaAssetId,
            mappingSource: "BULK_REVIEWED"
          }
        ],
        replaceExistingPrimaryVideo: true
      })
      .expect(200);

    expect(bulkAttach.body).toMatchObject({
      batchReportId: expect.any(String),
      applied: 1,
      skipped: 0,
      failed: 0
    });
  });
});
