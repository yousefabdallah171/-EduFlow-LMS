import { useEffect, useMemo, useState } from "react";
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

type LessonResponse = Lesson | { lesson: Lesson };

const unwrapLesson = (response: LessonResponse) => "lesson" in response ? response.lesson : response;

const buildInitialFormData = (sectionId?: string | null): Omit<Lesson, "id"> => ({
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

const cleanLessonPayload = (data: Omit<Lesson, "id">) => ({
  titleEn: data.titleEn.trim(),
  titleAr: data.titleAr.trim(),
  descriptionEn: data.descriptionEn?.trim() || undefined,
  descriptionAr: data.descriptionAr?.trim() || undefined,
  sectionId: data.sectionId || undefined,
  sortOrder: Number.isFinite(data.sortOrder) ? data.sortOrder : 0,
  isPublished: data.isPublished,
  isPreview: data.isPreview,
  dripDays: typeof data.dripDays === "number" && Number.isFinite(data.dripDays) ? data.dripDays : undefined
});

export const LessonForm = ({
  lessonId,
  sectionId,
  open,
  onOpenChange,
  onSubmit
}: LessonFormProps) => {
  const { i18n } = useTranslation();
  const isAr = resolveLocale(i18n.language) === "ar";
  const emptyFormData = useMemo(() => buildInitialFormData(sectionId), [sectionId]);
  const [formData, setFormData] = useState<Omit<Lesson, "id">>(emptyFormData);

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
      const response = await api.get<LessonResponse>(`/admin/lessons/${lessonId}`);
      return unwrapLesson(response.data);
    },
    enabled: open && !!lessonId,
    retry: false
  });

  const createMutation = useMutation({
    mutationFn: async (data: Omit<Lesson, "id">) =>
      api.post<LessonResponse>("/admin/lessons", cleanLessonPayload(data)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-lessons"] });
      onOpenChange(false);
      onSubmit?.();
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Lesson) =>
      api.patch<LessonResponse>(`/admin/lessons/${data.id}`, cleanLessonPayload(data)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-lessons"] });
      onOpenChange(false);
      onSubmit?.();
      resetForm();
    }
  });

  const resetForm = () => {
    setFormData(buildInitialFormData(sectionId));
  };

  const handleSubmit = async () => {
    try {
      if (lessonId && lessonQuery.data) {
        await updateMutation.mutateAsync({ id: lessonId, ...formData });
      } else {
        await createMutation.mutateAsync(formData);
      }
    } catch (error) {
      const apiError = error as AxiosError<{ message?: string; error?: string; fields?: Record<string, string> }>;
      const fields = apiError.response?.data?.fields;
      const fieldMessage = fields ? Object.entries(fields).map(([field, message]) => `${field}: ${message}`).join("\n") : null;
      toast.error(
        fieldMessage ??
          apiError.response?.data?.message ??
          apiError.response?.data?.error ??
          (isAr ? "تعذر حفظ الدرس." : "Failed to save lesson.")
      );
    }
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!lessonId) {
      setFormData(emptyFormData);
      return;
    }

    if (lessonQuery.data) {
      setFormData({
        titleEn: lessonQuery.data.titleEn,
        titleAr: lessonQuery.data.titleAr,
        descriptionEn: lessonQuery.data.descriptionEn || "",
        descriptionAr: lessonQuery.data.descriptionAr || "",
        sectionId: lessonQuery.data.sectionId || undefined,
        sortOrder: lessonQuery.data.sortOrder,
        isPublished: lessonQuery.data.isPublished,
        isPreview: lessonQuery.data.isPreview,
        dripDays: lessonQuery.data.dripDays ?? undefined
      });
    }
  }, [emptyFormData, lessonId, lessonQuery.data, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lessonId ? (isAr ? "تعديل الدرس" : "Edit lesson") : (isAr ? "إنشاء درس" : "Create lesson")}</DialogTitle>
          <DialogDescription>
            {lessonId
              ? isAr
                ? "حدّث تفاصيل الدرس ومكانه داخل المسار."
                : "Update the lesson details and its place in the course flow."
              : isAr
                ? "أضف درسًا جديدًا داخل قسم مناسب."
                : "Add a new lesson to the right section."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-semibold" htmlFor="lesson-section-id" style={{ color: "var(--color-text-muted)" }}>
              {isAr ? "القسم" : "Section"}
            </label>
            <select
              className="w-full rounded-lg border px-3 py-2 text-sm transition-colors"
              id="lesson-section-id"
              style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)", backgroundColor: "var(--color-surface-2)" }}
              value={formData.sectionId || ""}
              onChange={(event) => setFormData({ ...formData, sectionId: event.target.value || undefined })}
            >
              <option value="">{isAr ? "اختر قسمًا" : "Select a section"}</option>
              {sectionsQuery.data?.map((section) => (
                <option key={section.id} value={section.id}>
                  {isAr ? `${section.titleAr} - ${section.titleEn}` : `${section.titleEn} - ${section.titleAr}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold" htmlFor="lesson-title-en" style={{ color: "var(--color-text-muted)" }}>
              {isAr ? "العنوان بالإنجليزية" : "Title (English)"}
            </label>
            <Input
              id="lesson-title-en"
              placeholder={isAr ? "مثال: Introduction to React" : "e.g., Introduction to React"}
              value={formData.titleEn}
              onChange={(event) => setFormData({ ...formData, titleEn: event.target.value })}
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold" htmlFor="lesson-title-ar" style={{ color: "var(--color-text-muted)" }}>
              {isAr ? "العنوان بالعربية" : "Title (Arabic)"}
            </label>
            <Input
              id="lesson-title-ar"
              placeholder={isAr ? "مثال: مقدمة إلى React" : "e.g., مقدمة إلى React"}
              value={formData.titleAr}
              onChange={(event) => setFormData({ ...formData, titleAr: event.target.value })}
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold" htmlFor="lesson-description-en" style={{ color: "var(--color-text-muted)" }}>
              {isAr ? "الوصف بالإنجليزية" : "Description (English)"}
            </label>
            <textarea
              className="w-full rounded-lg border px-3 py-2 text-sm transition-colors"
              id="lesson-description-en"
              placeholder={isAr ? "وصف اختياري" : "Optional description"}
              rows={3}
              style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)", backgroundColor: "var(--color-surface-2)" }}
              value={formData.descriptionEn || ""}
              onChange={(event) => setFormData({ ...formData, descriptionEn: event.target.value })}
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold" htmlFor="lesson-description-ar" style={{ color: "var(--color-text-muted)" }}>
              {isAr ? "الوصف بالعربية" : "Description (Arabic)"}
            </label>
            <textarea
              className="w-full rounded-lg border px-3 py-2 text-sm transition-colors"
              id="lesson-description-ar"
              placeholder={isAr ? "وصف اختياري" : "Optional description"}
              rows={3}
              style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)", backgroundColor: "var(--color-surface-2)" }}
              value={formData.descriptionAr || ""}
              onChange={(event) => setFormData({ ...formData, descriptionAr: event.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-xs font-semibold" htmlFor="lesson-sort-order" style={{ color: "var(--color-text-muted)" }}>
                {isAr ? "ترتيب الظهور" : "Sort order"}
              </label>
              <Input
                id="lesson-sort-order"
                type="number"
                value={formData.sortOrder}
                onChange={(event) => setFormData({ ...formData, sortOrder: parseInt(event.target.value, 10) || 0 })}
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold" htmlFor="lesson-drip-days" style={{ color: "var(--color-text-muted)" }}>
                {isAr ? "أيام التأخير" : "Drip days"}
              </label>
              <Input
                id="lesson-drip-days"
                placeholder={isAr ? "اتركه فارغًا إذا كان فوريًا" : "Leave empty for immediate access"}
                type="number"
                value={formData.dripDays ?? ""}
                onChange={(event) => setFormData({ ...formData, dripDays: event.target.value ? parseInt(event.target.value, 10) : undefined })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                checked={formData.isPublished}
                type="checkbox"
                onChange={(event) => setFormData({ ...formData, isPublished: event.target.checked })}
              />
              <span className="text-sm" style={{ color: "var(--color-text-primary)" }}>
                {isAr ? "الدرس منشور" : "Lesson is published"}
              </span>
            </label>

            <label className="flex items-center gap-2">
              <input
                checked={formData.isPreview}
                type="checkbox"
                onChange={(event) => setFormData({ ...formData, isPreview: event.target.checked })}
              />
              <span className="text-sm" style={{ color: "var(--color-text-primary)" }}>
                {isAr ? "متاح كمعاينة مجانية" : "Available as free preview"}
              </span>
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
            {isAr ? "إلغاء" : "Cancel"}
          </button>
          <button
            className="rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-all hover:opacity-95"
            style={{ background: "var(--gradient-brand)" }}
            onClick={() => void handleSubmit()}
            type="button"
          >
            {lessonId ? (isAr ? "تحديث" : "Update") : (isAr ? "إنشاء" : "Create")}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
