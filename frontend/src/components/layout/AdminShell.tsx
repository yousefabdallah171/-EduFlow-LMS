import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useParams } from "react-router-dom";

import { MobileDrawer } from "@/components/layout/MobileDrawer";
import { cn } from "@/lib/utils";

const adminItems = [
  { labelKey: "admin.nav.dashboard",     to: "/admin/dashboard",      icon: "◈" },
  { labelKey: "admin.nav.lessons",       to: "/admin/lessons",        icon: "▶" },
  { labelKey: "admin.nav.students",      to: "/admin/students",       icon: "◉" },
  { labelKey: "admin.nav.pricing",       to: "/admin/pricing",        icon: "◎" },
  { labelKey: "admin.nav.analytics",     to: "/admin/analytics",      icon: "◇" },
  { labelKey: "admin.nav.orders",        to: "/admin/orders",         icon: "◈" },
  { labelKey: "admin.nav.media",         to: "/admin/media",          icon: "⬡" },
  { labelKey: "admin.nav.audit",         to: "/admin/audit",          icon: "◎" },
  { labelKey: "admin.nav.tickets",       to: "/admin/tickets",        icon: "◉" },
  { labelKey: "admin.nav.settings",      to: "/admin/settings",       icon: "◇" },
  { labelKey: "admin.nav.notifications", to: "/admin/notifications",  icon: "▶" },
];

type AdminShellProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export const AdminShell = ({ title, description, children }: AdminShellProps) => {
  const location = useLocation();
  const { locale } = useParams();
  const { t } = useTranslation();
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";
  const localizedItems = adminItems.map((item) => ({ ...item, label: t(item.labelKey) }));

  return (
    <main className="min-h-dvh px-4 py-6 sm:px-6 sm:py-8" style={{ backgroundColor: "var(--color-page)" }}>
      <section className="mx-auto max-w-7xl">
        <MobileDrawer items={localizedItems} />
        <div className="mt-4 grid gap-5 md:grid-cols-[220px_minmax(0,1fr)] md:items-start">

          {/* Sidebar */}
          <aside
            className="hidden rounded-2xl border p-3 shadow-card md:block"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
              {t("admin.shell.workspace")}
            </p>
            <nav aria-label="Admin navigation" className="space-y-0.5">
              {localizedItems.map((item) => {
                const target = `${prefix}${item.to}`;
                const active = location.pathname === target;

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
                    <span className="text-base leading-none opacity-70">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* Content */}
          <div className="space-y-5">
            <header
              className="rounded-2xl border p-5 shadow-card"
              style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
            >
              <p className="text-xs font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">
                {t("admin.shell.workspace")}
              </p>
              <h1 className="mt-1.5 text-2xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                {title}
              </h1>
              <p className="mt-1.5 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                {description}
              </p>
            </header>
            {children}
          </div>
        </div>
      </section>
    </main>
  );
};
