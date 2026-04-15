import fs from "node:fs/promises";
import path from "node:path";

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

const password = "Admin1234!";
const lessonId = "upload-lesson";
const uploadBuffer = Buffer.from("fake-video-content-for-upload-test");

const encodeMetadata = (value: string) => Buffer.from(value, "utf8").toString("base64");

beforeAll(async () => {
  const appModule = await import("../../src/app.js");
  const databaseModule = await import("../../src/config/database.js");
  app = appModule.createApp();
  prisma = databaseModule.prisma;
});

beforeEach(async () => {
  await prisma.videoUpload.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany({ where: { role: "ADMIN" } });
  await fs.rm(path.resolve(process.cwd(), "storage", "uploads"), { recursive: true, force: true }).catch(() => undefined);
  await fs.rm(path.resolve(process.cwd(), "storage", "hls"), { recursive: true, force: true }).catch(() => undefined);

  const admin = await prisma.user.create({
    data: {
      email: "admin-upload@example.com",
      fullName: "Admin Upload",
      role: "ADMIN",
      emailVerified: true,
      passwordHash: await bcrypt.hash(password, 12)
    }
  });

  await prisma.lesson.create({
    data: {
      id: lessonId,
      titleEn: "Upload target",
      titleAr: "Upload target",
      sortOrder: 1
    }
  });

  await prisma.courseSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      titleEn: "Course",
      titleAr: "Course",
      pricePiasters: 1000,
      updatedById: admin.id
    }
  });
});

describe("US4 tus upload", () => {
  it("creates an upload, resumes via HEAD offset, and generates HLS output", async () => {
    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "admin-upload@example.com", password })
      .expect(200);

    const accessToken = login.body.accessToken as string;

    const create = await request(app)
      .post("/api/v1/admin/uploads")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("Tus-Resumable", "1.0.0")
      .set("Upload-Length", String(uploadBuffer.length))
      .set(
        "Upload-Metadata",
        `filename ${encodeMetadata("lesson.mp4")},lessonId ${encodeMetadata(lessonId)},contentType ${encodeMetadata("video/mp4")}`
      )
      .expect(201);

    const uploadLocation = create.headers.location as string;

    await request(app)
      .head(uploadLocation)
      .set("Authorization", `Bearer ${accessToken}`)
      .set("Tus-Resumable", "1.0.0")
      .expect(200)
      .expect("Upload-Offset", "0");

    const firstChunk = uploadBuffer.subarray(0, 10);
    await request(app)
      .patch(uploadLocation)
      .set("Authorization", `Bearer ${accessToken}`)
      .set("Tus-Resumable", "1.0.0")
      .set("Upload-Offset", "0")
      .set("Content-Type", "application/offset+octet-stream")
      .send(firstChunk)
      .expect(204)
      .expect("Upload-Offset", String(firstChunk.length));

    await request(app)
      .head(uploadLocation)
      .set("Authorization", `Bearer ${accessToken}`)
      .set("Tus-Resumable", "1.0.0")
      .expect(200)
      .expect("Upload-Offset", String(firstChunk.length));

    await request(app)
      .patch(uploadLocation)
      .set("Authorization", `Bearer ${accessToken}`)
      .set("Tus-Resumable", "1.0.0")
      .set("Upload-Offset", String(firstChunk.length))
      .set("Content-Type", "application/offset+octet-stream")
      .send(uploadBuffer.subarray(firstChunk.length))
      .expect(204);

    const playlistPath = path.resolve(process.cwd(), "storage", "hls", lessonId, "playlist.m3u8");
    await expect(fs.access(playlistPath)).resolves.toBeUndefined();

    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
    const upload = await prisma.videoUpload.findFirst({ where: { lessonId } });

    expect(lesson?.videoStatus).toBe("READY");
    expect(upload?.status).toBe("READY");
  });
});

