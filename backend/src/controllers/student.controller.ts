import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/database.js";

export const studentController = {
  async dashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;

      const [enrollment, allLessons, progress] = await Promise.all([
        prisma.enrollment.findUnique({ where: { userId } }),
        prisma.lesson.findMany({ where: { isPublished: true }, select: { id: true } }),
        prisma.lessonProgress.findMany({
          where: { userId },
          orderBy: { updatedAt: "desc" }
        })
      ]);

      const completed = progress.filter((p) => p.completedAt !== null).length;
      const total = allLessons.length;
      const completionPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
      const lastLesson = progress[0];

      res.json({
        lastLessonId: lastLesson?.lessonId ?? null,
        completionPercent,
        enrolled: enrollment?.status === "ACTIVE",
        status: enrollment?.status ?? null,
        enrolledAt: enrollment?.enrolledAt?.toISOString() ?? null
      });
    } catch (error) {
      next(error);
    }
  }
};
