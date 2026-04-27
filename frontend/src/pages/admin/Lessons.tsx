import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { AttachmentManager } from "@/components/admin/AttachmentManager";
import { BulkLessonMapper } from "@/components/admin/lessons/BulkLessonMapper";
import { LessonAttachmentDrawer } from "@/components/admin/lessons/LessonAttachmentDrawer";
import { LessonForm } from "@/components/admin/LessonForm";
import { SectionManager } from "@/components/admin/SectionManager";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { AdminShell } from "@/components/layout/AdminShell";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useTusUpload } from "@/hooks/useTusUpload";
import { getAdminUiCopy } from "@/lib/admin-ui-copy";
import { api, queryClient } from "@/lib/api";
import { resolveLocale } from "@/lib/locale";

type MediaFile = {
  id: string;
  title: string;
  type: string;
  status: string;
  durationSeconds: number | null;
  sizeBytes: bigint;
};

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

const VideoStatusBadge = ({ status, labels }: { status: LessonAdmin["videoStatus"]; labels: Record<LessonAdmin["videoStatus"], string> }) => {
  const map: Record<LessonAdmin["videoStatus"], { bg: string; color: string; label: string }> = {
    READY: { bg: "rgba(34,197,94,0.12)", color: "rgb(21,128,61)", label: labels.READY },
    PROCESSING: { bg: "rgba(234,179,8,0.12)", color: "rgb(161,98,7)", label: labels.PROCESSING },
    ERROR: { bg: "rgba(239,68,68,0.12)", color: "rgb(185,28,28)", label: labels.ERROR },
    NONE: { bg: "var(--color-surface-2)", color: "var(--color-text-muted)", label: labels.NONE }
  };
  const current = map[status];
  return (
    <span
      className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
      style={{ backgroundColor: current.bg, color: current.color }}
    >
      {current.label}
    </span>
  );
};

const formatDuration = (durationSeconds: number | null, fallback: string) => {
  if (!durationSeconds) return fallback;
  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);
  const seconds = durationSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m ${seconds}s`;
};

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

export const AdminLessons = () => {
  const { t, i18n } = useTranslation();
  const locale = resolveLocale(i18n.language);
  const copy = getAdminUiCopy(locale);
  const isAr = locale === "ar";
  const statusLabels = {
    READY: copy.common.ready,
    PROCESSING: copy.lessons.processing,
    ERROR: copy.lessons.needsReview,
    NONE: copy.lessons.noVideo
  };
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [lessonFormOpen, setLessonFormOpen] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [pendingDeleteLessonId, setPendingDeleteLessonId] = useState<string | null>(null);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [attachmentDrawerOpen, setAttachmentDrawerOpen] = useState(false);
  const { progress, bytesUploaded, bytesTotal, isUploading, startUpload, cancelUpload } = useTusUpload({
    lessonId: selectedLessonId
  });

  const linkMediaMutation = useMutation({
    mutationFn: async (mediaFileId: string) => {
      if (!selectedLessonId) throw new Error("No lesson selected");
      return api.put(`/admin/lessons/${selectedLessonId}/media/${mediaFileId}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-lessons"] });
      setMediaPickerOpen(false);
      toast.success(isAr ? "تم ربط الفيديو بنجاح" : "Video linked successfully");
    },
    onError: (error) => {
      const apiError = error as AxiosError<{ message?: string }>;
      toast.error(
        apiError.response?.data?.message ?? (isAr ? "فشل ربط الفيديو" : "Failed to link video")
      );
    }
  });

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

  const lessons = useMemo(() => lessonsQuery.data ?? [], [lessonsQuery.data]);
  const selectedLesson = useMemo(
    () => lessons.find((lesson) => lesson.id === selectedLessonId) ?? null,
    [lessons, selectedLessonId]
  );
  const pendingDeleteLesson = useMemo(
    () => lessons.find((lesson) => lesson.id === pendingDeleteLessonId) ?? null,
    [lessons, pendingDeleteLessonId]
  );

  useEffect(() => {
    if (!lessons.length) {
      if (selectedLessonId) {
        setSelectedLessonId(null);
      }
      return;
    }

    if (!selectedLessonId || !lessons.some((lesson) => lesson.id === selectedLessonId)) {
      setSelectedLessonId(lessons[0].id);
    }
  }, [lessons, selectedLessonId]);

  const readyCount = lessons.filter((lesson) => lesson.videoStatus === "READY").length;
  const processingCount = lessons.filter((lesson) => lesson.videoStatus === "PROCESSING").length;
  const unpublishedCount = lessons.filter((lesson) => !lesson.isPublished).length;

  const handleDeleteLesson = async (lessonId: string) => {
    try {
      await deleteMutation.mutateAsync(lessonId);
      setPendingDeleteLessonId(null);
    } catch (error) {
      const apiError = error as AxiosError<{ message?: string }>;
      toast.error(
        apiError.response?.data?.message ??
          (isAr ? "تعذر حذف الدرس." : "Failed to delete lesson.")
      );
    }
  };

  return (
    <AdminShell title={t("admin.lessons.title")} description={t("admin.lessons.desc")}>
      <section className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: selectedSectionId ? copy.lessons.filteredLessons : copy.lessons.totalLessons,
              value: lessons.length,
              note: selectedSectionId ? copy.lessons.filteredWorkspace : copy.lessons.fullWorkspace
            },
            {
              label: copy.lessons.videoReady,
              value: readyCount,
              note: copy.lessons.readyNote
            },
            {
              label: copy.lessons.processingNow,
              value: processingCount,
              note: copy.lessons.processingNote
            },
            {
              label: copy.lessons.needsPublishing,
              value: unpublishedCount,
              note: copy.lessons.needsPublishingNote
            }
          ].map((item) => (
            <div key={item.label} className="dashboard-panel p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                {item.label}
              </p>
              <p className="mt-3 text-3xl font-black tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                {item.value}
              </p>
              <p className="mt-2 text-sm leading-6" style={{ color: "var(--color-text-secondary)" }}>
                {item.note}
              </p>
            </div>
          ))}
        </div>

        <div className="grid gap-5 xl:grid-cols-[290px_minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="space-y-4">
            <SectionManager
              selectedSectionId={selectedSectionId}
              onSelectSection={(sectionId) => setSelectedSectionId(sectionId || null)}
            />

            <div className="dashboard-panel p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                {copy.lessons.workflow}
              </p>
              <div className="mt-3 space-y-3 text-sm leading-6" style={{ color: "var(--color-text-secondary)" }}>
                {copy.lessons.workflowSteps.map((step) => (
                  <p key={step}>{step}</p>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="dashboard-panel p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                    {copy.lessons.workspace}
                  </p>
                  <h2 className="text-2xl font-black tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                    {selectedSectionId ? copy.lessons.manageSection : copy.lessons.manageLibrary}
                  </h2>
                  <p className="max-w-2xl text-sm leading-7" style={{ color: "var(--color-text-secondary)" }}>
                    {copy.lessons.workspaceDesc}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    className="rounded-lg border px-3 py-2 text-sm font-semibold transition-colors hover:bg-surface2"
                    style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                    onClick={() => {
                      setSelectedSectionId(null);
                      setSelectedLessonId(null);
                    }}
                    type="button"
                  >
                    {copy.lessons.showAll}
                  </button>
                  <button
                    className="rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-all hover:opacity-95"
                    style={{ background: "var(--gradient-brand)" }}
                    onClick={() => {
                      setEditingLessonId(null);
                      setLessonFormOpen(true);
                    }}
                    type="button"
                  >
                    {copy.lessons.newLesson}
                  </button>
                </div>
              </div>
            </div>

            {lessonsQuery.isLoading ? (
              <div className="dashboard-panel p-6">
                <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                  {copy.common.loading}
                </p>
              </div>
            ) : lessons.length === 0 ? (
              <EmptyState
                action={
                  <button
                    className="rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-all hover:opacity-95"
                    style={{ background: "var(--gradient-brand)" }}
                    onClick={() => {
                      setEditingLessonId(null);
                      setLessonFormOpen(true);
                    }}
                    type="button"
                  >
                    {copy.common.createFirstLesson}
                  </button>
                }
                description={
                  selectedSectionId
                    ? copy.lessons.emptySectionDesc
                    : copy.lessons.emptyAllDesc
                }
                eyebrow={isAr ? "إدارة الدروس" : "Admin lessons"}
                icon="LS"
                title={selectedSectionId ? copy.lessons.emptySectionTitle : copy.lessons.emptyAllTitle}
              />
            ) : (
              <div className="space-y-3">
                {lessons.map((lesson) => {
                  const isActive = lesson.id === selectedLessonId;

                  return (
                    <article
                      key={lesson.id}
                      className="dashboard-panel w-full p-5 transition-all hover:-translate-y-0.5"
                      style={{
                        borderColor: isActive ? "color-mix(in oklab, var(--color-brand) 55%, white)" : undefined,
                        boxShadow: isActive ? "0 24px 70px rgba(239, 68, 68, 0.14)" : undefined
                      }}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <button
                          aria-pressed={isActive}
                          className="min-w-0 flex-1 space-y-3 text-left"
                          onClick={() => setSelectedLessonId(lesson.id)}
                          type="button"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                              style={{ backgroundColor: "var(--color-surface-2)", color: "var(--color-text-muted)" }}
                            >
                              {isAr ? `الدرس ${lesson.sortOrder}` : `Lesson ${lesson.sortOrder}`}
                            </span>
                            <VideoStatusBadge labels={statusLabels} status={lesson.videoStatus} />
                            <span
                              className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                              style={{
                                backgroundColor: lesson.isPublished
                                  ? "rgba(34,197,94,0.12)"
                                  : "rgba(148,163,184,0.18)",
                                color: lesson.isPublished ? "rgb(21,128,61)" : "var(--color-text-muted)"
                              }}
                            >
                              {lesson.isPublished ? copy.common.published : copy.common.draft}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <h3 className="text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>
                              {lesson.titleEn}
                            </h3>
                            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                              {lesson.titleAr}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                            <span>{lesson.section?.titleEn ?? copy.lessons.noSection}</span>
                            <span>{formatDuration(lesson.durationSeconds, copy.lessons.noDuration)}</span>
                            <span>{lesson.dripDays ? copy.lessons.unlocksAfter.replace("{{days}}", String(lesson.dripDays)) : copy.lessons.noDrip}</span>
                          </div>
                        </button>

                        <div className="flex flex-wrap gap-2 lg:justify-end">
                          <button
                            className="rounded-lg border px-3 py-2 text-xs font-semibold transition-colors hover:bg-surface2"
                            style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                            onClick={() => {
                              setSelectedLessonId(lesson.id);
                              setEditingLessonId(lesson.id);
                              setLessonFormOpen(true);
                            }}
                            type="button"
                          >
                            {copy.common.editDetails}
                          </button>
                          <button
                            className="rounded-lg border px-3 py-2 text-xs font-semibold transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                            style={{ borderColor: "rgba(239,68,68,0.4)", color: "rgb(185,28,28)" }}
                            onClick={() => {
                              setSelectedLessonId(lesson.id);
                              setPendingDeleteLessonId(lesson.id);
                            }}
                            type="button"
                          >
                            {copy.common.delete}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-4">
            {selectedLesson ? (
              <>
                <div className="dashboard-panel p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                    {copy.lessons.selectedLesson}
                  </p>
                  <div className="mt-3 space-y-3">
                    <div>
                      <h3 className="text-xl font-black tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                        {selectedLesson.titleEn}
                      </h3>
                      <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                        {selectedLesson.titleAr}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <VideoStatusBadge labels={statusLabels} status={selectedLesson.videoStatus} />
                      <span
                        className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                        style={{ backgroundColor: "var(--color-surface-2)", color: "var(--color-text-muted)" }}
                      >
                        {selectedLesson.section?.titleEn ?? copy.lessons.unsectioned}
                      </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        { label: copy.lessons.order, value: selectedLesson.sortOrder.toString() },
                        { label: copy.lessons.duration, value: formatDuration(selectedLesson.durationSeconds, copy.lessons.noDuration) },
                        { label: copy.lessons.release, value: selectedLesson.dripDays ? copy.lessons.dayDrip.replace("{{days}}", String(selectedLesson.dripDays)) : copy.lessons.immediate },
                        { label: copy.lessons.visibility, value: selectedLesson.isPublished ? copy.common.published : copy.common.draft }
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="rounded-2xl border p-3"
                          style={{ borderColor: "var(--color-border-strong)", backgroundColor: "var(--color-surface-2)" }}
                        >
                          <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                            {item.label}
                          </p>
                          <p className="mt-2 text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                            {item.value}
                          </p>
                        </div>
                      ))}
                    </div>
                    <button
                      className="w-full rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-all hover:opacity-95"
                      style={{ background: "var(--gradient-brand)" }}
                      onClick={() => {
                        setEditingLessonId(selectedLesson.id);
                        setLessonFormOpen(true);
                      }}
                      type="button"
                    >
                      {copy.lessons.editSettings}
                    </button>
                  </div>
                </div>

                <div className="dashboard-panel p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                        {copy.lessons.videoUpload}
                      </p>
                      <h4 className="mt-2 text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>
                        {copy.lessons.replaceVideo}
                      </h4>
                    </div>
                    <VideoStatusBadge labels={statusLabels} status={selectedLesson.videoStatus} />
                  </div>

                  <div className="mt-4 space-y-3">
                    <p className="text-sm leading-6" style={{ color: "var(--color-text-secondary)" }}>
                      Select a video from your media library or upload a new one to /admin/media, then link it here.
                    </p>

                    <button
                      className="w-full rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-all hover:opacity-95"
                      style={{ background: "var(--gradient-brand)" }}
                      onClick={() => setMediaPickerOpen(true)}
                      type="button"
                      disabled={linkMediaMutation.isPending}
                    >
                      {linkMediaMutation.isPending ? "Linking..." : "Link from Media Library"}
                    </button>

                    <button
                      className="w-full rounded-lg border px-3 py-2 text-center text-xs font-semibold transition-colors"
                      style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                      onClick={() => setAttachmentDrawerOpen(true)}
                      type="button"
                    >
                      Open Lesson Attachment Drawer
                    </button>

                    <a
                      href="/admin/media"
                      className="block w-full rounded-lg border px-3 py-2 text-center text-xs font-semibold transition-colors"
                      style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Go to Media Library
                    </a>
                  </div>
                </div>

                <BulkLessonMapper
                  onApplied={() => {
                    void queryClient.invalidateQueries({ queryKey: ["admin-lessons"] });
                  }}
                />

                <AttachmentManager lessonId={selectedLesson.id} />
              </>
            ) : (
              <EmptyState
                description={copy.lessons.pickLessonDesc}
                eyebrow={isAr ? "تفاصيل الدرس" : "Lesson details"}
                icon="AD"
                title={copy.lessons.pickLessonTitle}
              />
            )}
          </div>
        </div>
      </section>

      <MediaPicker
        isOpen={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={(mediaFile) => {
          void linkMediaMutation.mutateAsync(mediaFile.id);
        }}
        mediaType="VIDEO"
      />

      <LessonForm
        lessonId={editingLessonId}
        sectionId={selectedSectionId}
        open={lessonFormOpen}
        onOpenChange={setLessonFormOpen}
        onSubmit={() => {
          setEditingLessonId(null);
        }}
      />

      <LessonAttachmentDrawer
        lessonId={selectedLessonId}
        isOpen={attachmentDrawerOpen}
        onClose={() => setAttachmentDrawerOpen(false)}
        onAttached={() => {
          void queryClient.invalidateQueries({ queryKey: ["admin-lessons"] });
        }}
      />

      <Dialog
        open={!!pendingDeleteLessonId}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteLessonId(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isAr ? "حذف الدرس؟" : "Delete lesson?"}</DialogTitle>
            <DialogDescription>
              {isAr
                ? `سيتم حذف "${pendingDeleteLesson?.titleAr || pendingDeleteLesson?.titleEn || "هذا الدرس"}" نهائيًا من لوحة الإدارة.`
                : `This will permanently remove "${pendingDeleteLesson?.titleEn || pendingDeleteLesson?.titleAr || "this lesson"}" from the admin workspace.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              className="rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-surface2"
              style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
              onClick={() => setPendingDeleteLessonId(null)}
              type="button"
            >
              {copy.common.cancel}
            </button>
            <button
              className="rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-all hover:opacity-95"
              style={{ backgroundColor: "rgb(185,28,28)" }}
              onClick={() => {
                if (pendingDeleteLessonId) {
                  void handleDeleteLesson(pendingDeleteLessonId);
                }
              }}
              type="button"
            >
              {copy.common.delete}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
};
