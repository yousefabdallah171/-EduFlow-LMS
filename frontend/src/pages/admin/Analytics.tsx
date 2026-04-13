import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "sonner";

import { AdminShell } from "@/components/layout/AdminShell";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { api, queryClient } from "@/lib/api";

type AnalyticsPayload = {
  topLessons: Array<{ lessonId: string; titleEn: string; titleAr: string; completionRate: number; averageWatchTimeSeconds: number }>;
  dropOffLessons: Array<{ lessonId: string; titleEn: string; titleAr: string; dropOffRate: number; averageExitPositionSeconds: number }>;
};

type PaymentsPayload = {
  data: Array<{
    id: string;
    student: { id: string; fullName: string; email: string };
    amountEgp: number;
    discountEgp: number;
    couponCode: string | null;
    paymobTransactionId: string | null;
    status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
    createdAt: string;
  }>;
  summary: { totalRevenue: number; completedCount: number; failedCount: number };
};

const PaymentStatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { bg: string; color: string }> = {
    COMPLETED: { bg: "rgba(34,197,94,0.12)",   color: "rgb(21,128,61)" },
    PENDING:   { bg: "rgba(234,179,8,0.12)",   color: "rgb(161,98,7)" },
    FAILED:    { bg: "rgba(239,68,68,0.12)",   color: "rgb(185,28,28)" },
    REFUNDED:  { bg: "var(--color-surface-2)", color: "var(--color-text-muted)" }
  };
  const s = map[status] ?? map["REFUNDED"];
  return (
    <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: s.bg, color: s.color }}>
      {status}
    </span>
  );
};

const selectClass = "mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-brand-600/30";
const selectStyle = {
  backgroundColor: "var(--color-surface-2)",
  borderColor: "var(--color-border-strong)",
  color: "var(--color-text-primary)"
};

export const AdminAnalytics = () => {
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [period, setPeriod] = useState<"7d" | "30d" | "90d" | "all">("30d");
  const [statusFilter, setStatusFilter] = useState<"" | "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED">("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const analyticsQuery = useQuery({
    queryKey: ["admin-analytics", period],
    queryFn: async () => {
      const response = await api.get<AnalyticsPayload>("/admin/analytics", { params: { period } });
      return response.data;
    }
  });

  const paymentsQuery = useQuery({
    queryKey: ["admin-payments", statusFilter, fromDate, toDate],
    queryFn: async () => {
      const response = await api.get<PaymentsPayload>("/admin/payments", {
        params: {
          limit: 20,
          ...(statusFilter ? { status: statusFilter } : {}),
          ...(fromDate ? { from: new Date(fromDate).toISOString() } : {}),
          ...(toDate ? { to: new Date(toDate).toISOString() } : {})
        }
      });
      return response.data;
    }
  });

  const markPaidMutation = useMutation({
    mutationFn: async (paymentId: string) =>
      api.post(`/admin/payments/${paymentId}/mark-paid`, { reason: "Webhook delivery failed; payment confirmed via Paymob dashboard" }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-payments"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-analytics"] })
      ]);
      setActionError(null);
      setPendingPaymentId(null);
      toast.success("Payment marked as paid.");
    },
    onError: (error) => {
      const apiError = error as AxiosError<{ message?: string }>;
      const status = apiError.response?.status;
      const message =
        status === 409
          ? "Payment already marked as paid."
          : apiError.response?.data?.message ?? "Unable to mark payment as paid.";
      setActionError(message);
      toast.error(message);
    }
  });

  return (
    <AdminShell title="Analytics and payments" description="Review lesson performance, identify drop-off points, and recover pending payments when webhooks miss.">

      {/* Filters */}
      <section
        className="rounded-2xl border p-5 shadow-card"
        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        <p className="mb-4 text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>Filters</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }} htmlFor="analytics-period">
              KPI period
            </label>
            <select id="analytics-period" className={selectClass} style={selectStyle}
              onChange={(e) => setPeriod(e.target.value as typeof period)} value={period}>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }} htmlFor="payment-status-filter">
              Payment status
            </label>
            <select id="payment-status-filter" className={selectClass} style={selectStyle}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} value={statusFilter}>
              <option value="">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }} htmlFor="payment-from-filter">
              From date
            </label>
            <input id="payment-from-filter" type="date" className={selectClass} style={selectStyle}
              onChange={(e) => setFromDate(e.target.value)} value={fromDate} />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }} htmlFor="payment-to-filter">
              To date
            </label>
            <input id="payment-to-filter" type="date" className={selectClass} style={selectStyle}
              onChange={(e) => setToDate(e.target.value)} value={toDate} />
          </div>
        </div>
      </section>

      {/* Lesson analytics */}
      <section className="grid gap-5 xl:grid-cols-2">
        {/* Top lessons */}
        <div
          className="rounded-2xl border p-5 shadow-card"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <p className="mb-4 text-xs font-bold uppercase tracking-widest text-brand-600">Top performing lessons</p>
          <div className="space-y-3">
            {analyticsQuery.isLoading
              ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
              : analyticsQuery.data?.topLessons.map((lesson) => (
                  <div
                    key={lesson.lessonId}
                    className="rounded-xl border p-4"
                    style={{ borderColor: "var(--color-border-strong)", backgroundColor: "var(--color-surface-2)" }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{lesson.titleEn}</p>
                        {lesson.titleAr ? (
                          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{lesson.titleAr}</p>
                        ) : null}
                      </div>
                      <span
                        className="flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-bold"
                        style={{ backgroundColor: "rgba(34,197,94,0.12)", color: "rgb(21,128,61)" }}
                      >
                        {lesson.completionRate}% done
                      </span>
                    </div>
                    <p className="mt-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
                      Avg. watch time: {Math.round(lesson.averageWatchTimeSeconds / 60)}m {lesson.averageWatchTimeSeconds % 60}s
                    </p>
                  </div>
                ))}
          </div>
        </div>

        {/* Drop-off */}
        <div
          className="rounded-2xl border p-5 shadow-card"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <p className="mb-4 text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
            Drop-off analysis
          </p>
          <div className="space-y-3">
            {analyticsQuery.isLoading
              ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
              : analyticsQuery.data?.dropOffLessons.map((lesson) => (
                  <div
                    key={lesson.lessonId}
                    className="rounded-xl border p-4"
                    style={{ borderColor: "var(--color-border-strong)", backgroundColor: "var(--color-surface-2)" }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{lesson.titleEn}</p>
                        {lesson.titleAr ? (
                          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{lesson.titleAr}</p>
                        ) : null}
                      </div>
                      <span
                        className="flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-bold"
                        style={{ backgroundColor: "rgba(239,68,68,0.12)", color: "rgb(185,28,28)" }}
                      >
                        {lesson.dropOffRate}% drop-off
                      </span>
                    </div>
                    <p className="mt-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
                      Avg. exit: {Math.round(lesson.averageExitPositionSeconds / 60)}m {lesson.averageExitPositionSeconds % 60}s
                    </p>
                  </div>
                ))}
          </div>
        </div>
      </section>

      {/* Payments */}
      <section
        className="rounded-2xl border shadow-card"
        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 p-5" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Payment history</p>
            <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
              Revenue {paymentsQuery.data?.summary.totalRevenue ?? 0} EGP
              &nbsp;·&nbsp;{paymentsQuery.data?.summary.completedCount ?? 0} completed
              &nbsp;·&nbsp;{paymentsQuery.data?.summary.failedCount ?? 0} failed
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                {["Student", "Amount", "Coupon", "Status", "Created", "Action"].map((h) => (
                  <th key={h} className="px-4 py-3 text-start text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paymentsQuery.isLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--color-border)" }}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td>
                      ))}
                    </tr>
                  ))
                : paymentsQuery.data?.data.map((payment) => (
                    <tr key={payment.id} className="transition-colors hover:bg-surface2" style={{ borderBottom: "1px solid var(--color-border)" }}>
                      <td className="px-4 py-3">
                        <p className="font-semibold" style={{ color: "var(--color-text-primary)" }}>{payment.student.fullName}</p>
                        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{payment.student.email}</p>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>
                        {payment.amountEgp} EGP
                      </td>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                        {payment.couponCode ?? "—"}
                      </td>
                      <td className="px-4 py-3"><PaymentStatusBadge status={payment.status} /></td>
                      <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                        {new Date(payment.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {payment.status === "PENDING" ? (
                          <button
                            className="rounded-lg border px-3 py-2 text-xs font-semibold transition-colors hover:bg-surface2"
                            style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                            onClick={() => setPendingPaymentId(payment.id)}
                            type="button"
                          >
                            Mark paid
                          </button>
                        ) : (
                          <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog open={Boolean(pendingPaymentId)} onOpenChange={(open) => !open && setPendingPaymentId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark payment as paid?</DialogTitle>
            <DialogDescription>This will mark the payment complete and activate enrollment for the student.</DialogDescription>
          </DialogHeader>
          {actionError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
              {actionError}
            </p>
          ) : null}
          <DialogFooter>
            <button
              className="rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-surface2"
              style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
              onClick={() => setPendingPaymentId(null)}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-brand-700 disabled:opacity-50"
              disabled={markPaidMutation.isPending}
              onClick={() => { if (pendingPaymentId) markPaidMutation.mutate(pendingPaymentId); }}
              type="button"
            >
              {markPaidMutation.isPending ? "Working…" : "Confirm"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
};
