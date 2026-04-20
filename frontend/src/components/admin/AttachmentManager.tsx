import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api, queryClient } from "@/lib/api";
import { resolveLocale } from "@/lib/locale";

type LessonResource = {
  id: string;
  lessonId: string;
  title: string;
  fileUrl: string;
  fileSizeBytes: number | null;
  createdAt: string;
};

type AttachmentManagerProps = {
  lessonId?: string | null;
};

export const AttachmentManager = ({ lessonId }: AttachmentManagerProps) => {
  const { i18n } = useTranslation();
  const isAr = resolveLocale(i18n.language) === "ar";
  const [formData, setFormData] = useState({
    title: "",
    fileUrl: "",
    fileSizeBytes: ""
  });
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const resourcesQuery = useQuery({
    queryKey: ["lesson-resources", lessonId],
    queryFn: async () => {
      if (!lessonId) return [];
      const response = await api.get<{ resources: LessonResource[] }>(
        `/admin/lessons/${lessonId}/resources`
      );
      return response.data.resources;
    },
    enabled: !!lessonId
  });

  const createMutation = useMutation({
    mutationFn: async () =>
      api.post(`/admin/lessons/${lessonId}/resources`, {
        title: formData.title.trim(),
        fileUrl: formData.fileUrl.trim(),
        fileSizeBytes: formData.fileSizeBytes
          ? Number(formData.fileSizeBytes)
          : undefined
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["lesson-resources", lessonId] });
      setFormData({ title: "", fileUrl: "", fileSizeBytes: "" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (resourceId: string) =>
      api.delete(`/admin/lessons/${lessonId}/resources/${resourceId}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["lesson-resources", lessonId] });
      setPendingDeleteId(null);
    }
  });

  const pendingDeleteResource = useMemo(
    () => resourcesQuery.data?.find((resource) => resource.id === pendingDeleteId) ?? null,
    [pendingDeleteId, resourcesQuery.data]
  );

  const handleCreate = async () => {
    try {
      await createMutation.mutateAsync();
    } catch (error) {
      const apiError = error as AxiosError<{ message?: string }>;
      toast.error(
        apiError.response?.data?.message ??
          (isAr ? "تعذر حفظ المرفق." : "Failed to save attachment.")
      );
    }
  };

  const handleDelete = async (resourceId: string) => {
    try {
      await deleteMutation.mutateAsync(resourceId);
    } catch (error) {
      const apiError = error as AxiosError<{ message?: string }>;
      toast.error(
        apiError.response?.data?.message ??
          (isAr ? "تعذر حذف المرفق." : "Failed to delete attachment.")
      );
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!lessonId) {
    return (
      <div
        className="rounded-[28px] border p-4 shadow-card"
        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          {isAr ? "اختر درسًا لإدارة الروابط والملفات المساندة." : "Select a lesson to manage supporting resources."}
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        className="rounded-[28px] border p-4 shadow-card"
        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
          {isAr ? "المرفقات والروابط" : "Resources and links"}
        </h3>

        <div className="mb-4 space-y-3 rounded-2xl border p-4" style={{ borderColor: "var(--color-border-strong)", backgroundColor: "var(--color-surface-2)" }}>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
              {isAr ? "إضافة مورد للدرس" : "Add a lesson resource"}
            </h4>
            <p className="text-xs leading-6" style={{ color: "var(--color-text-muted)" }}>
              {isAr
                ? "أضف عنوانًا ورابطًا مباشرًا لملف أو مادة داعمة حتى تظهر للطلاب بوضوح."
                : "Add a clear title and direct URL for any supporting file or external resource."}
            </p>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold" htmlFor="resource-title" style={{ color: "var(--color-text-muted)" }}>
              {isAr ? "عنوان المورد" : "Resource title"}
            </label>
            <Input
              id="resource-title"
              placeholder={isAr ? "مثال: ملفات المشروع النهائية" : "Example: Final project files"}
              value={formData.title}
              onChange={(event) => setFormData((current) => ({ ...current, title: event.target.value }))}
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold" htmlFor="resource-url" style={{ color: "var(--color-text-muted)" }}>
              {isAr ? "رابط الملف أو المورد" : "File or resource URL"}
            </label>
            <Input
              id="resource-url"
              placeholder="https://..."
              type="url"
              value={formData.fileUrl}
              onChange={(event) => setFormData((current) => ({ ...current, fileUrl: event.target.value }))}
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold" htmlFor="resource-size" style={{ color: "var(--color-text-muted)" }}>
              {isAr ? "الحجم بالبايت (اختياري)" : "File size in bytes (optional)"}
            </label>
            <Input
              id="resource-size"
              inputMode="numeric"
              placeholder={isAr ? "مثال: 2048000" : "Example: 2048000"}
              value={formData.fileSizeBytes}
              onChange={(event) => setFormData((current) => ({ ...current, fileSizeBytes: event.target.value.replace(/[^\d]/g, "") }))}
            />
          </div>

          <button
            className="rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!formData.title.trim() || !formData.fileUrl.trim() || createMutation.isPending}
            style={{ background: "var(--gradient-brand)" }}
            onClick={() => void handleCreate()}
            type="button"
          >
            {createMutation.isPending
              ? isAr
                ? "جارٍ الحفظ..."
                : "Saving..."
              : isAr
                ? "إضافة المورد"
                : "Add resource"}
          </button>
        </div>

        <div className="space-y-2">
          <h4 className="text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
            {isAr
              ? `الموارد الحالية (${resourcesQuery.data?.length || 0})`
              : `Current resources (${resourcesQuery.data?.length || 0})`}
          </h4>

          {resourcesQuery.data && resourcesQuery.data.length > 0 ? (
            <div className="space-y-2">
              {resourcesQuery.data.map((resource) => (
                <div
                  key={resource.id}
                  className="flex items-start justify-between gap-3 rounded-lg border p-3"
                  style={{ borderColor: "var(--color-border-strong)", backgroundColor: "var(--color-surface-2)" }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                      {resource.title}
                    </p>
                    <a
                      className="mt-1 block truncate text-xs underline-offset-4 hover:underline"
                      href={resource.fileUrl}
                      rel="noopener noreferrer"
                      style={{ color: "var(--color-text-secondary)" }}
                      target="_blank"
                    >
                      {resource.fileUrl}
                    </a>
                    {resource.fileSizeBytes ? (
                      <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
                        {formatBytes(resource.fileSizeBytes)}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <a
                      className="rounded-md border px-2.5 py-1.5 text-[10px] font-medium transition-colors hover:bg-surface2"
                      href={resource.fileUrl}
                      rel="noopener noreferrer"
                      style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                      target="_blank"
                    >
                      {isAr ? "فتح" : "Open"}
                    </a>
                    <button
                      className="rounded-md border px-2.5 py-1.5 text-[10px] font-medium transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                      style={{ borderColor: "rgba(239,68,68,0.4)", color: "rgb(185,28,28)" }}
                      onClick={() => setPendingDeleteId(resource.id)}
                      type="button"
                    >
                      {isAr ? "حذف" : "Delete"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {isAr
                ? "لا توجد موارد بعد. أضف أول رابط أو ملف داعم لهذا الدرس."
                : "No resources yet. Add the first supporting link for this lesson."}
            </p>
          )}
        </div>
      </div>

      <Dialog
        open={!!pendingDeleteId}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteId(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isAr ? "حذف المورد؟" : "Delete resource?"}</DialogTitle>
            <DialogDescription>
              {isAr
                ? `سيتم حذف "${pendingDeleteResource?.title || "هذا المورد"}" من هذا الدرس نهائيًا.`
                : `This will permanently remove "${pendingDeleteResource?.title || "this resource"}" from the lesson.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              className="rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-surface2"
              style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
              onClick={() => setPendingDeleteId(null)}
              type="button"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
            <button
              className="rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-all hover:opacity-95"
              style={{ backgroundColor: "rgb(185,28,28)" }}
              onClick={() => {
                if (pendingDeleteId) {
                  void handleDelete(pendingDeleteId);
                }
              }}
              type="button"
            >
              {isAr ? "حذف" : "Delete"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
