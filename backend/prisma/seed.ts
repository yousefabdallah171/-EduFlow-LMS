import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminPasswordHash = await bcrypt.hash("Admin1234!", 12);
  const studentPasswordHash = await bcrypt.hash("Student1234!", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@eduflow.com" },
    update: {},
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
    update: {},
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

  await Promise.all(
    [
      {
        titleEn: "Welcome",
        titleAr: "مقدمة",
        sortOrder: 1,
        isPublished: true
      },
      {
        titleEn: "Getting Started",
        titleAr: "البدء",
        sortOrder: 2,
        isPublished: true
      },
      {
        titleEn: "Advanced Workflow",
        titleAr: "المرحلة المتقدمة",
        sortOrder: 3,
        isPublished: false
      }
    ].map((lesson) =>
      prisma.lesson.upsert({
        where: { id: `seed-${lesson.sortOrder}` },
        update: lesson,
        create: {
          id: `seed-${lesson.sortOrder}`,
          ...lesson
        }
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
      watchTimeSeconds: 120,
      lastPositionSeconds: 120,
      completedAt: new Date()
    },
    create: {
      userId: student.id,
      lessonId: "seed-1",
      watchTimeSeconds: 120,
      lastPositionSeconds: 120,
      completedAt: new Date()
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
