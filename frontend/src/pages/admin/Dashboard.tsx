import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen, Clock3, ReceiptText, ShieldCheck, Users } from "lucide-react";
import { Link, useParams } from "react-router-dom";
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
    <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
      {label}
    </p>
    <p className="mt-2 font-display text-3xl font-bold tabular-nums" style={{ color: "var(--color-text-primary)" }}>
      {value}
    </p>
    <p className="mt-1.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
      {sub}
    </p>
  </div>
);

export const AdminDashboard = () => {
  const { i18n, t } = useTranslation();
  const { locale } = useParams();
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";
  const resolvedLocale = resolveLocale(i18n.language);
  const isAr = resolvedLocale === "ar";

  const analyticsQuery = useQuery({
    queryKey: ["admin-dashboard", "30d"],
    queryFn: async () => {
      const response = await api.get<AnalyticsPayload>("/admin/analytics", { params: { period: "30d" } });
      return response.data;
    }
  });

  const revenueMax = seriesMax(analyticsQuery.data?.revenueTimeseries.map((e) => e.revenueEgp) ?? []);
  const enrollmentMax = seriesMax(analyticsQuery.data?.enrollmentTimeseries.map((e) => e.newEnrollments) ?? []);

  const attentionItems = analyticsQuery.data ? [
    {
      title: isAr ? "الطلاب الجدد هذا الشهر" : "New students this window",
      description: isAr ? "راجع الطلاب الجدد وتأكد من أن الوصول والمتابعة يعملان كما ينبغي." : "Review new enrollments and make sure access and onboarding are moving smoothly.",
      value: formatNumber(analyticsQuery.data.kpis.enrolledStudents.newThisPeriod, resolvedLocale),
      to: `${prefix}/admin/students`,
      icon: Users
    },
    {
      title: isAr ? "طلاب تم سحب وصولهم" : "Revoked enrollments",
      description: isAr ? "راقب الحالات التي تحتاج متابعة أو إعادة تفعيل." : "Keep an eye on accounts that may need follow-up or manual recovery.",
      value: formatNumber(analyticsQuery.data.kpis.enrolledStudents.revoked, resolvedLocale),
      to: `${prefix}/admin/students`,
      icon: ShieldCheck
    },
    {
      title: isAr ? "متوسط المشاهدة" : "Average watch time",
      description: isAr ? "هذا المؤشر يساعدك على معرفة ما إذا كان المحتوى يحافظ على اهتمام الطلاب." : "Use this to see whether the lesson flow is keeping learners engaged.",
      value: formatMinutesShort(analyticsQuery.data.kpis.videoEngagement.averageWatchTimeSeconds, resolvedLocale),
      to: `${prefix}/admin/analytics`,
      icon: Clock3
    }
  ] : [];

  return (
    <AdminShell title={t("admin.dashboard.title")} description={t("admin.dashboard.desc")}>
      {analyticsQuery.isLoading ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-[24px]" />
            ))}
          </div>
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
            <Skeleton className="h-72 rounded-[28px]" />
            <Skeleton className="h-72 rounded-[28px]" />
          </div>
        </>
      ) : analyticsQuery.data ? (
        <>
          <section className="dashboard-stat-grid dashboard-stat-grid--four">
            <KpiCard
              label={t("admin.dashboard.revenue")}
              value={`${formatNumber(analyticsQuery.data.kpis.totalRevenue.amountEgp, resolvedLocale)} ${t("common.currency.egp")}`}
              sub={t("admin.dashboard.revenueSub", {
                percent: `${analyticsQuery.data.kpis.totalRevenue.changePercent >= 0 ? "+" : ""}${formatNumber(analyticsQuery.data.kpis.totalRevenue.changePercent, resolvedLocale)}`
              })}
              accent
            />
            <KpiCard
              label={t("admin.dashboard.activeStudents")}
              value={formatNumber(analyticsQuery.data.kpis.enrolledStudents.active, resolvedLocale)}
              sub={t("admin.dashboard.activeStudentsSub", {
                value: formatNumber(analyticsQuery.data.kpis.enrolledStudents.newThisPeriod, resolvedLocale)
              })}
            />
            <KpiCard
              label={t("admin.dashboard.avgCompletion")}
              value={`${formatNumber(analyticsQuery.data.kpis.courseCompletion.averagePercent, resolvedLocale)}%`}
              sub={t("admin.dashboard.avgCompletionSub", {
                value: formatNumber(analyticsQuery.data.kpis.courseCompletion.fullyCompleted, resolvedLocale)
              })}
            />
            <KpiCard
              label={t("admin.dashboard.avgWatchTime")}
              value={formatMinutesShort(analyticsQuery.data.kpis.videoEngagement.averageWatchTimeSeconds, resolvedLocale)}
              sub={t("admin.dashboard.avgWatchTimeSub")}
            />
          </section>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
            <div className="space-y-5">
              <div className="dashboard-panel p-5">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">{isAr ? "ما يحتاج انتباهك اليوم" : "Needs attention today"}</p>
                    <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                      {isAr ? "اختصارات تشغيلية تساعدك على اتخاذ القرار بسرعة." : "Operational shortcuts that help you decide what to act on first."}
                    </p>
                  </div>
                </div>
                <div className="grid gap-3">
                  {attentionItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.title}
                        className="flex items-center justify-between gap-4 rounded-[22px] border px-4 py-4 no-underline transition-colors hover:bg-surface2"
                        style={{ borderColor: "var(--color-border)" }}
                        to={item.to}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: "var(--color-brand-muted)", color: "var(--color-brand)" }}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{item.title}</p>
                            <p className="mt-1 text-sm leading-6" style={{ color: "var(--color-text-secondary)" }}>{item.description}</p>
                          </div>
                        </div>
                        <div className="text-end">
                          <p className="font-display text-2xl font-bold text-brand-600">{item.value}</p>
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600">
                            {isAr ? "افتح" : "Open"}
                            <ArrowRight className="icon-dir h-3.5 w-3.5" />
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>

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
            </div>

            <div className="space-y-5">
              <div className="dashboard-panel p-5">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">{isAr ? "روابط تشغيلية سريعة" : "Operational shortcuts"}</p>
                <div className="mt-4 grid gap-2">
                  {[
                    { to: `${prefix}/admin/lessons`, label: t("admin.nav.lessons"), icon: BookOpen },
                    { to: `${prefix}/admin/students`, label: t("admin.nav.students"), icon: Users },
                    { to: `${prefix}/admin/orders`, label: t("admin.nav.orders"), icon: ReceiptText }
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.to}
                        className="flex items-center justify-between rounded-xl border px-4 py-3 no-underline transition-colors hover:bg-surface2"
                        style={{ borderColor: "var(--color-border)" }}
                        to={item.to}
                      >
                        <span className="inline-flex items-center gap-2 text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                          <Icon className="h-4 w-4 text-brand-600" />
                          {item.label}
                        </span>
                        <ArrowRight className="icon-dir h-4 w-4 text-brand-600" />
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="dashboard-panel p-5">
                <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                  {isAr ? "صحة المنصة" : "Platform health"}
                </p>
                <div className="mt-4 space-y-3">
                  {[
                    {
                      label: isAr ? "الوصول النشط" : "Active access",
                      value: formatNumber(analyticsQuery.data.kpis.enrolledStudents.active, resolvedLocale),
                      hint: isAr ? "طلاب يمكنهم الدخول الآن" : "Students who can currently enter the course"
                    },
                    {
                      label: isAr ? "الطلاب المكتملون" : "Fully completed",
                      value: formatNumber(analyticsQuery.data.kpis.courseCompletion.fullyCompleted, resolvedLocale),
                      hint: isAr ? "أنهوا المسار كاملًا" : "Students who finished the whole workflow"
                    },
                    {
                      label: isAr ? "إجمالي المشاهدة" : "Total watch time",
                      value: formatMinutesShort(analyticsQuery.data.kpis.videoEngagement.totalWatchTimeSeconds, resolvedLocale),
                      hint: isAr ? "وقت مشاهدة الطلاب في الفترة الحالية" : "Total learner watch time in this window"
                    }
                  ].map((item) => (
                    <div key={item.label} className="rounded-[22px] border px-4 py-4" style={{ borderColor: "var(--color-border)", backgroundColor: "color-mix(in oklab, var(--color-surface-2) 72%, transparent)" }}>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>{item.label}</p>
                      <p className="mt-2 text-2xl font-display font-bold" style={{ color: "var(--color-text-primary)" }}>{item.value}</p>
                      <p className="mt-1 text-xs leading-5" style={{ color: "var(--color-text-secondary)" }}>{item.hint}</p>
                    </div>
                  ))}
                </div>
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
