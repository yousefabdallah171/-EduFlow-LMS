import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileText, Save, Trash2 } from "lucide-react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { StudentShell } from "@/components/layout/StudentShell";
import { api } from "@/lib/api";
import { pickLocalizedText, resolveLocale } from "@/lib/locale";

type Note = {
  id: string;
  content: string;
  updatedAt: string;
  lesson: { id: string; titleEn: string; titleAr: string; sortOrder: number };
};

export const StudentNotes = () => {
  const { locale } = useParams();
  const currentLocale = resolveLocale(locale);
  const { t } = useTranslation();
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
        <header className="dashboard-panel dashboard-hero dashboard-panel--strong flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-brand-600">
              <FileText className="h-3.5 w-3.5" />
              {t("student.shell.section")}
            </p>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
              {t("student.notes.title")}
            </h1>
          </div>
          {notes.length > 0 ? (
            <button
              onClick={handleExport}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors hover:bg-surface2"
              style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-secondary)" }}
              type="button"
            >
              <Download className="h-4 w-4 text-brand-600" />
              {t("student.notes.export")}
            </button>
          ) : null}
        </header>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-[24px]" />)}
          </div>
        ) : notes.length === 0 ? (
          <EmptyState
            illustration={<FileText className="mx-auto h-10 w-10 text-brand-600" />}
            title={t("student.notes.empty")}
            description={t("student.notes.emptyDesc")}
          />
        ) : (
          <div className="space-y-4">
            {notes.map((note) => {
              const draft = editing[note.id] ?? note.content;

              return (
                <div key={note.id} className="dashboard-panel p-5">
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                    {pickLocalizedText(currentLocale, note.lesson.titleEn, note.lesson.titleAr)}
                  </p>
                  <textarea
                    className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-colors focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15"
                    style={{ backgroundColor: "var(--color-page)", borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)", resize: "vertical", minHeight: "96px" }}
                    value={draft}
                    onChange={(e) => setEditing({ ...editing, [note.id]: e.target.value })}
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
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
