import type { Lesson } from "@prisma/client";

import { prisma } from "../config/database.js";

export const lessonRepository = {
  findAll(): Promise<Lesson[]> {
    return prisma.lesson.findMany({
      orderBy: { sortOrder: "asc" }
    });
  },

  findById(id: string): Promise<Lesson | null> {
    return prisma.lesson.findUnique({ where: { id } });
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

  findPublishedForStudent(id: string, userId: string) {
    return prisma.lesson.findFirst({
      where: {
        id,
        isPublished: true
      },
      include: {
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
