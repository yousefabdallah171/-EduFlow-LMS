import crypto from "node:crypto";

import { redis } from "../config/redis.js";
import { prisma } from "../config/database.js";

const publishedLessonsCacheKey = "lessons:published:v1";
const publishedGroupedCacheKey = "lessons:published-grouped:v1";
const cacheVersionKey = "lessons:cache-version:v1";

const LESSONS_CACHE_TTL_SECONDS = 2 * 60 * 60;

const getCacheVersion = async () => (await redis.get(cacheVersionKey)) ?? "0";

const bumpCacheVersion = async () => {
  await redis.set(cacheVersionKey, String(Date.now()), "EX", LESSONS_CACHE_TTL_SECONDS);
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

export const lessonService = {
  async invalidatePublishedLessonsCache() {
    await bumpCacheVersion();
  },

  async getPublishedLessons(): Promise<PublishedLessonSummary[]> {
    const version = await getCacheVersion();
    const key = hashKey(publishedLessonsCacheKey, version);
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached) as PublishedLessonSummary[];

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

    await redis.set(key, JSON.stringify(lessons), "EX", LESSONS_CACHE_TTL_SECONDS);
    return lessons;
  },

  async getPublishedLessonsGrouped(): Promise<PublishedSectionWithLessons[]> {
    const version = await getCacheVersion();
    const key = hashKey(publishedGroupedCacheKey, version);
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached) as PublishedSectionWithLessons[];

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

    await redis.set(key, JSON.stringify(sections), "EX", LESSONS_CACHE_TTL_SECONDS);
    return sections;
  }
};

