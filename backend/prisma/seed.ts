import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type GeneratedLesson = {
  id: string;
  sortOrder: number;
  sectionKey: "introduction" | "foundations" | "advanced" | "production";
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  isPreview: boolean;
  isPublished: boolean;
  durationSeconds: number;
  fileName: string;
};

const storageRoot = () => path.resolve(process.cwd(), process.env.STORAGE_PATH || "storage");

const fileExists = async (filePath: string) => {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile() && stat.size > 1024;
  } catch {
    return false;
  }
};

const smallFileExists = async (filePath: string, minBytes: number) => {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile() && stat.size >= minBytes;
  } catch {
    return false;
  }
};

const runFfmpeg = (args: string[]) =>
  new Promise<void>((resolve, reject) => {
    const child = spawn("ffmpeg", args, { stdio: "ignore" });
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("ffmpeg timed out while generating seed media."));
    }, 180_000);

    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`ffmpeg exited with code ${code ?? "unknown"} while generating seed media.`));
    });
  });

const ensureSeedHls = async (lessonId: string, toneHz: number) => {
  const outputDir = path.join(storageRoot(), "hls", lessonId);
  const playlistPath = path.join(outputDir, "playlist.m3u8");
  const segmentPath = path.join(outputDir, "segment-000.ts");
  const keyPath = path.join(outputDir, "enc.key");

  if ((await fileExists(playlistPath)) && (await fileExists(segmentPath)) && (await smallFileExists(keyPath, 16))) {
    return path.relative(storageRoot(), playlistPath).replace(/\\/g, "/");
  }

  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });

  await fs.writeFile(keyPath, crypto.randomBytes(16));
  const keyInfoPath = path.join(outputDir, "hls-key-info.txt");
  await fs.writeFile(keyInfoPath, ["enc.key", keyPath, ""].join("\n"));

  await runFfmpeg([
    "-y",
    "-f",
    "lavfi",
    "-i",
    "testsrc=size=640x360:rate=24",
    "-f",
    "lavfi",
    "-i",
    `sine=frequency=${toneHz}:sample_rate=44100`,
    "-t",
    "4",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-preset",
    "veryfast",
    "-crf",
    "31",
    "-b:a",
    "64k",
    "-hls_time",
    "4",
    "-hls_playlist_type",
    "vod",
    "-hls_flags",
    "independent_segments",
    "-hls_key_info_file",
    keyInfoPath,
    "-hls_segment_filename",
    path.join(outputDir, "segment-%03d.ts"),
    playlistPath
  ]);

  return path.relative(storageRoot(), playlistPath).replace(/\\/g, "/");
};

const loadGeneratedLessons = async (): Promise<GeneratedLesson[]> => {
  const filePath = path.resolve(process.cwd(), "prisma", "generated-lessons.json");
  const raw = await fs.readFile(filePath, "utf8");
  const data = JSON.parse(raw) as GeneratedLesson[];
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("generated-lessons.json is empty. Run: pnpm lessons:sync");
  }
  return data.sort((a, b) => a.sortOrder - b.sortOrder);
};

async function main() {
  const adminPasswordHash = await bcrypt.hash("Admin1234!", 12);
  const studentPasswordHash = await bcrypt.hash("Student12345!", 12);
  const generatedLessons = await loadGeneratedLessons();
  const lessonSeedIds = generatedLessons.map((lesson) => lesson.id);
  const lessonHlsPathById = new Map<string, string>();
  for (const [index, lessonId] of lessonSeedIds.entries()) {
    const toneHz = 440 + index * 37;
    lessonHlsPathById.set(lessonId, await ensureSeedHls(lessonId, toneHz));
  }

  const admin = await prisma.user.upsert({
    where: { email: "admin@eduflow.com" },
    update: {
      passwordHash: adminPasswordHash,
      fullName: "AI Workflow Admin"
    },
    create: {
      email: "admin@eduflow.com",
      passwordHash: adminPasswordHash,
      fullName: "AI Workflow Admin",
      role: "ADMIN",
      emailVerified: true
    }
  });

  const student = await prisma.user.upsert({
    where: { email: "student@eduflow.com" },
    update: {
      passwordHash: studentPasswordHash,
      fullName: "AI Workflow Student"
    },
    create: {
      email: "student@eduflow.com",
      passwordHash: studentPasswordHash,
      fullName: "AI Workflow Student",
      role: "STUDENT",
      emailVerified: true
    }
  });

  await prisma.courseSettings.upsert({
    where: { id: 1 },
    update: {
      titleEn: "AI Workflow: From Idea to Production",
      titleAr: "AI Workflow: من الفكرة إلى الـ Production",
      descriptionEn: "A practical Arabic-first workflow course that turns ideas into production-ready applications using PRDs, Spec Kit, Claude Code, Codex, Docker, testing, SEO, and CI/CD.",
      descriptionAr: "كورس عربي عملي يعلمك الـ workflow الكامل من الفكرة إلى تطبيق production باستخدام PRD وSpec Kit وClaude Code وCodex وDocker والاختبارات والـ SEO والـ CI/CD.",
      pricePiasters: 99900,
      updatedById: admin.id
    },
    create: {
      id: 1,
      titleEn: "AI Workflow: From Idea to Production",
      titleAr: "AI Workflow: من الفكرة إلى الـ Production",
      descriptionEn: "A practical Arabic-first workflow course that turns ideas into production-ready applications using PRDs, Spec Kit, Claude Code, Codex, Docker, testing, SEO, and CI/CD.",
      descriptionAr: "كورس عربي عملي يعلمك الـ workflow الكامل من الفكرة إلى تطبيق production باستخدام PRD وSpec Kit وClaude Code وCodex وDocker والاختبارات والـ SEO والـ CI/CD.",
      pricePiasters: 99900,
      updatedById: admin.id
    }
  });

  await prisma.lesson.deleteMany({
    where: {
      id: {
        in: ["dashboard-lesson-1", "dashboard-lesson-2"]
      }
    }
  });

  await Promise.all([
    prisma.coursePackage.upsert({
      where: { id: "core-course" },
      update: {
        titleEn: "AI Workflow Course",
        titleAr: "كورس AI Workflow",
        descriptionEn: "All 7 phases of the workflow so you can learn the system and apply it on your own project.",
        descriptionAr: "الـ 7 مراحل كاملة، تتعلم الـ workflow وتطبقه على مشروعك بنفسك.",
        pricePiasters: 99900,
        currency: "EGP",
        isActive: true,
        sortOrder: 1
      },
      create: {
        id: "core-course",
        titleEn: "AI Workflow Course",
        titleAr: "كورس AI Workflow",
        descriptionEn: "All 7 phases of the workflow so you can learn the system and apply it on your own project.",
        descriptionAr: "الـ 7 مراحل كاملة، تتعلم الـ workflow وتطبقه على مشروعك بنفسك.",
        pricePiasters: 99900,
        currency: "EGP",
        isActive: true,
        sortOrder: 1
      }
    }),
    prisma.coursePackage.upsert({
      where: { id: "course-review-session" },
      update: {
        titleEn: "Course + Review Session",
        titleAr: "الكورس + جلسة مراجعة",
        descriptionEn: "The full workflow plus one personal session to review your real project and shorten the path.",
        descriptionAr: "الـ workflow كامل + جلسة واحدة معايا شخصياً تراجع فيها مشروعك الحقيقي. لو اشتغلت لوحدك ممكن تضيع وقت كتير — هنا بتختصر الطريق.",
        pricePiasters: 199900,
        currency: "EGP",
        isActive: true,
        sortOrder: 2
      },
      create: {
        id: "course-review-session",
        titleEn: "Course + Review Session",
        titleAr: "الكورس + جلسة مراجعة",
        descriptionEn: "The full workflow plus one personal session to review your real project and shorten the path.",
        descriptionAr: "الـ workflow كامل + جلسة واحدة معايا شخصياً تراجع فيها مشروعك الحقيقي. لو اشتغلت لوحدك ممكن تضيع وقت كتير — هنا بتختصر الطريق.",
        pricePiasters: 199900,
        currency: "EGP",
        isActive: true,
        sortOrder: 2
      }
    }),
    prisma.coursePackage.upsert({
      where: { id: "course-month-followup" },
      update: {
        isActive: false,
        sortOrder: 3
      },
      create: {
        id: "course-month-followup",
        titleEn: "Course + One Month Follow-up",
        titleAr: "الكورس + شهر متابعة",
        descriptionEn: "Weekly follow-up for a month. Disabled by default until you are ready to sell it inside checkout.",
        descriptionAr: "جلسة أسبوعية لمدة شهر. غير مفعّل افتراضياً إلى أن تكون جاهزاً لبيعه داخل صفحة الدفع.",
        pricePiasters: 800000,
        currency: "EGP",
        isActive: false,
        sortOrder: 3
      }
    })
  ]);

  const introSection = await prisma.section.upsert({
    where: { id: "section-introduction" },
    update: {
      titleEn: "Introduction",
      titleAr: "المقدمة",
      descriptionEn: "Open preview and orientation for the full course journey.",
      descriptionAr: "معاينة مفتوحة وتعريف بخطة الكورس ومسار التنفيذ.",
      sortOrder: 0
    },
    create: {
      id: "section-introduction",
      titleEn: "Introduction",
      titleAr: "المقدمة",
      descriptionEn: "Open preview and orientation for the full course journey.",
      descriptionAr: "معاينة مفتوحة وتعريف بخطة الكورس ومسار التنفيذ.",
      sortOrder: 0
    }
  });

  const foundationsSection = await prisma.section.upsert({
    where: { id: "section-foundations" },
    update: {
      titleEn: "Planning and Product Shape",
      titleAr: "التخطيط وشكل المنتج",
      descriptionEn: "Turn the idea into a PRD, technical map, and UI direction before writing code.",
      descriptionAr: "حوّل الفكرة إلى PRD وخريطة تقنية واتجاه UI واضح قبل كتابة الكود.",
      sortOrder: 1
    },
    create: {
      id: "section-foundations",
      titleEn: "Planning and Product Shape",
      titleAr: "التخطيط وشكل المنتج",
      descriptionEn: "Turn the idea into a PRD, technical map, and UI direction before writing code.",
      descriptionAr: "حوّل الفكرة إلى PRD وخريطة تقنية واتجاه UI واضح قبل كتابة الكود.",
      sortOrder: 1
    }
  });

  const advancedSection = await prisma.section.upsert({
    where: { id: "section-advanced" },
    update: {
      titleEn: "Structured Implementation",
      titleAr: "التنفيذ المنظم",
      descriptionEn: "Use Spec Kit and AI agents to build in focused, testable phases.",
      descriptionAr: "استخدم Spec Kit ووكلاء الذكاء الاصطناعي للبناء على مراحل واضحة وقابلة للاختبار.",
      sortOrder: 2
    },
    create: {
      id: "section-advanced",
      titleEn: "Structured Implementation",
      titleAr: "التنفيذ المنظم",
      descriptionEn: "Use Spec Kit and AI agents to build in focused, testable phases.",
      descriptionAr: "استخدم Spec Kit ووكلاء الذكاء الاصطناعي للبناء على مراحل واضحة وقابلة للاختبار.",
      sortOrder: 2
    }
  });

  const productionSection = await prisma.section.upsert({
    where: { id: "section-production" },
    update: {
      titleEn: "Launch and Production",
      titleAr: "الإطلاق والـ Production",
      descriptionEn: "Harden security, performance, SEO, tracking, Docker, deployment, and CI/CD.",
      descriptionAr: "قوّي الأمان والأداء والـ SEO والتتبع وDocker والنشر والـ CI/CD.",
      sortOrder: 3
    },
    create: {
      id: "section-production",
      titleEn: "Launch and Production",
      titleAr: "الإطلاق والـ Production",
      descriptionEn: "Harden security, performance, SEO, tracking, Docker, deployment, and CI/CD.",
      descriptionAr: "قوّي الأمان والأداء والـ SEO والتتبع وDocker والنشر والـ CI/CD.",
      sortOrder: 3
    }
  });

  const seededLessons = generatedLessons.map((lesson) => ({
    id: lesson.id,
    titleEn: lesson.titleEn,
    titleAr: lesson.titleAr,
    descriptionEn: lesson.descriptionEn,
    descriptionAr: lesson.descriptionAr,
    sectionId:
      lesson.sectionKey === "introduction"
        ? introSection.id
        : lesson.sectionKey === "foundations"
          ? foundationsSection.id
          : lesson.sectionKey === "advanced"
            ? advancedSection.id
            : productionSection.id,
    sortOrder: lesson.sortOrder,
    isPreview: lesson.isPreview,
    isPublished: lesson.isPublished,
    durationSeconds: lesson.durationSeconds,
    videoHlsPath: lessonHlsPathById.get(lesson.id) ?? "",
    videoStatus: "READY" as const,
    dripDays: 0
  }));

  await Promise.all(
    seededLessons.map((lesson) =>
      prisma.lesson.upsert({
        where: { id: lesson.id },
        update: lesson,
        create: lesson
      })
    )
  );

  await prisma.enrollment.upsert({
    where: { userId: student.id },
    update: {
      status: "ACTIVE",
      enrollmentType: "ADMIN_ENROLLED",
      revokedAt: null,
      revokedById: null
    },
    create: {
      userId: student.id,
      status: "ACTIVE",
      enrollmentType: "ADMIN_ENROLLED"
    }
  });

  await prisma.lessonProgress.upsert({
    where: {
      userId_lessonId: {
        userId: student.id,
        lessonId: "seed-1"
      }
    },
    update: {
      watchTimeSeconds: 0,
      lastPositionSeconds: 0,
      completedAt: null
    },
    create: {
      userId: student.id,
      lessonId: "seed-1",
      watchTimeSeconds: 0,
      lastPositionSeconds: 0,
      completedAt: null
    }
  });

  await prisma.notificationTemplate.upsert({
    where: { key: "SECURITY_SUSPICIOUS_ACTIVITY" },
    update: {
      subject: "Unusual login activity on your EduFlow account",
      bodyHtml:
        "Hello {{fullName}},<br/><br/>We detected unusual login attempts on your account from IP {{ipAddress}} at {{timestamp}}.<br/><br/>If this was you: <a href='{{wasMe}}'>This was me</a><br/>If this was NOT you: <a href='{{wasNotMe}}'>This was not me</a><br/><br/>For your security, we recommend changing your password if you did not attempt to log in."
    },
    create: {
      key: "SECURITY_SUSPICIOUS_ACTIVITY",
      subject: "Unusual login activity on your EduFlow account",
      bodyHtml:
        "Hello {{fullName}},<br/><br/>We detected unusual login attempts on your account from IP {{ipAddress}} at {{timestamp}}.<br/><br/>If this was you: <a href='{{wasMe}}'>This was me</a><br/>If this was NOT you: <a href='{{wasNotMe}}'>This was not me</a><br/><br/>For your security, we recommend changing your password if you did not attempt to log in."
    }
  });

  await prisma.notificationTemplate.upsert({
    where: { key: "ADMIN_SECURITY_ALERT" },
    update: {
      subject: "EduFlow Security: Permanent ban triggered",
      bodyHtml:
        "A permanent ban has been triggered.<br/><br/>IP: {{ipAddress}}<br/>Email: {{email}}<br/>Fingerprint: {{fingerprintHash}}<br/>Attempt count: {{attemptCount}}<br/>Time: {{timestamp}}<br/><br/>Manage at: {{adminSecurityUrl}}"
    },
    create: {
      key: "ADMIN_SECURITY_ALERT",
      subject: "EduFlow Security: Permanent ban triggered",
      bodyHtml:
        "A permanent ban has been triggered.<br/><br/>IP: {{ipAddress}}<br/>Email: {{email}}<br/>Fingerprint: {{fingerprintHash}}<br/>Attempt count: {{attemptCount}}<br/>Time: {{timestamp}}<br/><br/>Manage at: {{adminSecurityUrl}}"
    }
  });
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

