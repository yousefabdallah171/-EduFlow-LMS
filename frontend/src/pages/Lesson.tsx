import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { VideoPlayer } from "@/components/shared/VideoPlayer";
import { Progress } from "@/components/ui/progress";
import { useEnrollment } from "@/hooks/useEnrollment";
import { useVideoToken } from "@/hooks/useVideoToken";
import { api, queryClient } from "@/lib/api";
import { demoLessons, isDemoMode } from "@/lib/demo";

type LessonSummary = {
  id: string;
  title: string;
  sortOrder: number;
  completedAt: string | null;
  isUnlocked: boolean;
};

export const Lesson = () => {
  const { lessonId, locale } = useParams();
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
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
        return demoLessons.map((l) => ({
          id: l.id,
          title: l.title,
          sortOrder: l.sortOrder,
          completedAt: l.completedAt,
          isUnlocked: l.isUnlocked
        }));
      }
      const response = await api.get<{ lessons: LessonSummary[] }>("/lessons");
      return response.data.lessons;
    }
  });

  const progressMutation = useMutation({
    mutationFn: async (payload: { lastPositionSeconds: number; watchTimeSeconds: number; completed: boolean }) => {
      if (!lessonId) return null;
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
    }
  });

  const orderedLessons = lessonsQuery.data ?? [];
  const currentIndex = orderedLessons.findIndex((l) => l.id === lessonId);
  const previousLesson = currentIndex > 0 ? orderedLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex >= 0 ? orderedLessons[currentIndex + 1] : null;
  const completionPercentage =
    orderedLessons.length > 0
      ? Math.round((orderedLessons.filter((l) => l.completedAt).length / orderedLessons.length) * 100)
      : 0;

  const loadingState = (message: string) => (
    <div className="flex min-h-dvh items-center justify-center" style={{ backgroundColor: "var(--color-page)" }}>
      <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>{message}</p>
    </div>
  );

  if (statusQuery.isLoading) return loadingState(isAr ? "جاري التحقق من اشتراكك…" : "Checking your enrollment…");

  if (!isEnrolled) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-6 py-12" style={{ backgroundColor: "var(--color-page)" }}>
        <div
          className="w-full max-w-md rounded-2xl border p-8 shadow-card"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <p className="text-xs font-bold uppercase tracking-widest text-brand-600">{t("lesson.enrollmentRequired")}</p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
            {t("lesson.enrollmentRequired")}
          </h1>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
            {t("lesson.enrollmentRequiredDesc")}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white no-underline shadow-sm transition-all hover:bg-brand-700"
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

  if (!lessonQuery.data) return loadingState(lessonQuery.isError ? t("lesson.error") : t("lesson.loading"));

  return (
    <main className="min-h-dvh px-4 py-6 sm:px-6" style={{ backgroundColor: "var(--color-page)" }}>
      <section className="mx-auto max-w-6xl space-y-5">

        {/* Breadcrumb + title */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              className="inline-flex items-center gap-1.5 text-xs font-semibold no-underline transition-colors hover:text-brand-600"
              style={{ color: "var(--color-text-muted)" }}
              to={`${prefix}/course`}
            >
              <span className="icon-dir text-base leading-none">←</span>
              {t("lesson.backToCourse")}
            </Link>
            <h1 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl" style={{ color: "var(--color-text-primary)" }}>
              {lessonQuery.data.title}
            </h1>
          </div>

          {/* Progress chip */}
          <div
            className="min-w-48 rounded-2xl border p-4 shadow-card"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
              {t("lesson.courseProgress")}
            </p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums" style={{ color: "var(--color-text-primary)" }}>
              {completionPercentage}%
            </p>
            <Progress className="mt-2 h-1.5" value={completionPercentage} />
          </div>
        </div>

        {/* Video player */}
        <VideoPlayer
          lessonTitle={lessonQuery.data.title}
          sourceUrl={lessonQuery.data.hlsUrl}
          watermark={lessonQuery.data.watermark}
          initialPositionSeconds={lessonQuery.data.progress.lastPositionSeconds}
          onProgress={(payload) => { void progressMutation.mutateAsync(payload); }}
          onTokenExpired={() => { void renewToken(); }}
        />

        {/* Notes + navigation */}
        <div
          className="rounded-2xl border p-5 shadow-card"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
                {t("lesson.notes")}
              </p>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                {lessonQuery.data.descriptionHtml || t("lesson.titleFallback")}
              </p>
            </div>

            <div className="flex flex-shrink-0 flex-wrap items-center gap-2.5">
              {previousLesson ? (
                <Link
                  className="inline-flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-medium no-underline transition-colors hover:bg-surface2"
                  style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                  to={`${prefix}/lessons/${previousLesson.id}`}
                >
                  <span className="icon-dir">←</span>
                  {t("lesson.previous")}
                </Link>
              ) : null}
              {nextLesson?.isUnlocked ? (
                <Link
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white no-underline shadow-sm transition-all hover:bg-brand-700"
                  to={`${prefix}/lessons/${nextLesson.id}`}
                >
                  {t("lesson.nextLesson")}
                  <span className="icon-dir">→</span>
                </Link>
              ) : null}
            </div>
          </div>
        </div>

        {/* Lesson list sidebar strip */}
        {orderedLessons.length > 0 ? (
          <div
            className="rounded-2xl border p-4 shadow-card"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <p className="mb-3 px-1 text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
              {t("lesson.allLessons")}
            </p>
            <div className="space-y-1">
              {orderedLessons.map((lesson, idx) => {
                const isCurrent = lesson.id === lessonId;
                return (
                  <Link
                    key={lesson.id}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 no-underline transition-colors"
                    style={{
                      backgroundColor: isCurrent ? "var(--color-brand-muted)" : "transparent",
                      color: isCurrent ? "var(--color-brand)" : "var(--color-text-secondary)"
                    }}
                    to={lesson.isUnlocked ? `${prefix}/lessons/${lesson.id}` : "#"}
                    onClick={(e) => { if (!lesson.isUnlocked) e.preventDefault(); }}
                  >
                    <span
                      className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
                      style={{
                        backgroundColor: lesson.completedAt
                          ? "rgb(34 197 94 / 0.15)"
                          : isCurrent
                            ? "var(--color-brand-muted)"
                            : "var(--color-surface-2)",
                        color: lesson.completedAt ? "rgb(34 197 94)" : isCurrent ? "var(--color-brand)" : "var(--color-text-muted)"
                      }}
                    >
                      {lesson.completedAt ? "✓" : idx + 1}
                    </span>
                    <span className="flex-1 truncate text-sm font-medium">{lesson.title}</span>
                    {!lesson.isUnlocked ? (
                      <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>🔒</span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
};
