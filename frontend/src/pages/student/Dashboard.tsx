import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpenCheck, Download, FileText, Gauge, PlayCircle, ReceiptText, Sparkles } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Progress } from "@/components/ui/progress";
import { StudentShell } from "@/components/layout/StudentShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { SkeletonDashboard } from "@/components/skeletons";
import { api } from "@/lib/api";
import { CACHE_TIME, getGCTime } from "@/lib/query-config";
import { formatDate, resolveLocale } from "@/lib/locale";

type DashboardData = {
  lastLessonId: string | null;
  completionPercent: number;
  enrolled: boolean;
  status: string | null;
  enrolledAt: string | null;
};

export const StudentDashboard = () => {
  const { locale } = useParams();
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";
  const { t, i18n } = useTranslation();
  const resolvedLocale = resolveLocale(i18n.language);

  const { data, isLoading } = useQuery({
    queryKey: ["student-dashboard"],
    queryFn: () => api.get<DashboardData>("/student/dashboard").then((r) => r.data),
    staleTime: CACHE_TIME.MEDIUM,
    gcTime: getGCTime(CACHE_TIME.MEDIUM)
  });

  const progress = data?.completionPercent ?? 0;
  const milestoneLabel =
    progress >= 100
      ? t("student.dashboard.milestone.complete")
      : progress >= 70
        ? t("student.dashboard.milestone.finalStretch")
        : progress >= 35
          ? t("student.dashboard.milestone.strongMomentum")
          : t("student.dashboard.milestone.startNext");

  return (
    <StudentShell>
      <>
        <PageHeader
          hero
          eyebrow={t("student.shell.section")}
          title={t("course.welcomeBack")}
          description={t("student.dashboard.heroDescription")}
          actions={
            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex min-h-11 items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white no-underline shadow-sm transition-all hover:opacity-95"
                style={{ background: "var(--gradient-brand)" }}
                to={data?.lastLessonId ? `${prefix}/lessons/${data.lastLessonId}` : `${prefix}/course`}
              >
                {data?.lastLessonId ? t("course.continueLearning") : t("course.allLessons")}
                <ArrowRight className="icon-dir h-4 w-4" />
              </Link>
              <Link
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-5 py-3 text-sm font-medium no-underline transition-colors hover:bg-surface2"
                style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                to={`${prefix}/progress`}
              >
                <Gauge className="h-4 w-4 text-brand-600" />
                {t("student.progress.title")}
              </Link>
            </div>
          }
        />

        {isLoading ? (
          <SkeletonDashboard />
        ) : (
          <>
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.95fr)]">
              <section className="dashboard-panel dashboard-panel--strong p-6 sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-xl">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">{t("student.dashboard.continueLearning")}</p>
                    <h2 className="mt-3 font-display text-3xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                      {progress > 0 ? `${progress}%` : t("student.dashboard.startFirstLesson")}
                    </h2>
                    <p className="mt-2 text-sm leading-7" style={{ color: "var(--color-text-secondary)" }}>
                      {milestoneLabel}
                    </p>
                  </div>
                  <div className="rounded-[22px] border px-4 py-3 text-sm" style={{ borderColor: "var(--color-border)", backgroundColor: "color-mix(in oklab, var(--color-surface-2) 86%, transparent)" }}>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                      {t("student.dashboard.enrolledOn")}
                    </p>
                    <p className="mt-1 font-semibold" style={{ color: "var(--color-text-primary)" }}>
                      {data?.enrolledAt ? formatDate(data.enrolledAt, resolvedLocale) : t("common.notAvailableYet")}
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span style={{ color: "var(--color-text-secondary)" }}>
                      {t("student.dashboard.fullCourseProgressLabel")}
                    </span>
                    <span className="font-display text-lg font-bold text-brand-600">{progress}%</span>
                  </div>
                  <Progress className="h-2.5" value={progress} />
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {[
                    {
                      label: t("student.dashboard.metrics.currentFocus.label"),
                      value: data?.lastLessonId ? t("student.dashboard.metrics.currentFocus.resumeLatest") : t("student.dashboard.metrics.currentFocus.browseLibrary")
                    },
                    {
                      label: t("student.dashboard.metrics.learningPace.label"),
                      value: progress >= 60 ? t("student.dashboard.metrics.learningPace.advanced") : t("student.dashboard.metrics.learningPace.building")
                    },
                    {
                      label: t("student.dashboard.metrics.nextAction.label"),
                      value: data?.lastLessonId ? t("course.continueLearning") : t("course.allLessons")
                    }
                  ].map((item) => (
                    <div key={item.label} className="rounded-[22px] border px-4 py-4" style={{ borderColor: "var(--color-border)", backgroundColor: "color-mix(in oklab, var(--color-surface-2) 70%, transparent)" }}>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                        {item.label}
                      </p>
                      <p className="mt-2 text-sm font-semibold leading-6" style={{ color: "var(--color-text-primary)" }}>
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="dashboard-panel p-6">
                <div className="flex items-center gap-2 text-brand-600">
                  <Sparkles className="h-4 w-4" />
                  <p className="text-xs font-bold uppercase tracking-[0.16em]">{t("student.dashboard.nextSteps.title")}</p>
                </div>
                <div className="mt-4 content-stack gap-4">
                  <div className="rounded-[22px] border p-4" style={{ borderColor: "var(--color-border)", backgroundColor: "color-mix(in oklab, var(--color-brand) 8%, var(--color-surface))" }}>
                    <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                      {data?.lastLessonId ? t("student.dashboard.nextSteps.cardTitle.resume") : t("student.dashboard.nextSteps.cardTitle.library")}
                    </p>
                    <p className="mt-2 text-sm leading-6" style={{ color: "var(--color-text-secondary)" }}>
                      {data?.lastLessonId
                        ? t("student.dashboard.nextSteps.cardBody.resume")
                        : t("student.dashboard.nextSteps.cardBody.library")}
                    </p>
                  </div>

                  <Link
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl py-3 text-center text-sm font-bold text-white no-underline shadow-sm transition-all hover:opacity-95"
                    style={{ background: "var(--gradient-brand)" }}
                    to={data?.lastLessonId ? `${prefix}/lessons/${data.lastLessonId}` : `${prefix}/course`}
                  >
                    <PlayCircle className="h-4 w-4" />
                    {data?.lastLessonId ? t("course.continueLearning") : t("course.allLessons")}
                  </Link>

                  <Link
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border py-3 text-center text-sm font-medium no-underline transition-colors hover:bg-surface2"
                    style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                    to={`${prefix}/course`}
                  >
                    <BookOpenCheck className="h-4 w-4 text-brand-600" />
                    {t("nav.course")}
                  </Link>
                </div>
              </section>
            </div>

            <section className="dashboard-panel p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>{t("student.dashboard.quickLinks")}</p>
                  <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                    {t("student.dashboard.quickLinksDescription")}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2.5">
                {[
                  { to: "/course", label: t("nav.course"), icon: BookOpenCheck },
                  { to: "/progress", label: t("student.progress.title"), icon: Gauge },
                  { to: "/notes", label: t("nav.notes"), icon: FileText },
                  { to: "/downloads", label: t("nav.downloads"), icon: Download },
                  { to: "/orders", label: t("nav.orders"), icon: ReceiptText },
                ].map((link) => {
                  const Icon = link.icon;

                  return (
                    <Link
                      key={link.to}
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium no-underline transition-colors hover:bg-surface2"
                      style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-secondary)" }}
                      to={`${prefix}${link.to}`}
                    >
                      <Icon className="h-4 w-4 text-brand-600" />
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </>
    </StudentShell>
  );
};
