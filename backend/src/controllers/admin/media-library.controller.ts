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
  }
};
