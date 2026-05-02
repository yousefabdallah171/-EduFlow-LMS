import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, CircleDot, LockKeyhole, LogIn, PlayCircle, Plus, Trophy } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { StudentShell } from "@/components/layout/StudentShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { SEO } from "@/components/shared/SEO";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useEnrollment } from "@/hooks/useEnrollment";
import { api } from "@/lib/api";
import { formatOfferDuration, formatOfferPrice, getPricingCardById } from "@/lib/course-offer";
import { demoLessons, isDemoMode } from "@/lib/demo";
import { formatClockDuration, formatDate, pickLocalizedText, resolveLocale } from "@/lib/locale";
import { CACHE_TIME, getGCTime } from "@/lib/query-config";
import { SEO_PAGES } from "@/lib/seo-config";
import { cn } from "@/lib/utils";

type LessonSummary = {
  id: string;
  title: string;
  titleEn?: string;
  titleAr?: string | null;
  durationSeconds: number | null;
  sortOrder: number;
  isUnlocked: boolean;
  unlocksAt: string | null;
  completedAt: string | null;
  lastPositionSeconds: number;
};

type PublicLesson = {
  id: string;
  title: string;
  titleAr: string | null;
  durationSeconds: number | null;
  sortOrder: number;
};

type CoursePackage = {
  id: string;
  titleEn: string;
  titleAr: string;
  descriptionEn?: string | null;
  descriptionAr?: string | null;
  priceEgp: number;
  currency: string;
};

type CourseInfo = {
  title: string;
  titleEn?: string;
  titleAr?: string | null;
  descriptionHtml?: string;
  descriptionHtmlEn?: string;
  descriptionHtmlAr?: string;
  priceEgp: number;
  currency: string;
  lessonCount: number;
  totalDurationSeconds?: number;
  lessons: PublicLesson[];
  packages?: CoursePackage[];
};

const PublicCourseView = ({
  prefix,
  t,
  isAr,
  locale
}: {
  prefix: string;
  t: (k: string, opts?: Record<string, unknown>) => string;
  isAr: boolean;
  locale: "en" | "ar";
}) => {
  const navigate = useNavigate();

  const courseQuery = useQuery({
    queryKey: ["course"],
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const response = await api.get<CourseInfo>("/course");
      return response.data;
    },
    staleTime: CACHE_TIME.MEDIUM,
    gcTime: getGCTime(CACHE_TIME.MEDIUM)
  });

  const course = courseQuery.data;
  const courseTitle = pickLocalizedText(locale, course?.titleEn ?? course?.title, course?.titleAr);
  const primaryPackage = course?.packages?.[0];
  const featuredPackage = course?.packages?.[1];
  const primaryOffer = getPricingCardById(t, primaryPackage?.id);
  const featuredOffer = getPricingCardById(t, featuredPackage?.id);
  const totalDurationLabel = formatOfferDuration(course?.totalDurationSeconds ?? 0, locale);

  const sidebarActions = [
    { icon: CircleDot, label: t("actions.getCourseAccess"), href: `${prefix}/checkout`, accent: true },
    { icon: PlayCircle, label: t("course.public.watchFreePreview"), href: `${prefix}/preview` },
    { icon: LogIn, label: t("actions.logIn"), href: `${prefix}/login` },
    { icon: Plus, label: t("actions.createAccount"), href: `${prefix}/register` }
  ];

  return (
    <main className="dashboard-page min-h-dvh px-4 py-6 sm:px-6" style={{ backgroundColor: "var(--color-page)" }}>
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-5 md:grid-cols-[240px_minmax(0,1fr)] md:items-start">
          <aside className="dashboard-panel dashboard-sidebar hidden p-3 md:block">
            <div className="mb-3 rounded-[22px] p-4 text-center" style={{ backgroundColor: "var(--color-brand-muted)" }}>
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl shadow-sm" style={{ background: "var(--gradient-brand)" }}>
                <span className="font-mono text-sm font-black text-white">YA</span>
              </div>
              <p className="mt-3 text-sm font-semibold leading-6" style={{ color: "var(--color-text-primary)" }}>
                {courseTitle || t("course.public.titleFallback")}
              </p>
            </div>

            <p className={cn("mb-1.5 px-3 text-[10px] font-bold tracking-[0.16em]", !isAr && "uppercase")} style={{ color: "var(--color-text-muted)" }}>
              {t("course.public.actions")}
            </p>
            <nav className="space-y-0.5">
              {sidebarActions.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.label}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium no-underline transition-colors",
                      item.accent ? "text-white shadow-sm hover:opacity-95" : "hover:bg-surface2"
                    )}
                    style={item.accent ? { background: "var(--gradient-brand)" } : { color: "var(--color-text-secondary)" }}
                    to={item.href}
                  >
                    <Icon className={cn("h-4 w-4", item.accent ? "opacity-85" : "text-brand-600 opacity-70")} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {course ? (
              <div className="dashboard-panel dashboard-panel--accent mt-4 rounded-[22px] p-3">
                <p className={cn("text-[10px] font-bold tracking-[0.16em]", !isAr && "uppercase")} style={{ color: "var(--color-text-muted)" }}>
                  {primaryOffer?.kicker ?? t("checkout.coursePrice")}
                </p>
                <p className="mt-2 text-sm font-bold text-brand-600">
                  {primaryOffer?.title ?? (isAr ? primaryPackage?.titleAr : primaryPackage?.titleEn)}
                </p>
                {primaryOffer?.description ? (
                  <p className="mt-2 text-xs leading-6" style={{ color: "var(--color-text-secondary)" }}>
                    {primaryOffer.description}
                  </p>
                ) : null}
                <p className="mt-3 font-display text-2xl font-bold text-brand-600" dir="ltr">
                  {formatOfferPrice(course.priceEgp, course.currency, locale)}
                </p>
                {primaryOffer?.savePill ? (
                  <p className="mt-1 text-xs font-semibold text-brand-600">{primaryOffer.savePill}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: "var(--color-surface-2)", color: "var(--color-text-primary)" }}>
                    {t("course.public.lessonCount", { count: course.lessonCount })}
                  </span>
                  {totalDurationLabel ? (
                    <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: "var(--color-brand-muted)", color: "var(--color-brand-text)" }}>
                      {totalDurationLabel}
                    </span>
                  ) : null}
                </div>
                {featuredOffer?.featuredBadge ? (
                  <p className="mt-3 rounded-[18px] px-3 py-2 text-xs font-semibold leading-6" style={{ backgroundColor: "color-mix(in oklab, var(--color-brand) 10%, transparent)", color: "var(--color-text-primary)" }}>
                    {featuredOffer.featuredBadge}
                  </p>
                ) : null}
              </div>
            ) : null}
          </aside>

          <div className="space-y-5">
            <PageHeader
              hero
              eyebrow={courseTitle || t("app.title")}
              title={courseTitle || t("course.public.titleFallback")}
              description={t("course.public.unlockMessage")}
              actions={
                <div className="flex flex-wrap gap-3">
                  <Link
                    className="inline-flex min-h-11 items-center rounded-xl px-5 py-2.5 text-sm font-bold text-white no-underline shadow-sm transition-all hover:opacity-95"
                    style={{ background: "var(--gradient-brand)" }}
                    to={`${prefix}/checkout`}
                  >
                    {t("actions.getCourseAccess")}
                  </Link>
                  <Link
                    className="rounded-xl border px-5 py-2.5 text-sm font-medium no-underline transition-colors hover:bg-surface2"
                    style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                    to={`${prefix}/login`}
                  >
                    {t("actions.logIn")}
                  </Link>
                </div>
              }
            />

            <div className="dashboard-panel dashboard-panel--accent flex flex-wrap items-center justify-between gap-3 rounded-[22px] p-4">
              <div>
                <p className={cn("text-xs font-bold tracking-[0.16em] text-brand-600", !isAr && "uppercase")}>
                  {t("course.freePreview")}
                </p>
                <p className="mt-0.5 text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                  {t("course.public.firstLessonFree")}
                </p>
              </div>
              <Link
                className="flex-shrink-0 rounded-xl px-4 py-2 text-sm font-bold text-white no-underline shadow-sm transition-all hover:opacity-95"
                style={{ background: "var(--gradient-brand)" }}
                to={`${prefix}/preview`}
              >
                {t("actions.watchPreview")}
              </Link>
            </div>

            {courseQuery.isLoading ? (
              <div className="rounded-[28px] border p-8 text-center shadow-card" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
                <p className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>{t("common.loading")}</p>
              </div>
            ) : course?.lessons && course.lessons.length > 0 ? (
              <div className="dashboard-panel overflow-hidden">
                <div className="flex items-center justify-between p-5" style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <p className={cn("text-xs font-bold tracking-[0.16em] text-brand-600", !isAr && "uppercase")}>
                    {t("course.public.content")}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: "var(--color-surface-2)", color: "var(--color-text-muted)" }}>
                      {t("course.public.lessonCount", { count: course.lessons.length })}
                    </span>
                    {totalDurationLabel ? (
                      <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: "var(--color-brand-muted)", color: "var(--color-brand-text)" }}>
                        {totalDurationLabel}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="divide-y" style={{ borderColor: "var(--color-border)" }}>
                  {course.lessons.map((lesson, idx) => {
                    const title = isAr && lesson.titleAr ? lesson.titleAr : lesson.title;
                    const isFirst = idx === 0;

                    return (
                      <button
                        key={lesson.id}
                        type="button"
                        className="flex w-full flex-col items-start gap-3 px-5 py-4 text-start transition-colors hover:bg-surface2 sm:flex-row sm:items-center sm:justify-between"
                        onClick={() => {
                          if (isFirst) {
                            navigate(`${prefix}/preview`);
                          } else {
                            navigate(`${prefix}/login`);
                          }
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
                            style={{
                              backgroundColor: isFirst ? "var(--color-brand-muted)" : "var(--color-surface-2)",
                              color: isFirst ? "var(--color-brand)" : "var(--color-text-secondary)"
                            }}
                          >
                            {isFirst ? <PlayCircle className="h-4 w-4" /> : <LockKeyhole className="h-4 w-4" />}
                          </span>
                          <div>
                            <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                              {title}
                            </p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
                              <span>{isFirst ? t("course.public.freeWatchNow") : t("course.public.loginRequired")}</span>
                              {lesson.durationSeconds ? (
                                <span dir="ltr">{formatClockDuration(lesson.durationSeconds, locale)}</span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                        <span className="text-xs font-medium text-brand-600 sm:flex-shrink-0">
                          {isFirst ? t("course.public.preview") : t("actions.logIn")}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <p className="text-center text-xs" style={{ color: "var(--color-text-muted)" }}>
              {t("course.public.newHere")}{" "}
              <Link className="font-semibold text-brand-600 no-underline hover:underline" to={`${prefix}/register`}>
                {t("landing.createAccount")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
};

export const Course = () => {
  const { locale } = useParams();
  const { t, i18n } = useTranslation();
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";
  const resolvedLocale = resolveLocale(i18n.language);
  const isAr = resolvedLocale === "ar";
  const demo = isDemoMode();
  const { user } = useAuth();
  const { statusQuery } = useEnrollment();
  const isEnrolled = statusQuery.data?.enrolled && statusQuery.data?.status === "ACTIVE";

  const lessonsQuery = useQuery({
    queryKey: ["course-lessons"],
    enabled: Boolean(isEnrolled || demo),
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (demo) {
        return demoLessons.map((lesson) => ({
          ...lesson,
          titleEn: lesson.title,
          titleAr: null
        }));
      }
      const response = await api.get<{ lessons: LessonSummary[] }>("/lessons");
      return response.data.lessons;
    }
  });

  const completedCount = lessonsQuery.data?.filter((lesson) => lesson.completedAt).length ?? 0;
  const totalCount = lessonsQuery.data?.length ?? 0;
  const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const nextLesson = lessonsQuery.data?.find((lesson) => lesson.isUnlocked && !lesson.completedAt);
  const resumeLesson = lessonsQuery.data?.find((lesson) => lesson.lastPositionSeconds > 0 && !lesson.completedAt);
  const featuredLesson = resumeLesson ?? nextLesson ?? lessonsQuery.data?.find((lesson) => lesson.isUnlocked) ?? null;

  if (!user && !demo) {
    return <PublicCourseView prefix={prefix} t={t} isAr={isAr} locale={resolvedLocale} />;
  }

  return (
    <StudentShell>
      <>
        <SEO page={SEO_PAGES.course} />
        <PageHeader
          hero
          backHref={`${prefix}/dashboard`}
          backLabel={t("nav.dashboard")}
          eyebrow={isEnrolled ? t("course.welcomeBack") : t("course.title")}
          title={user ? user.fullName : t("course.titleFallback")}
          description={isEnrolled ? t("course.active") : t("course.notEnrolled")}
          actions={
            isEnrolled ? (
              <div className="flex flex-wrap gap-3">
                {featuredLesson ? (
                  <Link
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white no-underline shadow-sm transition-all hover:opacity-95"
                    style={{ background: "var(--gradient-brand)" }}
                    to={`${prefix}/lessons/${featuredLesson.id}`}
                  >
                    {resumeLesson ? t("actions.resume") : t("course.continueLearning")}
                    <ArrowRight className="icon-dir h-4 w-4" />
                  </Link>
                ) : null}
                <Link
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-5 py-3 text-sm font-medium no-underline transition-colors hover:bg-surface2"
                  style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                  to={`${prefix}/progress`}
                >
                  <Trophy className="h-4 w-4 text-brand-600" />
                  {t("student.progress.title")}
                </Link>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                <Link
                  className="inline-flex min-h-11 items-center rounded-xl px-5 py-3 text-sm font-bold text-white no-underline shadow-sm transition-all hover:opacity-95"
                  style={{ background: "var(--gradient-brand)" }}
                  to={`${prefix}/checkout`}
                >
                  {t("course.getAccess")}
                </Link>
                <Link
                  className="inline-flex min-h-11 items-center rounded-xl border px-5 py-3 text-sm font-medium no-underline transition-colors hover:bg-surface2"
                  style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                  to={`${prefix}/preview`}
                >
                  {t("course.watchFreeLesson")}
                </Link>
              </div>
            )
          }
        />

        {isEnrolled && totalCount > 0 ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="dashboard-panel dashboard-panel--accent p-5">
              <p className={cn("text-xs font-semibold tracking-[0.16em]", !isAr && "uppercase")} style={{ color: "var(--color-text-muted)" }}>
                {t("course.completion")}
              </p>
              <p className="mt-2 font-display text-3xl font-bold tabular-nums" style={{ color: "var(--color-text-primary)" }}>{completionPct}%</p>
              <Progress className="mt-3 h-2" value={completionPct} />
            </div>
            <div className="dashboard-panel p-5">
              <p className={cn("text-xs font-semibold tracking-[0.16em]", !isAr && "uppercase")} style={{ color: "var(--color-text-muted)" }}>
                {t("course.completedLessons")}
              </p>
              <p className="mt-2 font-display text-3xl font-bold tabular-nums" style={{ color: "var(--color-text-primary)" }}>{completedCount}</p>
              <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
                {t("course.outOf", { total: totalCount })}
              </p>
            </div>
            <div className="dashboard-panel p-5">
              <p className={cn("text-xs font-semibold tracking-[0.16em]", !isAr && "uppercase")} style={{ color: "var(--color-text-muted)" }}>
                {t("course.learningRhythm")}
              </p>
              <p className="mt-2 text-sm font-semibold leading-6" style={{ color: "var(--color-text-primary)" }}>
                {completionPct >= 75
                  ? t("course.learningRhythmHigh")
                  : completionPct >= 35
                    ? t("course.learningRhythmMid")
                    : t("course.learningRhythmLow")}
              </p>
            </div>
          </div>
        ) : null}

        {!statusQuery.isLoading && !isEnrolled ? (
          <div className="dashboard-panel p-6">
            <div className="rounded-[24px] border border-dashed p-6 text-center" style={{ borderColor: "var(--color-border-strong)" }}>
              <p className="font-display text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>
                {t("course.noAccess")}
              </p>
              <p className="mt-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                {t("course.purchaseToUnlock")}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Link
                  className="inline-flex min-h-11 items-center rounded-xl px-5 py-2.5 text-sm font-bold text-white no-underline shadow-sm transition-all hover:opacity-95"
                  style={{ background: "var(--gradient-brand)" }}
                  to={`${prefix}/checkout`}
                >
                  {t("course.getAccess")}
                </Link>
                <Link
                  className="rounded-xl border px-5 py-2.5 text-sm font-medium no-underline transition-colors hover:bg-surface2"
                  style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                  to={`${prefix}/preview`}
                >
                  {t("course.watchFreeLesson")}
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        {isEnrolled && featuredLesson ? (
          <section className="dashboard-panel p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className={cn("text-xs font-bold tracking-[0.16em] text-brand-600", !isAr && "uppercase")}>
                  {resumeLesson ? t("course.continueLearning") : t("course.recommendedNextLesson")}
                </p>
                <p className="mt-2 text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  {pickLocalizedText(resolvedLocale, featuredLesson.titleEn ?? featuredLesson.title, featuredLesson.titleAr)}
                </p>
                <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  {resumeLesson
                    ? t("course.resumeFromSecondsFull", { seconds: featuredLesson.lastPositionSeconds })
                    : featuredLesson.durationSeconds
                      ? formatClockDuration(featuredLesson.durationSeconds, resolvedLocale)
                      : t("course.readyToStart")}
                </p>
              </div>
              <Link
                className="inline-flex min-h-11 items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white no-underline shadow-sm transition-all hover:opacity-95"
                style={{ background: "var(--gradient-brand)" }}
                to={`${prefix}/lessons/${featuredLesson.id}`}
              >
                {resumeLesson ? t("actions.resume") : t("actions.start")}
                <ArrowRight className="icon-dir h-4 w-4" />
              </Link>
            </div>
          </section>
        ) : null}

        {isEnrolled ? (
          <div id="lessons" className="dashboard-panel overflow-hidden">
            <div className="flex items-center justify-between p-5" style={{ borderBottom: "1px solid var(--color-border)" }}>
              <div>
                <p className={cn("text-xs font-bold tracking-[0.16em] text-brand-600", !isAr && "uppercase")}>
                  {t("course.lessonsLabel")}
                </p>
                <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  {t("course.lessonStatesHint")}
                </p>
              </div>
              {lessonsQuery.isLoading ? (
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{t("common.loading")}</span>
              ) : null}
            </div>

            {lessonsQuery.isError ? (
              <p className="p-5 text-sm text-red-500">
                {t("course.unableToLoadLessons")}
              </p>
            ) : null}

            <div className="divide-y" style={{ borderColor: "var(--color-border)" }}>
              {lessonsQuery.data?.map((lesson, idx) => {
                const isResume = lesson.lastPositionSeconds > 0 && !lesson.completedAt;
                return (
                  <div
                    key={lesson.id}
                    className={cn(
                      "flex flex-col items-start gap-4 px-5 py-4 transition-colors sm:flex-row sm:items-center sm:justify-between",
                      lesson.isUnlocked ? "hover:bg-surface2" : "opacity-60"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
                        style={{
                          backgroundColor: lesson.completedAt
                            ? "color-mix(in oklab, var(--color-brand-muted) 100%, transparent)"
                            : lesson.isUnlocked
                              ? "var(--color-brand-muted)"
                              : "var(--color-surface-2)",
                          color: lesson.completedAt
                            ? "var(--color-brand)"
                            : lesson.isUnlocked
                              ? "var(--color-brand)"
                              : "var(--color-text-muted)"
                        }}
                      >
                        {lesson.completedAt ? <Check className="h-4 w-4" /> : lesson.isUnlocked ? idx + 1 : <LockKeyhole className="h-4 w-4" />}
                      </span>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                          {pickLocalizedText(resolvedLocale, lesson.titleEn ?? lesson.title, lesson.titleAr)}
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
                          <span>
                            {(() => {
                              if (lesson.completedAt) return t("common.completed");
                              if (isResume) return t("course.resumeFromSeconds", { seconds: lesson.lastPositionSeconds });
                              if (!lesson.isUnlocked) {
                                return lesson.unlocksAt
                                  ? t("course.unlocksAtDate", { date: formatDate(lesson.unlocksAt, resolvedLocale) })
                                  : t("course.unlocksAtSoon");
                              }
                              return t("course.notStarted");
                            })()}
                          </span>
                          {lesson.durationSeconds ? (
                            <span dir="ltr">{formatClockDuration(lesson.durationSeconds, resolvedLocale)}</span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {lesson.isUnlocked ? (
                      <Link
                        className="rounded-lg px-3.5 py-2 text-xs font-bold text-white no-underline shadow-sm transition-all hover:opacity-95 sm:flex-shrink-0"
                        style={{ background: "var(--gradient-brand)" }}
                        to={`${prefix}/lessons/${lesson.id}`}
                      >
                        {lesson.completedAt
                          ? t("actions.rewatch")
                          : isResume
                            ? t("actions.resume")
                            : t("actions.start")}
                      </Link>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </>
    </StudentShell>
  );
};
