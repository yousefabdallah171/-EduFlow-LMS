import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
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
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["student-notes"] }); toast.success(t("student.notes.saved")); }
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/student/notes/${id}`),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["student-notes"] }); toast.success(t("student.notes.deleted")); }
  });

  const handleExport = () => {
    void api.get("/student/notes/export", { responseType: "blob" }).then((r) => {
      const url = URL.createObjectURL(r.data as Blob);
      const a = document.createElement("a");
      a.href = url; a.download = "notes.txt"; a.click();
      URL.revokeObjectURL(url);
    });
  };

  const notes = data?.notes ?? [];

  return (
    <StudentShell>
      <>

        <header
          className="flex items-center justify-between rounded-2xl border p-6 shadow-card"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-600">{t("student.shell.section")}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
              {t("student.notes.title")}
            </h1>
          </div>
          {notes.length > 0 && (
            <button
              onClick={handleExport}
              className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-surface2"
              style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-secondary)" }}
              type="button"
            >
              {t("student.notes.export")}
            </button>
          )}
        </header>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
          </div>
        ) : notes.length === 0 ? (
          <EmptyState
            icon="📝"
            title={t("student.notes.empty")}
            description={t("student.notes.emptyDesc")}
          />
        ) : (
          <div className="space-y-4">
            {notes.map((note) => {
              const draft = editing[note.id] ?? note.content;
              return (
                <div
                  key={note.id}
                  className="rounded-2xl border p-5 shadow-card"
                  style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
                >
                  <p className="mb-2 text-xs font-bold" style={{ color: "var(--color-text-muted)" }}>
                    {pickLocalizedText(currentLocale, note.lesson.titleEn, note.lesson.titleAr)}
                  </p>
                  <textarea
                    className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-colors focus:border-brand-600"
                    style={{ backgroundColor: "var(--color-page)", borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)", resize: "vertical", minHeight: "80px" }}
                    value={draft}
                    onChange={(e) => setEditing({ ...editing, [note.id]: e.target.value })}
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => { void updateMut.mutateAsync({ id: note.id, content: draft }); }}
                      disabled={updateMut.isPending}
                      className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-brand-700 disabled:opacity-50"
                      type="button"
                    >
                      {t("actions.save")}
                    </button>
                    <button
                      onClick={() => { void deleteMut.mutateAsync(note.id); }}
                      disabled={deleteMut.isPending}
                      className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface2"
                      style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-secondary)" }}
                      type="button"
                    >
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
