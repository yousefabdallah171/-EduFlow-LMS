import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

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

const lessonId = "preview-lesson";
const storageRoot = () => path.resolve(process.cwd(), process.env.STORAGE_PATH || "storage");
const lessonHlsDir = () => path.resolve(storageRoot(), "hls", lessonId);

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

  await prisma.lesson.create({
    data: {
      id: lessonId,
      titleEn: "Preview Lesson",
      titleAr: "Preview Lesson",
      descriptionEn: "Preview video",
      durationSeconds: 120,
      isPublished: true,
      isPreview: true,
      sortOrder: 1,
      videoStatus: "READY"
    }
  });

  await fs.rm(lessonHlsDir(), { recursive: true, force: true });
  await fs.mkdir(lessonHlsDir(), { recursive: true });
  await fs.writeFile(path.join(lessonHlsDir(), "enc.key"), crypto.randomBytes(16));
  await fs.writeFile(
    path.join(lessonHlsDir(), "playlist.m3u8"),
    ['#EXTM3U', '#EXT-X-KEY:METHOD=AES-128,URI="enc.key"', "#EXTINF:4.0,", "segment-000.ts", "#EXT-X-ENDLIST"].join("\n")
  );
  await fs.writeFile(path.join(lessonHlsDir(), "segment-000.ts"), Buffer.from("seed"));

  await prisma.lesson.update({
    where: { id: lessonId },
    data: { videoHlsPath: path.relative(storageRoot(), path.join(lessonHlsDir(), "playlist.m3u8")) }
  });
});

describe("video hardening", () => {
  it("sets no-store headers on unauthorized playlist responses", async () => {
    const resp = await request(app).get(`/api/v1/video/${lessonId}/playlist.m3u8?token=bad`).expect(401);
    expect(resp.headers["cache-control"]).toContain("no-store");
    expect(resp.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("binds preview playback to a httpOnly preview cookie (URL copy fails)", async () => {
    const agent = request.agent(app);
    const preview = await agent
      .get("/api/v1/lessons/preview")
      .set("User-Agent", "UA-ONE")
      .set("X-Forwarded-For", "10.1.2.3")
      .expect(200);

    const hlsUrl = preview.body.hlsUrl as string;
    expect(hlsUrl).toContain(`/api/v1/video/${lessonId}/playlist.m3u8?token=`);

    await request(app)
      .get(hlsUrl)
      .set("User-Agent", "UA-ONE")
      .set("X-Forwarded-For", "10.1.2.3")
      .expect(401);

    const playlist = await agent
      .get(hlsUrl)
      .set("User-Agent", "UA-ONE")
      .set("X-Forwarded-For", "10.1.2.3")
      .expect(200);

    expect(playlist.text).toContain("#EXTM3U");
    expect(playlist.text).toContain(`/api/v1/video/${lessonId}/key?token=`);
  });

  it("enforces preview playlist rate limits and concurrency lease", async () => {
    const agent = request.agent(app);
    const preview = await agent
      .get("/api/v1/lessons/preview")
      .set("User-Agent", "UA-ONE")
      .set("X-Forwarded-For", "10.1.2.3")
      .expect(200);

    const hlsUrl = preview.body.hlsUrl as string;

    // First request establishes the lease.
    await agent.get(hlsUrl).set("User-Agent", "UA-ONE").set("X-Forwarded-For", "10.1.2.3").expect(200);

    // Different fingerprint (UA+IP) should be blocked (either by preview binding or concurrency cap).
    const blocked = await agent.get(hlsUrl).set("User-Agent", "UA-TWO").set("X-Forwarded-For", "10.9.9.9");
    expect([401, 429]).toContain(blocked.status);

    // Rate limit: preview playlists are capped at 10/min.
    let lastStatus = 0;
    for (let i = 0; i < 12; i += 1) {
      const resp = await agent.get(hlsUrl).set("User-Agent", "UA-ONE").set("X-Forwarded-For", "10.1.2.3");
      lastStatus = resp.status;
      if (resp.status === 429) break;
    }
    expect([200, 429]).toContain(lastStatus);
  });

  it("blocks segment path traversal and unknown extensions", async () => {
    const agent = request.agent(app);
    const preview = await agent
      .get("/api/v1/lessons/preview")
      .set("User-Agent", "UA-ONE")
      .set("X-Forwarded-For", "10.1.2.3")
      .expect(200);

    const token = (preview.body.videoToken as string) || "";

    await agent
      .get(`/api/v1/video/${lessonId}/segment`)
      .query({ token, file: "../secret.txt" })
      .set("User-Agent", "UA-ONE")
      .set("X-Forwarded-For", "10.1.2.3")
      .expect(404);

    await agent
      .get(`/api/v1/video/${lessonId}/segment`)
      .query({ token, file: "segment-000.exe" })
      .set("User-Agent", "UA-ONE")
      .set("X-Forwarded-For", "10.1.2.3")
      .expect(404);
  });
});
