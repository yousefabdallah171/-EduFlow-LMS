import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { LockKeyhole, PlayCircle } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { VideoPlayer } from "@/components/shared/VideoPlayer";
import { PreviewCTABanner } from "@/components/shared/PreviewCTABanner";
import { PageHeader } from "@/components/shared/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { useEnrollment } from "@/hooks/useEnrollment";
import { api } from "@/lib/api";
import { CACHE_TIME, getGCTime } from "@/lib/query-config";
import { formatClockDuration, pickLocalizedText, resolveLocale } from "@/lib/locale";

type PreviewLesson = {
  id: string;
  title: string;
  titleEn?: string;
  titleAr: string;
  descriptionHtml: string;
  descriptionHtmlEn?: string;
  descriptionHtmlAr?: string;
  durationSeconds: number | null;
  videoToken: string;
  hlsUrl: string;
  expiresAt?: string;
  sortOrder: number;
};

type CourseLesson = {
  id: string;
  title: string;
  titleAr: string | null;
  durationSeconds: number | null;
  sortOrder: number;
};

type CourseInfo = {
  title: string;
  titleEn?: string;
  titleAr?: string | null;
  lessonCount: number;
  lessons: CourseLesson[];
};

export const Preview = () => {
  const { locale } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";
  const resolvedLocale = resolveLocale(i18n.language);
  const { user, isAuthReady } = useAuth();
  const { statusQuery } = useEnrollment();
  const isLoggedIn = Boolean(user);
  const isEnrolled = statusQuery.data?.enrolled && statusQuery.data?.status === "ACTIVE";

  const previewQuery = useQuery({
    queryKey: ["lesson-preview"],
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const response = await api.get<PreviewLesson>("/lessons/preview");
      return response.data;
    }
  });

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

  useEffect(() => {
    if (!isAuthReady) {
      return;
    }

    if (isEnrolled && previewQuery.data?.id) {
      navigate(`${prefix}/lessons/${previewQuery.data.id}`, { replace: true });
    }
  }, [isAuthReady, isEnrolled, navigate, prefix, previewQuery.data?.id]);

  if (previewQuery.isLoading || courseQuery.isLoading || (isLoggedIn && statusQuery.isLoading)) {
    return (
      <div className="flex min-h-dvh items-center justify-center" style={{ backgroundColor: "var(--color-page)" }}>
        <div className="rounded-[28px] border p-8 text-center shadow-card" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <p className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  if (previewQuery.isError || !previewQuery.data) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-6" style={{ backgroundColor: "var(--color-page)" }}>
        <div
          className="w-full max-w-md rounded-[28px] border p-8 text-center shadow-card"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <p className="text-base font-bold" style={{ color: "var(--color-text-primary)" }}>
            {t("preview.notAvailableTitle")}
          </p>
          <p className="mt-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
            {t("preview.notAvailableBody")}
          </p>
          <Link
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white no-underline shadow-sm transition-all hover:opacity-95"
            style={{ background: "var(--gradient-brand)" }}
            to={`${prefix}/`}
          >
            {t("actions.backToHome")}
          </Link>
        </div>
      </div>
    );
  }

  const lesson = previewQuery.data;
  const course = courseQuery.data;
  const title = pickLocalizedText(resolvedLocale, lesson.titleEn ?? lesson.title, lesson.titleAr);
  const description = pickLocalizedText(
    resolvedLocale,
    lesson.descriptionHtmlEn ?? lesson.descriptionHtml,
    lesson.descriptionHtmlAr
  );
  const courseTitle = course
    ? pickLocalizedText(resolvedLocale, course.titleEn ?? course.title, course.titleAr)
    : title;
  const lockedActionLabel = isLoggedIn ? t("preview.getAccessCta") : t("actions.logIn");
  const lockedActionHref = isLoggedIn ? `${prefix}/checkout` : `${prefix}/login`;
  const previewBenefits = t("preview.benefits.items", { returnObjects: true }) as string[];

  return (
    <main className="marketing-dark min-h-dvh px-4 py-6 sm:px-6" style={{ backgroundColor: "var(--color-page)" }}>
      <section className="app-shell space-y-5">
        <PageHeader
          hero
          eyebrow={t("preview.freePreview")}
          title={title}
          description={t("preview.forEveryone")}
          actions={
            <>
              {!isLoggedIn ? (
                <Link
                  className="rounded-xl border px-4 py-2 text-sm font-medium no-underline transition-colors hover:bg-surface2"
                  style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                  to={`${prefix}/login`}
                >
                  {t("actions.logIn")}
                </Link>
              ) : null}
              <Link
                className="rounded-xl px-4 py-2 text-sm font-bold text-white no-underline shadow-sm transition-all hover:opacity-95"
                style={{ background: "var(--gradient-brand)" }}
                to={`${prefix}/checkout`}
              >
                {t("preview.getAccessCta")}
              </Link>
            </>
          }
        />

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
          <div className="dashboard-panel dashboard-panel--accent p-5">
            <div className="section-heading">
              <p className="section-heading__eyebrow">{t("preview.benefits.eyebrow")}</p>
              <h2 className="section-heading__title">{t("preview.benefits.title")}</h2>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {previewBenefits.map((benefit) => (
                <div key={benefit} className="rounded-[22px] border p-4" style={{ borderColor: "var(--color-border)", backgroundColor: "color-mix(in oklab, var(--color-surface) 82%, transparent)" }}>
                  <p className="text-sm leading-7" style={{ color: "var(--color-text-primary)" }}>{benefit}</p>
                </div>
              ))}
            </div>
          </div>

          <div
            className="dashboard-panel p-5"
          >
            <p className="section-heading__eyebrow">{courseTitle}</p>
            <p className="mt-2 font-display text-4xl font-black" style={{ color: "var(--color-text-primary)" }}>
              {course?.lessonCount ?? 1}
            </p>
            <p className="mt-1 text-sm leading-7" style={{ color: "var(--color-text-secondary)" }}>
              {t("preview.courseLessonsHint")}
            </p>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
            <div
              className="rounded-[28px] border p-4 shadow-card"
              style={{ backgroundColor: "var(--color-brand-muted)", borderColor: "rgba(163,230,53,0.2)" }}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white" style={{ background: "var(--gradient-brand)" }}>
                    <PlayCircle className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">
                      {t("preview.freePreview")}
                    </p>
                    <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                      {t("preview.firstLessonUnlocked")}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!isLoggedIn ? (
                    <Link
                      className="rounded-xl border px-4 py-2 text-sm font-medium no-underline transition-colors hover:bg-surface2"
                      style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                      to={`${prefix}/login`}
                    >
                      {t("actions.logIn")}
                    </Link>
                  ) : null}
                  <Link
                    className="rounded-xl px-4 py-2 text-sm font-bold text-white no-underline shadow-sm transition-all hover:opacity-95"
                    style={{ background: "var(--gradient-brand)" }}
                    to={`${prefix}/checkout`}
                  >
                    {t("preview.getAccessCta")}
                  </Link>
                </div>
              </div>
            </div>

            <VideoPlayer
              lessonTitle={title}
              sourceUrl={lesson.hlsUrl}
              watermark={null}
              initialPositionSeconds={0}
              playbackExpiresAt={lesson.expiresAt ?? null}
              onProgress={() => {}}
              onTokenExpired={() => {
                void previewQuery.refetch();
              }}
            />

            <div
              className="rounded-[28px] border p-5 shadow-card"
              style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                    {t("preview.firstLesson")}
                  </p>
                  <h2 className="mt-2 font-display text-xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                    {title}
                  </h2>
                  {lesson.durationSeconds ? (
                    <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
                      {formatClockDuration(lesson.durationSeconds)}
                    </p>
                  ) : null}
                </div>

                <Link
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold text-white no-underline shadow-sm transition-all hover:opacity-95"
                  style={{ background: "var(--gradient-brand)" }}
                  to={`${prefix}/checkout`}
                >
                  {t("preview.getAccessCta")}
                </Link>
              </div>
            </div>

            {description ? (
              <div
                className="rounded-[28px] border p-5 shadow-card"
                style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
              >
                <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                  {t("lesson.notes")}
                </p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                  {description}
                </p>
              </div>
            ) : null}

            <div
              className="relative overflow-hidden rounded-[32px] border p-8 text-center shadow-elevated"
              style={{ backgroundColor: "var(--color-invert)", borderColor: "transparent" }}
            >
              <div
                className="pointer-events-none absolute inset-0"
                style={{ background: "radial-gradient(ellipse 60% 80% at 50% 120%, rgba(163,230,53,0.3), transparent)" }}
              />
              <p className="relative text-xs font-bold uppercase tracking-[0.16em] opacity-60" style={{ color: "var(--color-text-invert)" }}>
                {t("preview.likedIt")}
              </p>
              <h2 className="relative mt-3 font-display text-2xl font-bold tracking-tight" style={{ color: "var(--color-text-invert)" }}>
                {t("preview.getFullAccess")}
              </h2>
              <p className="relative mt-2 text-sm opacity-70" style={{ color: "var(--color-text-invert)" }}>
                {t("preview.onePayment")}
              </p>
              <div className="relative mx-auto mt-5 max-w-2xl rounded-[24px] border px-4 py-4 text-start" style={{ borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.04)" }}>
                <ul className="grid gap-3 sm:grid-cols-3">
                  {previewBenefits.map((benefit) => (
                    <li key={benefit} className="text-sm leading-6" style={{ color: "var(--color-text-invert)" }}>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative mt-6 flex flex-wrap justify-center gap-3">
                <Link
                  className="rounded-xl px-6 py-3 text-sm font-bold text-white no-underline shadow-sm transition-all hover:opacity-95"
                  style={{ background: "var(--gradient-brand)" }}
                  to={`${prefix}/checkout`}
                >
                  {t("preview.getAccessCta")}
                </Link>
                <Link
                  className="rounded-xl border border-white/20 px-6 py-3 text-sm font-medium text-white no-underline transition-all hover:bg-white/10"
                  to={`${prefix}/register`}
                >
                  {t("landing.createAccount")}
                </Link>
              </div>
            </div>
          </div>

          <aside
            className="rounded-[28px] border p-4 shadow-card xl:sticky xl:top-28 xl:h-fit"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">
                  {t("course.public.content")}
                </p>
                <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
                  {course ? t("lessons.lessonCount", { count: course.lessonCount }) : null}
                </p>
              </div>
              <Link
                className="rounded-xl px-3 py-2 text-xs font-bold text-white no-underline shadow-sm transition-all hover:opacity-95"
                style={{ background: "var(--gradient-brand)" }}
                to={`${prefix}/checkout`}
              >
                {t("preview.getAccessCta")}
              </Link>
            </div>

            <div className="space-y-2">
              {course?.lessons.map((courseLesson, index) => {
                const lessonTitle = pickLocalizedText(resolvedLocale, courseLesson.title, courseLesson.titleAr);
                const isPreviewLesson = courseLesson.id === lesson.id || index === 0;

                return (
                  <div
                    key={courseLesson.id}
                    className="flex items-center gap-3 rounded-xl border px-3 py-3"
                    style={{
                      borderColor: isPreviewLesson ? "rgba(163,230,53,0.18)" : "var(--color-border)",
                      backgroundColor: isPreviewLesson ? "var(--color-brand-muted)" : "var(--color-surface)"
                    }}
                  >
                    <span
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
                      style={{
                        backgroundColor: isPreviewLesson ? "rgba(163,230,53,0.14)" : "var(--color-surface-2)",
                        color: isPreviewLesson ? "var(--color-brand)" : "var(--color-text-muted)"
                      }}
                    >
                      {isPreviewLesson ? <PlayCircle className="h-4 w-4" /> : <LockKeyhole className="h-4 w-4" />}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                        {lessonTitle}
                      </p>
                      <p className="mt-0.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
                        {isPreviewLesson ? t("preview.lessonAvailability.available") : t("preview.lessonAvailability.locked")}
                        {courseLesson.durationSeconds ? ` - ${formatClockDuration(courseLesson.durationSeconds)}` : ""}
                      </p>
                    </div>

                    {isPreviewLesson ? (
                      <Link
                        className="rounded-lg px-3 py-2 text-xs font-bold no-underline"
                        style={{ backgroundColor: "var(--color-surface)", color: "var(--color-brand)" }}
                        to={`${prefix}/preview`}
                      >
                        {t("course.public.preview")}
                      </Link>
                    ) : (
                      <Link
                        className="rounded-lg border px-3 py-2 text-xs font-semibold no-underline transition-colors hover:bg-surface2"
                        style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                        to={lockedActionHref}
                      >
                        {lockedActionLabel}
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </aside>
        </div>
      </section>

      <PreviewCTABanner lessonCount={course?.lessonCount ?? 0} />
    </main>
  );
};
