import { useQuery } from "@tanstack/react-query";
import { ReceiptText } from "lucide-react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { StudentShell } from "@/components/layout/StudentShell";
import { api } from "@/lib/api";
import { formatDate, formatNumber, resolveLocale } from "@/lib/locale";

type Order = { id: string; amountEgp: number; currency: string; status: string; createdAt: string };

const statusVariant = (s: string): "default" | "outline" | "secondary" | "destructive" => {
  if (s === "COMPLETED") return "default";
  if (s === "FAILED") return "destructive";
  return "outline";
};

export const StudentOrders = () => {
  const { locale } = useParams();
  const currentLocale = resolveLocale(locale);
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ["student-orders"],
    queryFn: () => api.get<{ orders: Order[] }>("/student/orders").then((r) => r.data)
  });

  const orders = data?.orders ?? [];

  return (
    <StudentShell>
      <>
        <header className="dashboard-panel dashboard-hero dashboard-panel--strong p-6">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-brand-600">
            <ReceiptText className="h-3.5 w-3.5" />
            {t("student.shell.section")}
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
            {t("student.orders.title")}
          </h1>
        </header>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            illustration={<ReceiptText className="mx-auto h-10 w-10 text-brand-600" />}
            title={t("student.orders.empty")}
            description={t("student.orders.emptyDesc")}
          />
        ) : (
          <div className="dashboard-panel overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
                  {[t("student.orders.date"), t("student.orders.amount"), t("student.orders.status")].map((heading) => (
                    <th key={heading} className="px-5 py-3 text-start text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((order, i) => (
                  <tr key={order.id} className={i < orders.length - 1 ? "border-b" : ""} style={{ borderColor: "var(--color-border)" }}>
                    <td className="px-5 py-3.5" style={{ color: "var(--color-text-secondary)" }}>
                      {formatDate(order.createdAt, currentLocale)}
                    </td>
                    <td className="px-5 py-3.5 font-semibold" style={{ color: "var(--color-text-primary)" }}>
                      {formatNumber(order.amountEgp, currentLocale)} {t("common.currency.egp")}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={statusVariant(order.status)}>{t(`payments.${order.status.toLowerCase()}`) || order.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </>
    </StudentShell>
  );
};
