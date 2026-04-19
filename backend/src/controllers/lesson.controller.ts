import fs from "node:fs/promises";
import path from "node:path";

import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import { prisma } from "../config/database.js";
import { enrollmentRepository } from "../repositories/enrollment.repository.js";
import { lessonRepository } from "../repositories/lesson.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { progressService, ProgressError } from "../services/progress.service.js";
import { VideoTokenError, videoTokenService } from "../services/video-token.service.js";
import { maskEmail } from "../utils/mask-email.js";
import type { PreviewTokenPayload } from "../utils/video-token.js";

const progressSchema = z.object({
  lastPositionSeconds: z.number().int().min(0),
  watchTimeSeconds: z.number().int().min(0),
  completed: z.boolean().optional()
});

const getStorageRoot = () => path.resolve(process.cwd(), "storage");
const getFirstValue = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const rewritePlaylist = (playlist: string, lessonId: string, token: string) => {
  const encodedToken = encodeURIComponent(token);

  return playlist
    .split(/\r?\n/)
    .map((line) => {
      if (!line) {
        return line;
      }

      if (line.startsWith("#EXT-X-KEY")) {
        return `#EXT-X-KEY:METHOD=AES-128,URI="/api/v1/video/${lessonId}/key?token=${encodedToken}"`;
      }

      if (line.startsWith("#")) {
        return line;
      }

      return `/api/v1/video/${lessonId}/segment?file=${encodeURIComponent(line)}&token=${encodedToken}`;
    })
    .join("\n");
};

const resolveLessonAccess = async (userId: string, lessonId: string) => {
  const enrollment = await enrollmentRepository.findByUserId(userId);
  if (!enrollment || enrollment.status !== "ACTIVE") {
    throw new VideoTokenError("NOT_ENROLLED", 403, "Enrollment required.");
  }

  const lesson = await lessonRepository.findPublishedForStudent(lessonId, userId);
  if (!lesson) {
    throw new VideoTokenError("LESSON_NOT_FOUND", 404, "Lesson not found.");
  }

  const unlocksAt =
    typeof lesson.dripDays === "number"
      ? new Date(enrollment.enrolledAt.getTime() + lesson.dripDays * 24 * 60 * 60 * 1000)
      : null;

  if (unlocksAt && unlocksAt > new Date()) {
    throw new VideoTokenError("LESSON_LOCKED", 403, "Lesson is locked.");
  }

  return {
    enrollment,
    lesson,
    unlocksAt
  };
};

const handleLessonError = (error: unknown, res: Response, next: NextFunction) => {
  if (error instanceof z.ZodError) {
    res.status(422).json({
      error: "VALIDATION_ERROR",
      fields: Object.fromEntries(error.issues.map((issue) => [issue.path.join("."), issue.message]))
    });
    return;
  }

  if (error instanceof VideoTokenError || error instanceof ProgressError) {
    const body: Record<string, unknown> = {
      error: error.code,
      message: error.message
    };

    if (error.code === "LESSON_LOCKED" && "unlocksAt" in error) {
      body.unlocksAt = (error as VideoTokenError & { unlocksAt?: string }).unlocksAt;
    }

    res.status(error.status).json(body);
    return;
  }

  next(error);
};

const buildPlaylist = (lessonId: string, token: string) => {
  const encodedToken = encodeURIComponent(token);
  return [
    "#EXTM3U",
    "#EXT-X-VERSION:3",
    "#EXT-X-TARGETDURATION:10",
    "#EXT-X-MEDIA-SEQUENCE:0",
    `#EXT-X-KEY:METHOD=AES-128,URI="/api/v1/video/${lessonId}/key?token=${encodedToken}"`,
    "#EXTINF:10.0,",
    `/api/v1/video/${lessonId}/segment-0.ts?token=${encodedToken}`,
    "#EXT-X-ENDLIST"
  ].join("\n");
};

export const lessonController = {
  async getAllLessonsGrouped(req: Request, res: Response) {
    try {
      const enrollment = await enrollmentRepository.findByUserId(req.user!.userId);
      if (!enrollment || enrollment.status !== "ACTIVE") {
        res.status(403).json({ error: "NOT_ENROLLED" });
        return;
      }

      const sections = await prisma.section.findMany({
        include: {
          lessons: {
            where: { isPublished: true },
            select: {
              id: true,
              titleEn: true,
              titleAr: true,
              descriptionEn: true,
              descriptionAr: true,
              durationSeconds: true,
              sortOrder: true,
              dripDays: true,
              progress: {
                where: { userId: req.user!.userId },
                select: {
                  completedAt: true,
                  lastPositionSeconds: true
                },
                take: 1
              }
            },
            orderBy: { sortOrder: "asc" }
          }
        },
        orderBy: { sortOrder: "asc" }
      });

      res.json({
        sections: sections.map((section) => ({
          ...section,
          lessons: section.lessons.map((lesson) => {
            const progress = lesson.progress[0];
            const unlocksAt =
              typeof lesson.dripDays === "number"
                ? new Date(enrollment.enrolledAt.getTime() + lesson.dripDays * 24 * 60 * 60 * 1000)
                : null;
            const isUnlocked = !unlocksAt || unlocksAt <= new Date();

            return {
              id: lesson.id,
              titleEn: lesson.titleEn,
              titleAr: lesson.titleAr,
              descriptionEn: lesson.descriptionEn,
              descriptionAr: lesson.descriptionAr,
              durationSeconds: lesson.durationSeconds,
              sortOrder: lesson.sortOrder,
              isUnlocked,
              unlocksAt: isUnlocked ? null : unlocksAt?.toISOString() ?? null,
              completedAt: progress?.completedAt ?? null,
              lastPositionSeconds: progress?.lastPositionSeconds ?? 0
            };
          })
        }))
      });
    } catch (error) {
      console.error("Error fetching lessons:", error);
      res.status(500).json({ message: "Failed to fetch lessons" });
    }
  },

  async getLessonDetail(req: Request, res: Response) {
    try {
      const lessonId = getFirstValue(req.params.lessonId);
      const userId = req.user?.userId;

      if (!lessonId) {
        res.status(400).json({ message: "Lesson ID is required" });
        return;
      }

      const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: {
          section: {
            select: {
              id: true,
              titleEn: true,
              titleAr: true
            }
          },
          resources: {
            select: {
              id: true,
              title: true,
              fileUrl: true,
              fileSizeBytes: true,
              createdAt: true
            }
          },
          progress: userId ? {
            where: { userId },
            select: {
              completedAt: true,
              watchTimeSeconds: true,
              lastPositionSeconds: true
            }
          } : undefined
        }
      });

      if (!lesson) {
        res.status(404).json({ message: "Lesson not found" });
        return;
      }

      res.json({ lesson });
    } catch (error) {
      console.error("Error fetching lesson:", error);
      res.status(500).json({ message: "Failed to fetch lesson" });
    }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const enrollment = await enrollmentRepository.findByUserId(req.user!.userId);
      if (!enrollment || enrollment.status !== "ACTIVE") {
        res.status(403).json({ error: "NOT_ENROLLED" });
        return;
      }

      const lessons = await lessonRepository.findAllPublishedForStudent(req.user!.userId);

      res.json({
        lessons: lessons.map((lesson) => {
          const progress = lesson.progress[0];
          const unlocksAt =
            typeof lesson.dripDays === "number"
              ? new Date(enrollment.enrolledAt.getTime() + lesson.dripDays * 24 * 60 * 60 * 1000)
              : null;
          const isUnlocked = !unlocksAt || unlocksAt <= new Date();

          return {
            id: lesson.id,
            title: lesson.titleEn,
            titleEn: lesson.titleEn,
            titleAr: lesson.titleAr,
            durationSeconds: lesson.durationSeconds,
            sortOrder: lesson.sortOrder,
            isUnlocked,
            unlocksAt: isUnlocked ? null : unlocksAt?.toISOString() ?? null,
            completedAt: progress?.completedAt ?? null,
            lastPositionSeconds: progress?.lastPositionSeconds ?? 0
          };
        })
      });
    } catch (error) {
      handleLessonError(error, res, next);
    }
  },

  async detail(req: Request, res: Response, next: NextFunction) {
    try {
      const lessonId = getFirstValue(req.params.id);
      if (!lessonId) {
        res.status(400).json({ error: "LESSON_ID_REQUIRED" });
        return;
      }

      const access = await resolveLessonAccess(req.user!.userId, lessonId);
      const user = await userRepository.findById(req.user!.userId);

      if (!user) {
        res.status(401).json({ error: "UNAUTHORIZED" });
        return;
      }

      const token = await videoTokenService.issueToken(user, access.lesson.id, req.user!.sessionId);
      const progress = access.lesson.progress[0];

      res.json({
        id: access.lesson.id,
        title: access.lesson.titleEn,
        titleEn: access.lesson.titleEn,
        titleAr: access.lesson.titleAr,
        descriptionHtml: access.lesson.descriptionEn ?? "",
        descriptionHtmlEn: access.lesson.descriptionEn ?? "",
        descriptionHtmlAr: access.lesson.descriptionAr ?? "",
        durationSeconds: access.lesson.durationSeconds,
        videoToken: token.videoToken,
        hlsUrl: token.hlsUrl,
        expiresAt: token.expiresAt.toISOString(),
        watermark: {
          name: user.fullName,
          maskedEmail: maskEmail(user.email)
        },
        progress: {
          lastPositionSeconds: progress?.lastPositionSeconds ?? 0,
          completedAt: progress?.completedAt ?? null
        },
        section: access.lesson.sectionId
          ? await prisma.section.findUnique({
              where: { id: access.lesson.sectionId },
              select: { id: true, titleEn: true, titleAr: true }
            })
          : null
      });
    } catch (error) {
      if (error instanceof VideoTokenError && error.code === "LESSON_LOCKED") {
        const lessonId = getFirstValue(req.params.id);
        const access = await enrollmentRepository.findByUserId(req.user!.userId);
        const lesson = lessonId ? await lessonRepository.findById(lessonId) : null;
        const unlocksAt =
          access && lesson && typeof lesson.dripDays === "number"
            ? new Date(access.enrolledAt.getTime() + lesson.dripDays * 24 * 60 * 60 * 1000).toISOString()
            : null;

        res.status(403).json({
          error: "LESSON_LOCKED",
          unlocksAt
        });
        return;
      }

      handleLessonError(error, res, next);
    }
  },

  async updateProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const lessonId = getFirstValue(req.params.id);
      if (!lessonId) {
        res.status(400).json({ error: "LESSON_ID_REQUIRED" });
        return;
      }

      await resolveLessonAccess(req.user!.userId, lessonId);
      const body = progressSchema.parse(req.body);
      res.json(await progressService.updateProgress(req.user!.userId, lessonId, body));
    } catch (error) {
      handleLessonError(error, res, next);
    }
  },

  async playlist(req: Request, res: Response, next: NextFunction) {
    try {
      const lessonId = getFirstValue(req.params.id);
      const token = getFirstValue(req.query.token as string | string[] | undefined);
      if (!lessonId) {
        res.status(400).json({ error: "LESSON_ID_REQUIRED" });
        return;
      }

      await videoTokenService.validateToken(token, lessonId, req.cookies.refresh_token as string | undefined);

      const lesson = await lessonRepository.findById(lessonId);
      if (!lesson) {
        res.status(404).json({ error: "LESSON_NOT_FOUND" });
        return;
      }

      if (lesson.videoHlsPath) {
        const candidatePath = path.resolve(getStorageRoot(), lesson.videoHlsPath);
        if (candidatePath.startsWith(getStorageRoot())) {
          try {
            const playlist = await fs.readFile(candidatePath, "utf8");
            res.type("application/vnd.apple.mpegurl").send(rewritePlaylist(playlist, lessonId, token ?? ""));
            return;
          } catch {
            // Fall through to generated playlist.
          }
        }
      }

      res.type("application/vnd.apple.mpegurl").send(buildPlaylist(lessonId, token ?? ""));
    } catch (error) {
      handleLessonError(error, res, next);
    }
  },

  async key(req: Request, res: Response, next: NextFunction) {
    try {
      const lessonId = getFirstValue(req.params.id);
      const token = getFirstValue(req.query.token as string | string[] | undefined);
      if (!lessonId) {
        res.status(400).json({ error: "LESSON_ID_REQUIRED" });
        return;
      }

      const payload = await videoTokenService.validateToken(
        token,
        lessonId,
        req.cookies.refresh_token as string | undefined
      );

      // Preview tokens use a predictable session ID so the AES key is stable for the token's TTL.
      const isPreview = "isPreview" in payload && (payload as PreviewTokenPayload).isPreview;
      const sessionId = isPreview ? `preview:${lessonId}` : (payload as { sessionId: string }).sessionId;
      const key = await videoTokenService.getSessionKey(sessionId, payload.lessonId);
      res.type("application/octet-stream").send(key);
    } catch (error) {
      handleLessonError(error, res, next);
    }
  },

  async preview(req: Request, res: Response, next: NextFunction) {
    try {
      const firstLesson = await lessonRepository.findFirstPreview() ?? await lessonRepository.findFirstPublished();
      if (!firstLesson) {
        res.status(404).json({ error: "NO_LESSONS", message: "No published lessons available for preview." });
        return;
      }

      const { videoToken, hlsUrl, expiresAt } = await videoTokenService.issuePreviewToken(firstLesson.id);

      res.json({
        id: firstLesson.id,
        title: firstLesson.titleEn,
        titleEn: firstLesson.titleEn,
        titleAr: firstLesson.titleAr,
        descriptionHtml: firstLesson.descriptionEn ?? "",
        descriptionHtmlEn: firstLesson.descriptionEn ?? "",
        descriptionHtmlAr: firstLesson.descriptionAr ?? "",
        durationSeconds: firstLesson.durationSeconds,
        videoToken,
        hlsUrl,
        expiresAt: expiresAt.toISOString(),
        sortOrder: firstLesson.sortOrder
      });
    } catch (error) {
      handleLessonError(error, res, next);
    }
  },

  async segment(req: Request, res: Response, next: NextFunction) {
    try {
      const lessonId = getFirstValue(req.params.id);
      const token = getFirstValue(req.query.token as string | string[] | undefined);
      const segment = getFirstValue(req.query.file as string | string[] | undefined) ?? getFirstValue(req.params.segment);
      if (!lessonId || !segment) {
        res.status(400).json({ error: "SEGMENT_REQUIRED" });
        return;
      }

      await videoTokenService.validateToken(token, lessonId, req.cookies.refresh_token as string | undefined);

      const lesson = await lessonRepository.findById(lessonId);
      if (!lesson?.videoHlsPath) {
        res.type("video/mp2t").send(Buffer.alloc(0));
        return;
      }

      const segmentPath = path.resolve(path.dirname(path.resolve(getStorageRoot(), lesson.videoHlsPath)), segment);
      if (!segmentPath.startsWith(getStorageRoot())) {
        res.status(404).json({ error: "SEGMENT_NOT_FOUND" });
        return;
      }

      res.type("video/mp2t").send(await fs.readFile(segmentPath));
    } catch (error) {
      handleLessonError(error, res, next);
    }
  }
};
