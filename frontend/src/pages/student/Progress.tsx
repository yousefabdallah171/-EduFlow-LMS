import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock3, Gauge, ListChecks } from "lucide-react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Progress as ProgressBar } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { StudentShell } from "@/components/layout/StudentShell";
import { api } from "@/lib/api";
import { formatMinutesShort, formatNumber, resolveLocale } from "@/lib/locale";

type LessonItem = {
  id: string;
  title: string;
  durationSeconds: number | null;
  completedAt: string | null;
  lastPositionSeconds: number;
  isUnlocked: boolean;
};

export const StudentProgress = () => {
  const { locale } = useParams();
  const { t } = useTranslation();
  const currentLocale = resolveLocale(locale);

  const { data, isLoading } = useQuery({
    queryKey: ["student-lessons"],
    queryFn: () => api.get<{ lessons: LessonItem[] }>("/lessons").then((r) => r.data)
  });

  const lessons = data?.lessons ?? [];
  const completed = lessons.filter((l) => l.completedAt).length;
  const percent = lessons.length > 0 ? Math.round((completed / lessons.length) * 100) : 0;

  return (
    <StudentShell>
      <>
        <header className="dashboard-panel dashboard-hero dashboard-panel--strong p-6">
          <div className="relative">
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-brand-600">
              <Gauge className="h-3.5 w-3.5" />
              {t("student.dashboard.yourJourney")}
            </p>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
              {t("student.progress.title")}
            </h1>
            {!isLoading ? (
              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                  <span style={{ color: "var(--color-text-secondary)" }}>
                    {t("student.progress.summary", {
                      completed: formatNumber(completed, currentLocale),
                      total: formatNumber(lessons.length, currentLocale)
                    })}
                  </span>
                  <span className="font-display text-lg font-bold text-brand-600">{percent}%</span>
                </div>
                <ProgressBar value={percent} />
              </div>
            ) : null}
          </div>
        </header>

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
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
                  <th className="px-5 py-3 text-start text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                    {t("student.progress.lessonTitle")}
                  </th>
                  <th className="hidden px-5 py-3 text-start text-xs font-bold uppercase tracking-[0.16em] sm:table-cell" style={{ color: "var(--color-text-muted)" }}>
                    {t("student.progress.watchTime")}
                  </th>
                  <th className="px-5 py-3 text-start text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                    {t("student.progress.status")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {lessons.map((lesson, i) => (
                  <tr
                    key={lesson.id}
                    className={i < lessons.length - 1 ? "border-b" : ""}
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    <td className="px-5 py-3.5 font-medium" style={{ color: "var(--color-text-primary)" }}>
                      {lesson.title}
                    </td>
                    <td className="hidden px-5 py-3.5 sm:table-cell" style={{ color: "var(--color-text-secondary)" }}>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 className="h-3.5 w-3.5 text-brand-600" />
                        {formatMinutesShort(lesson.lastPositionSeconds, currentLocale)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </>
    </StudentShell>
  );
};
