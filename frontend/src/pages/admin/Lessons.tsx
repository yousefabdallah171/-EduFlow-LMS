import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";

import { AdminShell } from "@/components/layout/AdminShell";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const { progress, bytesUploaded, bytesTotal, isUploading, startUpload, cancelUpload } = useTusUpload({ lessonId: selectedLessonId });

  const lessonsQuery = useQuery({
    queryKey: ["admin-lessons"],
    queryFn: async () => {
      const response = await api.get<{ lessons: LessonAdmin[] }>("/admin/lessons");
      return response.data.lessons;
    }
  });

  const uploadsQuery = useQuery({
    queryKey: ["admin-uploads"],
    refetchInterval: isUploading ? 3000 : 5000,
    queryFn: async () => {
      const response = await api.get<{
        uploads: Array<{
          id: string;
          filename: string;
          sizeBytes: number;
          offsetBytes: number;
          status: string;
          lessonId: string | null;
          createdAt: string;
        }>;
      }>("/admin/uploads");
      return response.data.uploads;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (lessonId: string) => api.delete(`/admin/lessons/${lessonId}`),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["admin-lessons"] }); }
  });

  const currentLesson = useMemo(
    () => lessonsQuery.data?.find((l) => l.id === selectedLessonId) ?? null,
    [lessonsQuery.data, selectedLessonId]
  );

  const handleSelectLesson = (lessonId: string) => {
    setSelectedLessonId(lessonId);
    setSheetOpen(true);
  };

  const handleDeleteLesson = async (lessonId: string) => {
    try {
      await deleteMutation.mutateAsync(lessonId);
    } catch (error) {
      const apiError = error as AxiosError<{ message?: string }>;
      window.alert(apiError.response?.data?.message ?? "Failed to delete lesson.");
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <AdminShell title="Lesson uploads" description="Attach resumable video uploads to lessons and monitor offset progress for large files.">
      <section className="space-y-5">

        {/* Lessons table */}
        <div
          className="overflow-hidden rounded-2xl border shadow-card"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                  {["Lesson", "Video status", "Order", "Duration", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-start text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lessonsQuery.data?.map((lesson) => (
                  <tr key={lesson.id} className="transition-colors hover:bg-surface2" style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td className="px-4 py-3">
                      <p className="font-semibold" style={{ color: "var(--color-text-primary)" }}>{lesson.titleEn}</p>
                      <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{lesson.titleAr}</p>
                    </td>
                    <td className="px-4 py-3"><VideoStatusBadge status={lesson.videoStatus} /></td>
                    <td className="px-4 py-3 tabular-nums text-xs" style={{ color: "var(--color-text-secondary)" }}>{lesson.sortOrder}</td>
                    <td className="px-4 py-3 tabular-nums text-xs" style={{ color: "var(--color-text-secondary)" }}>
                      {lesson.durationSeconds ? `${Math.floor(lesson.durationSeconds / 60)}m ${lesson.durationSeconds % 60}s` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold text-white transition-all hover:bg-brand-700"
                          onClick={() => handleSelectLesson(lesson.id)}
                          type="button"
                        >
                          Upload
                        </button>
                        <button
                          className="rounded-lg border px-3 py-2 text-xs font-semibold transition-colors hover:bg-surface2"
                          style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
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
        </div>

        {/* Recent uploads */}
        {uploadsQuery.data && uploadsQuery.data.length > 0 ? (
          <div
            className="rounded-2xl border p-5 shadow-card"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <p className="mb-4 text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
              Recent uploads
            </p>
            <div className="space-y-3">
              {uploadsQuery.data.map((upload) => {
                const pct = upload.sizeBytes > 0 ? Math.round((upload.offsetBytes / upload.sizeBytes) * 100) : 0;
                return (
                  <div
                    key={upload.id}
                    className="rounded-xl border p-4"
                    style={{ borderColor: "var(--color-border-strong)", backgroundColor: "var(--color-surface-2)" }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{upload.filename}</p>
                        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{upload.status}</p>
                      </div>
                      <p className="tabular-nums text-xs" style={{ color: "var(--color-text-secondary)" }}>
                        {formatBytes(upload.offsetBytes)} / {formatBytes(upload.sizeBytes)}
                      </p>
                    </div>
                    {pct < 100 ? (
                      <div className="mt-3">
                        <Progress value={pct} className="h-1.5" />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </section>

      {/* Upload sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[min(100%-1rem,32rem)] sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Upload Video</SheetTitle>
            <SheetDescription>
              {currentLesson ? `Attach a resumable video upload to "${currentLesson.titleEn}".` : "Select a lesson to upload."}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-5">
            <div>
              <label
                className="mb-2 block text-xs font-semibold uppercase tracking-widest"
                style={{ color: "var(--color-text-muted)" }}
              >
                Video file
              </label>
              <input
                accept="video/*"
                className="block w-full rounded-xl border px-4 py-3 text-sm transition-colors file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-3 file:py-1 file:text-xs file:font-bold file:text-white"
                style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)", backgroundColor: "var(--color-surface-2)" }}
                disabled={!currentLesson || isUploading}
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && currentLesson) startUpload(file);
                }}
              />
            </div>

            <div
              className="rounded-xl border p-4"
              style={{ borderColor: "var(--color-border-strong)", backgroundColor: "var(--color-surface-2)" }}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>Upload progress</span>
                <span className="tabular-nums text-sm font-bold text-brand-600">{progress}%</span>
              </div>
              <Progress className="mt-3 h-2" value={progress} />
              <p className="mt-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
                {formatBytes(bytesUploaded)} / {formatBytes(bytesTotal)}
              </p>
            </div>

            {isUploading ? (
              <button
                className="w-full rounded-xl border px-4 py-3 text-sm font-semibold transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                style={{ borderColor: "rgba(239,68,68,0.4)", color: "rgb(185,28,28)" }}
                onClick={() => setConfirmCancelOpen(true)}
                type="button"
              >
                Cancel upload
              </button>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      {/* Cancel confirm dialog */}
      <Dialog open={confirmCancelOpen} onOpenChange={setConfirmCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel upload?</DialogTitle>
            <DialogDescription>The current upload session will be terminated and partial chunks removed.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              className="rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-surface2"
              style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
              onClick={() => setConfirmCancelOpen(false)}
              type="button"
            >
              Keep uploading
            </button>
            <button
              className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-red-700"
              onClick={() => {
                void cancelUpload();
                setConfirmCancelOpen(false);
              }}
              type="button"
            >
              Cancel upload
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
};
