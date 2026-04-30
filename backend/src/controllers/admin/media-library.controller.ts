import type { NextFunction, Request, Response } from "express";
import { prisma } from "../../config/database.js";
import { uploadStuckDetectorService } from "../../services/upload/upload-stuck-detector.service.js";

const parsePositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return fallback;
};

const getSortBy = (value: string | undefined) => {
  if (value === "title" || value === "status" || value === "sizeBytes" || value === "createdAt") {
    return value;
  }
  return "createdAt";
};

const getSortDir = (value: string | undefined) => (value === "asc" ? "asc" : "desc");
const getMediaType = (value: string | undefined) => {
  if (!value) {
    return undefined;
  }

  const normalized = value.toUpperCase();
  if (normalized === "VIDEO" || normalized === "IMAGE" || normalized === "PDF" || normalized === "DOCUMENT" || normalized === "OTHER") {
    return normalized as "VIDEO" | "IMAGE" | "PDF" | "DOCUMENT" | "OTHER";
  }
  return undefined;
};

const toJsonSafe = <T>(value: T): T =>
  JSON.parse(
    JSON.stringify(value, (_key, item: unknown) => (typeof item === "bigint" ? Number(item) : item))
  ) as T;

export const mediaLibraryController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parsePositiveInt(req.query.page as string | undefined, 1);
      const pageSize = Math.min(parsePositiveInt(req.query.pageSize as string | undefined, 20), 100);
      const sortBy = getSortBy(req.query.sortBy as string | undefined);
      const sortDir = getSortDir(req.query.sortDir as string | undefined);
      const status = (req.query.status as string | undefined)?.toUpperCase();
      const type = getMediaType(req.query.type as string | undefined);
      const folderId = req.query.folderId as string | undefined;
      const search = (req.query.search as string | undefined)?.trim();
      const where = {
        ...(status ? { status: status as "UPLOADING" | "PROCESSING" | "READY" | "ERROR" } : {}),
        ...(type ? { type } : {}),
        ...(folderId ? { folderId } : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: "insensitive" as const } },
                { originalFilename: { contains: search, mode: "insensitive" as const } }
              ]
            }
          : {})
      };

      const [items, total] = await Promise.all([
        prisma.mediaFile.findMany({
          where,
          include: {
            uploadedBy: {
              select: {
                id: true,
                fullName: true,
                email: true
              }
            },
            folder: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            [sortBy]: sortDir
          },
          skip: (page - 1) * pageSize,
          take: pageSize
        }),
        prisma.mediaFile.count({ where })
      ]);

      res.status(200).json({
        items: toJsonSafe(items),
        pagination: {
          page,
          pageSize,
          total
        }
      });
    } catch (error) {
      next(error);
    }
  },

  async statusSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const folderId = req.query.folderId as string | undefined;
      const search = (req.query.search as string | undefined)?.trim();
      const where = {
        ...(folderId ? { folderId } : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: "insensitive" as const } },
                { originalFilename: { contains: search, mode: "insensitive" as const } }
              ]
            }
          : {})
      };

      const grouped = await prisma.mediaFile.groupBy({
        by: ["status"],
        where,
        _count: {
          _all: true
        }
      });

      const counters = grouped.reduce<Record<string, number>>((accumulator, row) => {
        accumulator[row.status] = row._count._all;
        return accumulator;
      }, {});

      res.status(200).json({
        uploading: counters.UPLOADING ?? 0,
        processing: counters.PROCESSING ?? 0,
        ready: counters.READY ?? 0,
        failed: counters.ERROR ?? 0,
        total: Object.values(counters).reduce((sum, value) => sum + value, 0)
      });
    } catch (error) {
      next(error);
    }
  },

  async processingTelemetry(_req: Request, res: Response, next: NextFunction) {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const [queueDepth, processedLastHour, failedLastHour, stuck] = await Promise.all([
        prisma.uploadSession.count({
          where: {
            status: {
              in: ["QUEUED", "UPLOADING", "PROCESSING"]
            }
          }
        }),
        prisma.mediaFile.count({
          where: {
            status: "READY",
            updatedAt: { gte: oneHourAgo }
          }
        }),
        prisma.mediaFile.count({
          where: {
            status: "ERROR",
            updatedAt: { gte: oneHourAgo }
          }
        }),
        uploadStuckDetectorService.detectStuckSessions()
      ]);

      res.status(200).json({
        queueDepth,
        processingRatePerMinute: Number((processedLastHour / 60).toFixed(2)),
        failedPerHour: failedLastHour,
        stuckItems: stuck.stuckCount,
        stuckSessionIds: stuck.stuckSessionIds
      });
    } catch (error) {
      next(error);
    }
  },

  async legacyCount(_req: Request, res: Response, next: NextFunction) {
    try {
      const count = await prisma.lesson.count({
        where: { videoHlsPath: { not: null }, mediaFileId: null }
      });
      res.json({ count });
    } catch (error) {
      next(error);
    }
  },

  async backfillLegacy(_req: Request, res: Response, next: NextFunction) {
    try {
      const getMediaType = (filename: string) => {
        const ext = filename.split(".").pop()?.toLowerCase() ?? "";
        if (["mp4", "mov", "webm", "avi", "mkv"].includes(ext)) return "VIDEO" as const;
        if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "IMAGE" as const;
        if (ext === "pdf") return "PDF" as const;
        if (["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(ext)) return "DOCUMENT" as const;
        return "OTHER" as const;
      };

      let migrated = 0;

      // Step 1 — VideoUpload records that are complete and have no MediaFile yet
      const legacyUploads = await prisma.videoUpload.findMany({
        where: { status: { in: ["COMPLETE", "READY"] }, mediaFileId: null },
        include: { lesson: { select: { id: true, videoHlsPath: true, mediaFileId: true } } }
      });

      for (const upload of legacyUploads) {
        const title = upload.filename.replace(/\.[^/.]+$/, "");
        const mediaFile = await prisma.mediaFile.create({
          data: {
            title,
            type: getMediaType(upload.filename),
            status: "READY",
            originalFilename: upload.filename,
            storagePath: upload.storagePath,
            hlsPath: upload.lesson?.videoHlsPath ?? null,
            sizeBytes: upload.sizeBytes,
            uploadedById: upload.uploadedById
          }
        });

        await prisma.videoUpload.update({ where: { id: upload.id }, data: { mediaFileId: mediaFile.id } });

        if (upload.lesson && upload.lesson.videoHlsPath && !upload.lesson.mediaFileId) {
          await prisma.lesson.update({ where: { id: upload.lesson.id }, data: { mediaFileId: mediaFile.id } });
        }
        migrated++;
      }

      // Step 2 — Lessons with videoHlsPath but still no mediaFileId (no VideoUpload record)
      const orphanLessons = await prisma.lesson.findMany({
        where: { videoHlsPath: { not: null }, mediaFileId: null }
      });

      const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } });

      if (adminUser && orphanLessons.length > 0) {
        for (const lesson of orphanLessons) {
          const title = lesson.titleEn || "Untitled";
          const mediaFile = await prisma.mediaFile.create({
            data: {
              title,
              type: "VIDEO",
              status: "READY",
              originalFilename: `${title}.mp4`,
              storagePath: null,
              hlsPath: lesson.videoHlsPath,
              sizeBytes: BigInt(0),
              uploadedById: adminUser.id
            }
          });
          await prisma.lesson.update({ where: { id: lesson.id }, data: { mediaFileId: mediaFile.id } });
          migrated++;
        }
      }

      res.json({ migrated });
    } catch (error) {
      next(error);
    }
  }
};
