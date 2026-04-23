import { prisma } from "../config/database.js";

export const noteRepository = {
  create(userId: string, lessonId: string, content: string) {
    return prisma.note.create({ data: { userId, lessonId, content } });
  },
  upsert(userId: string, lessonId: string, content: string) {
    return prisma.note.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      update: { content },
      create: { userId, lessonId, content }
    });
  },
  findByUserAndLesson(userId: string, lessonId: string) {
    return prisma.note.findUnique({ where: { userId_lessonId: { userId, lessonId } } });
  },
  findByIdForUser(id: string, userId: string) {
    return prisma.note.findFirst({ where: { id, userId } });
  },
  findAllByUser(userId: string) {
    return prisma.note.findMany({
      where: { userId },
      include: { lesson: { select: { id: true, titleEn: true, titleAr: true, sortOrder: true } } },
      orderBy: { updatedAt: "desc" }
    });
  },
  updateForUser(id: string, userId: string, content: string) {
    return prisma.note.update({ where: { id, userId }, data: { content } });
  },
  deleteForUser(id: string, userId: string) {
    return prisma.note.delete({ where: { id, userId } });
  }
};
