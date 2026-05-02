import { useQuery } from "@tanstack/react-query";
import { CircleCheckBig, ReceiptText, ShieldCheck } from "lucide-react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { StudentShell } from "@/components/layout/StudentShell";
import { api } from "@/lib/api";
import { formatDate, formatNumber, resolveLocale } from "@/lib/locale";
import { cn } from "@/lib/utils";

type Order = { id: string; amountEgp: number; currency: string; status: string; createdAt: string };

const statusVariant = (s: string): "default" | "outline" | "secondary" | "destructive" => {
  if (s === "COMPLETED") return "default";
  if (s === "FAILED") return "destructive";
  return "outline";
};

export const StudentOrders = () => {
  const { t, i18n } = useTranslation();
  const { locale } = useParams();
  const resolvedLocale = resolveLocale(i18n.language);
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";
  const isAr = resolvedLocale === "ar";

  const { data, isLoading } = useQuery({
    queryKey: ["student-orders"],
    queryFn: () => api.get<{ orders: Order[] }>("/student/orders").then((r) => r.data)
  });

  const orders = data?.orders ?? [];
  const completedOrders = orders.filter((order) => order.status === "COMPLETED").length;

  return (
    <StudentShell>
      <>
        <PageHeader
          hero
          backHref={`${prefix}/dashboard`}
          backLabel={t("nav.dashboard")}
          eyebrow={t("student.shell.section")}
          title={t("student.orders.title")}
          description={t("student.orders.description")}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="dashboard-panel dashboard-panel--accent p-5">
            <p className={cn("text-xs font-bold tracking-[0.16em] text-brand-600", !isAr && "uppercase")}>{t("student.orders.metrics.totalOrders")}</p>
            <p className="mt-2 font-display text-3xl font-bold" style={{ color: "var(--color-text-primary)" }}>{formatNumber(orders.length, resolvedLocale)}</p>
          </div>
          <div className="dashboard-panel p-5">
            <p className={cn("text-xs font-bold tracking-[0.16em]", !isAr && "uppercase")} style={{ color: "var(--color-text-muted)" }}>{t("student.orders.metrics.completedOrders")}</p>
            <p className="mt-2 font-display text-3xl font-bold" style={{ color: "var(--color-text-primary)" }}>{formatNumber(completedOrders, resolvedLocale)}</p>
          </div>
          <div className="dashboard-panel p-5">
            <p className={cn("text-xs font-bold tracking-[0.16em]", !isAr && "uppercase")} style={{ color: "var(--color-text-muted)" }}>{t("student.orders.metrics.trustSupport")}</p>
            <p className="mt-2 text-sm leading-6" style={{ color: "var(--color-text-secondary)" }}>
              {t("student.orders.metrics.trustSupportBody")}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            illustration={<ReceiptText className="mx-auto h-10 w-10 text-brand-600" />}
            eyebrow={t("student.orders.emptyEyebrow")}
            title={t("student.orders.empty")}
            description={t("student.orders.emptyDesc")}
          />
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {orders.map((order) => (
                <div key={order.id} className="dashboard-panel p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
                        {t("student.orders.date")}
                      </p>
                      <p className="mt-1 text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                        {formatDate(order.createdAt, resolvedLocale)}
                      </p>
                    </div>
                    <Badge variant={statusVariant(order.status)} className="gap-1">
                      {order.status === "COMPLETED" ? <CircleCheckBig className="h-3.5 w-3.5" /> : null}
                      {t(`payments.${String(order.status ?? "").toLowerCase()}`) || order.status}
                    </Badge>
                  </div>
                  <div className="mt-4 rounded-[20px] border px-4 py-3" style={{ borderColor: "var(--color-border)", backgroundColor: "color-mix(in oklab, var(--color-surface-2) 72%, transparent)" }}>
                    <p className="text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
                      {t("student.orders.amount")}
                    </p>
                    <p className="mt-1 text-base font-bold" style={{ color: "var(--color-text-primary)" }} dir="ltr">
                      {formatNumber(order.amountEgp, resolvedLocale)} {t("common.currency.egp")}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="dashboard-panel hidden overflow-x-auto md:block">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b px-5 py-4" style={{ borderColor: "var(--color-border)" }}>
              <div>
                <p className={cn("text-xs font-bold tracking-[0.16em] text-brand-600", !isAr && "uppercase")}>
                  {t("student.orders.table.title")}
                </p>
                <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  {t("student.orders.table.description")}
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: "var(--color-brand-muted)", color: "var(--color-brand)" }}>
                <ShieldCheck className="h-3.5 w-3.5" />
                {t("student.orders.table.badge")}
              </div>
            </div>

            <table className="min-w-[38rem] w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
                  {[t("student.orders.date"), t("student.orders.amount"), t("student.orders.status")].map((heading) => (
                    <th key={heading} className={cn("px-5 py-3 text-start text-xs font-bold tracking-[0.16em]", !isAr && "uppercase")} style={{ color: "var(--color-text-muted)" }}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((order, i) => (
                  <tr key={order.id} className={i < orders.length - 1 ? "border-b" : ""} style={{ borderColor: "var(--color-border)" }}>
                    <td className="px-5 py-4" style={{ color: "var(--color-text-secondary)" }}>
                      {formatDate(order.createdAt, resolvedLocale)}
                    </td>
                    <td className="px-5 py-4 font-semibold" style={{ color: "var(--color-text-primary)" }} dir="ltr">
                      {formatNumber(order.amountEgp, resolvedLocale)} {t("common.currency.egp")}
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={statusVariant(order.status)} className="gap-1">
                        {order.status === "COMPLETED" ? <CircleCheckBig className="h-3.5 w-3.5" /> : null}
                        {t(`payments.${String(order.status ?? "").toLowerCase()}`) || order.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
      </>
    </StudentShell>
  );
};
