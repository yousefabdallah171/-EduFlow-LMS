import type { LessonProgress, Prisma } from "@prisma/client";

import { prisma } from "../config/database.js";

export const progressRepository = {
  upsert(userId: string, lessonId: string, data: Prisma.LessonProgressUncheckedUpdateInput): Promise<LessonProgress> {
    return prisma.lessonProgress.upsert({
      where: {
        userId_lessonId: {
          userId,
          lessonId
        }
      },
      update: data,
      create: {
        userId,
        lessonId,
        watchTimeSeconds: Number(data.watchTimeSeconds ?? 0),
        lastPositionSeconds: Number(data.lastPositionSeconds ?? 0),
        completedAt: (data.completedAt as Date | null | undefined) ?? null
      }
    });
  },

  findByUserAndLesson(userId: string, lessonId: string): Promise<LessonProgress | null> {
    return prisma.lessonProgress.findUnique({
      where: {
        userId_lessonId: {
          userId,
          lessonId
        }
      }
    });
  },

  async findCourseCompletion(userId: string) {
    const [totalLessons, completedLessons] = await Promise.all([
      prisma.lesson.count({
        where: { isPublished: true }
      }),
      prisma.lessonProgress.count({
        where: {
          userId,
          completedAt: {
            not: null
          },
          lesson: {
            isPublished: true
          }
        }
      })
    ]);

    return {
      totalLessons,
      completedLessons,
      percentage: totalLessons === 0 ? 0 : Number(((completedLessons / totalLessons) * 100).toFixed(1))
    };
  }
};
