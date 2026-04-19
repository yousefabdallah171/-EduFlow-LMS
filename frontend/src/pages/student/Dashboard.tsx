import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpenCheck, Download, FileText, Gauge, ReceiptText } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { StudentShell } from "@/components/layout/StudentShell";
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

  const { data, isLoading } = useQuery({
    queryKey: ["student-dashboard"],
    queryFn: () => api.get<DashboardData>("/student/dashboard").then((r) => r.data)
  });

  return (
    <StudentShell>
      <>

        <header className="dashboard-panel dashboard-hero dashboard-panel--strong p-6">
          <div className="relative">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">{t("student.shell.section")}</p>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
              {t("course.welcomeBack")}
            </h1>
          </div>
        </header>

        {isLoading ? (
          <div className="dashboard-stat-grid">
            <Skeleton className="h-40 rounded-[24px]" />
            <Skeleton className="h-40 rounded-[24px]" />
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {/* Progress card */}
            <div
              className="dashboard-panel dashboard-panel--accent p-6"
            >
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">{t("student.dashboard.progress")}</p>
              <p className="mt-3 font-display text-4xl font-bold" style={{ color: "var(--color-text-primary)" }}>
                {data?.completionPercent ?? 0}%
              </p>
              <Progress className="mt-3" value={data?.completionPercent ?? 0} />
              <p className="mt-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
                {t("student.dashboard.lessonsCompleted")}
              </p>
            </div>

            {/* Continue learning */}
            <div
              className="dashboard-panel flex flex-col p-6"
            >
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">{t("student.dashboard.continueLearning")}</p>
              {data?.lastLessonId ? (
                <Link
                  className="mt-auto inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl py-3 text-center text-sm font-bold text-white no-underline shadow-sm transition-all hover:opacity-95"
                  style={{ background: "var(--gradient-brand)" }}
                  to={`${prefix}/lessons/${data.lastLessonId}`}
                >
                  {t("student.dashboard.continueLearning")}
                  <ArrowRight className="icon-dir h-4 w-4 opacity-80" />
                </Link>
              ) : (
                <Link
                  className="mt-auto inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl py-3 text-center text-sm font-bold text-white no-underline shadow-sm transition-all hover:opacity-95"
                  style={{ background: "var(--gradient-brand)" }}
                  to={`${prefix}/course`}
                >
                  {t("course.allLessons")}
                  <ArrowRight className="icon-dir h-4 w-4 opacity-80" />
                </Link>
              )}
              {data?.enrolledAt && (
                <p className="mt-3 text-xs text-center" style={{ color: "var(--color-text-muted)" }}>
                  {t("student.dashboard.enrolledOn")} {formatDate(data.enrolledAt, currentLocale)}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Quick links */}
        <div className="dashboard-panel p-5">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>{t("student.dashboard.quickLinks")}</p>
          <div className="flex flex-wrap gap-2">
            {[
              { to: "/course",    label: t("nav.course"), icon: BookOpenCheck },
              { to: "/progress",  label: t("student.progress.title"), icon: Gauge },
              { to: "/notes",     label: t("nav.notes"), icon: FileText },
              { to: "/downloads", label: t("nav.downloads"), icon: Download },
              { to: "/orders",    label: t("nav.orders"), icon: ReceiptText },
            ].map((link) => {
              const Icon = link.icon;

              return (
              <Link
                key={link.to}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium no-underline transition-colors hover:bg-surface2"
                style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-secondary)" }}
                to={`${prefix}${link.to}`}
              >
                <Icon className="h-4 w-4 text-brand-600" />
                {link.label}
              </Link>
              );
            })}
          </div>
        </div>
      </>
    </StudentShell>
  );
};
