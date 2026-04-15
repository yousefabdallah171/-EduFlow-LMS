import { useQuery } from "@tanstack/react-query";
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

        <header
          className="rounded-2xl border p-6 shadow-card"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <p className="text-xs font-bold uppercase tracking-widest text-brand-600">{t("student.shell.section")}</p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
            {t("course.welcomeBack")}
          </h1>
        </header>

        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {/* Progress card */}
            <div
              className="rounded-2xl border p-6 shadow-card"
              style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
            >
              <p className="text-xs font-bold uppercase tracking-widest text-brand-600">{t("student.dashboard.progress")}</p>
              <p className="mt-3 text-4xl font-bold" style={{ color: "var(--color-text-primary)" }}>
                {data?.completionPercent ?? 0}%
              </p>
              <Progress className="mt-3" value={data?.completionPercent ?? 0} />
              <p className="mt-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
                {t("student.dashboard.lessonsCompleted")}
              </p>
            </div>

            {/* Continue learning */}
            <div
              className="flex flex-col rounded-2xl border p-6 shadow-card"
              style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
            >
              <p className="text-xs font-bold uppercase tracking-widest text-brand-600">{t("student.dashboard.continueLearning")}</p>
              {data?.lastLessonId ? (
                <Link
                  className="mt-auto block w-full rounded-xl bg-brand-600 py-3 text-center text-sm font-bold text-white no-underline transition-all hover:bg-brand-700"
                  to={`${prefix}/lessons/${data.lastLessonId}`}
                >
                  {t("student.dashboard.continueLearning")} <span className="icon-dir opacity-70">→</span>
                </Link>
              ) : (
                <Link
                  className="mt-auto block w-full rounded-xl bg-brand-600 py-3 text-center text-sm font-bold text-white no-underline transition-all hover:bg-brand-700"
                  to={`${prefix}/course`}
                >
                  {t("course.allLessons")} <span className="icon-dir opacity-70">→</span>
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
        <div
          className="rounded-2xl border p-5 shadow-card"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <p className="mb-4 text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>{t("student.dashboard.quickLinks")}</p>
          <div className="flex flex-wrap gap-2">
            {[
              { to: "/course",    label: t("nav.course") },
              { to: "/progress",  label: t("student.progress.title") },
              { to: "/notes",     label: t("nav.notes") },
              { to: "/downloads", label: t("nav.downloads") },
              { to: "/orders",    label: t("nav.orders") },
            ].map((link) => (
              <Link
                key={link.to}
                className="rounded-lg border px-3 py-2 text-sm font-medium no-underline transition-colors hover:bg-surface2"
                style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-secondary)" }}
                to={`${prefix}${link.to}`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </>
    </StudentShell>
  );
};
