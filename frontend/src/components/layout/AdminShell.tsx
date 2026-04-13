import type { ReactNode } from "react";
import { Link, useLocation, useParams } from "react-router-dom";

import { MobileDrawer } from "@/components/layout/MobileDrawer";
import { cn } from "@/lib/utils";

const adminItems = [
  { label: "Dashboard",  to: "/admin/dashboard",  icon: "◈" },
  { label: "Lessons",    to: "/admin/lessons",     icon: "▶" },
  { label: "Students",   to: "/admin/students",    icon: "◉" },
  { label: "Pricing",    to: "/admin/pricing",     icon: "◎" },
  { label: "Analytics",  to: "/admin/analytics",   icon: "◇" }
];

type AdminShellProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export const AdminShell = ({ title, description, children }: AdminShellProps) => {
  const location = useLocation();
  const { locale } = useParams();
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";

  return (
    <main className="min-h-dvh px-4 py-6 sm:px-6 sm:py-8" style={{ backgroundColor: "var(--color-page)" }}>
      <section className="mx-auto max-w-7xl">
        <MobileDrawer items={adminItems} />
        <div className="mt-4 grid gap-5 md:grid-cols-[220px_minmax(0,1fr)] md:items-start">

          {/* Sidebar */}
          <aside
            className="hidden rounded-2xl border p-3 shadow-card md:block"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
              Admin
            </p>
            <nav aria-label="Admin navigation" className="space-y-0.5">
              {adminItems.map((item) => {
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
                Admin workspace
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
