import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpenCheck, Download, FileText, Gauge, PlayCircle, ReceiptText, Sparkles } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Progress } from "@/components/ui/progress";
import { StudentShell } from "@/components/layout/StudentShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { SkeletonDashboard } from "@/components/skeletons";
import { api } from "@/lib/api";
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
  const currentLocale = resolveLocale(locale);
  const { t } = useTranslation();
  const isAr = currentLocale === "ar";

  const { data, isLoading } = useQuery({
    queryKey: ["student-dashboard"],
    queryFn: () => api.get<DashboardData>("/student/dashboard").then((r) => r.data)
  });

  const progress = data?.completionPercent ?? 0;
  const milestoneLabel =
    progress >= 100
      ? isAr ? "أكملت المسار بالكامل" : "You completed the full workflow"
      : progress >= 70
        ? isAr ? "أنت في المرحلة النهائية" : "You are in the final stretch"
        : progress >= 35
          ? isAr ? "أنت تتقدم بثبات" : "You are building strong momentum"
          : isAr ? "ابدأ بالدرس التالي لتثبيت العادة" : "Start the next lesson to build momentum";

  return (
    <StudentShell>
      <>
        <PageHeader
          hero
          eyebrow={t("student.shell.section")}
          title={t("course.welcomeBack")}
          description={isAr ? "هذا هو مركز التعلم الخاص بك: تابع من حيث توقفت، راجع تقدمك، وتحرك بسرعة إلى الدرس التالي." : "This is your learning hub: resume quickly, check your progress, and move straight into the next lesson."}
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
                      {progress > 0 ? `${progress}%` : isAr ? "ابدأ أول درس" : "Start your first lesson"}
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
                      {data?.enrolledAt ? formatDate(data.enrolledAt, currentLocale) : isAr ? "غير متاح بعد" : "Not available yet"}
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span style={{ color: "var(--color-text-secondary)" }}>
                      {isAr ? "تقدمك في جميع الدروس المفتوحة" : "Your progress across the full course"}
                    </span>
                    <span className="font-display text-lg font-bold text-brand-600">{progress}%</span>
                  </div>
                  <Progress className="h-2.5" value={progress} />
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {[
                    {
                      label: isAr ? "الهدف الحالي" : "Current focus",
                      value: data?.lastLessonId ? (isAr ? "متابعة آخر درس" : "Resume your latest lesson") : (isAr ? "استكشاف مكتبة الدورة" : "Browse the lesson library")
                    },
                    {
                      label: isAr ? "إيقاع التعلم" : "Learning pace",
                      value: progress >= 60 ? (isAr ? "متقدم" : "Advanced momentum") : (isAr ? "قيد البناء" : "Building rhythm")
                    },
                    {
                      label: isAr ? "الخطوة التالية" : "Next action",
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
                  <p className="text-xs font-bold uppercase tracking-[0.16em]">{isAr ? "المسار القادم" : "What to do next"}</p>
                </div>
                <div className="mt-4 content-stack gap-4">
                  <div className="rounded-[22px] border p-4" style={{ borderColor: "var(--color-border)", backgroundColor: "color-mix(in oklab, var(--color-brand) 8%, var(--color-surface))" }}>
                    <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                      {data?.lastLessonId ? (isAr ? "أكمل آخر درس توقفت عنده" : "Resume the lesson you last touched") : (isAr ? "ادخل إلى مكتبة الدروس" : "Open the lesson library")}
                    </p>
                    <p className="mt-2 text-sm leading-6" style={{ color: "var(--color-text-secondary)" }}>
                      {data?.lastLessonId
                        ? (isAr ? "العودة السريعة تقلل التشتت وتساعدك على الحفاظ على تسلسل التعلم." : "A quick return keeps your learning rhythm intact and reduces friction.")
                        : (isAr ? "ابدأ بالوحدة الأولى ثم انتقل خطوة بخطوة عبر مراحل الـ workflow." : "Start with the first module, then move phase by phase through the workflow.")}
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
                    {isAr ? "تنقل سريع إلى الصفحات التي تستخدمها باستمرار أثناء التعلم." : "Fast access to the supporting pages you use while learning."}
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
