import { Router } from "express";

import { prisma } from "../config/database.js";
import { enrollmentRepository } from "../repositories/enrollment.repository.js";
import { lessonRepository } from "../repositories/lesson.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { enrollmentService } from "../services/enrollment.service.js";
import { lessonService } from "../services/lesson.service.js";
import { videoTokenService, VideoTokenError } from "../services/video-token.service.js";
import { maskEmail } from "../utils/mask-email.js";
import { deduplicationMiddleware } from "../middleware/deduplication.middleware.js";

const router = Router({ mergeParams: true });

const getParam = (value: unknown) => (Array.isArray(value) ? value[0] : typeof value === "string" ? value : null);

router.get(
  "/detail",
  deduplicationMiddleware({
    key: (req) => `${req.user?.userId ?? "anon"}:lesson-detail:${getParam((req.params as Record<string, unknown>).id) ?? ""}`
  }),
  async (req, res, next) => {
    try {
      const lessonId = getParam((req.params as Record<string, unknown>).id);
      if (!lessonId) {
        res.status(400).json({ error: "LESSON_ID_REQUIRED" });
        return;
      }

      const userId = req.user!.userId;

      const enrollment = await enrollmentRepository.findByUserId(userId);
      if (!enrollment || enrollment.status !== "ACTIVE") {
        res.status(403).json({ error: "NOT_ENROLLED" });
        return;
      }

      const lesson = await lessonRepository.findPublishedForStudent(lessonId, userId);
      if (!lesson) {
        res.status(404).json({ error: "LESSON_NOT_FOUND" });
        return;
      }

      const unlocksAt =
        typeof lesson.dripDays === "number"
          ? new Date(enrollment.enrolledAt.getTime() + lesson.dripDays * 24 * 60 * 60 * 1000)
          : null;
      if (unlocksAt && unlocksAt > new Date()) {
        res.status(403).json({ error: "LESSON_LOCKED", unlocksAt: unlocksAt.toISOString() });
        return;
      }

      const user = await userRepository.findById(userId);
      if (!user) {
        res.status(401).json({ error: "UNAUTHORIZED" });
        return;
      }

      const token = await videoTokenService.issueToken(user, lesson.id, req.user!.sessionId);

      const [metadata, notes, enrollmentStatus] = await Promise.all([
        lessonService.getLessonMetadata(lessonId),
        prisma.note.findMany({
          where: { userId, lessonId },
          orderBy: { updatedAt: "desc" },
          select: { id: true, content: true, updatedAt: true }
        }),
        enrollmentService.getStatus(userId)
      ]);

      const progress = lesson.progress[0];

      res.json({
        lesson: {
          id: lesson.id,
          title: metadata?.titleEn ?? lesson.titleEn,
          titleEn: metadata?.titleEn ?? lesson.titleEn,
          titleAr: metadata?.titleAr ?? lesson.titleAr,
          descriptionHtml: metadata?.descriptionEn ?? lesson.descriptionEn ?? "",
          descriptionHtmlEn: metadata?.descriptionEn ?? lesson.descriptionEn ?? "",
          descriptionHtmlAr: metadata?.descriptionAr ?? lesson.descriptionAr ?? "",
          durationSeconds: metadata?.durationSeconds ?? lesson.durationSeconds,
          videoToken: token.videoToken,
          hlsUrl: token.hlsUrl,
          expiresAt: token.expiresAt.toISOString(),
          watermark: {
            name: user.fullName,
            maskedEmail: maskEmail(user.email)
          },
          progress: {
            lastPositionSeconds: progress?.lastPositionSeconds ?? 0,
            completedAt: progress?.completedAt ?? null,
            watchTimeSeconds: progress?.watchTimeSeconds ?? 0
          },
          section: metadata?.section
            ? {
                id: metadata.section.id,
                titleEn: metadata.section.titleEn,
                titleAr: metadata.section.titleAr
              }
            : lesson.sectionId && lesson.section
              ? {
                  id: lesson.section.id,
                  titleEn: lesson.section.titleEn,
                  titleAr: lesson.section.titleAr
                }
              : null,
          resources: metadata?.resources ?? []
        },
        sections: metadata?.section ? [metadata.section] : [],
        comments: { total: 0, items: [] as unknown[] },
        notes: notes.map((note) => ({
          id: note.id,
          text: note.content,
          timestamp: note.updatedAt.toISOString()
        })),
        enrollment: {
          status: enrollmentStatus.status ?? null,
          accessUntil: null as string | null
        }
      });
    } catch (error) {
      if (error instanceof VideoTokenError) {
        res.status(error.status).json({ error: error.code, message: error.message });
        return;
      }
      next(error);
    }
  }
);

export { router as lessonDetailRoutes };
