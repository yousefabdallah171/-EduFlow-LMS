import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileText, Save, Sparkles, Trash2, ExternalLink } from "lucide-react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { StudentShell } from "@/components/layout/StudentShell";
import { api } from "@/lib/api";
import { formatClockDuration, pickLocalizedText, resolveLocale } from "@/lib/locale";
import { cn } from "@/lib/utils";

type Note = {
  id: string;
  content: string;
  positionSeconds: number;
  updatedAt: string;
  lesson: { id: string; titleEn: string; titleAr: string; sortOrder: number };
};

export const StudentNotes = () => {
  const { locale } = useParams();
  const { t, i18n } = useTranslation();
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";
  const resolvedLocale = resolveLocale(i18n.language);
  const isAr = resolvedLocale === "ar";
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["student-notes"],
    queryFn: () => api.get<{ notes: Note[] }>("/student/notes").then((r) => r.data)
  });

  const updateMut = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      api.patch(`/student/notes/${id}`, { content }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["student-notes"] });
      toast.success(t("student.notes.saved"));
    }
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/student/notes/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["student-notes"] });
      toast.success(t("student.notes.deleted"));
    }
  });

  const handleExport = () => {
    void api.get("/student/notes/export", { responseType: "blob" }).then((r) => {
      const url = URL.createObjectURL(r.data as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "notes.txt";
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const notes = data?.notes ?? [];

  return (
    <StudentShell>
      <>
        <PageHeader
          hero
          backHref={`${prefix}/dashboard`}
          backLabel={t("nav.dashboard")}
          eyebrow={t("student.shell.section")}
          title={t("student.notes.title")}
          description={t("student.notes.description")}
          actions={
            notes.length > 0 ? (
              <button
                onClick={handleExport}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-surface2"
                style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-secondary)" }}
                type="button"
              >
                <Download className="h-4 w-4 text-brand-600" />
                {t("student.notes.export")}
              </button>
            ) : null
          }
        />

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-[24px]" />)}
          </div>
        ) : notes.length === 0 ? (
          <EmptyState
            illustration={<FileText className="mx-auto h-10 w-10 text-brand-600" />}
            eyebrow={t("student.notes.emptyEyebrow")}
            title={t("student.notes.empty")}
            description={t("student.notes.emptyDesc")}
            action={
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: "var(--color-brand-muted)", color: "var(--color-brand)" }}>
                <Sparkles className="h-3.5 w-3.5" />
                {t("student.notes.emptyTip")}
              </div>
            }
          />
        ) : (
          <div className="space-y-4">
            {notes.map((note) => {
              const draft = editing[note.id] ?? note.content;

              return (
                <div key={note.id} className="dashboard-panel p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={cn("text-xs font-bold tracking-[0.16em] text-brand-600", !isAr && "uppercase")}>
                          {pickLocalizedText(resolvedLocale, note.lesson.titleEn, note.lesson.titleAr)}
                        </p>
                        <span
                          className="rounded-full px-2.5 py-1 text-xs font-semibold"
                          dir="ltr"
                          style={{ backgroundColor: "var(--color-surface-2)", color: "var(--color-text-muted)" }}
                        >
                          {formatClockDuration(note.positionSeconds, resolvedLocale)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                        {t("student.notes.editHint")}
                      </p>
                    </div>
                    <Link
                      to={`${prefix}/lessons/${note.lesson.id}?notePosition=${note.positionSeconds}`}
                      className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium no-underline transition-colors hover:bg-surface2 sm:w-auto sm:flex-shrink-0"
                      style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-secondary)" }}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>{t("actions.resume")}</span>
                    </Link>
                  </div>

                  <textarea
                    className="mt-4 w-full rounded-[20px] border px-4 py-4 text-sm leading-7 outline-none transition-colors focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15"
                    style={{ backgroundColor: "var(--color-page)", borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)", resize: "vertical", minHeight: "160px" }}
                    dir="auto"
                    value={draft}
                    onChange={(e) => setEditing({ ...editing, [note.id]: e.target.value })}
                  />

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        void updateMut.mutateAsync({ id: note.id, content: draft });
                      }}
                      disabled={updateMut.isPending}
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:opacity-95 disabled:opacity-50"
                      style={{ background: "var(--gradient-brand)" }}
                      type="button"
                    >
                      <Save className="h-3.5 w-3.5" />
                      {t("actions.save")}
                    </button>
                    <button
                      onClick={() => {
                        void deleteMut.mutateAsync(note.id);
                      }}
                      disabled={deleteMut.isPending}
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl border px-4 py-2 text-xs font-medium transition-colors hover:bg-surface2"
                      style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-secondary)" }}
                      type="button"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t("actions.delete")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </>
    </StudentShell>
  );
};
