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
const studentEmail = "notes-student@example.com";
const otherEmail = "notes-other@example.com";
const lessonId = "notes-lesson";

beforeAll(async () => {
  const appModule = await import("../../src/app.js");
  const databaseModule = await import("../../src/config/database.js");
  app = appModule.createApp();
  prisma = databaseModule.prisma;
});

beforeEach(async () => {
  await prisma.note.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany({ where: { email: { in: [studentEmail, otherEmail] } } });
  await prisma.lesson.deleteMany({ where: { id: lessonId } });

  await prisma.lesson.create({
    data: {
      id: lessonId,
      titleEn: "Notes Lesson",
      titleAr: "Notes Lesson",
      isPublished: true,
      sortOrder: 1
    }
  });

  for (const email of [studentEmail, otherEmail]) {
    await prisma.user.create({
      data: {
        email,
        fullName: email === studentEmail ? "Notes Student" : "Other Student",
        emailVerified: true,
        passwordHash: await bcrypt.hash(password, 12)
      }
    });
  }
});

describe("Notes CRUD", () => {
  it("creates, updates, lists, exports, and deletes only the current student's notes", async () => {
    const login = await request(app).post("/api/v1/auth/login").send({ email: studentEmail, password }).expect(200);
    const accessToken = login.body.accessToken as string;

    const other = await prisma.user.findUniqueOrThrow({ where: { email: otherEmail } });
    const otherNote = await prisma.note.create({
      data: {
        userId: other.id,
        lessonId,
        content: "Private note owned by someone else"
      }
    });

    const created = await request(app)
      .post("/api/v1/student/notes")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ lessonId, content: "First note" })
      .expect(201);

    expect(created.body).toMatchObject({
      lessonId,
      content: "First note"
    });

    await request(app)
      .patch(`/api/v1/student/notes/${created.body.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ content: "Updated note" })
      .expect(200)
      .expect((response) => {
        expect(response.body.content).toBe("Updated note");
      });

    await request(app)
      .patch(`/api/v1/student/notes/${otherNote.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ content: "Should not change" })
      .expect(404);

    const list = await request(app).get("/api/v1/student/notes").set("Authorization", `Bearer ${accessToken}`).expect(200);
    expect(list.body.notes).toHaveLength(1);
    expect(list.body.notes[0]).toMatchObject({
      id: created.body.id,
      content: "Updated note"
    });

    const exported = await request(app)
      .get("/api/v1/student/notes/export")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    expect(exported.text).toContain("Updated note");
    expect(exported.text).not.toContain("Private note");

    await request(app).delete(`/api/v1/student/notes/${created.body.id}`).set("Authorization", `Bearer ${accessToken}`).expect(204);

    await request(app).get("/api/v1/student/notes").set("Authorization", `Bearer ${accessToken}`).expect(200).expect({
      notes: []
    });
  });
});
