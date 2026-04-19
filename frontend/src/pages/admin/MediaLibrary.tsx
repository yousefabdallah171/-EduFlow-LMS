import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AdminShell } from "@/components/layout/AdminShell";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { api } from "@/lib/api";

type Upload = { id: string; filename: string; status: string; sizeBytes: string; lessonId: string | null };

const statusVariant = (s: string) => s === "READY" ? "default" : s === "ERROR" ? "destructive" : "outline";

export const AdminMediaLibrary = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-uploads"],
    queryFn: () => api.get<{ uploads: Upload[] }>("/admin/uploads").then((r) => r.data)
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/uploads/${id}`),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["admin-uploads"] }); toast.success("Deleted"); setDeletingId(null); }
  });

  const uploads = data?.uploads ?? [];

  return (
    <AdminShell title={t("admin.media.title")} description={t("admin.media.desc")}>
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-[28px]" />)}
        </div>
      ) : uploads.length === 0 ? (
        <EmptyState icon="Video" title={t("admin.media.empty")} description={t("admin.media.emptyDesc")} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {uploads.map((u) => (
            <div key={u.id} className="dashboard-panel p-4">
              <div className="mb-3 flex h-20 items-center justify-center rounded-xl" style={{ backgroundColor: "var(--color-surface-2)" }}>
                <span className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>Video</span>
              </div>
              <p className="truncate text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{u.filename}</p>
              <div className="mt-2 flex items-center justify-between">
                <Badge variant={statusVariant(u.status) as "default" | "outline" | "destructive"}>{u.status}</Badge>
                <button onClick={() => setDeletingId(u.id)} className="text-xs text-red-500 hover:underline" type="button">{t("actions.delete")}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-sm rounded-[28px] border p-6" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            <p className="font-bold mb-4" style={{ color: "var(--color-text-primary)" }}>Delete this upload?</p>
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
