import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { useTranslation } from "react-i18next";

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

type Lesson = {
  id: string;
  titleEn: string;
  titleAr: string;
  descriptionEn?: string;
  descriptionAr?: string;
  sectionId?: string;
  sortOrder: number;
  isPublished: boolean;
  isPreview: boolean;
  dripDays?: number;
};

type Section = {
  id: string;
  titleEn: string;
  titleAr: string;
};

type LessonFormProps = {
  lessonId?: string | null;
  sectionId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: () => void;
};

export const LessonForm = ({
  lessonId,
  sectionId,
  open,
  onOpenChange,
  onSubmit
}: LessonFormProps) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Omit<Lesson, "id">>({
    titleEn: "",
    titleAr: "",
    descriptionEn: "",
    descriptionAr: "",
    sectionId: sectionId || undefined,
    sortOrder: 0,
    isPublished: false,
    isPreview: false,
    dripDays: undefined
  });

  const sectionsQuery = useQuery({
    queryKey: ["admin-sections"],
    queryFn: async () => {
      const response = await api.get<{ sections: Section[] }>("/admin/sections");
      return response.data.sections;
    }
  });

  const lessonQuery = useQuery({
    queryKey: ["admin-lesson", lessonId],
    queryFn: async () => {
      if (!lessonId) return null;
      const response = await api.get<Lesson>(`/admin/lessons/${lessonId}`);
      return response.data;
    },
    enabled: !!lessonId
  });

  const createMutation = useMutation({
    mutationFn: async (data: Omit<Lesson, "id">) =>
      api.post<Lesson>("/admin/lessons", data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-lessons"] });
      onOpenChange(false);
      onSubmit?.();
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Lesson) =>
      api.put<Lesson>(`/admin/lessons/${data.id}`, {
        titleEn: data.titleEn,
        titleAr: data.titleAr,
        descriptionEn: data.descriptionEn,
        descriptionAr: data.descriptionAr,
        sectionId: data.sectionId,
        sortOrder: data.sortOrder,
        isPublished: data.isPublished,
        isPreview: data.isPreview,
        dripDays: data.dripDays
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-lessons"] });
      onOpenChange(false);
      onSubmit?.();
      resetForm();
    }
  });

  const resetForm = () => {
    setFormData({
      titleEn: "",
      titleAr: "",
      descriptionEn: "",
      descriptionAr: "",
      sectionId: sectionId || undefined,
      sortOrder: 0,
      isPublished: false,
      isPreview: false,
      dripDays: undefined
    });
  };

  const handleSubmit = async () => {
    try {
      if (lessonId && lessonQuery.data) {
        await updateMutation.mutateAsync({ id: lessonId, ...formData });
      } else {
        await createMutation.mutateAsync(formData);
      }
    } catch (error) {
      const apiError = error as AxiosError<{ message?: string }>;
      window.alert(apiError.response?.data?.message ?? "Failed to save lesson.");
    }
  };

  // Update form when lesson data is loaded
  if (lessonId && lessonQuery.data && JSON.stringify(formData) === JSON.stringify({
    titleEn: "",
    titleAr: "",
    descriptionEn: "",
    descriptionAr: "",
    sectionId: sectionId || undefined,
    sortOrder: 0,
    isPublished: false,
    isPreview: false,
    dripDays: undefined
  })) {
    setFormData({
      titleEn: lessonQuery.data.titleEn,
      titleAr: lessonQuery.data.titleAr,
      descriptionEn: lessonQuery.data.descriptionEn || "",
      descriptionAr: lessonQuery.data.descriptionAr || "",
      sectionId: lessonQuery.data.sectionId || undefined,
      sortOrder: lessonQuery.data.sortOrder,
      isPublished: lessonQuery.data.isPublished,
      isPreview: lessonQuery.data.isPreview,
      dripDays: lessonQuery.data.dripDays
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lessonId ? "Edit lesson" : "Create lesson"}</DialogTitle>
          <DialogDescription>
            {lessonId ? "Update the lesson details." : "Add a new lesson to a section."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
              Section
            </label>
            <select
              className="w-full rounded-lg border px-3 py-2 text-sm transition-colors"
              style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)", backgroundColor: "var(--color-surface-2)" }}
              value={formData.sectionId || ""}
              onChange={(e) => setFormData({ ...formData, sectionId: e.target.value || undefined })}
            >
              <option value="">Select a section</option>
              {sectionsQuery.data?.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.titleEn}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
              Title (English)
            </label>
            <Input
              placeholder="e.g., Introduction to React"
              value={formData.titleEn}
              onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
              Title (Arabic)
            </label>
            <Input
              placeholder="مثال: مقدمة إلى React"
              value={formData.titleAr}
              onChange={(e) => setFormData({ ...formData, titleAr: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
              Description (English)
            </label>
            <textarea
              className="w-full rounded-lg border px-3 py-2 text-sm transition-colors"
              style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)", backgroundColor: "var(--color-surface-2)" }}
              rows={3}
              placeholder="Optional description"
              value={formData.descriptionEn || ""}
              onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
              Description (Arabic)
            </label>
            <textarea
              className="w-full rounded-lg border px-3 py-2 text-sm transition-colors"
              style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)", backgroundColor: "var(--color-surface-2)" }}
              rows={3}
              placeholder="وصف اختياري"
              value={formData.descriptionAr || ""}
              onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
                Sort order
              </label>
              <Input
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
                Drip days
              </label>
              <Input
                type="number"
                placeholder="Leave empty for no drip"
                value={formData.dripDays ?? ""}
                onChange={(e) => setFormData({ ...formData, dripDays: e.target.value ? parseInt(e.target.value) : undefined })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isPublished}
                onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
              />
              <span className="text-sm" style={{ color: "var(--color-text-primary)" }}>Published</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isPreview}
                onChange={(e) => setFormData({ ...formData, isPreview: e.target.checked })}
              />
              <span className="text-sm" style={{ color: "var(--color-text-primary)" }}>Preview (free)</span>
            </label>
          </div>
        </div>

        <DialogFooter>
          <button
            className="rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-surface2"
            style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
            onClick={() => onOpenChange(false)}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-brand-700"
            onClick={() => void handleSubmit()}
            type="button"
          >
            {lessonId ? "Update" : "Create"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
