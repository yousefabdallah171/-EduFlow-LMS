import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
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
  sectionId: z.string().trim().min(1).nullable().optional(),
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

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    res.status(404).json({
      error: "LESSON_NOT_FOUND",
      message: "Lesson not found."
    });
    return;
  }

  next(error);
};

export const adminLessonsController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const sectionId = getFirstValue(req.query.sectionId as string | string[] | undefined);
      const lessons = sectionId
        ? await lessonRepository.getLessonsBySection(sectionId)
        : await lessonRepository.getLessonsByAdmin();
      res.json({
        lessons: lessons.map((lesson: any) => ({
          id: lesson.id,
          titleEn: lesson.titleEn,
          titleAr: lesson.titleAr,
          descriptionEn: lesson.descriptionEn,
          descriptionAr: lesson.descriptionAr,
          sortOrder: lesson.sortOrder,
          isPublished: lesson.isPublished,
          isPreview: lesson.isPreview,
          videoStatus: lesson.videoStatus,
          durationSeconds: lesson.durationSeconds,
          dripDays: lesson.dripDays,
          sectionId: lesson.sectionId,
          section: lesson.section
        }))
      });
    } catch (error) {
      next(error);
    }
  },

  async detail(req: Request, res: Response, next: NextFunction) {
    try {
      const lessonId = getFirstValue(req.params.lessonId);
      if (!lessonId) {
        res.status(400).json({ error: "LESSON_ID_REQUIRED" });
        return;
      }

      const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: { section: true }
      });
      if (!lesson) {
        res.status(404).json({
          error: "LESSON_NOT_FOUND",
          message: "Lesson not found."
        });
        return;
      }

      res.json({ lesson });
    } catch (error) {
      handleLessonAdminError(error, res, next);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { titleEn, titleAr, descriptionEn, descriptionAr, sectionId, isPublished, isPreview, dripDays, sortOrder } = createLessonSchema
        .extend({ isPreview: z.boolean().optional() })
        .parse(req.body);

      if (!titleEn || !titleAr) {
        res.status(400).json({ message: "titleEn and titleAr are required" });
        return;
      }

      const nextSortOrder = sortOrder ?? await getNextLessonSortOrder(sectionId ?? undefined);
      const lesson = await prisma.lesson.create({
        data: {
          titleEn,
          titleAr,
          descriptionEn: descriptionEn || null,
          descriptionAr: descriptionAr || null,
          sectionId: sectionId || null,
          isPublished: isPublished ?? false,
          isPreview: isPreview ?? false,
          sortOrder: nextSortOrder,
          dripDays: dripDays ?? null
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

      const { titleEn, titleAr, descriptionEn, descriptionAr, sectionId, isPublished, isPreview, sortOrder, dripDays } = updateLessonSchema
        .extend({ isPreview: z.boolean().optional() })
        .parse(req.body);

      const lesson = await prisma.lesson.update({
        where: { id: lessonId },
        data: {
          titleEn,
          titleAr,
          descriptionEn: descriptionEn === undefined ? undefined : descriptionEn || null,
          descriptionAr: descriptionAr === undefined ? undefined : descriptionAr || null,
          sectionId: sectionId === undefined ? undefined : sectionId || null,
          isPublished,
          isPreview,
          sortOrder,
          dripDays: dripDays === undefined ? undefined : dripDays
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
      handleLessonAdminError(error, res, next);
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
      handleLessonAdminError(error, res, next);
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

async function getNextLessonSortOrder(sectionId?: string): Promise<number> {
  const last = await prisma.lesson.findFirst({
    where: sectionId ? { sectionId } : undefined,
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true }
  });
  return (last?.sortOrder ?? 0) + 1;
}
