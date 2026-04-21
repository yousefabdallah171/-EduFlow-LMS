import { prisma } from "../config/database.js";
import { redis } from "../config/redis.js";

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

const DEFAULT_TITLE_EN = "AI Workflow: From Idea to Production";
const DEFAULT_TITLE_AR = "AI Workflow: من الفكرة إلى الـ Production";

export const courseService = {
  async getPublicCourse(): Promise<PublicCourseResponse> {
    const cached = await redis.get(PUBLIC_COURSE_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached) as PublicCourseResponse;
    }

    const [settings, lessons, packages] = await Promise.all([
      prisma.courseSettings.findUnique({ where: { id: 1 } }),
      prisma.lesson.findMany({
        where: { isPublished: true },
        select: { id: true, titleEn: true, titleAr: true, durationSeconds: true, sortOrder: true },
        orderBy: { sortOrder: "asc" }
      }),
      prisma.coursePackage.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" }
      })
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

    await redis.set(PUBLIC_COURSE_CACHE_KEY, JSON.stringify(response), "EX", PUBLIC_COURSE_CACHE_TTL_SECONDS);
    return response;
  },

  async invalidatePublicCourseCache(): Promise<void> {
    await redis.del(PUBLIC_COURSE_CACHE_KEY);
  }
};
