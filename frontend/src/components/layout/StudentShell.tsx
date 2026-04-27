import type { ReactNode } from "react";
import {
  BadgeHelp,
  BookOpenCheck,
  Download,
  FileText,
  Gauge,
  LayoutDashboard,
  MessageCircle,
  PlayCircle,
  ReceiptText,
  UserCircle2
} from "lucide-react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { MobileDrawer } from "@/components/layout/MobileDrawer";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/hooks/useAuth";
import { useEnrollment } from "@/hooks/useEnrollment";
import { resolveLocale } from "@/lib/locale";
import { cn } from "@/lib/utils";

const studentItems = [
  { icon: LayoutDashboard, labelKey: "nav.dashboard", to: "/dashboard" },
  { icon: PlayCircle, labelKey: "nav.course", to: "/course" },
  { icon: Gauge, labelKey: "nav.progress", to: "/progress" },
  { icon: FileText, labelKey: "nav.notes", to: "/notes" },
  { icon: Download, labelKey: "nav.downloads", to: "/downloads" },
  { icon: ReceiptText, labelKey: "nav.orders", to: "/orders" },
  { icon: UserCircle2, labelKey: "nav.profile", to: "/profile" },
  { icon: BadgeHelp, labelKey: "nav.help", to: "/help" }
];

type StudentShellProps = {
  children: ReactNode;
};

export const StudentShell = ({ children }: StudentShellProps) => {
  const location = useLocation();
  const { locale } = useParams();
  const { t, i18n } = useTranslation();
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";
  const isAr = resolveLocale(i18n.language) === "ar";
  const { user } = useAuth();
  const { statusQuery } = useEnrollment();
  const isEnrolled = statusQuery.data?.enrolled && statusQuery.data?.status === "ACTIVE";

  const drawerItems = studentItems.map((item) => ({
    label: t(item.labelKey),
    to: item.to
  }));

  return (
    <main className="dashboard-page min-h-dvh px-4 py-6 sm:px-6" style={{ backgroundColor: "var(--color-page)" }}>
      <div className="mx-auto max-w-6xl">
        <MobileDrawer items={drawerItems} />

        <div className="mt-4 grid gap-5 md:grid-cols-[248px_minmax(0,1fr)] md:items-start">
          <aside className="dashboard-panel dashboard-sidebar hidden p-3 md:block">
            {user ? (
              <div
                className="relative mb-3 flex items-center gap-3 rounded-[22px] border px-3 py-3"
                style={{ backgroundColor: "color-mix(in oklab, var(--color-surface-2) 76%, transparent)", borderColor: "var(--color-border)" }}
              >
                <div
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl text-sm font-bold text-white"
                  style={{ background: "var(--gradient-brand)" }}
                >
                  <Avatar
                    alt={user.fullName}
                    className="h-full w-full rounded-2xl text-sm font-bold text-white"
                    fallback={user.fullName.charAt(0).toUpperCase()}
                    src={user.avatarUrl}
                    style={{ background: "var(--gradient-brand)" }}
                  />
                </div>
                <div className="min-w-0">
                  <p className="font-display truncate text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                    {user.fullName}
                  </p>
                  <p className="truncate text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {user.email}
                  </p>
                </div>
              </div>
            ) : null}

            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--color-text-muted)" }}>
              {t("student.shell.section")}
            </p>

            <nav aria-label="Student navigation" className="space-y-1">
              {studentItems.map((item) => {
                const target = `${prefix}${item.to}`;
                const active = location.pathname === target || location.pathname.startsWith(target + "/");
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
                    <Icon className={cn("h-4 w-4", active ? "text-brand-600" : "text-brand-600/70")} />
                    {t(item.labelKey)}
                  </Link>
                );
              })}
            </nav>

            {isEnrolled ? (
              <div className="dashboard-panel dashboard-panel--accent mt-4 rounded-[22px] p-3">
                <div className="flex items-start gap-2">
                  <BookOpenCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-600" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-600">
                      {t("student.shell.enrolled")}
                    </p>
                    <p className="mt-1 text-xs leading-5" style={{ color: "var(--color-text-muted)" }}>
                      {t("student.shell.lifetimeAccess")}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <Link
                  className="block w-full rounded-2xl px-3 py-3 text-center text-sm font-bold text-white no-underline transition-all hover:opacity-95"
                  style={{ background: "var(--gradient-brand)" }}
                  to={`${prefix}/checkout`}
                >
                  {t("course.getAccess")}
                </Link>
              </div>
            )}
          </aside>

          <div className="min-w-0 space-y-5">{children}</div>
        </div>

        {isEnrolled ? (
          <a
            href="https://api.whatsapp.com/send/?phone=201023516495&text&type=phone_number&app_absent=0"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "fixed bottom-6 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all hover:scale-105 hover:shadow-xl",
              isAr ? "right-6" : "left-6"
            )}
            style={{ backgroundColor: "#25D366", color: "white" }}
            aria-label={t("common.contactWhatsApp")}
            title={t("common.contactWhatsApp")}
          >
            <MessageCircle className="h-7 w-7" />
          </a>
        ) : null}
      </div>
    </main>
  );
};
