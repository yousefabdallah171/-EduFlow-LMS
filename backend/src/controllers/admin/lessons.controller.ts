import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import { prisma } from "../../config/database.js";
import { lessonRepository } from "../../repositories/lesson.repository.js";
import { videoUploadRepository } from "../../repositories/video-upload.repository.js";

const getFirstValue = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const createLessonSchema = z.object({
  titleEn: z.string().trim().min(1).max(255),
  titleAr: z.string().trim().min(1).max(255),
  descriptionEn: z.string().trim().optional(),
  descriptionAr: z.string().trim().optional(),
  dripDays: z.number().int().min(0).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  sectionId: z.string().optional(),
  isPublished: z.boolean().optional()
});

const updateLessonSchema = createLessonSchema.partial().extend({
  isPublished: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional()
});

const reorderSchema = z.object({
  order: z.array(
    z.object({
      id: z.string().min(1),
      sortOrder: z.number().int().min(0)
    })
  )
});

const handleLessonAdminError = (error: unknown, res: Response, next: NextFunction) => {
  if (error instanceof z.ZodError) {
    res.status(422).json({
      error: "VALIDATION_ERROR",
      fields: Object.fromEntries(error.issues.map((issue) => [issue.path.join("."), issue.message]))
    });
    return;
  }

  next(error);
};

export const adminLessonsController = {
  async list(_req: Request, res: Response, next: NextFunction) {
    try {
      const lessons = await (lessonRepository as any).getLessonsByAdmin();
      res.json({
        lessons: lessons.map((lesson: any) => ({
          id: lesson.id,
          titleEn: lesson.titleEn,
          titleAr: lesson.titleAr,
          sortOrder: lesson.sortOrder,
          isPublished: lesson.isPublished,
          videoStatus: lesson.videoStatus,
          durationSeconds: lesson.durationSeconds,
          dripDays: lesson.dripDays,
          section: lesson.section
        }))
      });
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { titleEn, titleAr, descriptionEn, descriptionAr, sectionId, isPublished, dripDays } = createLessonSchema.parse(req.body);

      if (!titleEn || !titleAr) {
        res.status(400).json({ message: "titleEn and titleAr are required" });
        return;
      }

      const sortOrder = await getNextLessonSortOrder();
      const lesson = await prisma.lesson.create({
        data: {
          titleEn,
          titleAr,
          descriptionEn,
          descriptionAr,
          sectionId,
          isPublished: isPublished ?? false,
          sortOrder,
          dripDays
        },
        include: { section: true }
      });

      res.status(201).json({ lesson });
    } catch (error) {
      handleLessonAdminError(error, res, next);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const lessonId = getFirstValue(req.params.lessonId);
      if (!lessonId) {
        res.status(400).json({ error: "LESSON_ID_REQUIRED" });
        return;
      }

      const { titleEn, titleAr, descriptionEn, descriptionAr, sectionId, isPublished, sortOrder, dripDays } = updateLessonSchema.parse(req.body);

      const lesson = await prisma.lesson.update({
        where: { id: lessonId },
        data: {
          titleEn,
          titleAr,
          descriptionEn,
          descriptionAr,
          sectionId,
          isPublished,
          sortOrder,
          dripDays
        },
        include: { section: true }
      });

      res.json({ lesson });
    } catch (error) {
      handleLessonAdminError(error, res, next);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const lessonId = getFirstValue(req.params.lessonId);
      if (!lessonId) {
        res.status(400).json({ error: "LESSON_ID_REQUIRED" });
        return;
      }

      const activeUpload = await videoUploadRepository.findByLessonId(lessonId);
      if (activeUpload?.status === "UPLOADING") {
        res.status(409).json({
          error: "UPLOAD_IN_PROGRESS",
          message: "Cancel the active video upload before deleting."
        });
        return;
      }

      await lessonRepository.delete(lessonId);
      res.json({ message: "Lesson deleted." });
    } catch (error) {
      next(error);
    }
  },

  async togglePreview(req: Request, res: Response, next: NextFunction) {
    try {
      const lessonId = getFirstValue(req.params.lessonId);
      if (!lessonId) {
        res.status(400).json({ error: "LESSON_ID_REQUIRED" });
        return;
      }

      const { isPreview } = z.object({ isPreview: z.boolean() }).parse(req.body);
      const lesson = await lessonRepository.update(lessonId, { isPreview });
      res.json(lesson);
    } catch (error) {
      next(error);
    }
  },

  async reorder(req: Request, res: Response, next: NextFunction) {
    try {
      const body = reorderSchema.parse(req.body);
      await prisma.$transaction(
        body.order.map((entry) =>
          prisma.lesson.update({
            where: { id: entry.id },
            data: { sortOrder: entry.sortOrder }
          })
        )
      );
      res.json({ message: "Lessons reordered." });
    } catch (error) {
      handleLessonAdminError(error, res, next);
    }
  }
};

async function getNextLessonSortOrder(): Promise<number> {
  const last = await prisma.lesson.findFirst({
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true }
  });
  return (last?.sortOrder ?? 0) + 1;
}
