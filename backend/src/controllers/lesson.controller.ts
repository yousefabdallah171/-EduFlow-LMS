import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";

import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import { env } from "../config/env.js";
import { prisma } from "../config/database.js";
import { enrollmentRepository } from "../repositories/enrollment.repository.js";
import { lessonRepository } from "../repositories/lesson.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { lessonService } from "../services/lesson.service.js";
import { progressService, ProgressError } from "../services/progress.service.js";
import { VideoTokenError, videoTokenService } from "../services/video-token.service.js";
import { VideoAbuseError, getClientContext, videoAbuseService } from "../services/video-abuse.service.js";

const progressSchema = z.object({
  lastPositionSeconds: z.number().int().min(0),
  watchTimeSeconds: z.number().int().min(0),
  completed: z.boolean().optional()
});

const MAX_TOKEN_LENGTH = 2000;
const getStorageRoot = () => path.resolve(process.cwd(), env.STORAGE_PATH);
const getFirstValue = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const isHttpsRequest = (req: Request) =>
  req.secure || req.get("x-forwarded-proto")?.split(",")[0]?.trim() === "https";

const isWithinDir = (parent: string, child: string) => {
  const parentResolved = path.resolve(parent);
  const childResolved = path.resolve(child);
  const relative = path.relative(parentResolved, childResolved);
  if (!relative) return true;
  return !relative.startsWith("..") && !path.isAbsolute(relative);
};

const setVideoNoStoreHeaders = (res: Response) => {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
};

const rewriteKeyLine = (line: string, uri: string) => {
  if (!line.startsWith("#EXT-X-KEY")) return line;
  if (!line.includes("URI=")) {
    return `${line},URI="${uri}"`;
  }

  return line.replace(/URI=([^,]*)/i, (_match, value) => {
    const cleaned = String(value).trim();
    const hasQuotes = cleaned.startsWith("\"") && cleaned.endsWith("\"");
    return `URI=${hasQuotes ? `"${uri}"` : uri}`;
  });
};

const rewritePlaylist = (playlist: string, lessonId: string, token: string) => {
  const encodedToken = encodeURIComponent(token);
  const keyUri = `/api/v1/video/${lessonId}/key?token=${encodedToken}`;

  return playlist
    .split(/\r?\n/)
    .map((line) => {
      if (!line) {
        return line;
      }

      if (line.startsWith("#EXT-X-KEY")) return rewriteKeyLine(line, keyUri);

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

  if (error instanceof VideoTokenError || error instanceof ProgressError || error instanceof VideoAbuseError) {
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
    `/api/v1/video/${lessonId}/segment-000.ts?token=${encodedToken}`,
    "#EXT-X-ENDLIST"
  ].join("\n");
};

export const lessonController = {
  async getAllLessonsGrouped(req: Request, res: Response, next: NextFunction) {
    try {
      const enrollment = await enrollmentRepository.findByUserId(req.user!.userId);
      if (!enrollment || enrollment.status !== "ACTIVE") {
        res.status(403).json({ error: "NOT_ENROLLED" });
        return;
      }

      const sections = await lessonService.getPublishedLessonsGrouped();

      const lessonIds = sections.flatMap((section) => section.lessons.map((lesson) => lesson.id));
      const progressByLessonId = await progressService.getProgressByLessonIds(req.user!.userId, lessonIds);

      res.json({
        sections: sections.map((section) => ({
          ...section,
          lessons: section.lessons.map((lesson) => {
            const progress = progressByLessonId.get(lesson.id);
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
      next(error);
    }
  },

  async getLessonDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const lessonId = getFirstValue(req.params.lessonId);
      const userId = req.user?.userId;

      if (!lessonId) {
        res.status(400).json({ message: "Lesson ID is required" });
        return;
      }

      const lesson = await lessonService.getLessonMetadata(lessonId);

      if (!lesson) {
        res.status(404).json({ message: "Lesson not found" });
        return;
      }

      if (!userId) {
        res.json({ lesson });
        return;
      }

      const progress = await prisma.lessonProgress.findUnique({
        where: { userId_lessonId: { userId, lessonId } },
        select: {
          completedAt: true,
          watchTimeSeconds: true,
          lastPositionSeconds: true
        }
      });

      res.json({
        lesson: {
          ...lesson,
          progress: progress ? [progress] : []
        }
      });
    } catch (error) {
      next(error);
    }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const enrollment = await enrollmentRepository.findByUserId(req.user!.userId);
      if (!enrollment || enrollment.status !== "ACTIVE") {
        res.status(403).json({ error: "NOT_ENROLLED" });
        return;
      }

      const paginationSchema = z
        .object({
          page: z.coerce.number().int().min(1).optional(),
          limit: z.coerce.number().int().min(1).max(100).optional()
        })
        .passthrough();
      const pagination = paginationSchema.parse(req.query);

      const lessons = await lessonService.getPublishedLessons();

      const shouldPaginate = typeof pagination.page === "number" || typeof pagination.limit === "number";
      const page = pagination.page ?? 1;
      const limit = pagination.limit ?? 20;
      const pagedLessons = shouldPaginate ? lessons.slice((page - 1) * limit, (page - 1) * limit + limit) : lessons;

      const lessonIds = pagedLessons.map((lesson) => lesson.id);
      const progressByLessonId = await progressService.getProgressByLessonIds(req.user!.userId, lessonIds);

      const responseLessons = pagedLessons.map((lesson) => {
          const progress = progressByLessonId.get(lesson.id);
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
        });

      if (!shouldPaginate) {
        res.json({ lessons: responseLessons });
        return;
      }

      res.json({
        lessons: responseLessons,
        pagination: {
          page,
          limit,
          total: lessons.length,
          totalPages: Math.ceil(lessons.length / limit)
        }
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

      const token = await videoTokenService.issueToken(user, access.lesson.id, req.user!.sessionId, {
        ip: req.ip,
        userAgent: req.get("user-agent")
      });
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
          initials: user.fullName
            .split(" ")
            .slice(0, 2)
            .map((n) => n[0])
            .join("")
            .toUpperCase(),
          timestamp: new Date().toISOString()
        },
        progress: {
          lastPositionSeconds: progress?.lastPositionSeconds ?? 0,
          completedAt: progress?.completedAt ?? null
        },
        section:
          access.lesson.sectionId && access.lesson.section
            ? {
                id: access.lesson.section.id,
                titleEn: access.lesson.section.titleEn,
                titleAr: access.lesson.section.titleAr
              }
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
      setVideoNoStoreHeaders(res);
      const lessonId = getFirstValue(req.params.id);
      const token = getFirstValue(req.query.token as string | string[] | undefined);
      if (!lessonId) {
        res.status(400).json({ error: "LESSON_ID_REQUIRED" });
        return;
      }

      if (token && token.length > MAX_TOKEN_LENGTH) {
        res.status(400).json({ error: "TOKEN_TOO_LONG" });
        return;
      }

      const client = getClientContext({ ip: req.ip, userAgent: req.get("user-agent") });
      const payload = await videoTokenService.validateToken({
        token,
        lessonId,
        rawRefreshToken: req.cookies.refresh_token as string | undefined,
        previewSessionIdCookie: req.cookies.preview_session as string | undefined,
        ip: req.ip,
        userAgent: req.get("user-agent") ?? undefined
      });

      const isPreview = "isPreview" in payload && (payload as { isPreview?: boolean }).isPreview;
      const sessionId = isPreview
        ? (payload as { previewSessionId: string }).previewSessionId
        : (payload as { sessionId: string }).sessionId;

      await videoAbuseService.enforceConcurrency({
        userId: isPreview ? null : (payload as { userId: string }).userId,
        sessionId: isPreview ? null : (payload as { sessionId: string }).sessionId,
        previewSessionId: isPreview ? sessionId : null,
        lessonId,
        client
      });

      await videoAbuseService.enforceRateLimit({
        scope: "playlist",
        subject: sessionId,
        maxPerWindow: isPreview ? 10 : 30,
        event: {
          userId: isPreview ? null : (payload as { userId: string }).userId,
          sessionId: isPreview ? null : (payload as { sessionId: string }).sessionId,
          lessonId,
          previewSessionId: isPreview ? sessionId : null,
          client
        }
      });

      const lesson = await lessonRepository.findById(lessonId);
      if (!lesson) {
        res.status(404).json({ error: "LESSON_NOT_FOUND" });
        return;
      }

      if (lesson.videoHlsPath) {
        const candidatePath = path.resolve(getStorageRoot(), lesson.videoHlsPath);
        if (isWithinDir(getStorageRoot(), candidatePath)) {
          try {
            const playlist = await fs.readFile(candidatePath, "utf8");
            setVideoNoStoreHeaders(res);
            res.type("application/vnd.apple.mpegurl").send(rewritePlaylist(playlist, lessonId, token ?? ""));
            return;
          } catch {
            // Fall through to generated playlist.
          }
        }
      }

      setVideoNoStoreHeaders(res);
      res.type("application/vnd.apple.mpegurl").send(buildPlaylist(lessonId, token ?? ""));
    } catch (error) {
      handleLessonError(error, res, next);
    }
  },

  async key(req: Request, res: Response, next: NextFunction) {
    try {
      setVideoNoStoreHeaders(res);
      const lessonId = getFirstValue(req.params.id);
      const token = getFirstValue(req.query.token as string | string[] | undefined);
      if (!lessonId) {
        res.status(400).json({ error: "LESSON_ID_REQUIRED" });
        return;
      }

      if (token && token.length > MAX_TOKEN_LENGTH) {
        res.status(400).json({ error: "TOKEN_TOO_LONG" });
        return;
      }

      const client = getClientContext({ ip: req.ip, userAgent: req.get("user-agent") });
      const payload = await videoTokenService.validateToken({
        token,
        lessonId,
        rawRefreshToken: req.cookies.refresh_token as string | undefined,
        previewSessionIdCookie: req.cookies.preview_session as string | undefined,
        ip: req.ip,
        userAgent: req.get("user-agent") ?? undefined
      });

      const isPreview = "isPreview" in payload && (payload as { isPreview?: boolean }).isPreview;
      const sessionId = isPreview
        ? (payload as { previewSessionId: string }).previewSessionId
        : (payload as { sessionId: string }).sessionId;

      await videoAbuseService.enforceConcurrency({
        userId: isPreview ? null : (payload as { userId: string }).userId,
        sessionId: isPreview ? null : (payload as { sessionId: string }).sessionId,
        previewSessionId: isPreview ? sessionId : null,
        lessonId,
        client
      });

      await videoAbuseService.enforceRateLimit({
        scope: "key",
        subject: sessionId,
        maxPerWindow: isPreview ? 10 : 30,
        event: {
          userId: isPreview ? null : (payload as { userId: string }).userId,
          sessionId: isPreview ? null : (payload as { sessionId: string }).sessionId,
          lessonId,
          previewSessionId: isPreview ? sessionId : null,
          client
        }
      });

      const lesson = await lessonRepository.findById(lessonId);
      if (!lesson?.videoHlsPath) {
        res.status(404).json({ error: "KEY_NOT_FOUND" });
        return;
      }

      const baseDir = path.dirname(path.resolve(getStorageRoot(), lesson.videoHlsPath));
      if (!isWithinDir(getStorageRoot(), baseDir)) {
        res.status(404).json({ error: "KEY_NOT_FOUND" });
        return;
      }

      let key: Buffer;
      try {
        key = await fs.readFile(path.join(baseDir, "enc.key"));
      } catch {
        res.status(404).json({ error: "KEY_NOT_FOUND" });
        return;
      }

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

      const { videoToken, hlsUrl, expiresAt, previewSessionId } = await videoTokenService.issuePreviewToken({
        lessonId: firstLesson.id,
        ip: req.ip,
        userAgent: req.get("user-agent") ?? undefined
      });

      res.cookie("preview_session", previewSessionId, {
        httpOnly: true,
        secure: isHttpsRequest(req),
        sameSite: "strict",
        path: "/api/v1/video",
        maxAge: 15 * 60 * 1000
      });

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
      setVideoNoStoreHeaders(res);
      const lessonId = getFirstValue(req.params.id);
      const token = getFirstValue(req.query.token as string | string[] | undefined);
      const segment = getFirstValue(req.query.file as string | string[] | undefined) ?? getFirstValue(req.params.segment);
      if (!lessonId || !segment) {
        res.status(400).json({ error: "SEGMENT_REQUIRED" });
        return;
      }

      if (token && token.length > MAX_TOKEN_LENGTH) {
        res.status(400).json({ error: "TOKEN_TOO_LONG" });
        return;
      }

      const client = getClientContext({ ip: req.ip, userAgent: req.get("user-agent") });
      const payload = await videoTokenService.validateToken({
        token,
        lessonId,
        rawRefreshToken: req.cookies.refresh_token as string | undefined,
        previewSessionIdCookie: req.cookies.preview_session as string | undefined,
        ip: req.ip,
        userAgent: req.get("user-agent") ?? undefined
      });

      const isPreview = "isPreview" in payload && (payload as { isPreview?: boolean }).isPreview;
      const sessionId = isPreview
        ? (payload as { previewSessionId: string }).previewSessionId
        : (payload as { sessionId: string }).sessionId;

      await videoAbuseService.enforceConcurrency({
        userId: isPreview ? null : (payload as { userId: string }).userId,
        sessionId: isPreview ? null : (payload as { sessionId: string }).sessionId,
        previewSessionId: isPreview ? sessionId : null,
        lessonId,
        client
      });

      await videoAbuseService.enforceRateLimit({
        scope: "segment",
        subject: sessionId,
        maxPerWindow: isPreview ? 200 : 600,
        event: {
          userId: isPreview ? null : (payload as { userId: string }).userId,
          sessionId: isPreview ? null : (payload as { sessionId: string }).sessionId,
          lessonId,
          previewSessionId: isPreview ? sessionId : null,
          client
        }
      });

      const lesson = await lessonRepository.findById(lessonId);
      if (!lesson?.videoHlsPath) {
        res.type("video/mp2t").send(Buffer.alloc(0));
        return;
      }

      const trimmed = segment.trim();
      const lower = trimmed.toLowerCase();

      if (!trimmed) {
        res.status(404).json({ error: "SEGMENT_NOT_FOUND" });
        return;
      }

      if (trimmed.length > 255) {
        res.status(404).json({ error: "SEGMENT_NOT_FOUND" });
        return;
      }

      if (trimmed.includes("..")) {
        res.status(404).json({ error: "SEGMENT_NOT_FOUND" });
        return;
      }

      if (trimmed.includes("/")) {
        res.status(404).json({ error: "SEGMENT_NOT_FOUND" });
        return;
      }

      if (trimmed.includes("\\")) {
        res.status(404).json({ error: "SEGMENT_NOT_FOUND" });
        return;
      }

      if (trimmed.includes(":")) {
        res.status(404).json({ error: "SEGMENT_NOT_FOUND" });
        return;
      }

      if (trimmed.startsWith(".")) {
        res.status(404).json({ error: "SEGMENT_NOT_FOUND" });
        return;
      }

      if (trimmed.includes("~")) {
        res.status(404).json({ error: "SEGMENT_NOT_FOUND" });
        return;
      }

      if (lower.includes("%2e")) {
        res.status(404).json({ error: "SEGMENT_NOT_FOUND" });
        return;
      }

      if (lower.includes("%2f")) {
        res.status(404).json({ error: "SEGMENT_NOT_FOUND" });
        return;
      }

      if (lower.includes("%5c")) {
        res.status(404).json({ error: "SEGMENT_NOT_FOUND" });
        return;
      }

      const allowedExts = new Set([".ts", ".m4s", ".aac"]);
      if (!allowedExts.has(path.extname(trimmed).toLowerCase())) {
        res.status(404).json({ error: "SEGMENT_NOT_FOUND" });
        return;
      }

      const baseDir = path.dirname(path.resolve(getStorageRoot(), lesson.videoHlsPath));
      const candidate = path.resolve(baseDir, trimmed);
      if (!isWithinDir(getStorageRoot(), candidate)) {
        res.status(404).json({ error: "SEGMENT_NOT_FOUND" });
        return;
      }

      const [baseReal, fileReal] = await Promise.all([
        fs.realpath(baseDir).catch(() => null),
        fs.realpath(candidate).catch(() => null)
      ]);
      if (!baseReal || !fileReal || (!fileReal.startsWith(`${baseReal}${path.sep}`) && fileReal !== baseReal)) {
        res.status(404).json({ error: "SEGMENT_NOT_FOUND" });
        return;
      }

      const stat = await fs.stat(fileReal).catch(() => null);
      if (!stat || !stat.isFile()) {
        res.status(404).json({ error: "SEGMENT_NOT_FOUND" });
        return;
      }

      const ext = path.extname(trimmed).toLowerCase();
      const contentType = ext === ".aac" ? "audio/aac" : ext === ".m4s" ? "video/iso.segment" : "video/mp2t";
      res.type(contentType);

      const range = req.headers.range;
      if (!range) {
        createReadStream(fileReal).pipe(res);
        return;
      }

      const match = /^bytes=(\d+)-(\d+)?$/i.exec(range);
      if (!match) {
        res.status(416).end();
        return;
      }

      const start = Number(match[1]);
      const end = match[2] ? Number(match[2]) : stat.size - 1;
      if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || end >= stat.size) {
        res.status(416).end();
        return;
      }

      res.status(206);
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Content-Range", `bytes ${start}-${end}/${stat.size}`);
      res.setHeader("Content-Length", String(end - start + 1));

      createReadStream(fileReal, { start, end }).pipe(res);
    } catch (error) {
      handleLessonError(error, res, next);
    }
  }
};
