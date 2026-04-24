import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, FileVideo, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { AdminShell } from "@/components/layout/AdminShell";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { api } from "@/lib/api";
import { resolveLocale } from "@/lib/locale";

type Upload = { id: string; filename: string; status: string; sizeBytes: string; lessonId: string | null };

const statusVariant = (s: string) => s === "READY" ? "default" : s === "ERROR" ? "destructive" : "outline";

export const AdminMediaLibrary = () => {
  const { t, i18n } = useTranslation();
  const isAr = resolveLocale(i18n.language) === "ar";
  const qc = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-uploads"],
    queryFn: () => api.get<{ uploads: Upload[] }>("/admin/uploads").then((r) => r.data)
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/uploads/${id}`),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["admin-uploads"] }); toast.success(isAr ? "تم الحذف" : "Deleted"); setDeletingId(null); }
  });

  const uploads = data?.uploads ?? [];
  const readyCount = uploads.filter((upload) => upload.status === "READY").length;
  const processingCount = uploads.filter((upload) => upload.status === "PROCESSING").length;
  const errorCount = uploads.filter((upload) => upload.status === "ERROR").length;

  return (
    <AdminShell title={t("admin.media.title")} description={t("admin.media.desc")}>
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="dashboard-panel dashboard-panel--accent p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">{isAr ? "جاهز" : "Ready"}</p>
            <p className="mt-2 font-display text-3xl font-bold" style={{ color: "var(--color-text-primary)" }}>{readyCount}</p>
          </div>
          <div className="dashboard-panel p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>{isAr ? "قيد المعالجة" : "Processing"}</p>
            <p className="mt-2 font-display text-3xl font-bold" style={{ color: "var(--color-text-primary)" }}>{processingCount}</p>
          </div>
          <div className="dashboard-panel p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>{isAr ? "أخطاء" : "Errors"}</p>
            <p className="mt-2 font-display text-3xl font-bold" style={{ color: "var(--color-text-primary)" }}>{errorCount}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-[28px]" />)}
          </div>
        ) : uploads.length === 0 ? (
          <EmptyState icon="Video" title={t("admin.media.empty")} description={t("admin.media.emptyDesc")} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {uploads.map((u) => (
              <div key={u.id} className="dashboard-panel p-4">
                <div className="mb-4 flex h-24 items-center justify-center rounded-[22px]" style={{ backgroundColor: "var(--color-surface-2)" }}>
                  {u.status === "ERROR" ? (
                    <AlertTriangle className="h-7 w-7 text-red-500" />
                  ) : (
                    <FileVideo className="h-7 w-7 text-brand-600" />
                  )}
                </div>
                <p className="truncate text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{u.filename}</p>
                <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {u.lessonId ? (isAr ? `مرتبط بالدرس ${u.lessonId}` : `Linked to lesson ${u.lessonId}`) : (isAr ? "غير مرتبط بدرس بعد" : "Not linked to a lesson yet")}
                </p>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <Badge variant={statusVariant(u.status) as "default" | "outline" | "destructive"}>{u.status}</Badge>
                  <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{u.sizeBytes}</span>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => setDeletingId(u.id)}
                    className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                    style={{ borderColor: "rgba(239,68,68,0.4)" }}
                    type="button"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t("actions.delete")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/50">
          <div className="mx-4 w-full max-w-sm rounded-[28px] border p-6" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            <p className="mb-4 font-bold" style={{ color: "var(--color-text-primary)" }}>{isAr ? "حذف هذا الملف؟" : "Delete this upload?"}</p>
            <div className="flex gap-2">
              <button onClick={() => void deleteMut.mutateAsync(deletingId)} disabled={deleteMut.isPending} className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-bold text-white disabled:opacity-50" type="button">{t("actions.confirm")}</button>
              <button onClick={() => setDeletingId(null)} className="flex-1 rounded-xl border py-2.5 text-sm font-medium" style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }} type="button">{t("actions.cancel")}</button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
};
