import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import { prisma } from "../../config/database.js";
import { lessonMediaMatchingService } from "../../services/lessons/lesson-media-matching.service.js";

const getParam = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const autoMapSchema = z.object({
  lessonIds: z.array(z.string().min(1)).optional(),
  mediaAssetIds: z.array(z.string().min(1)).optional(),
  strategy: z.string().optional()
});

const bulkAttachSchema = z.object({
  attachments: z.array(
    z.object({
      lessonId: z.string().min(1),
      mediaAssetId: z.string().min(1),
      mappingSource: z.enum(["MANUAL", "AUTO_MATCH", "BULK_REVIEWED"]).optional()
    })
  ),
  replaceExistingPrimaryVideo: z.boolean().optional()
});

export const lessonAttachmentController = {
  async autoMap(req: Request, res: Response, next: NextFunction) {
    try {
      const payload = autoMapSchema.parse(req.body ?? {});
      const mapping = await lessonMediaMatchingService.autoMap({
        lessonIds: payload.lessonIds,
        mediaAssetIds: payload.mediaAssetIds
      });
      res.status(200).json(mapping);
    } catch (error) {
      next(error);
    }
  },

  async bulkAttach(req: Request, res: Response, next: NextFunction) {
    try {
      const payload = bulkAttachSchema.parse(req.body ?? {});
      const replaceExistingPrimaryVideo = payload.replaceExistingPrimaryVideo ?? false;
      const attachments = payload.attachments;

      const lessonIds = attachments.map((entry) => entry.lessonId);
      const mediaIds = attachments.map((entry) => entry.mediaAssetId);

      const [lessons, mediaAssets] = await Promise.all([
        prisma.lesson.findMany({
          where: { id: { in: lessonIds } },
          select: { id: true }
        }),
        prisma.mediaFile.findMany({
          where: { id: { in: mediaIds }, status: "READY" },
          select: { id: true }
        })
      ]);

      const existingLessonIds = new Set(lessons.map((lesson) => lesson.id));
      const existingMediaIds = new Set(mediaAssets.map((media) => media.id));
      const invalidAttachment = attachments.find(
        (entry) => !existingLessonIds.has(entry.lessonId) || !existingMediaIds.has(entry.mediaAssetId)
      );

      if (invalidAttachment) {
        res.status(422).json({
          error: "INVALID_ATTACHMENT_TARGET",
          message: "One or more lessons/media assets are invalid or not ready."
        });
        return;
      }

      const result = await prisma.$transaction(async (transaction) => {
        if (replaceExistingPrimaryVideo && lessonIds.length > 0) {
          await transaction.lessonMediaAttachment.updateMany({
            where: {
              lessonId: { in: lessonIds },
              isActive: true,
              attachmentRole: "PRIMARY_VIDEO"
            },
            data: { isActive: false }
          });
        }

        let applied = 0;
        for (const attachment of attachments) {
          await transaction.lessonMediaAttachment.create({
            data: {
              lessonId: attachment.lessonId,
              mediaAssetId: attachment.mediaAssetId,
              attachmentRole: "PRIMARY_VIDEO",
              mappingSource: attachment.mappingSource ?? "BULK_REVIEWED",
              isActive: true,
              attachedByUserId: req.user!.userId
            }
          });

          await transaction.lesson.update({
            where: { id: attachment.lessonId },
            data: { mediaFileId: attachment.mediaAssetId }
          });

          applied += 1;
        }

        const batchReport = await transaction.batchOperationReport.create({
          data: {
            operationType: "BULK_ATTACH",
            initiatedByUserId: req.user!.userId,
            totalItems: attachments.length,
            acceptedItems: attachments.length,
            completedItems: applied,
            failedItems: 0,
            pendingItems: 0,
            rejectedItems: 0,
            retriedItems: 0,
            summaryJson: {
              replaceExistingPrimaryVideo
            }
          }
        });

        return {
          batchReportId: batchReport.id,
          applied,
          skipped: attachments.length - applied,
          failed: 0
        };
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  async attachSingle(req: Request, res: Response, next: NextFunction) {
    try {
      const lessonId = getParam(req.params.lessonId);
      const mediaAssetId = getParam(req.params.mediaAssetId);

      if (!lessonId || !mediaAssetId) {
        res.status(400).json({
          error: "LESSON_OR_MEDIA_ID_REQUIRED"
        });
        return;
      }

      const [lesson, mediaAsset] = await Promise.all([
        prisma.lesson.findUnique({ where: { id: lessonId }, select: { id: true } }),
        prisma.mediaFile.findUnique({ where: { id: mediaAssetId }, select: { id: true, status: true } })
      ]);

      if (!lesson || !mediaAsset || mediaAsset.status !== "READY") {
        res.status(422).json({
          error: "INVALID_ATTACHMENT_TARGET"
        });
        return;
      }

      await prisma.$transaction(async (transaction) => {
        await transaction.lessonMediaAttachment.updateMany({
          where: {
            lessonId,
            isActive: true,
            attachmentRole: "PRIMARY_VIDEO"
          },
          data: { isActive: false }
        });

        await transaction.lessonMediaAttachment.create({
          data: {
            lessonId,
            mediaAssetId,
            attachmentRole: "PRIMARY_VIDEO",
            mappingSource: "MANUAL",
            isActive: true,
            attachedByUserId: req.user!.userId
          }
        });

        await transaction.lesson.update({
          where: { id: lessonId },
          data: { mediaFileId: mediaAssetId }
        });
      });

      res.status(200).json({
        lessonId,
        mediaAssetId,
        status: "ATTACHED",
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  },

  async listByLesson(req: Request, res: Response, next: NextFunction) {
    try {
      const lessonId = getParam(req.params.lessonId);
      if (!lessonId) {
        res.status(400).json({
          error: "LESSON_ID_REQUIRED"
        });
        return;
      }

      const attachments = await prisma.lessonMediaAttachment.findMany({
        where: { lessonId },
        include: {
          mediaAsset: {
            select: {
              id: true,
              title: true,
              originalFilename: true,
              status: true
            }
          }
        },
        orderBy: { attachedAt: "desc" }
      });

      res.status(200).json({
        lessonId,
        attachments: attachments.map((attachment) => ({
          id: attachment.id,
          mediaAssetId: attachment.mediaAssetId,
          role: attachment.attachmentRole,
          isActive: attachment.isActive,
          mappingSource: attachment.mappingSource,
          mediaAsset: attachment.mediaAsset
        }))
      });
    } catch (error) {
      next(error);
    }
  }
};
