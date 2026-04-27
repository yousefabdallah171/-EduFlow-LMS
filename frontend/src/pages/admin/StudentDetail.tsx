import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { BarChart3, CalendarDays, Mail, ShieldCheck, UserCircle2 } from "lucide-react";
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
    onSuccess: () => { toast.success(t("admin.studentDetail.revokeSuccess")); setRevoking(false); },
    onError: () => toast.error(t("admin.studentDetail.revokeError"))
  });

  const studentName = student?.fullName as string | undefined;
  const studentEmail = student?.email as string | undefined;
  const enrollmentStatus = student?.enrollmentStatus as string | undefined;
  const enrollmentType = student?.enrollmentType as string | undefined;
  const completion = Number(student?.courseCompletion ?? 0);
  const enrolledAt = student?.enrolledAt ? new Date(student.enrolledAt as string).toLocaleDateString() : "-";
  const lastActiveAt = student?.lastActiveAt ? new Date(student.lastActiveAt as string).toLocaleDateString() : "-";

  return (
    <AdminShell title={t("admin.studentDetail.title")} description={t("admin.studentDetail.desc")}>
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : student ? (
        <div className="space-y-5">
          <div className="dashboard-panel p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-[22px] text-white shadow-sm" style={{ background: "var(--gradient-brand)" }}>
                  <UserCircle2 className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold" style={{ color: "var(--color-text-primary)" }}>{studentName}</p>
                  <p className="mt-1 inline-flex items-center gap-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
                    <Mail className="h-4 w-4 text-brand-600" />
                    {studentEmail}
                  </p>
                </div>
              </div>
              <button onClick={() => setRevoking(true)} className="rounded-lg border border-red-500/30 px-4 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/10" type="button">
                {t("actions.revokeAccess")}
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="dashboard-panel dashboard-panel--accent p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">{t("admin.studentDetail.status")}</p>
              <p className="mt-2 text-xl font-semibold" style={{ color: "var(--color-text-primary)" }}>{enrollmentStatus ?? "-"}</p>
            </div>
            <div className="dashboard-panel p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>{t("admin.studentDetail.enrollmentType")}</p>
              <p className="mt-2 text-xl font-semibold" style={{ color: "var(--color-text-primary)" }}>{enrollmentType ?? "-"}</p>
            </div>
            <div className="dashboard-panel p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>{t("admin.studentDetail.completion")}</p>
              <p className="mt-2 text-xl font-semibold" style={{ color: "var(--color-text-primary)" }}>{completion}%</p>
            </div>
            <div className="dashboard-panel p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>{t("admin.studentDetail.lastActive")}</p>
              <p className="mt-2 text-xl font-semibold" style={{ color: "var(--color-text-primary)" }}>{lastActiveAt}</p>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
            <div className="dashboard-panel p-5">
              <div className="mb-4 flex items-center gap-2 text-brand-600">
                <BarChart3 className="h-4 w-4" />
                <h2 className="text-xs font-bold uppercase tracking-[0.16em]">{t("admin.studentDetail.snapshotTitle")}</h2>
              </div>
              <div className="rounded-[22px] border px-4 py-4" style={{ borderColor: "var(--color-border)", backgroundColor: "color-mix(in oklab, var(--color-surface-2) 72%, transparent)" }}>
                <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  {completion >= 100
                    ? t("admin.studentDetail.progress.complete")
                    : completion >= 50
                      ? t("admin.studentDetail.progress.progressing")
                      : t("admin.studentDetail.progress.needMomentum")}
                </p>
                <div className="mt-4 h-2 overflow-hidden rounded-full" style={{ backgroundColor: "var(--color-surface-2)" }}>
                  <div className="h-full rounded-full" style={{ width: `${completion}%`, background: "var(--gradient-brand)" }} />
                </div>
              </div>
            </div>

            <div className="dashboard-panel p-5">
              <div className="mb-4 flex items-center gap-2 text-brand-600">
                <CalendarDays className="h-4 w-4" />
                <h2 className="text-xs font-bold uppercase tracking-[0.16em]">{t("admin.studentDetail.timeline")}</h2>
              </div>
              <div className="space-y-3">
                <div className="rounded-[22px] border px-4 py-4" style={{ borderColor: "var(--color-border)", backgroundColor: "color-mix(in oklab, var(--color-surface-2) 72%, transparent)" }}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>{t("admin.studentDetail.enrolledOn")}</p>
                  <p className="mt-2 text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{enrolledAt}</p>
                </div>
                <div className="rounded-[22px] border px-4 py-4" style={{ borderColor: "var(--color-border)", backgroundColor: "color-mix(in oklab, var(--color-surface-2) 72%, transparent)" }}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>{t("admin.studentDetail.lastActive")}</p>
                  <p className="mt-2 text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{lastActiveAt}</p>
                </div>
                <div className="rounded-[22px] border px-4 py-4" style={{ borderColor: "var(--color-border)", backgroundColor: "color-mix(in oklab, var(--color-surface-2) 72%, transparent)" }}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>{t("admin.studentDetail.accessState")}</p>
                  <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                    <ShieldCheck className="h-4 w-4 text-brand-600" />
                    {enrollmentStatus ?? "-"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>{t("admin.studentDetail.notFound")}</p>
      )}

      {revoking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/50">
          <div className="mx-4 w-full max-w-sm rounded-[28px] border p-6 shadow-elevated" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            <p className="mb-2 font-bold" style={{ color: "var(--color-text-primary)" }}>{t("actions.revokeAccess")}?</p>
            <p className="mb-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>{t("admin.studentDetail.revokeWarning")}</p>
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
