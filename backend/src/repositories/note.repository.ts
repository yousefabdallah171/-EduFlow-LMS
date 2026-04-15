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
  findAllByUser(userId: string) {
    return prisma.note.findMany({
      where: { userId },
      include: { lesson: { select: { id: true, titleEn: true, titleAr: true, sortOrder: true } } },
      orderBy: { updatedAt: "desc" }
    });
  },
  update(id: string, content: string) {
    return prisma.note.update({ where: { id }, data: { content } });
  },
  delete(id: string) {
    return prisma.note.delete({ where: { id } });
  }
};
