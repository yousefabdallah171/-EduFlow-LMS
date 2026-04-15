import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { StudentShell } from "@/components/layout/StudentShell";
import { api } from "@/lib/api";
import { formatNumber, pickLocalizedText, resolveLocale } from "@/lib/locale";

type Resource = { id: string; title: string; fileUrl: string; fileSizeBytes: number };

const formatSize = (bytes: number, locale: "en" | "ar") => {
  if (bytes < 1024) return `${formatNumber(bytes, locale)} B`;
  if (bytes < 1024 * 1024) return `${formatNumber(Number((bytes / 1024).toFixed(1)), locale)} KB`;
  return `${formatNumber(Number((bytes / (1024 * 1024)).toFixed(1)), locale)} MB`;
};

export const StudentDownloads = () => {
  const { locale } = useParams();
  const currentLocale = resolveLocale(locale);
  const { t } = useTranslation();

  const { data: lessonsData, isLoading } = useQuery({
    queryKey: ["student-lessons-downloads"],
    queryFn: () =>
      api
        .get<{ lessons: { id: string; title: string; titleEn: string; titleAr: string | null }[] }>("/lessons")
        .then((r) => r.data)
  });

  const lessons = lessonsData?.lessons ?? [];

  const resourceQueries = useQuery({
    queryKey: ["student-all-resources", lessons.map((l) => l.id)],
    enabled: lessons.length > 0,
    queryFn: async () => {
      const results = await Promise.all(
        lessons.map((l) =>
          api.get<{ resources: Resource[] }>(`/lessons/${l.id}/resources`)
            .then((r) => ({ lesson: l, resources: r.data.resources }))
            .catch(() => ({ lesson: l, resources: [] }))
        )
      );
      return results.filter((r) => r.resources.length > 0);
    }
  });

  const grouped = resourceQueries.data ?? [];

  return (
    <StudentShell>
      <>

        <header
          className="rounded-2xl border p-6 shadow-card"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <p className="text-xs font-bold uppercase tracking-widest text-brand-600">{t("student.shell.section")}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
            {t("student.downloads.title")}
          </h1>
        </header>

        {isLoading || resourceQueries.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
        ) : grouped.length === 0 ? (
          <EmptyState icon="📥" title={t("student.downloads.empty")} description={t("student.downloads.emptyDesc")} />
        ) : (
          <div className="space-y-4">
            {grouped.map(({ lesson, resources }) => (
              <div
                key={lesson.id}
                className="rounded-2xl border p-5 shadow-card"
                style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
              >
                <p className="mb-3 text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>
                  {pickLocalizedText(currentLocale, lesson.titleEn ?? lesson.title, lesson.titleAr)}
                </p>
                <div className="space-y-2">
                  {resources.map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-4">
                      <a
                        href={r.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-brand-600 no-underline hover:underline"
                      >
                        {r.title}
                      </a>
                      <Badge variant="outline">{formatSize(r.fileSizeBytes, currentLocale)}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </>
    </StudentShell>
  );
};
