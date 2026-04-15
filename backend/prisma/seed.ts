import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const storageRoot = () => path.resolve(process.cwd(), "storage");

const fileExists = async (filePath: string) => {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile() && stat.size > 1024;
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
    }, 60_000);

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

  if ((await fileExists(playlistPath)) && (await fileExists(segmentPath))) {
    return path.relative(storageRoot(), playlistPath).replace(/\\/g, "/");
  }

  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });

  await runFfmpeg([
    "-y",
    "-f",
    "lavfi",
    "-i",
    "testsrc=size=1280x720:rate=30",
    "-f",
    "lavfi",
    "-i",
    `sine=frequency=${toneHz}:sample_rate=44100`,
    "-t",
    "12",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "96k",
    "-hls_time",
    "12",
    "-hls_playlist_type",
    "vod",
    "-hls_flags",
    "independent_segments",
    "-hls_segment_filename",
    path.join(outputDir, "segment-%03d.ts"),
    playlistPath
  ]);

  return path.relative(storageRoot(), playlistPath).replace(/\\/g, "/");
};

async function main() {
  const adminPasswordHash = await bcrypt.hash("Admin1234!", 12);
  const studentPasswordHash = await bcrypt.hash("Student12345!", 12);
  const [seedOneHlsPath, seedTwoHlsPath, seedThreeHlsPath] = await Promise.all([
    ensureSeedHls("seed-1", 440),
    ensureSeedHls("seed-2", 554),
    ensureSeedHls("seed-3", 659)
  ]);

  const admin = await prisma.user.upsert({
    where: { email: "admin@eduflow.com" },
    update: {
      passwordHash: adminPasswordHash
    },
    create: {
      email: "admin@eduflow.com",
      passwordHash: adminPasswordHash,
      fullName: "EduFlow Admin",
      role: "ADMIN",
      emailVerified: true
    }
  });

  const student = await prisma.user.upsert({
    where: { email: "student@eduflow.com" },
    update: {
      passwordHash: studentPasswordHash
    },
    create: {
      email: "student@eduflow.com",
      passwordHash: studentPasswordHash,
      fullName: "EduFlow Student",
      role: "STUDENT",
      emailVerified: true
    }
  });

  await prisma.courseSettings.upsert({
    where: { id: 1 },
    update: { updatedById: admin.id },
    create: {
      id: 1,
      titleEn: "EduFlow Course",
      titleAr: "دورة EduFlow",
      descriptionEn: "Seeded course settings",
      descriptionAr: "إعدادات الدورة الأولية",
      pricePiasters: 49900,
      updatedById: admin.id
    }
  });

  const foundationsSection = await prisma.section.upsert({
    where: { id: "section-foundations" },
    update: {
      titleEn: "Foundations",
      titleAr: "الأساسيات",
      descriptionEn: "Start with the platform and core workflow.",
      descriptionAr: "ابدأ بالمنصة وسير العمل الأساسي.",
      sortOrder: 1
    },
    create: {
      id: "section-foundations",
      titleEn: "Foundations",
      titleAr: "الأساسيات",
      descriptionEn: "Start with the platform and core workflow.",
      descriptionAr: "ابدأ بالمنصة وسير العمل الأساسي.",
      sortOrder: 1
    }
  });

  const advancedSection = await prisma.section.upsert({
    where: { id: "section-advanced" },
    update: {
      titleEn: "Advanced Workflow",
      titleAr: "سير العمل المتقدم",
      descriptionEn: "Production practices for delivery and scaling.",
      descriptionAr: "ممارسات الإنتاج للتسليم والتوسع.",
      sortOrder: 2
    },
    create: {
      id: "section-advanced",
      titleEn: "Advanced Workflow",
      titleAr: "سير العمل المتقدم",
      descriptionEn: "Production practices for delivery and scaling.",
      descriptionAr: "ممارسات الإنتاج للتسليم والتوسع.",
      sortOrder: 2
    }
  });

  await Promise.all(
    [
      {
        id: "seed-1",
        titleEn: "Welcome",
        titleAr: "مقدمة",
        descriptionEn: "A quick tour of the course experience.",
        descriptionAr: "جولة سريعة في تجربة الدورة.",
        sortOrder: 1,
        isPublished: true,
        isPreview: true,
        sectionId: foundationsSection.id,
        videoHlsPath: seedOneHlsPath,
        videoStatus: "READY" as const,
        durationSeconds: 12,
        dripDays: 0
      },
      {
        id: "seed-2",
        titleEn: "Getting Started",
        titleAr: "البدء",
        descriptionEn: "Set up your workflow and first project steps.",
        descriptionAr: "جهز سير عملك وخطوات المشروع الأولى.",
        sortOrder: 2,
        isPublished: true,
        isPreview: false,
        sectionId: foundationsSection.id,
        videoHlsPath: seedTwoHlsPath,
        videoStatus: "READY" as const,
        durationSeconds: 12,
        dripDays: 0
      },
      {
        id: "seed-3",
        titleEn: "Advanced Workflow",
        titleAr: "المرحلة المتقدمة",
        descriptionEn: "Move from prototype to a production-ready delivery flow.",
        descriptionAr: "انتقل من النموذج الأولي إلى سير تسليم جاهز للإنتاج.",
        sortOrder: 3,
        isPublished: true,
        isPreview: false,
        sectionId: advancedSection.id,
        videoHlsPath: seedThreeHlsPath,
        videoStatus: "READY" as const,
        durationSeconds: 12,
        dripDays: 0
      }
    ].map((lesson) =>
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
