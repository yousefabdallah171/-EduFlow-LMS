import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress as ProgressBar } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
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

        <header
          className="rounded-2xl border p-6 shadow-card"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <p className="text-xs font-bold uppercase tracking-widest text-brand-600">{t("student.dashboard.yourJourney")}</p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
            {t("student.progress.title")}
          </h1>
          {!isLoading && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span style={{ color: "var(--color-text-secondary)" }}>
                  {t("student.progress.summary", {
                    completed: formatNumber(completed, currentLocale),
                    total: formatNumber(lessons.length, currentLocale)
                  })}
                </span>
                <span className="font-bold text-brand-600">{percent}%</span>
              </div>
              <ProgressBar value={percent} />
            </div>
          )}
        </header>

        <div
          className="rounded-2xl border shadow-card overflow-hidden"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          {isLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
            </div>
          ) : lessons.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>{t("student.progress.noLessons")}</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
                  <th className="px-5 py-3 text-start text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
                    {t("student.progress.lessonTitle")}
                  </th>
                  <th className="px-5 py-3 text-start text-xs font-bold uppercase tracking-widest hidden sm:table-cell" style={{ color: "var(--color-text-muted)" }}>
                    {t("student.progress.watchTime")}
                  </th>
                  <th className="px-5 py-3 text-start text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
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
                    <td className="px-5 py-3.5 hidden sm:table-cell" style={{ color: "var(--color-text-secondary)" }}>
                      {formatMinutesShort(lesson.lastPositionSeconds, currentLocale)}
                    </td>
                    <td className="px-5 py-3.5">
                      {lesson.completedAt ? (
                        <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">
                          {t("student.progress.completed")}
                        </Badge>
                      ) : lesson.lastPositionSeconds > 0 ? (
                        <Badge variant="outline">{t("student.progress.inProgress")}</Badge>
                      ) : (
                        <Badge variant="outline" className="opacity-50">{t("student.progress.notStarted")}</Badge>
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
