import type { ReactNode } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { MobileDrawer } from "@/components/layout/MobileDrawer";
import { useAuth } from "@/hooks/useAuth";
import { useEnrollment } from "@/hooks/useEnrollment";
import { cn } from "@/lib/utils";

const studentItems = [
  { icon: "◈", labelKey: "nav.dashboard",  to: "/dashboard" },
  { icon: "▶", labelKey: "nav.course",      to: "/course" },
  { icon: "◎", labelKey: "nav.progress",    to: "/progress" },
  { icon: "◉", labelKey: "nav.notes",       to: "/notes" },
  { icon: "◇", labelKey: "nav.downloads",   to: "/downloads" },
  { icon: "⬡", labelKey: "nav.orders",      to: "/orders" },
  { icon: "▷", labelKey: "nav.profile",     to: "/profile" },
  { icon: "?", labelKey: "nav.help",        to: "/help" },
];

type StudentShellProps = {
  children: ReactNode;
};

export const StudentShell = ({ children }: StudentShellProps) => {
  const location = useLocation();
  const { locale } = useParams();
  const { t } = useTranslation();
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";
  const { user } = useAuth();
  const { statusQuery } = useEnrollment();
  const isEnrolled = statusQuery.data?.enrolled && statusQuery.data?.status === "ACTIVE";

  const drawerItems = studentItems.map((item) => ({
    label: t(item.labelKey),
    to: item.to,
  }));

  return (
    <main className="min-h-dvh px-4 py-6 sm:px-6" style={{ backgroundColor: "var(--color-page)" }}>
      <div className="mx-auto max-w-6xl">
        {/* Mobile drawer */}
        <MobileDrawer items={drawerItems} />

        <div className="mt-4 grid gap-5 md:grid-cols-[240px_minmax(0,1fr)] md:items-start">

          {/* ── Sidebar ── */}
          <aside
            className="hidden rounded-2xl border p-3 shadow-card md:block"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            {/* User card */}
            {user && (
              <div
                className="mb-3 flex items-center gap-3 rounded-xl px-3 py-2.5"
                style={{ backgroundColor: "var(--color-surface-2)" }}
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white overflow-hidden" style={{ backgroundColor: "var(--color-brand)" }}>
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
                  ) : (
                    user.fullName.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                    {user.fullName}
                  </p>
                  <p className="truncate text-xs" style={{ color: "var(--color-text-muted)" }}>{user.email}</p>
                </div>
              </div>
            )}

            <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
              {t("student.shell.section")}
            </p>

            <nav aria-label="Student navigation" className="space-y-0.5">
              {studentItems.map((item) => {
                const target = `${prefix}${item.to}`;
                const active = location.pathname === target || location.pathname.startsWith(target + "/");
                return (
                  <Link
                    key={item.to}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium no-underline transition-colors",
                      active
                        ? "bg-brand-600/10 text-brand-600 dark:bg-brand-600/20 dark:text-brand-400"
                        : "text-secondary hover:bg-surface2 hover:text-primary"
                    )}
                    to={target}
                  >
                    <span className="text-base leading-none text-brand-600 opacity-70">{item.icon}</span>
                    {t(item.labelKey)}
                  </Link>
                );
              })}
            </nav>

            {/* Enrollment status */}
            {isEnrolled ? (
              <div className="mt-4 rounded-xl p-3" style={{ backgroundColor: "var(--color-surface-2)" }}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-brand-600">
                  {t("student.shell.enrolled")}
                </p>
                <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {t("student.shell.lifetimeAccess")}
                </p>
              </div>
            ) : (
              <div className="mt-4">
                <Link
                  className="block w-full rounded-xl bg-brand-600 px-3 py-2.5 text-center text-sm font-bold text-white no-underline transition-all hover:bg-brand-700"
                  to={`${prefix}/checkout`}
                >
                  {t("course.getAccess")}
                </Link>
              </div>
            )}
          </aside>

          {/* ── Main content ── */}
          <div className="space-y-5 min-w-0">
            {children}
          </div>
        </div>

        {/* ── WhatsApp Floating Icon (Enrolled Only) ── */}
        {isEnrolled && (
          <a
            href="https://api.whatsapp.com/send/?phone=201023516495&text&type=phone_number&app_absent=0"
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-6 left-6 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all hover:scale-110 hover:shadow-xl"
            style={{ backgroundColor: "#25D366", color: "white" }}
            aria-label="Contact via WhatsApp"
            title="Contact via WhatsApp"
          >
            <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.272-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004a9.87 9.87 0 00-4.968 1.495c-1.53.92-2.779 2.212-3.6 3.662-.821 1.45-1.223 3.064-1.22 4.704 0 1.64.402 3.254 1.224 4.704.82 1.45 2.07 2.74 3.6 3.66 1.529.925 3.253 1.39 5.004 1.39 1.75 0 3.474-.465 5.003-1.39 1.531-.92 2.78-2.21 3.6-3.66.822-1.45 1.224-3.064 1.224-4.704 0-1.64-.402-3.255-1.224-4.704-.82-1.45-2.069-2.742-3.6-3.662a9.867 9.867 0 00-4.968-1.495z" />
            </svg>
          </a>
        )}
      </div>
    </main>
  );
};
