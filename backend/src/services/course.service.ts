import { prisma } from "../config/database.js";
import { redis } from "../config/redis.js";
import { prometheus } from "../observability/prometheus.js";

export type PublicCourseResponse = {
  title: string;
  titleEn: string;
  titleAr: string;
  descriptionHtml: string;
  descriptionHtmlEn: string;
  descriptionHtmlAr: string;
  priceEgp: number;
  currency: string;
  lessonCount: number;
  totalDurationSeconds: number;
  isEnrollmentOpen: boolean;
  enrolled: boolean;
  lessons: Array<{
    id: string;
    title: string;
    titleAr: string;
    durationSeconds: number | null;
    sortOrder: number;
  }>;
  packages: Array<{
    id: string;
    titleEn: string;
    titleAr: string;
    descriptionEn: string | null;
    descriptionAr: string | null;
    priceEgp: number;
    currency: string;
    sortOrder: number;
  }>;
};

const PUBLIC_COURSE_CACHE_KEY = "course:public:v1";
const PUBLIC_COURSE_CACHE_TTL_SECONDS = 60;
const COURSE_PACKAGES_CACHE_KEY = "course:packages:v1";
const COURSE_SETTINGS_CACHE_KEY = "course:settings:v1";
const COURSE_PACKAGES_CACHE_TTL_SECONDS = 60 * 60;
const COURSE_SETTINGS_CACHE_TTL_SECONDS = 2 * 60 * 60;

const DEFAULT_TITLE_EN = "AI Workflow: From Idea to Production";
const DEFAULT_TITLE_AR = "AI Workflow: من الفكرة إلى الـ Production";

export const courseService = {
  async getCourseSettingsCached() {
    try {
      const cached = await redis.get(COURSE_SETTINGS_CACHE_KEY);
      if (cached) {
        prometheus.recordCacheHit("course_settings");
        return JSON.parse(cached) as Awaited<ReturnType<typeof prisma.courseSettings.findUnique>>;
      }
    } catch {
      // ignore redis failures
    }
    prometheus.recordCacheMiss("course_settings");

    const settings = await prisma.courseSettings.findUnique({ where: { id: 1 } });
    try {
      await redis.set(COURSE_SETTINGS_CACHE_KEY, JSON.stringify(settings), "EX", COURSE_SETTINGS_CACHE_TTL_SECONDS);
    } catch {
      // ignore redis failures
    }
    return settings;
  },

  async getCoursePackagesCached() {
    try {
      const cached = await redis.get(COURSE_PACKAGES_CACHE_KEY);
      if (cached) {
        prometheus.recordCacheHit("course_packages");
        return JSON.parse(cached) as Awaited<ReturnType<typeof prisma.coursePackage.findMany>>;
      }
    } catch {
      // ignore redis failures
    }
    prometheus.recordCacheMiss("course_packages");

    const packages = await prisma.coursePackage.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" }
    });
    try {
      await redis.set(COURSE_PACKAGES_CACHE_KEY, JSON.stringify(packages), "EX", COURSE_PACKAGES_CACHE_TTL_SECONDS);
    } catch {
      // ignore redis failures
    }
    return packages;
  },

  async getPublicCourse(): Promise<PublicCourseResponse> {
    try {
      const cached = await redis.get(PUBLIC_COURSE_CACHE_KEY);
      if (cached) {
        prometheus.recordCacheHit("course_public");
        return JSON.parse(cached) as PublicCourseResponse;
      }
    } catch {
      // ignore redis failures
    }
    prometheus.recordCacheMiss("course_public");

    const [settings, lessons, packages] = await Promise.all([
      courseService.getCourseSettingsCached(),
      prisma.lesson.findMany({
        where: { isPublished: true },
        select: { id: true, titleEn: true, titleAr: true, durationSeconds: true, sortOrder: true },
        orderBy: { sortOrder: "asc" }
      }),
      courseService.getCoursePackagesCached()
    ]);

    const primaryPackage = packages[0];
    const response: PublicCourseResponse = {
      title: settings?.titleEn ?? DEFAULT_TITLE_EN,
      titleEn: settings?.titleEn ?? DEFAULT_TITLE_EN,
      titleAr: settings?.titleAr ?? DEFAULT_TITLE_AR,
      descriptionHtml: settings?.descriptionEn ?? "",
      descriptionHtmlEn: settings?.descriptionEn ?? "",
      descriptionHtmlAr: settings?.descriptionAr ?? "",
      priceEgp: primaryPackage ? primaryPackage.pricePiasters / 100 : settings ? settings.pricePiasters / 100 : 0,
      currency: primaryPackage?.currency ?? settings?.currency ?? "EGP",
      lessonCount: lessons.length,
      totalDurationSeconds: lessons.reduce((total, lesson) => total + (lesson.durationSeconds ?? 0), 0),
      isEnrollmentOpen: settings?.isEnrollmentOpen ?? false,
      enrolled: false,
      lessons: lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.titleEn,
        titleAr: lesson.titleAr,
        durationSeconds: lesson.durationSeconds,
        sortOrder: lesson.sortOrder
      })),
      packages: packages.map((coursePackage) => ({
        id: coursePackage.id,
        titleEn: coursePackage.titleEn,
        titleAr: coursePackage.titleAr,
        descriptionEn: coursePackage.descriptionEn,
        descriptionAr: coursePackage.descriptionAr,
        priceEgp: coursePackage.pricePiasters / 100,
        currency: coursePackage.currency,
        sortOrder: coursePackage.sortOrder
      }))
    };

    try {
      await redis.set(PUBLIC_COURSE_CACHE_KEY, JSON.stringify(response), "EX", PUBLIC_COURSE_CACHE_TTL_SECONDS);
    } catch {
      // ignore redis failures
    }
    return response;
  },

  async invalidatePublicCourseCache(): Promise<void> {
    try {
      await redis.del(PUBLIC_COURSE_CACHE_KEY, COURSE_PACKAGES_CACHE_KEY, COURSE_SETTINGS_CACHE_KEY);
    } catch {
      // ignore redis failures
    }
  }
};
