import { useState, useMemo } from "react";
import { Download, Search, Filter } from "lucide-react";
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

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch payment history
  const { data, isLoading, error } = useQuery({
    queryKey: ["payment-history"],
    queryFn: async () => {
      const response = await api.get<{ orders: Payment[] }>("/student/orders");
      return response.data.orders;
    }
  });

  // Filter and sort payments
  const filteredPayments = useMemo(() => {
    if (!data) return [];

    let filtered = data;

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }

    // Filter by search term (order ID)
    if (searchTerm) {
      filtered = filtered.filter((p) =>
        String(p.id ?? "").toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortBy === "newest" ? dateB - dateA : dateA - dateB;
    });

    return sorted;
  }, [data, statusFilter, searchTerm, sortBy]);

  // Pagination
  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPayments.slice(start, start + itemsPerPage);
  }, [filteredPayments, currentPage]);

  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            ✓ {t("paymentHistory.statusCompleted")}
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            ⏳ {t("paymentHistory.statusPending")}
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            ✕ {t("paymentHistory.statusFailed")}
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
            ⊘ {t("paymentHistory.statusCancelled")}
          </span>
        );
      default:
        return <span className="text-xs">{status}</span>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(resolvedLocale === "ar" ? "ar-EG" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className="dashboard-page min-h-dvh px-4 py-10 sm:px-6" style={{ backgroundColor: "var(--color-page)" }}>
      <SEO page={SEO_PAGES.paymentHistory} />
      <div className="app-shell app-shell--compact">
        <PageHeader
          title={t("paymentHistory.title")}
          description={t("paymentHistory.description")}
        />

        {/* Filters & Search */}
        <div className="dashboard-panel p-6 mb-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Search */}
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder={t("paymentHistory.searchByOrderId")}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border outline-none transition-all focus:ring-2 focus:ring-brand-600/30"
                style={{
                  backgroundColor: "var(--color-surface-2)",
                  borderColor: "var(--color-border-strong)",
                  color: "var(--color-text-primary)"
                }}
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border outline-none transition-all focus:ring-2 focus:ring-brand-600/30"
                style={{
                  backgroundColor: "var(--color-surface-2)",
                  borderColor: "var(--color-border-strong)",
                  color: "var(--color-text-primary)"
                }}
              >
                <option value="all">{t("paymentHistory.filterAll")}</option>
                <option value="COMPLETED">{t("paymentHistory.statusCompleted")}</option>
                <option value="PENDING">{t("paymentHistory.statusPending")}</option>
                <option value="FAILED">{t("paymentHistory.statusFailed")}</option>
                <option value="CANCELLED">{t("paymentHistory.statusCancelled")}</option>
              </select>
            </div>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              {t("paymentHistory.sortBy")}
            </span>
            <button
              onClick={() => {
                setSortBy("newest");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${
                sortBy === "newest"
                  ? "bg-brand-600 text-white"
                  : "border hover:bg-gray-100 dark:hover:bg-gray-900"
              }`}
              style={
                sortBy === "newest"
                  ? {}
                  : {
                      borderColor: "var(--color-border)",
                      color: "var(--color-text-secondary)"
                    }
              }
            >
              {t("paymentHistory.newest")}
            </button>
            <button
              onClick={() => {
                setSortBy("oldest");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${
                sortBy === "oldest"
                  ? "bg-brand-600 text-white"
                  : "border hover:bg-gray-100 dark:hover:bg-gray-900"
              }`}
              style={
                sortBy === "oldest"
                  ? {}
                  : {
                      borderColor: "var(--color-border)",
                      color: "var(--color-text-secondary)"
                    }
              }
            >
              {t("paymentHistory.oldest")}
            </button>
          </div>
        </div>

        {/* Payments Table */}
        <div className="dashboard-panel overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500" />
              <p className="mt-4" style={{ color: "var(--color-text-secondary)" }}>
                {t("paymentHistory.loading")}
              </p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-red-600">{t("paymentHistory.error")}</p>
            </div>
          ) : paginatedPayments.length === 0 ? (
            <div className="p-8 text-center">
              <p style={{ color: "var(--color-text-secondary)" }}>
                {t("paymentHistory.noPayments")}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                        {t("paymentHistory.orderId")}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                        {t("paymentHistory.amount")}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                        {t("paymentHistory.status")}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                        {t("paymentHistory.date")}
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                        {t("paymentHistory.action")}
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
                        <td className="px-6 py-4 font-mono text-sm" style={{ color: "var(--color-text-primary)" }}>
                          {payment.id}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                          {payment.amountEgp.toFixed(2)} {payment.currency}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {getStatusBadge(payment.status)}
                        </td>
                        <td className="px-6 py-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                          {formatDate(payment.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => {
                              const element = document.createElement("a");
                              element.setAttribute(
                                "href",
                                `data:text/plain,Order: ${payment.id}%0AAmount: ${payment.amountEgp}%0AStatus: ${payment.status}%0ADate: ${payment.createdAt}`
                              );
                              element.setAttribute("download", `receipt-${payment.id}.txt`);
                              document.body.appendChild(element);
                              element.click();
                              document.body.removeChild(element);
                            }}
                            className="text-brand-600 hover:text-brand-700 transition-colors inline-flex items-center gap-1"
                            title={t("paymentHistory.downloadReceipt")}
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t flex items-center justify-between" style={{ borderColor: "var(--color-border)" }}>
                  <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                    {t("paymentHistory.pageInfo", {
                      page: currentPage,
                      total: totalPages,
                      count: filteredPayments.length
                    })}
                  </p>
                  <div className="flex gap-2">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                      className="px-3 py-1.5 text-sm rounded border disabled:opacity-50"
                      style={{ borderColor: "var(--color-border)" }}
                    >
                      {t("paymentHistory.previous")}
                    </button>
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                      className="px-3 py-1.5 text-sm rounded border disabled:opacity-50"
                      style={{ borderColor: "var(--color-border)" }}
                    >
                      {t("paymentHistory.next")}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Help Section */}
        <div className="mt-8 text-center">
          <p className="text-sm mb-2" style={{ color: "var(--color-text-secondary)" }}>
            {t("paymentHistory.needHelp")}
          </p>
          <a
            href="mailto:support@eduflow.com"
            className="text-sm font-medium text-brand-600 no-underline hover:underline"
          >
            {t("paymentHistory.supportEmail")}
          </a>
        </div>
      </div>
    </div>
  );
};
