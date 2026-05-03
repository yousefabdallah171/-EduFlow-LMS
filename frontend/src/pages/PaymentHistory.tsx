import { useState, useMemo } from "react";
import { Download, Search, Filter, AlertCircle, ReceiptText } from "lucide-react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { resolveLocale } from "@/lib/locale";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { SEO } from "@/components/shared/SEO";
import { SEO_PAGES } from "@/lib/seo-config";

interface Payment {
  id: string;
  amountEgp: number;
  currency: string;
  status: "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED";
  createdAt: string;
}

export const PaymentHistory = () => {
  const { locale } = useParams();
  const { t, i18n } = useTranslation();
  const resolvedLocale = locale === "en" || locale === "ar" ? locale : resolveLocale(i18n.language);
  const intlLocale = resolvedLocale === "ar" ? "ar-EG" : "en-US";

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["payment-history"],
    queryFn: async () => {
      const response = await api.get<{ orders: Payment[] }>("/student/orders");
      return response.data.orders;
    }
  });

  const filteredPayments = useMemo(() => {
    if (!data) return [];

    let filtered = data;

    if (statusFilter !== "all") {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter((p) =>
        String(p.id ?? "").toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return [...filtered].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortBy === "newest" ? dateB - dateA : dateA - dateB;
    });
  }, [data, statusFilter, searchTerm, sortBy]);

  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPayments.slice(start, start + itemsPerPage);
  }, [filteredPayments, currentPage]);

  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);

  const formatAmount = (amount: number, currency: string) =>
    `${new Intl.NumberFormat(intlLocale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)} ${currency}`;

  const formatDate = (dateString: string) =>
    new Intl.DateTimeFormat(intlLocale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(dateString));

  const statusLabel = (status: Payment["status"]) =>
    ({
      COMPLETED: t("student.paymentHistory.statusCompleted"),
      PENDING: t("student.paymentHistory.statusPending"),
      FAILED: t("student.paymentHistory.statusFailed"),
      CANCELLED: t("student.paymentHistory.statusCancelled")
    })[status] ?? status;

  const getStatusBadge = (status: Payment["status"]) => {
    const base = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    switch (status) {
      case "COMPLETED":
        return (
          <span className={`${base} bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400`}>
            ✓ {t("student.paymentHistory.statusCompleted")}
          </span>
        );
      case "PENDING":
        return (
          <span className={`${base} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400`}>
            ⏳ {t("student.paymentHistory.statusPending")}
          </span>
        );
      case "FAILED":
        return (
          <span className={`${base} bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400`}>
            ✕ {t("student.paymentHistory.statusFailed")}
          </span>
        );
      case "CANCELLED":
        return (
          <span className={`${base} bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400`}>
            ⊘ {t("student.paymentHistory.statusCancelled")}
          </span>
        );
      default:
        return <span className="text-xs">{status}</span>;
    }
  };

  const downloadReceipt = (payment: Payment) => {
    const lines = [
      `${t("student.paymentHistory.receiptOrder")}: ${payment.id}`,
      `${t("student.paymentHistory.receiptAmount")}: ${formatAmount(payment.amountEgp, payment.currency)}`,
      `${t("student.paymentHistory.receiptStatus")}: ${statusLabel(payment.status)}`,
      `${t("student.paymentHistory.receiptDate")}: ${formatDate(payment.createdAt)}`
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `receipt-${payment.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const isFiltered = searchTerm || statusFilter !== "all";

  return (
    <div className="dashboard-page min-h-dvh px-4 py-10 sm:px-6" style={{ backgroundColor: "var(--color-page)" }}>
      <SEO page={SEO_PAGES.paymentHistory} />
      <div className="app-shell app-shell--compact">
        <PageHeader
          title={t("student.paymentHistory.title")}
          description={t("student.paymentHistory.description")}
        />

        {/* Filters & Search */}
        <div className="dashboard-panel p-6 mb-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Search */}
            <div className="relative sm:col-span-2">
              <Search className="absolute start-3 top-3 h-5 w-5 text-gray-400" aria-hidden="true" />
              <input
                type="text"
                placeholder={t("student.paymentHistory.searchByOrderId")}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-lg border py-2.5 ps-10 pe-4 outline-none transition-all focus:ring-2 focus:ring-brand-600/30"
                style={{
                  backgroundColor: "var(--color-surface-2)",
                  borderColor: "var(--color-border-strong)",
                  color: "var(--color-text-primary)"
                }}
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter className="absolute start-3 top-3 h-5 w-5 text-gray-400" aria-hidden="true" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-lg border py-2.5 ps-10 pe-4 outline-none transition-all focus:ring-2 focus:ring-brand-600/30"
                style={{
                  backgroundColor: "var(--color-surface-2)",
                  borderColor: "var(--color-border-strong)",
                  color: "var(--color-text-primary)"
                }}
              >
                <option value="all">{t("student.paymentHistory.filterAll")}</option>
                <option value="COMPLETED">{t("student.paymentHistory.statusCompleted")}</option>
                <option value="PENDING">{t("student.paymentHistory.statusPending")}</option>
                <option value="FAILED">{t("student.paymentHistory.statusFailed")}</option>
                <option value="CANCELLED">{t("student.paymentHistory.statusCancelled")}</option>
              </select>
            </div>
          </div>

          {/* Sort */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              {t("student.paymentHistory.sortBy")}
            </span>
            {(["newest", "oldest"] as const).map((option) => (
              <button
                key={option}
                onClick={() => {
                  setSortBy(option);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 text-sm rounded transition-colors ${
                  sortBy === option
                    ? "bg-brand-600 text-white"
                    : "border hover:bg-gray-100 dark:hover:bg-gray-900"
                }`}
                style={
                  sortBy === option
                    ? {}
                    : {
                        borderColor: "var(--color-border)",
                        color: "var(--color-text-secondary)"
                      }
                }
              >
                {t(`student.paymentHistory.${option}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Payments Table */}
        <div className="dashboard-panel overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center">
              <div
                className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-200"
                style={{ borderTopColor: "var(--color-brand)" }}
                aria-hidden="true"
              />
              <p className="mt-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                {t("student.paymentHistory.loading")}
              </p>
            </div>
          ) : error ? (
            <div className="p-12 text-center space-y-3">
              <AlertCircle
                className="mx-auto h-8 w-8"
                style={{ color: "var(--color-danger)" }}
                aria-hidden="true"
              />
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                {t("student.paymentHistory.error")}
              </p>
              <button
                onClick={() => refetch()}
                className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
              >
                {t("student.paymentHistory.errorRetry")}
              </button>
            </div>
          ) : paginatedPayments.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <ReceiptText
                className="mx-auto h-8 w-8 mb-2"
                style={{ color: "var(--color-text-muted)" }}
                aria-hidden="true"
              />
              <p className="font-medium" style={{ color: "var(--color-text-primary)" }}>
                {isFiltered
                  ? t("student.paymentHistory.noFilterResults")
                  : t("student.paymentHistory.noPayments")}
              </p>
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                {isFiltered
                  ? t("student.paymentHistory.noFilterResultsDesc")
                  : t("student.paymentHistory.noPaymentsDesc")}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                      <th className="px-6 py-4 text-start text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                        {t("student.paymentHistory.orderId")}
                      </th>
                      <th className="px-6 py-4 text-start text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                        {t("student.paymentHistory.amount")}
                      </th>
                      <th className="px-6 py-4 text-start text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                        {t("student.paymentHistory.status")}
                      </th>
                      <th className="px-6 py-4 text-start text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                        {t("student.paymentHistory.date")}
                      </th>
                      <th className="px-6 py-4 text-end text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                        {t("student.paymentHistory.action")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPayments.map((payment) => (
                      <tr
                        key={payment.id}
                        style={{ borderBottom: "1px solid var(--color-border)" }}
                        className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                      >
                        <td
                          className="px-6 py-4 font-mono text-sm max-w-[12rem] truncate"
                          style={{ color: "var(--color-text-primary)" }}
                          title={payment.id}
                        >
                          {payment.id}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold tabular-nums" style={{ color: "var(--color-text-primary)" }}>
                          {formatAmount(payment.amountEgp, payment.currency)}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {getStatusBadge(payment.status)}
                        </td>
                        <td className="px-6 py-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                          {formatDate(payment.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-end">
                          <button
                            onClick={() => downloadReceipt(payment)}
                            className="text-brand-600 hover:text-brand-700 transition-colors inline-flex items-center gap-1"
                            aria-label={t("student.paymentHistory.downloadReceipt")}
                          >
                            <Download className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t flex items-center justify-between gap-4" style={{ borderColor: "var(--color-border)" }}>
                  <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                    {t("student.paymentHistory.pageInfo", {
                      page: currentPage,
                      total: totalPages,
                      count: filteredPayments.length
                    })}
                  </p>
                  <div className="flex gap-2">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                      className="px-3 py-1.5 text-sm rounded border disabled:opacity-40 transition-colors hover:bg-gray-100 dark:hover:bg-gray-900"
                      style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
                    >
                      {t("student.paymentHistory.previous")}
                    </button>
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                      className="px-3 py-1.5 text-sm rounded border disabled:opacity-40 transition-colors hover:bg-gray-100 dark:hover:bg-gray-900"
                      style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
                    >
                      {t("student.paymentHistory.next")}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Help */}
        <div className="mt-8 text-center">
          <p className="text-sm mb-2" style={{ color: "var(--color-text-secondary)" }}>
            {t("student.paymentHistory.needHelp")}
          </p>
          <a
            href={`/${resolvedLocale}/help`}
            className="text-sm font-medium text-brand-600 no-underline hover:underline"
          >
            {t("student.paymentHistory.contactSupport")}
          </a>
        </div>
      </div>
    </div>
  );
};
