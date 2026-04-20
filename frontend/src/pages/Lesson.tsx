import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, LockKeyhole, TriangleAlert } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { VideoPlayer } from "@/components/shared/VideoPlayer";
import { ResourcesList } from "@/components/student/ResourcesList";
import { Progress } from "@/components/ui/progress";
import { useEnrollment } from "@/hooks/useEnrollment";
import { useVideoToken } from "@/hooks/useVideoToken";
import { api, queryClient } from "@/lib/api";
import { demoLessons, isDemoMode } from "@/lib/demo";
import { pickLocalizedText, resolveLocale } from "@/lib/locale";

type LessonSummary = {
  id: string;
  title: string;
  titleEn?: string;
  titleAr?: string | null;
  sortOrder: number;
  completedAt: string | null;
  isUnlocked: boolean;
};

type GroupedLessonSummary = {
  id: string;
  titleEn: string;
  titleAr?: string | null;
  sortOrder: number;
  completedAt: string | null;
  isUnlocked: boolean;
};

type LessonSection = {
  id: string;
  titleEn: string;
  titleAr: string;
  lessons: GroupedLessonSummary[];
};

export const Lesson = () => {
  const { lessonId, locale } = useParams();
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";
  const currentLocale = resolveLocale(locale);
  const { t } = useTranslation();
  const isAr = currentLocale === "ar";
  const demo = isDemoMode();
  const { statusQuery } = useEnrollment();
  const isEnrolled = statusQuery.data?.enrolled && statusQuery.data?.status === "ACTIVE";
  const { lessonQuery, renewToken } = useVideoToken(lessonId, Boolean(isEnrolled));
  const lessonsQuery = useQuery({
    queryKey: ["course-lessons"],
    enabled: Boolean(isEnrolled),
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (demo) {
        return demoLessons.map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          titleEn: lesson.title,
          titleAr: null,
          sortOrder: lesson.sortOrder,
          completedAt: lesson.completedAt,
          isUnlocked: lesson.isUnlocked
        }));
      }

      const response = await api.get<{ lessons: LessonSummary[] }>("/lessons");
      return response.data.lessons;
    }
  });
  const groupedLessonsQuery = useQuery({
    queryKey: ["course-lessons-grouped"],
    enabled: Boolean(isEnrolled) && !demo,
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const response = await api.get<{ sections: LessonSection[] }>("/lessons/grouped");
      return response.data.sections;
    }
  });

  const progressMutation = useMutation({
    mutationFn: async (payload: { lastPositionSeconds: number; watchTimeSeconds: number; completed: boolean }) => {
      if (!lessonId) {
        return null;
      }

      if (demo) {
        return {
          ...payload,
          completedAt: payload.completed ? new Date().toISOString() : null,
          courseCompletionPercentage: payload.completed ? 100 : 50
        };
      }

      const response = await api.post(`/lessons/${lessonId}/progress`, payload);
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["course-lessons"] });
      void queryClient.invalidateQueries({ queryKey: ["student-dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["student-lessons"] });
    }
  });

  const orderedLessons = lessonsQuery.data ?? [];
  const currentIndex = orderedLessons.findIndex((lesson) => lesson.id === lessonId);
  const previousLesson = currentIndex > 0 ? orderedLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex >= 0 ? orderedLessons[currentIndex + 1] : null;
  const completionPercentage =
    orderedLessons.length > 0
      ? Math.round((orderedLessons.filter((lesson) => lesson.completedAt).length / orderedLessons.length) * 100)
      : 0;

  const loadingState = (message: string) => (
    <div className="flex min-h-dvh items-center justify-center" style={{ backgroundColor: "var(--color-page)" }}>
      <div
        className="rounded-3xl border px-6 py-5 text-center shadow-card"
        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        <p className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>{message}</p>
      </div>
    </div>
  );

  if (statusQuery.isLoading) {
    return loadingState(t("lesson.checkingEnrollment"));
  }

  if (!isEnrolled) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-6 py-12" style={{ backgroundColor: "var(--color-page)" }}>
        <div
          className="w-full max-w-md rounded-[28px] border p-8 shadow-card"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600/10 text-brand-600">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-brand-600">{t("lesson.enrollmentRequired")}</p>
          <h1 className="font-display mt-3 text-2xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
            {t("lesson.enrollmentRequired")}
          </h1>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
            {t("lesson.enrollmentRequiredDesc")}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              className="rounded-xl px-4 py-2.5 text-sm font-bold text-white no-underline shadow-sm transition-all hover:opacity-95"
              style={{ background: "var(--gradient-brand)" }}
              to={`${prefix}/checkout`}
            >
              {t("lesson.goToCheckout")}
            </Link>
            <Link
              className="rounded-xl border px-4 py-2.5 text-sm font-medium no-underline transition-colors hover:bg-surface2"
              style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
              to={`${prefix}/course`}
            >
              {t("lesson.backToCourse")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!lessonQuery.data) {
    if (lessonQuery.isError) {
      return (
        <div className="flex min-h-dvh items-center justify-center px-6 py-12" style={{ backgroundColor: "var(--color-page)" }}>
          <div
            className="w-full max-w-md rounded-[28px] border p-8 shadow-card"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600/10 text-brand-600">
              <TriangleAlert className="h-5 w-5" />
            </div>
            <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-brand-600">{t("lesson.error")}</p>
            <h1 className="font-display mt-3 text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>
              {t("lesson.titleFallback")}
            </h1>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
              {t("lesson.enrollmentRequiredDesc")}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                className="rounded-xl px-4 py-2.5 text-sm font-bold text-white no-underline shadow-sm transition-all hover:opacity-95"
                style={{ background: "var(--gradient-brand)" }}
                to={`${prefix}/course`}
              >
                {t("lesson.backToCourse")}
              </Link>
              <Link
                className="rounded-xl border px-4 py-2.5 text-sm font-medium no-underline transition-colors hover:bg-surface2"
                style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                to={`${prefix}/lessons`}
              >
                {t("lesson.allLessons")}
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return loadingState(t("lesson.loading"));
  }

  const lessonProgress = lessonQuery.data.progress ?? {
    lastPositionSeconds: 0,
    completedAt: null
  };

  const currentLessonTitle = pickLocalizedText(
    currentLocale,
    lessonQuery.data.titleEn ?? lessonQuery.data.title,
    lessonQuery.data.titleAr
  );
  const currentSectionTitle = lessonQuery.data.section
    ? pickLocalizedText(currentLocale, lessonQuery.data.section.titleEn, lessonQuery.data.section.titleAr)
    : "";
  const currentLessonDescription = pickLocalizedText(
    currentLocale,
    lessonQuery.data.descriptionHtmlEn ?? lessonQuery.data.descriptionHtml,
    lessonQuery.data.descriptionHtmlAr
  );

  return (
    <main
      className="min-h-dvh px-4 py-6 sm:px-6"
      style={{
        backgroundColor: "var(--color-page)",
        backgroundImage:
          "radial-gradient(circle at 10% 0%, color-mix(in oklab, var(--color-brand) 12%, transparent), transparent 22rem), radial-gradient(circle at 100% 10%, color-mix(in oklab, var(--color-brand-accent) 12%, transparent), transparent 20rem)"
      }}
    >
      <section className="mx-auto max-w-6xl space-y-5">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(19rem,0.7fr)]">
          <div className="space-y-5">
            <div
              className="rounded-[28px] border p-5 shadow-card sm:p-6"
              style={{
                background: "linear-gradient(180deg, color-mix(in oklab, var(--color-surface) 96%, white), color-mix(in oklab, var(--color-surface-2) 88%, transparent))",
                borderColor: "color-mix(in oklab, var(--color-brand) 18%, var(--color-border))"
              }}
            >
              <Link
                className="inline-flex items-center gap-1.5 text-xs font-semibold no-underline transition-colors hover:text-brand-600"
                style={{ color: "var(--color-text-muted)" }}
                to={`${prefix}/course`}
              >
                <ArrowLeft className="icon-dir h-4 w-4" />
                {t("lesson.backToCourse")}
              </Link>
              <h1 className="mt-3 text-xl font-bold tracking-tight sm:text-2xl" style={{ color: "var(--color-text-primary)" }}>
                {currentLessonTitle}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {currentSectionTitle ? (
                  <div
                    className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold"
                    style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-secondary)", backgroundColor: "var(--color-surface)" }}
                  >
                    <span style={{ color: "var(--color-text-muted)" }}>{t("lesson.sectionLabel")}</span>
                    <span style={{ color: "var(--color-text-primary)" }}>{currentSectionTitle}</span>
                  </div>
                ) : null}
                {lessonProgress.completedAt ? (
                  <div className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-600">
                    <Check className="h-3.5 w-3.5" />
                    {t("common.completed")}
                  </div>
                ) : null}
              </div>
              <p className="mt-4 max-w-3xl text-sm leading-7" style={{ color: "var(--color-text-secondary)" }}>
                {currentLessonDescription || t("lesson.titleFallback")}
              </p>
            </div>

            <VideoPlayer
              lessonTitle={currentLessonTitle}
              sourceUrl={lessonQuery.data.hlsUrl}
              watermark={lessonQuery.data.watermark}
              initialPositionSeconds={lessonProgress.lastPositionSeconds}
              playbackExpiresAt={lessonQuery.data.expiresAt ?? null}
              onProgress={(payload) => {
                void progressMutation.mutateAsync(payload);
              }}
              onTokenExpired={() => {
                void renewToken();
              }}
            />

            <div
              className="rounded-[28px] border p-5 shadow-card"
              style={{
                background: "linear-gradient(180deg, color-mix(in oklab, var(--color-surface) 96%, white), color-mix(in oklab, var(--color-surface-2) 88%, transparent))",
                borderColor: "var(--color-border)"
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                    {t("lesson.notes")}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                    {currentLessonDescription || t("lesson.titleFallback")}
                  </p>
                </div>

                <div className="flex flex-shrink-0 flex-wrap items-center gap-2.5">
                  {previousLesson ? (
                    <Link
                      className="inline-flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-medium no-underline transition-colors hover:bg-surface2"
                      style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                      to={`${prefix}/lessons/${previousLesson.id}`}
                    >
                      <ArrowLeft className="icon-dir h-4 w-4" />
                      {t("lesson.previous")}
                    </Link>
                  ) : null}
                  {nextLesson?.isUnlocked ? (
                    <Link
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold text-white no-underline shadow-sm transition-all hover:opacity-95"
                      style={{ background: "var(--gradient-brand)" }}
                      to={`${prefix}/lessons/${nextLesson.id}`}
                    >
                      {t("lesson.nextLesson")}
                      <ArrowRight className="icon-dir h-4 w-4" />
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>

            {lessonQuery.data?.resources && lessonQuery.data.resources.length > 0 ? (
              <ResourcesList resources={lessonQuery.data.resources} />
            ) : null}
          </div>

          <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
            <div
              className="rounded-[28px] border p-5 shadow-card"
              style={{
                background: "linear-gradient(180deg, color-mix(in oklab, var(--color-brand) 8%, var(--color-surface)), color-mix(in oklab, var(--color-surface-2) 92%, transparent))",
                borderColor: "color-mix(in oklab, var(--color-brand) 22%, var(--color-border))"
              }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                {t("lesson.courseProgress")}
              </p>
              <p className="mt-1.5 font-display text-3xl font-bold tabular-nums" style={{ color: "var(--color-text-primary)" }}>
                {completionPercentage}%
              </p>
              <Progress className="mt-3 h-2" value={completionPercentage} />
              <p className="mt-3 text-sm leading-6" style={{ color: "var(--color-text-secondary)" }}>
                {isAr
                  ? "حافظ على الإيقاع: إنهاء هذا الدرس يقربك من القسم التالي."
                  : "Keep the rhythm going: finishing this lesson moves you closer to the next section."}
              </p>
            </div>

            <div
              className="rounded-[28px] border p-4 shadow-card"
              style={{
                background: "linear-gradient(180deg, color-mix(in oklab, var(--color-surface) 96%, white), color-mix(in oklab, var(--color-surface-2) 88%, transparent))",
                borderColor: "var(--color-border)"
              }}
            >
              <p className="mb-3 px-1 text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                {t("lesson.allLessons")}
              </p>
              <div className="space-y-4">
                {groupedLessonsQuery.data && groupedLessonsQuery.data.length > 0 ? (
                  groupedLessonsQuery.data.map((section) => {
                    const sectionTitle = pickLocalizedText(currentLocale, section.titleEn, section.titleAr);

                    return (
                      <div key={section.id} className="space-y-2">
                        <div className="px-1 text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                          {sectionTitle}
                        </div>
                        <div className="space-y-1">
                          {section.lessons.map((lesson, index) => {
                            const isCurrent = lesson.id === lessonId;
                            const lessonTitle = pickLocalizedText(currentLocale, lesson.titleEn, lesson.titleAr);

                            return (
                              <Link
                                key={lesson.id}
                                className="flex items-center gap-3 rounded-2xl border px-3 py-3 no-underline transition-colors"
                                style={{
                                  background:
                                    isCurrent
                                      ? "linear-gradient(135deg, color-mix(in oklab, var(--color-brand) 12%, var(--color-surface)), color-mix(in oklab, var(--color-surface-2) 92%, transparent))"
                                      : "color-mix(in oklab, var(--color-surface-2) 58%, transparent)",
                                  borderColor: isCurrent ? "color-mix(in oklab, var(--color-brand) 28%, transparent)" : "var(--color-border)",
                                  color: isCurrent ? "var(--color-brand-text)" : "var(--color-text-secondary)"
                                }}
                                to={lesson.isUnlocked ? `${prefix}/lessons/${lesson.id}` : "#"}
                                onClick={(event) => {
                                  if (!lesson.isUnlocked) {
                                    event.preventDefault();
                                  }
                                }}
                              >
                                <span
                                  className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
                                  style={{
                                    backgroundColor: lesson.completedAt
                                      ? "rgb(34 197 94 / 0.15)"
                                      : isCurrent
                                        ? "var(--color-brand-muted)"
                                        : "var(--color-surface-2)",
                                    color: lesson.completedAt
                                      ? "rgb(34 197 94)"
                                      : isCurrent
                                        ? "var(--color-brand)"
                                        : "var(--color-text-muted)"
                                  }}
                                >
                                  {lesson.completedAt ? <Check className="h-3.5 w-3.5" /> : index + 1}
                                </span>
                                <span className="flex-1 truncate text-sm font-medium">{lessonTitle}</span>
                                {!lesson.isUnlocked ? (
                                  <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                                    {t("lesson.locked")}
                                  </span>
                                ) : null}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                ) : orderedLessons.length > 0 ? (
                  <div className="space-y-1">
                    {orderedLessons.map((lesson, index) => {
                      const isCurrent = lesson.id === lessonId;
                      const lessonTitle = pickLocalizedText(currentLocale, lesson.titleEn ?? lesson.title, lesson.titleAr);

                      return (
                        <Link
                          key={lesson.id}
                          className="flex items-center gap-3 rounded-2xl border px-3 py-3 no-underline transition-colors"
                          style={{
                            background:
                              isCurrent
                                ? "linear-gradient(135deg, color-mix(in oklab, var(--color-brand) 12%, var(--color-surface)), color-mix(in oklab, var(--color-surface-2) 92%, transparent))"
                                : "color-mix(in oklab, var(--color-surface-2) 58%, transparent)",
                            borderColor: isCurrent ? "color-mix(in oklab, var(--color-brand) 28%, transparent)" : "var(--color-border)",
                            color: isCurrent ? "var(--color-brand-text)" : "var(--color-text-secondary)"
                          }}
                          to={lesson.isUnlocked ? `${prefix}/lessons/${lesson.id}` : "#"}
                          onClick={(event) => {
                            if (!lesson.isUnlocked) {
                              event.preventDefault();
                            }
                          }}
                        >
                          <span
                            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
                            style={{
                              backgroundColor: lesson.completedAt
                                ? "rgb(34 197 94 / 0.15)"
                                : isCurrent
                                  ? "var(--color-brand-muted)"
                                  : "var(--color-surface-2)",
                              color: lesson.completedAt
                                ? "rgb(34 197 94)"
                                : isCurrent
                                  ? "var(--color-brand)"
                                  : "var(--color-text-muted)"
                            }}
                          >
                            {lesson.completedAt ? <Check className="h-3.5 w-3.5" /> : index + 1}
                          </span>
                          <span className="flex-1 truncate text-sm font-medium">{lessonTitle}</span>
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
};
