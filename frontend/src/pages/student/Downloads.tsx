import { useQuery } from "@tanstack/react-query";
import { Download, FileDown, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
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
  const { t, i18n } = useTranslation();
  const resolvedLocale = resolveLocale(i18n.language);

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
  const resourceCount = grouped.reduce((total, item) => total + item.resources.length, 0);

  return (
    <StudentShell>
      <>
        <PageHeader
          hero
          eyebrow={t("student.shell.section")}
          title={t("student.downloads.title")}
          description={t("student.downloads.description")}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="dashboard-panel dashboard-panel--accent p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">{t("student.downloads.metrics.availableResources")}</p>
            <p className="mt-2 font-display text-3xl font-bold" style={{ color: "var(--color-text-primary)" }}>{resourceCount}</p>
          </div>
          <div className="dashboard-panel p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>{t("student.downloads.metrics.linkedLessons")}</p>
            <p className="mt-2 font-display text-3xl font-bold" style={{ color: "var(--color-text-primary)" }}>{grouped.length}</p>
          </div>
          <div className="dashboard-panel p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>{t("student.downloads.metrics.bestUse")}</p>
            <p className="mt-2 text-sm leading-6" style={{ color: "var(--color-text-secondary)" }}>
              {t("student.downloads.metrics.bestUseBody")}
            </p>
          </div>
        </div>

        {isLoading || resourceQueries.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-[24px]" />)}
          </div>
        ) : grouped.length === 0 ? (
          <EmptyState
            illustration={<FileDown className="mx-auto h-10 w-10 text-brand-600" />}
            eyebrow={t("student.downloads.emptyEyebrow")}
            title={t("student.downloads.empty")}
            description={t("student.downloads.emptyDesc")}
          />
        ) : (
          <div className="space-y-4">
            {grouped.map(({ lesson, resources }) => (
              <div key={lesson.id} className="dashboard-panel p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>
                      {pickLocalizedText(resolvedLocale, lesson.titleEn ?? lesson.title, lesson.titleAr)}
                    </p>
                    <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                      {t("student.downloads.filesAttached", { count: resources.length })}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {resources.map((resource) => (
                    <a
                      key={resource.id}
                      href={resource.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="dashboard-panel flex flex-wrap items-center justify-between gap-3 rounded-[24px] px-4 py-4 no-underline transition-colors hover:bg-surface2"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: "var(--color-brand-muted)", color: "var(--color-brand)" }}>
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                            {resource.title}
                          </p>
                          <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
                            {t("student.downloads.readyToDownload")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{formatSize(resource.fileSizeBytes, resolvedLocale)}</Badge>
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600">
                          <Download className="h-3.5 w-3.5" />
                          {t("student.downloads.download")}
                        </span>
                      </div>
                    </a>
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
