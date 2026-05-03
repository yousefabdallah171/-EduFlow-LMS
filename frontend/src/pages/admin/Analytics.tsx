import { useMemo, useState } from "react";
import { AxiosError } from "axios";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { AdminShell } from "@/components/layout/AdminShell";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdminUiCopy } from "@/lib/admin-ui-copy";
import { api, queryClient } from "@/lib/api";
import { formatDate, formatNumber, resolveLocale } from "@/lib/locale";

type AnalyticsPayload = {
  topLessons: Array<{
    lessonId: string;
    titleEn: string;
    titleAr: string;
    completionRate: number;
    averageWatchTimeSeconds: number;
  }>;
  dropOffLessons: Array<{
    lessonId: string;
    titleEn: string;
    titleAr: string;
    dropOffRate: number;
    averageExitPositionSeconds: number;
  }>;
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

const statusTone = (status: PaymentsPayload["data"][number]["status"]) => {
  const map: Record<PaymentsPayload["data"][number]["status"], { bg: string; color: string }> = {
    COMPLETED: { bg: "var(--color-success-bg)", color: "var(--color-success)" },
    PENDING: { bg: "var(--color-warning-bg)", color: "var(--color-warning)" },
    FAILED: { bg: "var(--color-danger-bg)", color: "var(--color-danger)" },
    REFUNDED: { bg: "var(--color-surface-2)", color: "var(--color-text-muted)" }
  };
  return map[status];
};

const formatSeconds = (seconds: number, locale: "en" | "ar") => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (locale === "ar") {
    return `${formatNumber(minutes, locale)} د ${formatNumber(remainingSeconds, locale)} ث`;
  }
  return `${minutes}m ${remainingSeconds}s`;
};

export const AdminAnalytics = () => {
  const { t, i18n } = useTranslation();
  const locale = resolveLocale(i18n.language);
  const copy = getAdminUiCopy(locale);
  const isAr = locale === "ar";
  const [period, setPeriod] = useState<"7d" | "30d" | "90d" | "all">("30d");
  const [statusFilter, setStatusFilter] = useState<"" | "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED">("");
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);

  const analyticsQuery = useQuery({
    queryKey: ["admin-analytics", period],
    queryFn: async () => {
      const response = await api.get<AnalyticsPayload>("/admin/analytics", { params: { period } });
      return response.data;
    }
  });

  const paymentsQuery = useQuery({
    queryKey: ["admin-payments", statusFilter],
    queryFn: async () => {
      const response = await api.get<PaymentsPayload>("/admin/payments", {
        params: {
          limit: 20,
          ...(statusFilter ? { status: statusFilter } : {})
        }
      });
      return response.data;
    }
  });

  const markPaidMutation = useMutation({
    mutationFn: async (paymentId: string) =>
      api.post(`/admin/payments/${paymentId}/mark-paid`, {
        reason: "Payment verified by admin after external confirmation"
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-payments"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-analytics"] })
      ]);
      toast.success(isAr ? "تم تأكيد الدفع بنجاح." : "Payment marked as paid.");
    },
    onError: (error: unknown) => {
      const apiError = error as AxiosError<{ message?: string }>;
      toast.error(apiError.response?.data?.message ?? (isAr ? "تعذر تحديث حالة الدفع." : "Failed to update payment."));
    }
  });

  const topLessons = analyticsQuery.data?.topLessons ?? [];
  const dropOffLessons = analyticsQuery.data?.dropOffLessons ?? [];
  const payments = useMemo(() => paymentsQuery.data?.data ?? [], [paymentsQuery.data?.data]);
  const selectedPayment = useMemo(
    () => payments.find((payment) => payment.id === selectedPaymentId) ?? null,
    [payments, selectedPaymentId]
  );

  return (
    <AdminShell title={t("admin.analytics.title")} description={t("admin.analytics.desc")}>
      <section className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: copy.analytics.revenue, value: `${paymentsQuery.data?.summary.totalRevenue ?? 0} ${copy.common.egp}`, note: copy.analytics.revenueNote },
            { label: copy.common.completed, value: paymentsQuery.data?.summary.completedCount ?? 0, note: copy.analytics.completedNote },
            { label: copy.common.failed, value: paymentsQuery.data?.summary.failedCount ?? 0, note: copy.analytics.failedNote },
            { label: copy.analytics.insightWindow, value: period.toUpperCase(), note: copy.analytics.insightWindowNote }
          ].map((item) => (
            <div key={item.label} className="dashboard-panel p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                {item.label}
              </p>
              <p className="mt-3 text-3xl font-black tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                {item.value}
              </p>
              <p className="mt-2 text-sm leading-6" style={{ color: "var(--color-text-secondary)" }}>
                {item.note}
              </p>
            </div>
          ))}
        </div>

        <div className="dashboard-panel p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                {copy.analytics.view}
              </p>
              <h2 className="text-2xl font-black tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                {copy.analytics.title}
              </h2>
              <p className="max-w-3xl text-sm leading-7" style={{ color: "var(--color-text-secondary)" }}>
                {copy.analytics.desc}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {(["7d", "30d", "90d", "all"] as const).map((value) => (
                <button
                  key={value}
                  className="rounded-lg border px-3 py-2 text-sm font-semibold transition-colors hover:bg-surface2"
                  style={{
                    borderColor: period === value ? "var(--color-brand)" : "var(--color-border-strong)",
                    color: period === value ? "var(--color-brand-700)" : "var(--color-text-primary)",
                    backgroundColor: period === value ? "var(--color-brand-muted)" : "transparent"
                  }}
                  onClick={() => setPeriod(value)}
                  type="button"
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <div className="dashboard-panel p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
              {copy.analytics.topLessons}
            </p>
            <div className="mt-5 space-y-3">
              {analyticsQuery.isLoading ? (
                Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-[24px]" />)
              ) : topLessons.length === 0 ? (
                <EmptyState
                  description={copy.analytics.noTopDesc}
                    eyebrow={isAr ? "رؤى التعلم" : "Learning insights"}
                  icon="LI"
                  title={copy.analytics.noTopTitle}
                />
              ) : (
                topLessons.map((lesson) => (
                  <div key={lesson.lessonId} className="dashboard-panel p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold" style={{ color: "var(--color-text-primary)" }}>
                          {lesson.titleEn}
                        </h3>
                        <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                          {lesson.titleAr}
                        </p>
                      </div>
                      <div className={isAr ? "text-left" : "text-right"}>
                        <p className="text-xl font-black tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                          {Math.round(lesson.completionRate)}%
                        </p>
                        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                          {copy.analytics.completion}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                      {copy.analytics.avgWatch}: {formatSeconds(lesson.averageWatchTimeSeconds, locale)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="dashboard-panel p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
              {copy.analytics.dropOff}
            </p>
            <div className="mt-5 space-y-3">
              {analyticsQuery.isLoading ? (
                Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-[24px]" />)
              ) : dropOffLessons.length === 0 ? (
                <EmptyState
                  description={copy.analytics.noDropDesc}
                    eyebrow={isAr ? "مخاطر التعلم" : "Learning risks"}
                  icon="DR"
                  title={copy.analytics.noDropTitle}
                />
              ) : (
                dropOffLessons.map((lesson) => (
                  <div key={lesson.lessonId} className="dashboard-panel p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold" style={{ color: "var(--color-text-primary)" }}>
                          {lesson.titleEn}
                        </h3>
                        <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                          {lesson.titleAr}
                        </p>
                      </div>
                      <div className={isAr ? "text-left" : "text-right"}>
                        <p className="text-xl font-black tracking-tight" style={{ color: "rgb(185,28,28)" }}>
                          {Math.round(lesson.dropOffRate)}%
                        </p>
                        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                          {copy.analytics.dropOff}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                      {copy.analytics.avgExit}: {formatSeconds(lesson.averageExitPositionSeconds, locale)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="dashboard-panel p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                {copy.analytics.paymentReview}
              </p>
              <h2 className="mt-2 text-xl font-black tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                {copy.analytics.paymentTitle}
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["", "PENDING", "COMPLETED", "FAILED", "REFUNDED"] as const).map((value) => (
                <button
                  key={value || "ALL"}
                  className="rounded-lg border px-3 py-2 text-sm font-semibold transition-colors hover:bg-surface2"
                  style={{
                    borderColor: statusFilter === value ? "var(--color-brand)" : "var(--color-border-strong)",
                    color: statusFilter === value ? "var(--color-brand-700)" : "var(--color-text-primary)",
                    backgroundColor: statusFilter === value ? "var(--color-brand-muted)" : "transparent"
                  }}
                  onClick={() => setStatusFilter(value)}
                  type="button"
                >
                  {value ? (isAr ? t(`orders.status.${String(value).toLowerCase()}`) : value) : copy.common.all}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-3">
              {paymentsQuery.isLoading ? (
                Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-[28px]" />)
              ) : payments.length === 0 ? (
                <EmptyState
                  description={copy.analytics.noPaymentsDesc}
                  eyebrow={isAr ? "المدفوعات" : "Payments"}
                  icon="PY"
                  title={copy.analytics.noPaymentsTitle}
                />
              ) : (
                payments.map((payment) => {
                  const tone = statusTone(payment.status);

                  return (
                    <button
                      key={payment.id}
                      className="dashboard-panel w-full p-5 text-start transition-all hover:-translate-y-0.5"
                      style={{
                        borderColor:
                          selectedPaymentId === payment.id ? "color-mix(in oklab, var(--color-brand) 55%, white)" : undefined,
                        boxShadow:
                          selectedPaymentId === payment.id ? "0 24px 70px rgba(239, 68, 68, 0.14)" : undefined
                      }}
                      onClick={() => setSelectedPaymentId(payment.id)}
                      type="button"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                              style={{ backgroundColor: tone.bg, color: tone.color }}
                            >
                              {isAr ? t(`orders.status.${String(payment.status ?? "").toLowerCase()}`) : payment.status}
                            </span>
                            {payment.couponCode ? (
                              <span
                                className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                                style={{ backgroundColor: "var(--color-surface-2)", color: "var(--color-text-muted)" }}
                              >
                                {copy.common.coupon} {payment.couponCode}
                              </span>
                            ) : null}
                          </div>
                          <div>
                            <h3 className="text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>
                              {payment.student.fullName}
                            </h3>
                            <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                              {payment.student.email}
                            </p>
                          </div>
                        </div>
                        <div className={isAr ? "text-start lg:text-left" : "text-start lg:text-right"}>
                          <p className="text-2xl font-black tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                            {formatNumber(payment.amountEgp, locale)} {copy.common.egp}
                          </p>
                          <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
                            {formatDate(payment.createdAt, locale)}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="space-y-4">
              {selectedPayment ? (
                <div className="dashboard-panel p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                    {copy.analytics.selectedPayment}
                  </p>
                  <div className="mt-3 space-y-4">
                    <div>
                      <h3 className="text-xl font-black tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                        {selectedPayment.student.fullName}
                      </h3>
                      <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                        {selectedPayment.student.email}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        { label: copy.common.amount, value: `${formatNumber(selectedPayment.amountEgp, locale)} ${copy.common.egp}` },
                        { label: copy.analytics.discount, value: `${formatNumber(selectedPayment.discountEgp, locale)} ${copy.common.egp}` },
                        { label: copy.common.coupon, value: selectedPayment.couponCode ?? copy.analytics.none },
                        { label: copy.analytics.transaction, value: selectedPayment.paymobTransactionId ?? copy.analytics.notAvailable }
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="rounded-2xl border p-3"
                          style={{ borderColor: "var(--color-border-strong)", backgroundColor: "var(--color-surface-2)" }}
                        >
                          <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                            {item.label}
                          </p>
                          <p className="mt-2 break-all text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                            {item.value}
                          </p>
                        </div>
                      ))}
                    </div>

                    {selectedPayment.status === "PENDING" ? (
                      <button
                        className="w-full rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-all hover:opacity-95 disabled:opacity-60"
                        style={{ background: "var(--gradient-brand)" }}
                        disabled={markPaidMutation.isPending}
                        onClick={() => void markPaidMutation.mutateAsync(selectedPayment.id)}
                        type="button"
                      >
                        {copy.common.markPaid}
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <EmptyState
                  description={copy.analytics.pickPaymentDesc}
                  eyebrow={isAr ? "تفاصيل الدفع" : "Payment details"}
                  icon="PD"
                  title={copy.analytics.pickPaymentTitle}
                />
              )}
            </div>
          </div>
        </div>
      </section>
    </AdminShell>
  );
};
