import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AdminShell } from "@/components/layout/AdminShell";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

export const AdminStudentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const [revoking, setRevoking] = useState(false);

  const { data: student, isLoading } = useQuery({
    queryKey: ["admin-student", id],
    queryFn: () => api.get(`/admin/students/${id}`).then((r) => r.data as Record<string, unknown>),
    enabled: !!id
  });

  const revokeMut = useMutation({
    mutationFn: () => api.post(`/admin/students/${id}/revoke`),
    onSuccess: () => { toast.success("Enrollment revoked"); setRevoking(false); },
    onError: () => toast.error("Failed to revoke")
  });

  return (
    <AdminShell title={t("admin.studentDetail.title")} description={t("admin.studentDetail.desc")}>
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : student ? (
        <div className="space-y-5">
          <div className="rounded-2xl border p-6 shadow-card" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>{student.fullName as string}</p>
                <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>{student.email as string}</p>
              </div>
              <button onClick={() => setRevoking(true)} className="rounded-lg border border-red-500/30 px-4 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/10" type="button">
                {t("actions.revokeAccess")}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Student not found.</p>
      )}

      {revoking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-2xl border p-6 shadow-elevated max-w-sm w-full mx-4" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            <p className="font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>{t("actions.revokeAccess")}?</p>
            <p className="text-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>This will remove the student's access to all course content.</p>
            <div className="flex gap-2">
              <button onClick={() => void revokeMut.mutateAsync()} disabled={revokeMut.isPending} className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-bold text-white disabled:opacity-50" type="button">{t("actions.confirm")}</button>
              <button onClick={() => setRevoking(false)} className="flex-1 rounded-xl border py-2.5 text-sm font-medium" style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }} type="button">{t("actions.cancel")}</button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
};
