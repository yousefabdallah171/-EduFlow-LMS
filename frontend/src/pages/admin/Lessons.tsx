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
import { getAdminUiCopy } from "@/lib/admin-ui-copy";
import { api, queryClient } from "@/lib/api";
import { resolveLocale } from "@/lib/locale";

type LessonAdmin = {
  id: string;
  titleEn: string;
  titleAr: string;
  sortOrder: number;
  isPublished: boolean;
  videoStatus: "NONE" | "PROCESSING" | "READY" | "ERROR";
  durationSeconds: number | null;
  dripDays: number | null;
  sectionId?: string | null;
  section?: {
    id: string;
    titleEn: string;
    titleAr: string;
  } | null;
};

type SectionAdmin = {
  id: string;
  titleEn: string;
  titleAr: string;
  sortOrder: number;
};

const VideoStatusBadge = ({ status, labels }: { status: LessonAdmin["videoStatus"]; labels: Record<LessonAdmin["videoStatus"], string> }) => {
  const map: Record<LessonAdmin["videoStatus"], { bg: string; color: string; label: string }> = {
    READY: { bg: "var(--color-success-bg)", color: "var(--color-success)", label: labels.READY },
    PROCESSING: { bg: "var(--color-warning-bg)", color: "var(--color-warning)", label: labels.PROCESSING },
    ERROR: { bg: "var(--color-danger-bg)", color: "var(--color-danger)", label: labels.ERROR },
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
  const [stagedLessons, setStagedLessons] = useState<LessonAdmin[]>([]);

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

  const sectionsQuery = useQuery({
    queryKey: ["admin-sections"],
    queryFn: async () => {
      const response = await api.get<{ sections: SectionAdmin[] }>("/admin/sections");
      return response.data.sections;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (lessonId: string) => api.delete(`/admin/lessons/${lessonId}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-lessons"] });
      setSelectedLessonId(null);
    }
  });

  const saveLayoutMutation = useMutation({
    mutationFn: async (payload: LessonAdmin[]) => {
      const originalById = new Map(lessons.map((lesson) => [lesson.id, lesson]));
      const movedLessons = payload.filter((lesson) => {
        const original = originalById.get(lesson.id);
        return original && (original.sectionId ?? null) !== (lesson.sectionId ?? null);
      });

      if (movedLessons.length > 0) {
        await Promise.all(
          movedLessons.map((lesson) =>
            api.put(`/admin/lessons/${lesson.id}`, {
              sectionId: lesson.sectionId ?? null
            })
          )
        );
      }

      await api.post("/admin/lessons/reorder", {
        order: payload.map((lesson, index) => ({
          id: lesson.id,
          sortOrder: index
        }))
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-lessons"] }),
        queryClient.invalidateQueries({ queryKey: ["lessons-grouped"] }),
        queryClient.invalidateQueries({ queryKey: ["course"] })
      ]);
      toast.success(isAr ? "تم حفظ ترتيب الدروس والأقسام" : "Lesson ordering and sections saved");
    },
    onError: (error) => {
      const apiError = error as AxiosError<{ message?: string }>;
      toast.error(
        apiError.response?.data?.message ??
          (isAr ? "تعذر حفظ تغييرات الترتيب." : "Failed to save lesson ordering changes.")
      );
    }
  });

  const lessons = useMemo(() => lessonsQuery.data ?? [], [lessonsQuery.data]);
  const sections = useMemo(() => sectionsQuery.data ?? [], [sectionsQuery.data]);
  const selectedLesson = useMemo(
    () => stagedLessons.find((lesson) => lesson.id === selectedLessonId) ?? null,
    [stagedLessons, selectedLessonId]
  );
  const pendingDeleteLesson = useMemo(
    () => stagedLessons.find((lesson) => lesson.id === pendingDeleteLessonId) ?? null,
    [stagedLessons, pendingDeleteLessonId]
  );

  useEffect(() => {
    setStagedLessons(lessons);
  }, [lessons]);

  useEffect(() => {
    if (!stagedLessons.length) {
      if (selectedLessonId) {
        setSelectedLessonId(null);
      }
      return;
    }

    if (!selectedLessonId || !stagedLessons.some((lesson) => lesson.id === selectedLessonId)) {
      setSelectedLessonId(stagedLessons[0].id);
    }
  }, [stagedLessons, selectedLessonId]);

  const readyCount = stagedLessons.filter((lesson) => lesson.videoStatus === "READY").length;
  const processingCount = stagedLessons.filter((lesson) => lesson.videoStatus === "PROCESSING").length;
  const unpublishedCount = stagedLessons.filter((lesson) => !lesson.isPublished).length;
  const isDirty = useMemo(() => {
    if (stagedLessons.length !== lessons.length) return true;
    for (let index = 0; index < stagedLessons.length; index += 1) {
      const staged = stagedLessons[index];
      const original = lessons[index];
      if (!original) return true;
      if (staged.id !== original.id) return true;
      if ((staged.sectionId ?? null) !== (original.sectionId ?? null)) return true;
    }
    return false;
  }, [lessons, stagedLessons]);

  const moveLessonByOffset = (lessonId: string, offset: number) => {
    setStagedLessons((current) => {
      const sourceIndex = current.findIndex((lesson) => lesson.id === lessonId);
      if (sourceIndex < 0) return current;
      const targetIndex = sourceIndex + offset;
      if (targetIndex < 0 || targetIndex >= current.length) return current;
      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  const moveLessonToSection = (lessonId: string, sectionId: string | null) => {
    const nextSection = sectionId ? sections.find((section) => section.id === sectionId) : null;
    setStagedLessons((current) =>
      current.map((lesson) =>
        lesson.id === lessonId
          ? {
              ...lesson,
              sectionId,
              section: nextSection
                ? { id: nextSection.id, titleEn: nextSection.titleEn, titleAr: nextSection.titleAr }
                : null
            }
          : lesson
      )
    );
  };

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
              value: stagedLessons.length,
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
            ) : stagedLessons.length === 0 ? (
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
                {stagedLessons.map((lesson, lessonIndex) => {
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
                            onClick={() => moveLessonByOffset(lesson.id, -1)}
                            type="button"
                            disabled={lessonIndex === 0}
                          >
                            ↑
                          </button>
                          <button
                            className="rounded-lg border px-3 py-2 text-xs font-semibold transition-colors hover:bg-surface2"
                            style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                            onClick={() => moveLessonByOffset(lesson.id, 1)}
                            type="button"
                            disabled={lessonIndex === stagedLessons.length - 1}
                          >
                            ↓
                          </button>
                          <select
                            className="rounded-lg border px-2 py-2 text-xs font-semibold"
                            style={{
                              borderColor: "var(--color-border-strong)",
                              color: "var(--color-text-primary)",
                              backgroundColor: "var(--color-surface)"
                            }}
                            onChange={(event) => moveLessonToSection(lesson.id, event.target.value || null)}
                            value={lesson.sectionId ?? ""}
                          >
                            <option value="">{isAr ? "بدون قسم" : "No section"}</option>
                            {sections.map((section) => (
                              <option key={section.id} value={section.id}>
                                {isAr ? section.titleAr : section.titleEn}
                              </option>
                            ))}
                          </select>
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

            <div className="dashboard-panel p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
                  {isDirty
                    ? isAr
                      ? "لديك تغييرات غير محفوظة في الترتيب أو الأقسام."
                      : "You have unsaved ordering or section changes."
                    : isAr
                      ? "لا توجد تغييرات معلقة."
                      : "No pending layout changes."}
                </p>
                <div className="flex gap-2">
                  <button
                    className="rounded-lg border px-3 py-2 text-xs font-semibold transition-colors hover:bg-surface2"
                    style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                    onClick={() => setStagedLessons(lessons)}
                    type="button"
                    disabled={!isDirty || saveLayoutMutation.isPending}
                  >
                    {isAr ? "إلغاء التغييرات" : "Discard changes"}
                  </button>
                  <button
                    className="rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-all hover:opacity-95"
                    style={{ background: "var(--gradient-brand)" }}
                    onClick={() => saveLayoutMutation.mutate(stagedLessons)}
                    type="button"
                    disabled={!isDirty || saveLayoutMutation.isPending}
                  >
                    {saveLayoutMutation.isPending
                      ? isAr
                        ? "جارٍ الحفظ..."
                        : "Saving..."
                      : isAr
                        ? "حفظ التغييرات"
                        : "Save changes"}
                  </button>
                </div>
              </div>
            </div>
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
