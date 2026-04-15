import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";
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

        <header
          className="rounded-2xl border p-6 shadow-card"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <p className="text-xs font-bold uppercase tracking-widest text-brand-600">{t("student.shell.section")}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
            {t("student.orders.title")}
          </h1>
        </header>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : orders.length === 0 ? (
          <EmptyState icon="🧾" title={t("student.orders.empty")} description={t("student.orders.emptyDesc")} />
        ) : (
          <div
            className="rounded-2xl border shadow-card overflow-hidden"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
                  {[t("student.orders.date"), t("student.orders.amount"), t("student.orders.status")].map((h) => (
                    <th key={h} className="px-5 py-3 text-start text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>{h}</th>
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
