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

type Section = {
  id: string;
  titleEn: string;
  titleAr: string;
  descriptionEn?: string;
  descriptionAr?: string;
  sortOrder: number;
};

type SectionManagerProps = {
  selectedSectionId?: string | null;
  onSelectSection: (sectionId: string) => void;
};

export const SectionManager = ({ selectedSectionId, onSelectSection }: SectionManagerProps) => {
  const { i18n } = useTranslation();
  const isAr = resolveLocale(i18n.language) === "ar";
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<Section, "id">>({
    titleEn: "",
    titleAr: "",
    descriptionEn: "",
    descriptionAr: "",
    sortOrder: 0
  });

  const sectionsQuery = useQuery({
    queryKey: ["admin-sections"],
    queryFn: async () => {
      const response = await api.get<{ sections: Section[] }>("/admin/sections");
      return response.data.sections;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: Omit<Section, "id">) =>
      api.post<Section>("/admin/sections", data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-sections"] });
      setDialogOpen(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Section) =>
      api.put<Section>(`/admin/sections/${data.id}`, {
        titleEn: data.titleEn,
        titleAr: data.titleAr,
        descriptionEn: data.descriptionEn,
        descriptionAr: data.descriptionAr,
        sortOrder: data.sortOrder
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-sections"] });
      setDialogOpen(false);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (sectionId: string) =>
      api.delete(`/admin/sections/${sectionId}`),
    onSuccess: async (_, sectionId) => {
      await queryClient.invalidateQueries({ queryKey: ["admin-sections"] });
      if (selectedSectionId === sectionId) {
        onSelectSection("");
      }
      setPendingDeleteId(null);
    }
  });

  const pendingDeleteSection = useMemo(
    () => sectionsQuery.data?.find((section) => section.id === pendingDeleteId) ?? null,
    [pendingDeleteId, sectionsQuery.data]
  );

  const resetForm = () => {
    setFormData({
      titleEn: "",
      titleAr: "",
      descriptionEn: "",
      descriptionAr: "",
      sortOrder: 0
    });
    setEditingId(null);
  };

  const handleOpen = (section?: Section) => {
    if (section) {
      setEditingId(section.id);
      setFormData({
        titleEn: section.titleEn,
        titleAr: section.titleAr,
        descriptionEn: section.descriptionEn || "",
        descriptionAr: section.descriptionAr || "",
        sortOrder: section.sortOrder
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, ...formData });
      } else {
        await createMutation.mutateAsync(formData);
      }
    } catch (error) {
      const apiError = error as AxiosError<{ message?: string }>;
      toast.error(
        apiError.response?.data?.message ??
          (isAr ? "تعذر حفظ القسم." : "Failed to save section.")
      );
    }
  };

  const handleDelete = async (sectionId: string) => {
    try {
      await deleteMutation.mutateAsync(sectionId);
    } catch (error) {
      const apiError = error as AxiosError<{ message?: string }>;
      toast.error(
        apiError.response?.data?.message ??
          (isAr ? "تعذر حذف القسم." : "Failed to delete section.")
      );
    }
  };

  return (
    <>
      <div
        className="rounded-[28px] border p-4 shadow-card"
        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
            {isAr ? "الأقسام" : "Sections"}
          </h3>
          <button
            className="rounded-xl px-3 py-1.5 text-xs font-bold text-white transition-all hover:opacity-95"
            style={{ background: "var(--gradient-brand)" }}
            onClick={() => handleOpen()}
            type="button"
          >
            {isAr ? "+ قسم جديد" : "+ New section"}
          </button>
        </div>

        <div className="space-y-2">
          {sectionsQuery.data?.map((section) => (
            <article
              key={section.id}
              className="rounded-lg border p-3"
              style={{
                borderColor:
                  selectedSectionId === section.id
                    ? "var(--color-brand-600)"
                    : "var(--color-border)",
                backgroundColor:
                  selectedSectionId === section.id
                    ? "var(--color-surface-2)"
                    : "transparent"
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  className="min-w-0 flex-1 text-left"
                  onClick={() => onSelectSection(section.id)}
                  type="button"
                >
                  <p className="truncate text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                    {section.titleEn}
                  </p>
                  <p className="truncate text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {section.titleAr}
                  </p>
                </button>
                <div className="flex shrink-0 gap-1">
                  <button
                    className="rounded-md border px-2 py-1 text-[10px] font-medium transition-colors hover:bg-surface2"
                    style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                    onClick={() => handleOpen(section)}
                    type="button"
                  >
                    {isAr ? "تعديل" : "Edit"}
                  </button>
                  <button
                    className="rounded-md border px-2 py-1 text-[10px] font-medium transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                    style={{ borderColor: "var(--color-danger-bg)", color: "var(--color-danger)" }}
                    onClick={() => setPendingDeleteId(section.id)}
                    type="button"
                  >
                    {isAr ? "حذف" : "Delete"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {!sectionsQuery.data || sectionsQuery.data.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            {isAr ? "لا توجد أقسام بعد. أنشئ أول قسم لتنظيم الدروس." : "No sections yet. Create the first section to organize lessons."}
          </p>
        ) : null}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? (isAr ? "تعديل القسم" : "Edit section") : (isAr ? "إنشاء قسم" : "Create section")}</DialogTitle>
            <DialogDescription>
              {editingId
                ? isAr
                  ? "حدّث بيانات القسم وتنظيمه داخل المسار."
                  : "Update the section details and placement in the course flow."
                : isAr
                  ? "أضف قسمًا جديدًا لتنظيم الدروس داخل المسار."
                  : "Add a new section to organize the lesson flow."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
                {isAr ? "العنوان بالإنجليزية" : "Title (English)"}
              </label>
              <Input
                placeholder={isAr ? "مثال: Getting Started" : "e.g., Getting Started"}
                value={formData.titleEn}
                onChange={(event) => setFormData({ ...formData, titleEn: event.target.value })}
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
                {isAr ? "العنوان بالعربية" : "Title (Arabic)"}
              </label>
              <Input
                placeholder={isAr ? "مثال: البداية" : "e.g., البداية"}
                value={formData.titleAr}
                onChange={(event) => setFormData({ ...formData, titleAr: event.target.value })}
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
                {isAr ? "الوصف بالإنجليزية" : "Description (English)"}
              </label>
              <Input
                placeholder={isAr ? "وصف اختياري" : "Optional description"}
                value={formData.descriptionEn || ""}
                onChange={(event) => setFormData({ ...formData, descriptionEn: event.target.value })}
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
                {isAr ? "الوصف بالعربية" : "Description (Arabic)"}
              </label>
              <Input
                placeholder={isAr ? "وصف اختياري" : "Optional description"}
                value={formData.descriptionAr || ""}
                onChange={(event) => setFormData({ ...formData, descriptionAr: event.target.value })}
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
                {isAr ? "ترتيب الظهور" : "Sort order"}
              </label>
              <Input
                type="number"
                value={formData.sortOrder}
                onChange={(event) => setFormData({ ...formData, sortOrder: parseInt(event.target.value, 10) || 0 })}
              />
            </div>
          </div>

          <DialogFooter>
            <button
              className="rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-surface2"
              style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
              onClick={() => setDialogOpen(false)}
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
              {editingId ? (isAr ? "تحديث" : "Update") : (isAr ? "إنشاء" : "Create")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <DialogTitle>{isAr ? "حذف القسم؟" : "Delete section?"}</DialogTitle>
            <DialogDescription>
              {isAr
                ? `سيتم حذف "${pendingDeleteSection?.titleAr || pendingDeleteSection?.titleEn || "هذا القسم"}" من لوحة الإدارة.`
                : `This will remove "${pendingDeleteSection?.titleEn || pendingDeleteSection?.titleAr || "this section"}" from the admin workspace.`}
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
              style={{ backgroundColor: "var(--color-danger)" }}
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
