import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { AdminShell } from "@/components/layout/AdminShell";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { formatNumber, formatMinutesShort, resolveLocale } from "@/lib/locale";
import { cn } from "@/lib/utils";

type AnalyticsPayload = {
  period: string;
  kpis: {
    totalRevenue: { amountEgp: number; changePercent: number; currency: string };
    enrolledStudents: { total: number; active: number; revoked: number; newThisPeriod: number };
    courseCompletion: { averagePercent: number; fullyCompleted: number };
    videoEngagement: { averageWatchTimeSeconds: number; totalWatchTimeSeconds: number };
  };
  revenueTimeseries: Array<{ date: string; revenueEgp: number }>;
  enrollmentTimeseries: Array<{ date: string; newEnrollments: number }>;
};

const seriesMax = (values: number[]) => Math.max(1, ...values);

const KpiCard = ({ label, value, sub, accent = false }: { label: string; value: string; sub: string; accent?: boolean }) => (
  <div
    className={cn("p-5", accent ? "dashboard-panel dashboard-panel--accent dashboard-panel--strong" : "dashboard-panel")}
  >
    <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: accent ? "rgba(255,255,255,0.5)" : "var(--color-text-muted)" }}>
      {label}
    </p>
    <p className="mt-2 font-display text-3xl font-bold tabular-nums" style={{ color: accent ? "var(--color-text-invert)" : "var(--color-text-primary)" }}>
      {value}
    </p>
    <p className="mt-1.5 text-xs" style={{ color: accent ? "rgba(255,255,255,0.55)" : "var(--color-text-muted)" }}>
      {sub}
    </p>
  </div>
);

export const AdminDashboard = () => {
  const { i18n, t } = useTranslation();
  const locale = resolveLocale(i18n.language);
  const analyticsQuery = useQuery({
    queryKey: ["admin-dashboard", "30d"],
    queryFn: async () => {
      const response = await api.get<AnalyticsPayload>("/admin/analytics", { params: { period: "30d" } });
      return response.data;
    }
  });

  const revenueMax = seriesMax(analyticsQuery.data?.revenueTimeseries.map((e) => e.revenueEgp) ?? []);
  const enrollmentMax = seriesMax(analyticsQuery.data?.enrollmentTimeseries.map((e) => e.newEnrollments) ?? []);

  return (
    <AdminShell title={t("admin.dashboard.title")} description={t("admin.dashboard.desc")}>
      {analyticsQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-[24px]" />
          ))}
        </div>
      ) : analyticsQuery.data ? (
        <>
          {/* KPI cards */}
          <section className="dashboard-stat-grid dashboard-stat-grid--four">
            <KpiCard
              label={t("admin.dashboard.revenue")}
              value={`${formatNumber(analyticsQuery.data.kpis.totalRevenue.amountEgp, locale)} ${t("common.currency.egp")}`}
              sub={t("admin.dashboard.revenueSub", {
                percent: `${analyticsQuery.data.kpis.totalRevenue.changePercent >= 0 ? "+" : ""}${formatNumber(analyticsQuery.data.kpis.totalRevenue.changePercent, locale)}`
              })}
              accent
            />
            <KpiCard
              label={t("admin.dashboard.activeStudents")}
              value={formatNumber(analyticsQuery.data.kpis.enrolledStudents.active, locale)}
              sub={t("admin.dashboard.activeStudentsSub", {
                value: formatNumber(analyticsQuery.data.kpis.enrolledStudents.newThisPeriod, locale)
              })}
            />
            <KpiCard
              label={t("admin.dashboard.avgCompletion")}
              value={`${formatNumber(analyticsQuery.data.kpis.courseCompletion.averagePercent, locale)}%`}
              sub={t("admin.dashboard.avgCompletionSub", {
                value: formatNumber(analyticsQuery.data.kpis.courseCompletion.fullyCompleted, locale)
              })}
            />
            <KpiCard
              label={t("admin.dashboard.avgWatchTime")}
              value={formatMinutesShort(analyticsQuery.data.kpis.videoEngagement.averageWatchTimeSeconds, locale)}
              sub={t("admin.dashboard.avgWatchTimeSub")}
            />
          </section>

          {/* Charts */}
          <section className="grid gap-5 xl:grid-cols-2">
            <div className="dashboard-panel p-5">
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-brand-600">{t("admin.dashboard.revenueChart")}</p>
              <div className="flex h-48 items-end gap-1.5">
                {analyticsQuery.data.revenueTimeseries.slice(-14).map((entry) => (
                  <div key={entry.date} className="flex flex-1 flex-col items-center gap-1.5">
                    <div
                      className="w-full rounded-t-lg transition-all"
                      style={{ height: `${Math.max(8, (entry.revenueEgp / revenueMax) * 176)}px`, opacity: entry.revenueEgp > 0 ? 1 : 0.25, background: "var(--gradient-brand)" }}
                    />
                    <span className="tabular-nums text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                      {entry.date.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="dashboard-panel p-5">
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                {t("admin.dashboard.enrollmentsChart")}
              </p>
              <div className="flex h-48 items-end gap-1.5">
                {analyticsQuery.data.enrollmentTimeseries.slice(-14).map((entry) => (
                  <div key={entry.date} className="flex flex-1 flex-col items-center gap-1.5">
                    <div
                      className="w-full rounded-t-lg transition-all"
                      style={{
                        height: `${Math.max(8, (entry.newEnrollments / enrollmentMax) * 176)}px`,
                        backgroundColor: "var(--color-text-primary)",
                        opacity: entry.newEnrollments > 0 ? 0.7 : 0.15
                      }}
                    />
                    <span className="tabular-nums text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                      {entry.date.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      ) : (
        <EmptyState
          title={t("admin.dashboard.emptyTitle")}
          description={t("admin.dashboard.emptyDesc")}
        />
      )}
    </AdminShell>
  );
};
