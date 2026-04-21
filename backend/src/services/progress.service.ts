import crypto from "node:crypto";

import { redis } from "../config/redis.js";
import { lessonRepository } from "../repositories/lesson.repository.js";
import { progressRepository } from "../repositories/progress.repository.js";

const PROGRESS_CACHE_TTL_SECONDS = 5 * 60;
const progressCacheVersionKey = "progress:cache-version:v1";

const getCacheVersion = async () => (await redis.get(progressCacheVersionKey)) ?? "0";

const bumpCacheVersion = async () => {
  await redis.set(progressCacheVersionKey, String(Date.now()), "EX", PROGRESS_CACHE_TTL_SECONDS);
};

const progressCacheKey = (userId: string, version: string) => {
  const hash = crypto.createHash("sha256").update(`${version}:${userId}`).digest("hex");
  return `progress:${hash}`;
};

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
  async invalidateProgressCache() {
    await bumpCacheVersion();
  },

  async getProgressByLessonIds(userId: string, lessonIds: string[]) {
    if (lessonIds.length === 0) {
      return new Map<string, { completedAt: Date | null; lastPositionSeconds: number }>();
    }

    const version = await getCacheVersion();
    const key = progressCacheKey(userId, version);
    const cached = await redis.get(key);
    if (cached) {
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

    const rows = await progressRepository.findManyByUser(userId);
    const record: Record<string, { completedAt: string | null; lastPositionSeconds: number }> = {};
    for (const row of rows) {
      record[row.lessonId] = {
        completedAt: row.completedAt ? row.completedAt.toISOString() : null,
        lastPositionSeconds: row.lastPositionSeconds
      };
    }

    await redis.set(key, JSON.stringify(record), "EX", PROGRESS_CACHE_TTL_SECONDS);

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
    await this.invalidateProgressCache();

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
