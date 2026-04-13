import { useQuery } from "@tanstack/react-query";

import { AdminShell } from "@/components/layout/AdminShell";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

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
    className="rounded-2xl border p-5 shadow-card"
    style={{ backgroundColor: accent ? "var(--color-invert)" : "var(--color-surface)", borderColor: "var(--color-border)" }}
  >
    <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: accent ? "rgba(255,255,255,0.5)" : "var(--color-text-muted)" }}>
      {label}
    </p>
    <p className="mt-2 text-3xl font-bold tabular-nums" style={{ color: accent ? "var(--color-text-invert)" : "var(--color-text-primary)" }}>
      {value}
    </p>
    <p className="mt-1.5 text-xs" style={{ color: accent ? "rgba(255,255,255,0.55)" : "var(--color-text-muted)" }}>
      {sub}
    </p>
  </div>
);

export const AdminDashboard = () => {
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
    <AdminShell title="Admin dashboard" description="Track the core commercial and learning signals for the course over the last 30 days.">
      {analyticsQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : analyticsQuery.data ? (
        <>
          {/* KPI cards */}
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Revenue"
              value={`${analyticsQuery.data.kpis.totalRevenue.amountEgp} EGP`}
              sub={`${analyticsQuery.data.kpis.totalRevenue.changePercent >= 0 ? "+" : ""}${analyticsQuery.data.kpis.totalRevenue.changePercent}% vs previous window`}
              accent
            />
            <KpiCard
              label="Active students"
              value={String(analyticsQuery.data.kpis.enrolledStudents.active)}
              sub={`${analyticsQuery.data.kpis.enrolledStudents.newThisPeriod} new this period`}
            />
            <KpiCard
              label="Avg. completion"
              value={`${analyticsQuery.data.kpis.courseCompletion.averagePercent}%`}
              sub={`${analyticsQuery.data.kpis.courseCompletion.fullyCompleted} fully completed`}
            />
            <KpiCard
              label="Avg. watch time"
              value={`${Math.round(analyticsQuery.data.kpis.videoEngagement.averageWatchTimeSeconds / 60)}m`}
              sub="Average per active learner"
            />
          </section>

          {/* Charts */}
          <section className="grid gap-5 xl:grid-cols-2">
            <div
              className="rounded-2xl border p-5 shadow-card"
              style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
            >
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-brand-600">Revenue (30 days)</p>
              <div className="flex h-48 items-end gap-1.5">
                {analyticsQuery.data.revenueTimeseries.slice(-14).map((entry) => (
                  <div key={entry.date} className="flex flex-1 flex-col items-center gap-1.5">
                    <div
                      className="w-full rounded-t-lg bg-brand-600 transition-all"
                      style={{ height: `${Math.max(8, (entry.revenueEgp / revenueMax) * 176)}px`, opacity: entry.revenueEgp > 0 ? 1 : 0.25 }}
                    />
                    <span className="tabular-nums text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                      {entry.date.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="rounded-2xl border p-5 shadow-card"
              style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
            >
              <p className="mb-4 text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
                Enrollments (30 days)
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
          title="No analytics yet"
          description="Payments, enrollments, and lesson progress will populate this dashboard once the first student journey completes."
        />
      )}
    </AdminShell>
  );
};
