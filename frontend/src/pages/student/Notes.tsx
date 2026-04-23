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
import { pickLocalizedText, resolveLocale } from "@/lib/locale";

type Note = {
  id: string;
  content: string;
  positionSeconds: number;
  updatedAt: string;
  lesson: { id: string; titleEn: string; titleAr: string; sortOrder: number };
};

export const StudentNotes = () => {
  const { locale } = useParams();
  const currentLocale = resolveLocale(locale);
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Record<string, string>>({});
  const isAr = currentLocale === "ar";

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
          eyebrow={t("student.shell.section")}
          title={t("student.notes.title")}
          description={
            isAr
              ? "اجمع أفكارك وملاحظاتك في مكان واحد حتى يسهل الرجوع إليها أثناء التقدم عبر الدروس."
              : "Keep your ideas and lesson takeaways in one place so they are easy to revisit while you move through the course."
          }
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
            eyebrow={isAr ? "مساحة الملاحظات" : "Your note space"}
            title={t("student.notes.empty")}
            description={t("student.notes.emptyDesc")}
            action={
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: "var(--color-brand-muted)", color: "var(--color-brand)" }}>
                <Sparkles className="h-3.5 w-3.5" />
                {isAr ? "افتح أي درس وابدأ التدوين أثناء المشاهدة." : "Open any lesson and start writing while you watch."}
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
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">
                          {pickLocalizedText(currentLocale, note.lesson.titleEn, note.lesson.titleAr)}
                        </p>
                        <span className="text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
                          {Math.floor(note.positionSeconds / 60)}:{String(note.positionSeconds % 60).padStart(2, "0")}
                        </span>
                      </div>
                      <p className="mt-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                        {isAr ? "حرر الملاحظة ثم احفظها لتظل مرتبطة بالدرس." : "Edit your note here and save it to keep it attached to this lesson."}
                      </p>
                    </div>
                    <Link
                      to={`/${locale}/lessons/${note.lesson.id}?notePosition=${note.positionSeconds}`}
                      className="flex-shrink-0 inline-flex min-h-10 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium no-underline transition-colors hover:bg-surface2"
                      style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-secondary)" }}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                  <textarea
                    className="mt-4 w-full rounded-[20px] border px-4 py-4 text-sm leading-7 outline-none transition-colors focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15"
                    style={{ backgroundColor: "var(--color-page)", borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)", resize: "vertical", minHeight: "160px" }}
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
