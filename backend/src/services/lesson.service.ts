import crypto from "node:crypto";
import type { VideoStatus } from "@prisma/client";

import { redis } from "../config/redis.js";
import { env } from "../config/env.js";
import { prisma } from "../config/database.js";
import { prometheus } from "../observability/prometheus.js";

const publishedLessonsCacheKey = "lessons:published:v1";
const publishedGroupedCacheKey = "lessons:published-grouped:v1";
const adminLessonsCacheKey = "lessons:admin:v1";
const cacheVersionKey = "lessons:cache-version:v1";
const lessonMetadataCacheKey = (lessonId: string) => `lesson:metadata:${lessonId}`;
const publishedLessonCountCacheKey = "lesson:published-count";

const LESSONS_CACHE_TTL_SECONDS = env.CACHE_TTL_LESSON_METADATA_SECONDS;
const LESSON_METADATA_CACHE_TTL_SECONDS = env.CACHE_TTL_LESSON_METADATA_SECONDS;

const getCacheVersion = async () => {
  try {
    return (await redis.get(cacheVersionKey)) ?? "0";
  } catch {
    return "0";
  }
};

const bumpCacheVersion = async () => {
  try {
    await redis.set(cacheVersionKey, String(Date.now()), "EX", LESSONS_CACHE_TTL_SECONDS);
  } catch {
    // ignore redis failures
  }
};

const hashKey = (base: string, version: string) =>
  `${base}:${crypto.createHash("sha256").update(version).digest("hex")}`;

export type PublishedLessonSummary = {
  id: string;
  titleEn: string;
  titleAr: string | null;
  durationSeconds: number | null;
  sortOrder: number;
  dripDays: number | null;
  sectionId: string | null;
};

export type PublishedSectionWithLessons = {
  id: string;
  titleEn: string;
  titleAr: string;
  sortOrder: number;
  lessons: Array<{
    id: string;
    titleEn: string;
    titleAr: string;
    descriptionEn: string | null;
    descriptionAr: string | null;
    durationSeconds: number | null;
    sortOrder: number;
    dripDays: number | null;
  }>;
};

export type LessonMetadata = {
  id: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string | null;
  descriptionAr: string | null;
  videoHlsPath: string | null;
  videoStatus: VideoStatus;
  durationSeconds: number | null;
  sortOrder: number;
  isPublished: boolean;
  isPreview: boolean;
  dripDays: number | null;
  sectionId: string | null;
  section: { id: string; titleEn: string; titleAr: string; sortOrder: number } | null;
  resources: Array<{
    id: string;
    title: string;
    fileUrl: string;
    fileSizeBytes: number;
    createdAt: string;
  }>;
};

export const lessonService = {
  async invalidatePublishedLessonsCache() {
    await bumpCacheVersion();
    try {
      await redis.del(publishedLessonCountCacheKey, adminLessonsCacheKey);
    } catch {
      // ignore redis failures
    }
  },

  async invalidateLessonMetadataCache(lessonIds: string | string[]) {
    const ids = Array.isArray(lessonIds) ? lessonIds : [lessonIds];
    if (ids.length === 0) return;
    try {
      await redis.del(...ids.map((id) => lessonMetadataCacheKey(id)));
    } catch {
      // ignore redis failures
    }
  },

  async getLessonMetadata(lessonId: string): Promise<LessonMetadata | null> {
    const key = lessonMetadataCacheKey(lessonId);
    try {
      const cached = await redis.get(key);
      if (cached) {
        prometheus.recordCacheHit("lesson_metadata");
        return JSON.parse(cached) as LessonMetadata;
      }
    } catch {
      // ignore redis failures
    }
    prometheus.recordCacheMiss("lesson_metadata");

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        titleEn: true,
        titleAr: true,
        descriptionEn: true,
        descriptionAr: true,
        videoHlsPath: true,
        videoStatus: true,
        durationSeconds: true,
        sortOrder: true,
        isPublished: true,
        isPreview: true,
        dripDays: true,
        sectionId: true,
        section: {
          select: {
            id: true,
            titleEn: true,
            titleAr: true,
            sortOrder: true
          }
        },
        resources: {
          select: {
            id: true,
            title: true,
            fileUrl: true,
            fileSizeBytes: true,
            createdAt: true
          },
          orderBy: { createdAt: "desc" }
        }
      }
    });

    if (!lesson) return null;

    const payload: LessonMetadata = {
      ...lesson,
      titleAr: lesson.titleAr,
      section: lesson.section
        ? {
            id: lesson.section.id,
            titleEn: lesson.section.titleEn,
            titleAr: lesson.section.titleAr,
            sortOrder: lesson.section.sortOrder
          }
        : null,
      resources: lesson.resources.map((resource) => ({
        id: resource.id,
        title: resource.title,
        fileUrl: resource.fileUrl,
        fileSizeBytes: Number(resource.fileSizeBytes),
        createdAt: resource.createdAt.toISOString()
      }))
    };

    try {
      await redis.set(key, JSON.stringify(payload), "EX", LESSON_METADATA_CACHE_TTL_SECONDS);
    } catch {
      // ignore redis failures
    }

    return payload;
  },

  async getPublishedLessonCount(): Promise<number> {
    try {
      const cached = await redis.get(publishedLessonCountCacheKey);
      if (cached !== null) {
        prometheus.recordCacheHit("lesson_count");
        return parseInt(cached, 10);
      }
    } catch {
      // ignore redis failures
    }
    prometheus.recordCacheMiss("lesson_count");

    const count = await prisma.lesson.count({ where: { isPublished: true } });

    try {
      await redis.set(publishedLessonCountCacheKey, String(count), "EX", LESSONS_CACHE_TTL_SECONDS);
    } catch {
      // ignore redis failures
    }

    return count;
  },

  async getPublishedLessons(): Promise<PublishedLessonSummary[]> {
    const version = await getCacheVersion();
    const key = hashKey(publishedLessonsCacheKey, version);
    try {
      const cached = await redis.get(key);
      if (cached) {
        prometheus.recordCacheHit("lessons_published");
        return JSON.parse(cached) as PublishedLessonSummary[];
      }
    } catch {
      // ignore redis failures
    }
    prometheus.recordCacheMiss("lessons_published");

    const lessons = await prisma.lesson.findMany({
      where: { isPublished: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        titleEn: true,
        titleAr: true,
        durationSeconds: true,
        sortOrder: true,
        dripDays: true,
        sectionId: true
      }
    });

    try {
      await redis.set(key, JSON.stringify(lessons), "EX", LESSONS_CACHE_TTL_SECONDS);
    } catch {
      // ignore redis failures
    }
    return lessons;
  },

  async getPublishedLessonsGrouped(): Promise<PublishedSectionWithLessons[]> {
    const version = await getCacheVersion();
    const key = hashKey(publishedGroupedCacheKey, version);
    try {
      const cached = await redis.get(key);
      if (cached) {
        prometheus.recordCacheHit("lessons_grouped");
        return JSON.parse(cached) as PublishedSectionWithLessons[];
      }
    } catch {
      // ignore redis failures
    }
    prometheus.recordCacheMiss("lessons_grouped");

    const sections = await prisma.section.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        titleEn: true,
        titleAr: true,
        sortOrder: true,
        lessons: {
          where: { isPublished: true },
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            titleEn: true,
            titleAr: true,
            descriptionEn: true,
            descriptionAr: true,
            durationSeconds: true,
            sortOrder: true,
            dripDays: true
          }
        }
      }
    });

    try {
      await redis.set(key, JSON.stringify(sections), "EX", LESSONS_CACHE_TTL_SECONDS);
    } catch {
      // ignore redis failures
    }
    return sections;
  },

  async getAdminLessons() {
    try {
      const cached = await redis.get(adminLessonsCacheKey);
      if (cached) {
        prometheus.recordCacheHit("lessons_admin");
        return JSON.parse(cached);
      }
    } catch {
      // ignore redis failures
    }
    prometheus.recordCacheMiss("lessons_admin");

    const lessons = await prisma.lesson.findMany({
      include: {
        section: {
          select: {
            id: true,
            titleEn: true,
            titleAr: true
          }
        }
      },
      orderBy: [{ sectionId: "asc" }, { sortOrder: "asc" }]
    });

    try {
      await redis.set(adminLessonsCacheKey, JSON.stringify(lessons), "EX", LESSONS_CACHE_TTL_SECONDS);
    } catch {
      // ignore redis failures
    }

    return lessons;
  }
};

