import type { ReactNode } from "react";
import {
  BarChart3,
  Bell,
  BookOpen,
  CreditCard,
  FileClock,
  Gauge,
  Image,
  LifeBuoy,
  ReceiptText,
  Settings,
  Shield,
  Users
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useParams } from "react-router-dom";

import { MobileDrawer } from "@/components/layout/MobileDrawer";
import { PageHeader } from "@/components/shared/PageHeader";
import { cn } from "@/lib/utils";

const adminItems = [
  { labelKey: "admin.nav.dashboard", to: "/admin/dashboard", icon: Gauge },
  { labelKey: "admin.nav.lessons", to: "/admin/lessons", icon: BookOpen },
  { labelKey: "admin.nav.students", to: "/admin/students", icon: Users },
  { labelKey: "admin.nav.pricing", to: "/admin/pricing", icon: CreditCard },
  { labelKey: "admin.nav.analytics", to: "/admin/analytics", icon: BarChart3 },
  { labelKey: "admin.nav.orders", to: "/admin/orders", icon: ReceiptText },
  { labelKey: "admin.nav.media", to: "/admin/media", icon: Image },
  { labelKey: "admin.nav.audit", to: "/admin/audit", icon: FileClock },
  { labelKey: "admin.nav.tickets", to: "/admin/tickets", icon: LifeBuoy },
  { labelKey: "admin.nav.security", to: "/admin/security", icon: Shield },
  { labelKey: "admin.nav.settings", to: "/admin/settings", icon: Settings },
  { labelKey: "admin.nav.notifications", to: "/admin/notifications", icon: Bell }
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
    <main className="dashboard-page min-h-dvh px-4 py-6 sm:px-6 sm:py-8" style={{ backgroundColor: "var(--color-page)" }}>
      <section className="app-shell">
        <MobileDrawer items={localizedItems} />
        <div className="mt-4 grid gap-5 md:grid-cols-[220px_minmax(0,1fr)] md:items-start">
          <aside className="dashboard-panel dashboard-sidebar hidden p-3 md:block">
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
              {t("admin.shell.workspace")}
            </p>
            <nav aria-label="Admin navigation" className="space-y-0.5">
              {localizedItems.map((item) => {
                const target = `${prefix}${item.to}`;
                const active = location.pathname === target;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.to}
                    className={cn(
                      "dashboard-nav-link flex items-center gap-2.5 px-3 py-3 text-sm font-medium no-underline transition-colors",
                      !active && "text-secondary hover:bg-surface2 hover:text-primary"
                    )}
                    data-active={active ? "true" : "false"}
                    to={target}
                  >
                    <Icon className="h-4 w-4 opacity-70" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>

          <div className="space-y-5">
            <PageHeader
              hero
              eyebrow={t("admin.shell.workspace")}
              title={title}
              description={description}
            />
            {children}
          </div>
        </div>
      </section>
    </main>
  );
};
