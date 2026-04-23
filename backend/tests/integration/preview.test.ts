import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
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

const previewLessonId = "preview-lesson";
const lockedLessonId = "locked-preview-test-lesson";

beforeAll(async () => {
  const appModule = await import("../../src/app.js");
  const databaseModule = await import("../../src/config/database.js");
  app = appModule.createApp();
  prisma = databaseModule.prisma;
});

beforeEach(async () => {
  await prisma.videoToken.deleteMany();
  await prisma.lessonProgress.deleteMany();
  await prisma.note.deleteMany();
  await prisma.videoUpload.deleteMany();
  await prisma.lessonResource.deleteMany();
  await prisma.lesson.deleteMany();

  await prisma.lesson.createMany({
    data: [
      {
        id: previewLessonId,
        titleEn: "Preview Lesson",
        titleAr: "Preview Lesson",
        descriptionEn: "<p>Watch this lesson free.</p>",
        durationSeconds: 90,
        isPublished: true,
        isPreview: true,
        sortOrder: 1,
        videoStatus: "READY"
      },
      {
        id: lockedLessonId,
        titleEn: "Locked Lesson",
        titleAr: "Locked Lesson",
        durationSeconds: 180,
        isPublished: true,
        isPreview: false,
        sortOrder: 2,
        videoStatus: "READY"
      }
    ]
  });
});

describe("Preview lesson flow", () => {
  it("returns the published preview lesson with a playable guest video token", async () => {
    const agent = request.agent(app);
    const preview = await agent.get("/api/v1/lessons/preview").expect(200);

    expect(preview.body).toMatchObject({
      id: previewLessonId,
      title: "Preview Lesson",
      durationSeconds: 90
    });
    expect(preview.body.videoToken).toEqual(expect.any(String));
    expect(preview.body.hlsUrl).toContain(`/api/v1/video/${previewLessonId}/playlist.m3u8`);

    const playlist = await agent
      .get(`/api/v1/video/${previewLessonId}/playlist.m3u8`)
      .query({ token: preview.body.videoToken })
      .expect(200);

    expect(playlist.text).toContain("#EXTM3U");
    expect(playlist.text).toContain(`/api/v1/video/${previewLessonId}/key?token=`);
  });

  it("rejects a preview token when it is reused against a different lesson", async () => {
    const agent = request.agent(app);
    const preview = await agent.get("/api/v1/lessons/preview").expect(200);

    await agent
      .get(`/api/v1/video/${lockedLessonId}/playlist.m3u8`)
      .query({ token: preview.body.videoToken })
      .expect(401);
  });
});
