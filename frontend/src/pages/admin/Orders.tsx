import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { AdminShell } from "@/components/layout/AdminShell";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

type Payment = { id: string; amountPiasters: number; status: string; createdAt: string; user: { fullName: string; email: string } };

export const AdminOrders = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => api.get<{ payments: Payment[]; total: number }>("/admin/orders").then((r) => r.data)
  });

  const markPaidMut = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/orders/${id}/mark-paid`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success("Marked as paid");
      setMarkingId(null);
      setError(null);
    },
    onError: (err: unknown) => {
      const apiError = err as AxiosError<{ message?: string; error?: string }>;
      const errorMsg = apiError.response?.data?.message ?? apiError.response?.data?.error ?? "Failed to mark paid";
      setError(errorMsg);
      toast.error(errorMsg);
    }
  });

  const exportCsv = () => {
    void api.get("/admin/orders/export-csv", { responseType: "blob" }).then((r) => {
      const url = URL.createObjectURL(r.data as Blob);
      const a = document.createElement("a"); a.href = url; a.download = "orders.csv"; a.click(); URL.revokeObjectURL(url);
    });
  };

  return (
    <AdminShell title={t("admin.orders.title")} description={t("admin.orders.desc")}>
      <div className="flex justify-end mb-3">
        <button onClick={exportCsv} className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-surface2" style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-secondary)" }} type="button">
          {t("admin.orders.exportCsv")}
        </button>
      </div>

      <div className="dashboard-panel overflow-hidden">
        {isLoading ? (
          <div className="p-5 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
                {["Student", "Email", "Amount", "Status", "Date", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-start text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data?.payments ?? []).map((p, i) => (
                <tr key={p.id} className={i < (data?.payments.length ?? 0) - 1 ? "border-b" : ""} style={{ borderColor: "var(--color-border)" }}>
                  <td className="px-4 py-3 font-medium" style={{ color: "var(--color-text-primary)" }}>{p.user.fullName}</td>
                  <td className="px-4 py-3" style={{ color: "var(--color-text-secondary)" }}>{p.user.email}</td>
                  <td className="px-4 py-3 font-semibold" style={{ color: "var(--color-text-primary)" }}>{p.amountPiasters / 100} EGP</td>
                  <td className="px-4 py-3"><Badge variant={p.status === "COMPLETED" ? "default" : "outline"}>{p.status}</Badge></td>
                  <td className="px-4 py-3" style={{ color: "var(--color-text-secondary)" }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {p.status !== "COMPLETED" && (
                      <button
                        onClick={() => setMarkingId(p.id)}
                        className="rounded-lg px-3 py-1 text-xs font-bold text-white transition-all hover:opacity-95"
                        style={{ background: "var(--gradient-brand)" }}
                        type="button"
                      >
                        {t("actions.markPaid")}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {markingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-[28px] border p-6 shadow-elevated mx-4" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            <p className="font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>{t("actions.markPaid")}?</p>
            <p className="text-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>This will mark the payment as completed and activate enrollment.</p>
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setError(null);
                  void markPaidMut.mutateAsync(markingId);
                }}
                disabled={markPaidMut.isPending}
                className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-50"
                style={{ background: "var(--gradient-brand)" }}
                type="button"
              >
                {markPaidMut.isPending ? "Processing..." : t("actions.confirm")}
              </button>
              <button
                onClick={() => {
                  setMarkingId(null);
                  setError(null);
                }}
                className="flex-1 rounded-xl border py-2.5 text-sm font-medium"
                style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                type="button"
              >
                {t("actions.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
};
