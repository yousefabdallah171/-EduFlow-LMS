import type { Lesson, Prisma } from "@prisma/client";

import { prisma } from "../config/database.js";

const adminLessonInclude = {
  section: {
    select: {
      id: true,
      titleEn: true,
      titleAr: true
    }
  }
} satisfies Prisma.LessonInclude;

const sectionLessonInclude = {
  section: true,
  resources: true,
  progress: true
} satisfies Prisma.LessonInclude;

const lessonDetailsInclude = {
  section: true,
  resources: true,
  progress: true,
  videoTokens: true
} satisfies Prisma.LessonInclude;

export const lessonRepository = {
  findAll(): Promise<Lesson[]> {
    return prisma.lesson.findMany({
      orderBy: { sortOrder: "asc" }
    });
  },

  getLessonsByAdmin() {
    return prisma.lesson.findMany({
      include: adminLessonInclude,
      orderBy: [{ sectionId: "asc" }, { sortOrder: "asc" }]
    });
  },

  getLessonsBySection(sectionId: string) {
    return prisma.lesson.findMany({
      where: { sectionId },
      include: sectionLessonInclude,
      orderBy: { sortOrder: "asc" }
    });
  },

  findById(id: string): Promise<Lesson | null> {
    return prisma.lesson.findUnique({ where: { id } });
  },

  async findByIdWithDetails(id: string) {
    return prisma.lesson.findUnique({
      where: { id },
      include: lessonDetailsInclude
    });
  },

  create(data: Parameters<typeof prisma.lesson.create>[0]["data"]) {
    return prisma.lesson.create({ data });
  },

  update(id: string, data: Parameters<typeof prisma.lesson.update>[0]["data"]) {
    return prisma.lesson.update({
      where: { id },
      data
    });
  },

  delete(id: string) {
    return prisma.lesson.delete({
      where: { id }
    });
  },

  findFirstPublished(): Promise<import("@prisma/client").Lesson | null> {
    return prisma.lesson.findFirst({
      where: { isPublished: true },
      orderBy: { sortOrder: "asc" }
    });
  },

  findFirstPreview(): Promise<import("@prisma/client").Lesson | null> {
    return prisma.lesson.findFirst({
      where: { isPreview: true, isPublished: true },
      orderBy: { sortOrder: "asc" }
    });
  },

  findPublishedForStudent(id: string, userId: string) {
    return prisma.lesson.findFirst({
      where: {
        id,
        isPublished: true
      },
      include: {
        section: {
          select: {
            id: true,
            titleEn: true,
            titleAr: true
          }
        },
        progress: {
          where: { userId },
          take: 1
        }
      }
    });
  },

  findAllPublishedForStudent(userId: string) {
    return prisma.lesson.findMany({
      where: { isPublished: true },
      orderBy: { sortOrder: "asc" },
      include: {
        progress: {
          where: { userId },
          take: 1
        }
      }
    });
  }
};
