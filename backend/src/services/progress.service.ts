import crypto from "node:crypto";

import { redis } from "../config/redis.js";
import { prometheus } from "../observability/prometheus.js";
import { lessonRepository } from "../repositories/lesson.repository.js";
import { progressRepository } from "../repositories/progress.repository.js";
import { dashboardService } from "./dashboard.service.js";

const PROGRESS_CACHE_TTL_SECONDS = 5 * 60;

const progressCacheKey = (userId: string) => `student:progress:${userId}`;

export class ProgressError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

export const progressService = {
  async invalidateProgressCache(userId: string) {
    try {
      await redis.del(progressCacheKey(userId));
    } catch {
      // ignore redis failures
    }
  },

  async getProgressByLessonIds(userId: string, lessonIds: string[]) {
    if (lessonIds.length === 0) {
      return new Map<string, { completedAt: Date | null; lastPositionSeconds: number }>();
    }

    const key = progressCacheKey(userId);
    try {
      const cached = await redis.get(key);
      if (cached) {
        prometheus.recordCacheHit("student_progress");
        const parsed = JSON.parse(cached) as Record<string, { completedAt: string | null; lastPositionSeconds: number }>;
        const map = new Map<string, { completedAt: Date | null; lastPositionSeconds: number }>();
        for (const lessonId of lessonIds) {
          const value = parsed[lessonId];
          if (value) {
            map.set(lessonId, {
              completedAt: value.completedAt ? new Date(value.completedAt) : null,
              lastPositionSeconds: value.lastPositionSeconds ?? 0
            });
          }
        }
        return map;
      }
      prometheus.recordCacheMiss("student_progress");
    } catch {
      // ignore redis failures
    }

    const rows = await progressRepository.findManyByUser(userId);
    const record: Record<string, { completedAt: string | null; lastPositionSeconds: number }> = {};
    for (const row of rows) {
      record[row.lessonId] = {
        completedAt: row.completedAt ? row.completedAt.toISOString() : null,
        lastPositionSeconds: row.lastPositionSeconds
      };
    }

    try {
      await redis.set(key, JSON.stringify(record), "EX", PROGRESS_CACHE_TTL_SECONDS);
    } catch {
      // ignore redis failures
    }

    const map = new Map<string, { completedAt: Date | null; lastPositionSeconds: number }>();
    for (const lessonId of lessonIds) {
      const value = record[lessonId];
      if (value) {
        map.set(lessonId, {
          completedAt: value.completedAt ? new Date(value.completedAt) : null,
          lastPositionSeconds: value.lastPositionSeconds ?? 0
        });
      }
    }
    return map;
  },

  async updateProgress(
    userId: string,
    lessonId: string,
    input: {
      watchTimeSeconds: number;
      lastPositionSeconds: number;
      completed?: boolean;
    }
  ) {
    const lesson = await lessonRepository.findById(lessonId);
    if (!lesson?.isPublished) {
      throw new ProgressError("LESSON_NOT_FOUND", 404, "Lesson not found.");
    }

    const existing = await progressRepository.findByUserAndLesson(userId, lessonId);
    const watchTimeSeconds = Math.max(existing?.watchTimeSeconds ?? 0, input.watchTimeSeconds);
    const lastPositionSeconds = Math.max(0, input.lastPositionSeconds);
    const meetsCompletionThreshold =
      typeof lesson.durationSeconds === "number" && lesson.durationSeconds > 0
        ? watchTimeSeconds >= lesson.durationSeconds * 0.9
        : Boolean(input.completed);

    const completedAt = input.completed || meetsCompletionThreshold ? existing?.completedAt ?? new Date() : null;

    const progress = await progressRepository.upsert(userId, lessonId, {
      watchTimeSeconds,
      lastPositionSeconds,
      completedAt
    });

    const completion = await progressRepository.findCourseCompletion(userId);
    await this.invalidateProgressCache(userId);
    await dashboardService.invalidateStudentDashboard(userId);

    return {
      lastPositionSeconds: progress.lastPositionSeconds,
      watchTimeSeconds: progress.watchTimeSeconds,
      completedAt: progress.completedAt,
      courseCompletionPercentage: completion.percentage
    };
  },

  getCourseCompletion(userId: string) {
    return progressRepository.findCourseCompletion(userId);
  }
};
