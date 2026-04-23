import { useMemo, useState } from "react";
import { AxiosError } from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { AdminShell } from "@/components/layout/AdminShell";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdminUiCopy } from "@/lib/admin-ui-copy";
import { api } from "@/lib/api";
import { formatDate, formatNumber, resolveLocale } from "@/lib/locale";

type Payment = {
  id: string;
  amountPiasters: number;
  status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED" | string;
  createdAt: string;
  user: { fullName: string; email: string };
};

const formatMoney = (amountPiasters: number, locale: "en" | "ar") =>
  formatNumber(amountPiasters / 100, locale);

const formatStatusTone = (status: Payment["status"]) => {
  if (status === "COMPLETED") return "default" as const;
  return "outline" as const;
};

export const AdminOrders = () => {
  const { t, i18n } = useTranslation();
  const locale = resolveLocale(i18n.language);
  const copy = getAdminUiCopy(locale);
  const isAr = locale === "ar";
  const queryClient = useQueryClient();
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "COMPLETED" | "FAILED">("ALL");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => api.get<{ payments: Payment[]; total: number }>("/admin/orders").then((response) => response.data)
  });

  const payments = useMemo(() => data?.payments ?? [], [data?.payments]);
  const filteredPayments = useMemo(
    () => payments.filter((payment) => statusFilter === "ALL" || payment.status === statusFilter),
    [payments, statusFilter]
  );

  const markPaidMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/orders/${id}/mark-paid`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success(isAr ? "تم تأكيد الطلب كمدفوع." : "Order marked as paid.");
      setSelectedPayment(null);
    },
    onError: (error: unknown) => {
      const apiError = error as AxiosError<{ message?: string; error?: string }>;
      toast.error(
        apiError.response?.data?.message ??
          apiError.response?.data?.error ??
          (isAr ? "تعذر تأكيد الطلب كمدفوع." : "Failed to mark the order as paid.")
      );
    }
  });

  const exportCsv = async () => {
    const response = await api.get("/admin/orders/export-csv", { responseType: "blob" });
    const url = URL.createObjectURL(response.data as Blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "orders.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const pendingCount = payments.filter((payment) => payment.status === "PENDING").length;
  const failedCount = payments.filter((payment) => payment.status === "FAILED").length;
  const revenueTotal = payments
    .filter((payment) => payment.status === "COMPLETED")
    .reduce((sum, payment) => sum + payment.amountPiasters, 0);

  return (
    <AdminShell title={t("admin.orders.title")} description={t("admin.orders.desc")}>
      <section className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: copy.orders.totalOrders, value: payments.length, note: copy.orders.totalOrdersNote },
            { label: copy.orders.pendingReview, value: pendingCount, note: copy.orders.pendingReviewNote },
            { label: copy.common.failed, value: failedCount, note: copy.orders.failedNote },
            { label: copy.orders.capturedRevenue, value: `${formatMoney(revenueTotal, locale)} ${copy.common.egp}`, note: copy.orders.capturedRevenueNote }
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
                {copy.orders.revenueOps}
              </p>
              <h2 className="text-2xl font-black tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                {copy.orders.title}
              </h2>
              <p className="max-w-3xl text-sm leading-7" style={{ color: "var(--color-text-secondary)" }}>
                {copy.orders.desc}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {(["ALL", "PENDING", "COMPLETED", "FAILED"] as const).map((filter) => (
                <button
                  key={filter}
                  className="rounded-lg border px-3 py-2 text-sm font-semibold transition-colors hover:bg-surface2"
                  style={{
                    borderColor: statusFilter === filter ? "var(--color-brand)" : "var(--color-border-strong)",
                    color: statusFilter === filter ? "var(--color-brand-700)" : "var(--color-text-primary)",
                    backgroundColor: statusFilter === filter ? "var(--color-brand-muted)" : "transparent"
                  }}
                  onClick={() => setStatusFilter(filter)}
                  type="button"
                >
                  {filter === "ALL"
                    ? copy.orders.allOrders
                    : isAr
                      ? t(`orders.status.${String(filter).toLowerCase()}`)
                      : filter}
                </button>
              ))}
              <button
                className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-surface2"
                style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-secondary)" }}
                onClick={() => void exportCsv()}
                type="button"
              >
                {copy.orders.exportCsv}
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_360px]">
          <div className="space-y-3">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-[28px]" />)
            ) : filteredPayments.length === 0 ? (
                <EmptyState
                  description={copy.orders.emptyDesc}
                  eyebrow={isAr ? "طلبات الإدارة" : "Admin orders"}
                  icon="OR"
                  title={copy.orders.emptyTitle}
                />
            ) : (
              filteredPayments.map((payment) => (
                <button
                  key={payment.id}
                  className="dashboard-panel w-full p-5 text-start transition-all hover:-translate-y-0.5"
                  style={{
                    borderColor:
                      selectedPayment?.id === payment.id ? "color-mix(in oklab, var(--color-brand) 55%, white)" : undefined,
                    boxShadow:
                      selectedPayment?.id === payment.id ? "0 24px 70px rgba(239, 68, 68, 0.14)" : undefined
                  }}
                  onClick={() => setSelectedPayment(payment)}
                  type="button"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={formatStatusTone(payment.status)}>
                          {isAr ? t(`orders.status.${String(payment.status ?? "").toLowerCase()}`) : payment.status}
                        </Badge>
                        <span
                          className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                          style={{ backgroundColor: "var(--color-surface-2)", color: "var(--color-text-muted)" }}
                        >
                          {new Date(payment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>
                          {payment.user.fullName}
                        </h3>
                        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                          {payment.user.email}
                        </p>
                      </div>
                    </div>

                    <div className={isAr ? "text-start lg:text-left" : "text-start lg:text-right"}>
                      <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                        {copy.common.amount}
                      </p>
                      <p className="mt-2 text-2xl font-black tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                        {formatMoney(payment.amountPiasters, locale)} {copy.common.egp}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="space-y-4">
            {selectedPayment ? (
              <div className="dashboard-panel p-5">
                <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                  {copy.orders.selectedOrder}
                </p>
                <div className="mt-3 space-y-4">
                  <div>
                    <h3 className="text-xl font-black tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                      {selectedPayment.user.fullName}
                    </h3>
                    <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                      {selectedPayment.user.email}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      { label: copy.common.status, value: isAr ? t(`orders.status.${String(selectedPayment.status ?? "").toLowerCase()}`) : selectedPayment.status },
                      { label: copy.common.amount, value: `${formatMoney(selectedPayment.amountPiasters, locale)} ${copy.common.egp}` },
                      { label: copy.orders.date, value: formatDate(selectedPayment.createdAt, locale, { dateStyle: "medium", timeStyle: "short" }) },
                      { label: copy.orders.orderId, value: selectedPayment.id }
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

                  <div
                    className="rounded-2xl border p-4"
                    style={{ borderColor: "var(--color-border-strong)", backgroundColor: "var(--color-surface-2)" }}
                  >
                    <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                      {copy.orders.recommended}
                    </p>
                    <p className="mt-2 text-sm leading-6" style={{ color: "var(--color-text-secondary)" }}>
                      {copy.orders.recommendedDesc}
                    </p>
                  </div>

                  {selectedPayment.status !== "COMPLETED" ? (
                    <button
                      className="w-full rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-all hover:opacity-95 disabled:opacity-60"
                      style={{ background: "var(--gradient-brand)" }}
                      disabled={markPaidMutation.isPending}
                      onClick={() => void markPaidMutation.mutateAsync(selectedPayment.id)}
                      type="button"
                    >
                      {markPaidMutation.isPending ? copy.common.updating : t("actions.markPaid")}
                    </button>
                  ) : null}
                </div>
              </div>
            ) : (
                <EmptyState
                  description={copy.orders.pickDesc}
                  eyebrow={isAr ? "تفاصيل الطلب" : "Order details"}
                  icon="OD"
                  title={copy.orders.pickTitle}
                />
            )}
          </div>
        </div>
      </section>
    </AdminShell>
  );
};
