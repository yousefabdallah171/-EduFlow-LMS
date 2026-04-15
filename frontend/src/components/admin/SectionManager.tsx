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
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-sections"] });
      if (selectedSectionId === deleteMutation.variables) {
        onSelectSection("");
      }
    }
  });

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
      window.alert(apiError.response?.data?.message ?? "Failed to save section.");
    }
  };

  const handleDelete = async (sectionId: string) => {
    if (!window.confirm("Are you sure you want to delete this section?")) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(sectionId);
    } catch (error) {
      const apiError = error as AxiosError<{ message?: string }>;
      window.alert(apiError.response?.data?.message ?? "Failed to delete section.");
    }
  };

  return (
    <>
      <div
        className="rounded-2xl border p-4 shadow-card"
        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
            Sections
          </h3>
          <button
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-brand-700"
            onClick={() => handleOpen()}
            type="button"
          >
            + New
          </button>
        </div>

        <div className="space-y-2">
          {sectionsQuery.data?.map((section) => (
            <div
              key={section.id}
              className="rounded-lg border p-3 transition-colors cursor-pointer hover:bg-surface2"
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
              onClick={() => onSelectSection(section.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--color-text-primary)" }}>
                    {section.titleEn}
                  </p>
                  <p className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>
                    {section.titleAr}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    className="rounded-md border px-2 py-1 text-[10px] font-medium transition-colors hover:bg-surface2"
                    style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpen(section);
                    }}
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    className="rounded-md border px-2 py-1 text-[10px] font-medium transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                    style={{ borderColor: "rgba(239,68,68,0.4)", color: "rgb(185,28,28)" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDelete(section.id);
                    }}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {!sectionsQuery.data || sectionsQuery.data.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            No sections yet. Create one to get started.
          </p>
        ) : null}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit section" : "Create section"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Update the section details." : "Add a new section to organize lessons."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
                Title (English)
              </label>
              <Input
                placeholder="e.g., Getting Started"
                value={formData.titleEn}
                onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
                Title (Arabic)
              </label>
              <Input
                placeholder="مثال: البداية"
                value={formData.titleAr}
                onChange={(e) => setFormData({ ...formData, titleAr: e.target.value })}
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
                Description (English)
              </label>
              <Input
                placeholder="Optional description"
                value={formData.descriptionEn || ""}
                onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })}
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
                Description (Arabic)
              </label>
              <Input
                placeholder="وصف اختياري"
                value={formData.descriptionAr || ""}
                onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })}
              />
            </div>

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
          </div>

          <DialogFooter>
            <button
              className="rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-surface2"
              style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
              onClick={() => setDialogOpen(false)}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-brand-700"
              onClick={() => void handleSubmit()}
              type="button"
            >
              {editingId ? "Update" : "Create"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
