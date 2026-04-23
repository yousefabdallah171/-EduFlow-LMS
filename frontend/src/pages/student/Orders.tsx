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
  const isAr = currentLocale === "ar";

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
          eyebrow={t("student.shell.section")}
          title={t("student.orders.title")}
          description={
            isAr
              ? "راجع حالة مدفوعاتك بوضوح واعرف متى تم إنشاء كل طلب وما إذا كان مكتملًا أو يحتاج متابعة."
              : "Review your payment history clearly so you always know when each order was created and whether it completed successfully."
          }
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="dashboard-panel dashboard-panel--accent p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">{isAr ? "إجمالي الطلبات" : "Total orders"}</p>
            <p className="mt-2 font-display text-3xl font-bold" style={{ color: "var(--color-text-primary)" }}>{orders.length}</p>
          </div>
          <div className="dashboard-panel p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>{isAr ? "الطلبات المكتملة" : "Completed orders"}</p>
            <p className="mt-2 font-display text-3xl font-bold" style={{ color: "var(--color-text-primary)" }}>{completedOrders}</p>
          </div>
          <div className="dashboard-panel p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>{isAr ? "الثقة والدعم" : "Trust and support"}</p>
            <p className="mt-2 text-sm leading-6" style={{ color: "var(--color-text-secondary)" }}>
              {isAr ? "إذا واجهت مشكلة في الدفع أو تفعيل الوصول، استخدم صفحة المساعدة للتواصل بسرعة." : "If anything looks wrong with payment or activation, use the Help page to get support quickly."}
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
            eyebrow={isAr ? "سجل المدفوعات" : "Payment history"}
            title={t("student.orders.empty")}
            description={t("student.orders.emptyDesc")}
          />
        ) : (
          <div className="dashboard-panel overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b px-5 py-4" style={{ borderColor: "var(--color-border)" }}>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">
                  {isAr ? "المدفوعات الأخيرة" : "Recent payments"}
                </p>
                <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  {isAr ? "كل صف يوضح التاريخ، المبلغ، والحالة الحالية للطلب." : "Each row shows the date, amount, and current payment state."}
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: "var(--color-brand-muted)", color: "var(--color-brand)" }}>
                <ShieldCheck className="h-3.5 w-3.5" />
                {isAr ? "سجل واضح وآمن" : "Clear trusted record"}
              </div>
            </div>

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
                    <td className="px-5 py-4" style={{ color: "var(--color-text-secondary)" }}>
                      {formatDate(order.createdAt, currentLocale)}
                    </td>
                    <td className="px-5 py-4 font-semibold" style={{ color: "var(--color-text-primary)" }}>
                      {formatNumber(order.amountEgp, currentLocale)} {t("common.currency.egp")}
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={statusVariant(order.status)} className="gap-1">
                        {order.status === "COMPLETED" ? <CircleCheckBig className="h-3.5 w-3.5" /> : null}
                        {t(`payments.${order.status.toLowerCase()}`) || order.status}
                      </Badge>
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
