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

const password = "Securepass123";
const studentEmail = "video-student@example.com";
const lessonId = "video-lesson";
const storagePath = process.env.STORAGE_PATH || "storage";
const playlistPath = path.resolve(process.cwd(), storagePath, "hls", lessonId, "playlist.m3u8");

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
  await prisma.videoToken.deleteMany();
  await prisma.lessonProgress.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany({ where: { role: "STUDENT" } });
  await prisma.lesson.deleteMany();

  const student = await prisma.user.create({
    data: {
      email: studentEmail,
      fullName: "Video Student",
      emailVerified: true,
      passwordHash: await bcrypt.hash(password, 12)
    }
  });

  await prisma.enrollment.create({
    data: {
      userId: student.id,
      enrollmentType: "PAID"
    }
  });

  await prisma.lesson.create({
    data: {
      id: lessonId,
      titleEn: "Protected Lesson",
      titleAr: "Protected Lesson",
      descriptionEn: "Protected video",
      durationSeconds: 120,
      isPublished: true,
      sortOrder: 1,
      videoStatus: "READY"
    }
  });

  await fs.mkdir(path.dirname(playlistPath), { recursive: true });
  await fs.writeFile(
    playlistPath,
    ['#EXTM3U', '#EXT-X-KEY:METHOD=AES-128,URI="secret.key"', "#EXTINF:10.0,", "segment-a.ts", "#EXT-X-ENDLIST"].join(
      "\n"
    )
  );
  await prisma.lesson.update({
    where: { id: lessonId },
    data: {
      videoHlsPath: path.relative(path.resolve(process.cwd(), storagePath), playlistPath)
    }
  });
});

describe("US3 video token flow", () => {
  it("issues a token and rejects it after logout revokes the session", async () => {
    const login = await request(app).post("/api/v1/auth/login").send({ email: studentEmail, password }).expect(200);
    const accessToken = login.body.accessToken as string;
    const refreshCookie = cookieHeader(login.headers["set-cookie"]);

    const lesson = await request(app)
      .get(`/api/v1/lessons/${lessonId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(lesson.body.watermark).toMatchObject({
      name: "Video Student",
      maskedEmail: "v***@example.com"
    });
    expect(lesson.body.videoToken).toEqual(expect.any(String));

    const playlist = await request(app)
      .get(`/api/v1/video/${lessonId}/playlist.m3u8`)
      .set("Cookie", refreshCookie)
      .query({ token: lesson.body.videoToken })
      .expect(200);

    expect(playlist.text).toContain(`#EXT-X-KEY:METHOD=AES-128,URI="/api/v1/video/${lessonId}/key?token=`);
    expect(playlist.text).toContain(`/api/v1/video/${lessonId}/segment?file=segment-a.ts&token=`);

    await request(app)
      .get(`/api/v1/video/${lessonId}/playlist.m3u8`)
      .query({ token: lesson.body.videoToken })
      .expect(401);

    await request(app).post("/api/v1/auth/logout").set("Cookie", refreshCookie).expect(200);

    await request(app)
      .get(`/api/v1/video/${lessonId}/playlist.m3u8`)
      .set("Cookie", refreshCookie)
      .query({ token: lesson.body.videoToken })
      .expect(401);
  });
});

