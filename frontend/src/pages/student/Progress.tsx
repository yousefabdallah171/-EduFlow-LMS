import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Clock3, Gauge, ListChecks, PlayCircle, Trophy } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Progress as ProgressBar } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { StudentShell } from "@/components/layout/StudentShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { api } from "@/lib/api";
import { formatClockDuration, formatMinutesShort, formatNumber, pickLocalizedText, resolveLocale } from "@/lib/locale";
import { cn } from "@/lib/utils";

type LessonItem = {
  id: string;
  title: string;
  titleEn?: string;
  titleAr?: string | null;
  durationSeconds: number | null;
  completedAt: string | null;
  lastPositionSeconds: number;
  isUnlocked: boolean;
};

export const StudentProgress = () => {
  const { locale } = useParams();
  const { t, i18n } = useTranslation();
  const resolvedLocale = resolveLocale(i18n.language);
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";
  const isAr = resolvedLocale === "ar";

  const { data, isLoading } = useQuery({
    queryKey: ["student-lessons"],
    queryFn: () => api.get<{ lessons: LessonItem[] }>("/lessons").then((r) => r.data)
  });

  const lessons = data?.lessons ?? [];
  const completed = lessons.filter((l) => l.completedAt).length;
  const inProgress = lessons.filter((l) => !l.completedAt && l.lastPositionSeconds > 0).length;
  const percent = lessons.length > 0 ? Math.round((completed / lessons.length) * 100) : 0;
  const nextLesson = lessons.find((lesson) => lesson.isUnlocked && !lesson.completedAt);

  return (
    <StudentShell>
      <>
        <PageHeader
          hero
          backHref={`${prefix}/dashboard`}
          backLabel={t("nav.dashboard")}
          eyebrow={t("student.dashboard.yourJourney")}
          title={t("student.progress.title")}
          description={t("student.progress.description")}
          actions={
            nextLesson ? (
              <Link
                className="inline-flex min-h-11 items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white no-underline shadow-sm transition-all hover:opacity-95"
                style={{ background: "var(--gradient-brand)" }}
                to={`${prefix}/lessons/${nextLesson.id}`}
              >
                {t("course.continueLearning")}
                <ArrowRight className="icon-dir h-4 w-4" />
              </Link>
            ) : null
          }
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="dashboard-panel dashboard-panel--accent p-5">
            <div className="flex items-center gap-2 text-brand-600">
              <Trophy className="h-4 w-4" />
              <span className={cn("text-xs font-bold tracking-[0.16em]", !isAr && "uppercase")}>{t("course.completion")}</span>
            </div>
            <p className="mt-2 font-display text-3xl font-bold">{formatNumber(percent, resolvedLocale)}%</p>
            {!isLoading ? <ProgressBar className="mt-3 h-2" value={percent} /> : null}
          </div>
          <div className="dashboard-panel p-5">
            <div className="flex items-center gap-2 text-brand-600">
              <CheckCircle2 className="h-4 w-4" />
              <span className={cn("text-xs font-bold tracking-[0.16em]", !isAr && "uppercase")}>{t("student.progress.completed")}</span>
            </div>
            <p className="mt-2 font-display text-3xl font-bold" style={{ color: "var(--color-text-primary)" }}>{formatNumber(completed, resolvedLocale)}</p>
            <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
              {t("student.progress.summary", { completed: formatNumber(completed, resolvedLocale), total: formatNumber(lessons.length, resolvedLocale) })}
            </p>
          </div>
          <div className="dashboard-panel p-5">
            <div className="flex items-center gap-2 text-brand-600">
              <Gauge className="h-4 w-4" />
              <span className={cn("text-xs font-bold tracking-[0.16em]", !isAr && "uppercase")}>{t("student.progress.inProgress")}</span>
            </div>
            <p className="mt-2 font-display text-3xl font-bold" style={{ color: "var(--color-text-primary)" }}>{formatNumber(inProgress, resolvedLocale)}</p>
            <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
              {t("student.progress.inProgressHint")}
            </p>
          </div>
        </div>

        <div className="dashboard-panel overflow-hidden">
          {isLoading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
            </div>
          ) : lessons.length === 0 ? (
            <div className="p-10 text-center">
              <ListChecks className="mx-auto h-8 w-8 text-brand-600" />
              <p className="mt-3 text-sm" style={{ color: "var(--color-text-muted)" }}>{t("student.progress.noLessons")}</p>
            </div>
          ) : (
            <div className="space-y-1 p-3">
              {lessons.map((lesson) => (
                <Link
                  key={lesson.id}
                  className="flex flex-col items-start gap-3 rounded-[22px] border px-4 py-4 no-underline transition-colors hover:bg-surface2 sm:flex-row sm:items-center sm:justify-between"
                  style={{ borderColor: "var(--color-border)", color: "inherit" }}
                  to={lesson.isUnlocked ? `${prefix}/lessons/${lesson.id}` : `${prefix}/course`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                      {pickLocalizedText(resolvedLocale, lesson.titleEn ?? lesson.title, lesson.titleAr)}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
                      <span className="inline-flex items-center gap-1.5" dir="ltr">
                        <Clock3 className="h-3.5 w-3.5 text-brand-600" />
                        {formatMinutesShort(lesson.lastPositionSeconds, resolvedLocale)}
                      </span>
                      {lesson.durationSeconds ? (
                        <span>
                          {t("student.progress.lessonLength", {
                            length: formatClockDuration(lesson.durationSeconds, resolvedLocale)
                          })}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto sm:justify-start">
                    {lesson.completedAt ? (
                      <Badge variant="default" className="gap-1 border-green-500/20 bg-green-500/10 text-green-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {t("student.progress.completed")}
                      </Badge>
                    ) : lesson.lastPositionSeconds > 0 ? (
                      <Badge variant="outline">{t("student.progress.inProgress")}</Badge>
                    ) : (
                      <Badge variant="outline" className="opacity-60">{t("student.progress.notStarted")}</Badge>
                    )}

                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600">
                      <PlayCircle className="h-3.5 w-3.5" />
                      {lesson.completedAt ? t("actions.rewatch") : lesson.lastPositionSeconds > 0 ? t("actions.resume") : t("actions.start")}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </>
    </StudentShell>
  );
};
