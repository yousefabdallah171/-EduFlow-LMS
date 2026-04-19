import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { AdminShell } from "@/components/layout/AdminShell";
import { SectionManager } from "@/components/admin/SectionManager";
import { LessonForm } from "@/components/admin/LessonForm";
import { AttachmentManager } from "@/components/admin/AttachmentManager";
import { Progress } from "@/components/ui/progress";
import { useTusUpload } from "@/hooks/useTusUpload";
import { api, queryClient } from "@/lib/api";

type LessonAdmin = {
  id: string;
  titleEn: string;
  titleAr: string;
  sortOrder: number;
  isPublished: boolean;
  videoStatus: "NONE" | "PROCESSING" | "READY" | "ERROR";
  durationSeconds: number | null;
  dripDays: number | null;
  sectionId?: string;
  section?: {
    id: string;
    titleEn: string;
    titleAr: string;
  } | null;
};

const VideoStatusBadge = ({ status }: { status: LessonAdmin["videoStatus"] }) => {
  const map: Record<LessonAdmin["videoStatus"], { bg: string; color: string }> = {
    READY:      { bg: "rgba(34,197,94,0.12)",  color: "rgb(21,128,61)" },
    PROCESSING: { bg: "rgba(234,179,8,0.12)",  color: "rgb(161,98,7)" },
    ERROR:      { bg: "rgba(239,68,68,0.12)",  color: "rgb(185,28,28)" },
    NONE:       { bg: "var(--color-surface-2)", color: "var(--color-text-muted)" }
  };
  const s = map[status];
  return (
    <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: s.bg, color: s.color }}>
      {status}
    </span>
  );
};

export const AdminLessons = () => {
  const { t } = useTranslation();
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [lessonFormOpen, setLessonFormOpen] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const { progress, bytesUploaded, bytesTotal, isUploading, startUpload, cancelUpload } = useTusUpload({ lessonId: selectedLessonId });

  const lessonsQuery = useQuery({
    queryKey: ["admin-lessons", selectedSectionId],
    queryFn: async () => {
      const params = selectedSectionId ? { sectionId: selectedSectionId } : {};
      const response = await api.get<{ lessons: LessonAdmin[] }>("/admin/lessons", { params });
      return response.data.lessons;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (lessonId: string) => api.delete(`/admin/lessons/${lessonId}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-lessons"] });
      setSelectedLessonId(null);
    }
  });

  const handleDeleteLesson = async (lessonId: string) => {
    if (!window.confirm("Delete this lesson?")) return;
    try {
      await deleteMutation.mutateAsync(lessonId);
    } catch (error) {
      const apiError = error as AxiosError<{ message?: string }>;
      toast.error(apiError.response?.data?.message ?? "Failed to delete lesson.");
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <AdminShell title={t("admin.lessons.title")} description={t("admin.lessons.desc")}>
      <section className="space-y-5">
        {/* Two-panel layout */}
        <div className="grid gap-5 grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
          {/* Left panel: Sections */}
          <div>
            <SectionManager
              selectedSectionId={selectedSectionId}
              onSelectSection={setSelectedSectionId}
            />
          </div>

          {/* Right panel: Lessons for selected section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                Lessons {selectedSectionId ? "in Section" : ""}
              </h3>
              <button
                className="rounded-xl px-3 py-2 text-xs font-bold text-white transition-all hover:opacity-95"
                style={{ background: "var(--gradient-brand)" }}
                onClick={() => {
                  setEditingLessonId(null);
                  setLessonFormOpen(true);
                }}
                type="button"
              >
                + New Lesson
              </button>
            </div>

            {/* Lessons grid/table */}
            <div className="dashboard-panel overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                      {[
                        t("admin.lessons.table.lesson"),
                        t("admin.lessons.table.section"),
                        t("admin.lessons.table.videoStatus"),
                        t("admin.lessons.table.order"),
                        t("admin.lessons.table.duration"),
                        t("admin.lessons.table.actions")
                      ].map((h) => (
                        <th key={h} className="px-4 py-3 text-start text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lessonsQuery.data?.map((lesson) => (
                      <tr key={lesson.id} className="transition-colors hover:bg-surface2" style={{ borderBottom: "1px solid var(--color-border)" }}>
                        <td className="px-4 py-3 cursor-pointer" onClick={() => setSelectedLessonId(lesson.id)}>
                          <p className="font-semibold" style={{ color: "var(--color-text-primary)" }}>{lesson.titleEn}</p>
                          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{lesson.titleAr}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-medium" style={{ color: "var(--color-text-primary)" }}>
                            {lesson.sectionId ? lesson.section?.titleEn ?? t("admin.lessons.noSection") : t("admin.lessons.noSection")}
                          </p>
                          {lesson.sectionId ? (
                            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                              {lesson.section?.titleAr}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3"><VideoStatusBadge status={lesson.videoStatus} /></td>
                        <td className="px-4 py-3 tabular-nums text-xs" style={{ color: "var(--color-text-secondary)" }}>{lesson.sortOrder}</td>
                        <td className="px-4 py-3 tabular-nums text-xs" style={{ color: "var(--color-text-secondary)" }}>
                          {lesson.durationSeconds ? `${Math.floor(lesson.durationSeconds / 60)}m ${lesson.durationSeconds % 60}s` : "-"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              className="rounded-xl px-3 py-2 text-xs font-bold text-white transition-all hover:opacity-95"
                              style={{ background: "var(--gradient-brand)" }}
                              onClick={() => {
                                setSelectedLessonId(lesson.id);
                              }}
                              type="button"
                            >
                              Upload
                            </button>
                            <button
                              className="rounded-lg border px-3 py-2 text-xs font-semibold transition-colors hover:bg-surface2"
                              style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                              onClick={() => {
                                setEditingLessonId(lesson.id);
                                setLessonFormOpen(true);
                              }}
                              type="button"
                            >
                              Edit
                            </button>
                            <button
                              className="rounded-lg border px-3 py-2 text-xs font-semibold transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                              style={{ borderColor: "rgba(239,68,68,0.4)", color: "rgb(185,28,28)" }}
                              onClick={() => void handleDeleteLesson(lesson.id)}
                              type="button"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {!lessonsQuery.data || lessonsQuery.data.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                    {selectedSectionId ? "No lessons in this section yet." : "Select a section or create a new lesson."}
                  </p>
                </div>
              ) : null}
            </div>

            {/* Selected lesson editor */}
            {selectedLessonId ? (
              <div className="space-y-4">
                <h4 className="text-sm font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                  Lesson details & resources
                </h4>

                <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                  {/* Video upload */}
                  <div className="dashboard-panel p-4">
                    <h5 className="mb-4 text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                      Upload video
                    </h5>
                    <div className="space-y-3">
                      <div>
                        <label className="mb-2 block text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
                          Video file
                        </label>
                        <input
                          accept="video/*"
                          className="block w-full rounded-lg border px-3 py-2 text-sm transition-colors file:mr-2 file:rounded-lg file:border-0 file:bg-zinc-950 file:px-2 file:py-1 file:text-xs file:font-bold file:text-white"
                          style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)", backgroundColor: "var(--color-surface-2)" }}
                          disabled={isUploading}
                          type="file"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file && selectedLessonId) startUpload(file);
                          }}
                        />
                      </div>

                      {isUploading ? (
                        <div
                          className="rounded-lg border p-3"
                          style={{ borderColor: "var(--color-border-strong)", backgroundColor: "var(--color-surface-2)" }}
                        >
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>Progress</span>
                            <span className="tabular-nums text-sm font-bold text-brand-600">{progress}%</span>
                          </div>
                          <Progress className="h-2" value={progress} />
                          <p className="mt-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
                            {formatBytes(bytesUploaded)} / {formatBytes(bytesTotal)}
                          </p>
                        </div>
                      ) : null}

                      {isUploading ? (
                        <button
                          className="w-full rounded-lg border px-3 py-2 text-xs font-semibold transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                          style={{ borderColor: "rgba(239,68,68,0.4)", color: "rgb(185,28,28)" }}
                          onClick={() => void cancelUpload()}
                          type="button"
                        >
                          Cancel
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {/* Attachments */}
                  <AttachmentManager lessonId={selectedLessonId} />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* Lesson form dialog */}
      <LessonForm
        lessonId={editingLessonId}
        sectionId={selectedSectionId}
        open={lessonFormOpen}
        onOpenChange={setLessonFormOpen}
        onSubmit={() => {
          setEditingLessonId(null);
        }}
      />
    </AdminShell>
  );
};
