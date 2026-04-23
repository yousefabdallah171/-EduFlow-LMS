import { useMemo, useState } from "react";
import { Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/react";
import {
  autoUpdate,
  flip,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole
} from "@floating-ui/react";
import {
  ChevronDown,
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Shield,
  UserCircle2
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

type NavItem = {
  labelKey: string;
  to: string;
  icon: typeof LayoutDashboard;
};

const studentMenuItems: NavItem[] = [
  { labelKey: "nav.dashboard", to: "/dashboard", icon: LayoutDashboard },
  { labelKey: "nav.course", to: "/course", icon: GraduationCap },
  { labelKey: "nav.lessons", to: "/lessons", icon: CreditCard },
  { labelKey: "nav.profile", to: "/profile", icon: UserCircle2 }
];

const adminMenuItems: NavItem[] = [
  { labelKey: "nav.dashboard", to: "/admin/dashboard", icon: LayoutDashboard },
  { labelKey: "nav.lessons", to: "/admin/lessons", icon: GraduationCap },
  { labelKey: "nav.students", to: "/admin/students", icon: Shield }
];

const publicMenuItems: NavItem[] = [
  { labelKey: "nav.home", to: "/", icon: LayoutDashboard },
  { labelKey: "nav.course", to: "/course", icon: GraduationCap },
  { labelKey: "nav.checkout", to: "/checkout", icon: CreditCard }
];

export const NavBar = () => {
  const location = useLocation();
  const segment = location.pathname.split("/")[1];
  const prefix = segment === "en" || segment === "ar" ? `/${segment}` : "";
  const { user, logout } = useAuth();
  const userRole = user?.role;
  const isAuthenticated = Boolean(user);
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    middleware: [offset(12), flip(), shift({ padding: 12 })],
    whileElementsMounted: autoUpdate
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss, role]);

  const links = useMemo(() => {
    if (userRole === "ADMIN") {
      return adminMenuItems;
    }

    if (isAuthenticated) {
      return studentMenuItems;
    }

    return publicMenuItems;
  }, [isAuthenticated, userRole]);

  return (
    <Disclosure
      as="header"
      className="sticky top-0 z-30 border-b"
      style={{
        borderColor: "var(--color-border)",
        backgroundColor: "color-mix(in srgb, var(--color-surface) 82%, transparent)",
        backdropFilter: "blur(16px)"
      }}
    >
      <div className="app-shell px-0 py-3">
        <div
          className="surface-card flex items-center justify-between gap-3 rounded-[28px] px-3 py-2.5 sm:px-4"
          style={{
            backgroundColor: "color-mix(in srgb, var(--color-surface) 92%, transparent)",
            borderColor: "var(--color-border)"
          }}
        >
          <div className="flex min-w-0 items-center gap-3">
            <DisclosureButton
              aria-label={segment === "ar" ? "فتح القائمة" : "Open navigation"}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border md:hidden"
              style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
            >
              <Menu className="h-5 w-5" />
            </DisclosureButton>

            <Link className="flex min-w-0 items-center gap-3 no-underline" to={`${prefix}/`}>
                <span
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl font-mono text-sm font-black text-black"
                style={{
                  background: "var(--gradient-brand)",
                  boxShadow: "0 10px 24px rgba(163,230,53,0.22)"
                }}
              >
                AI
              </span>
              <span className="min-w-0">
                <span className="font-display block truncate text-sm font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                  AI Workflow
                </span>
                <span className="hidden truncate text-[11px] leading-tight sm:block" style={{ color: "var(--color-text-muted)" }}>
                  {t("app.subtitle")}
                </span>
              </span>
            </Link>
          </div>

          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            {links.map((item) => {
              const target = `${prefix}${item.to}`;
              const active = location.pathname === target || (item.to !== "/" && location.pathname.startsWith(target));
              const Icon = item.icon;

              return (
                <Link
                  key={item.to}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-sm font-medium no-underline transition-all",
                    active
                      ? "shadow-sm"
                      : "hover:bg-surface2"
                  )}
                  style={
                    active
                      ? {
                          backgroundColor: "var(--color-brand-muted)",
                          color: "var(--color-brand)",
                          border: "1px solid rgba(163,230,53,0.18)"
                        }
                      : {
                          color: "var(--color-text-secondary)"
                        }
                  }
                  to={target}
                >
                  <Icon className="h-4 w-4" />
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-1 py-1">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>

            {user ? (
              <div className="relative">
                <button
                  ref={refs.setReference}
                  className="flex items-center gap-2 rounded-2xl border px-2.5 py-2 transition-colors hover:bg-surface2"
                  style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                  type="button"
                  {...getReferenceProps()}
                >
                  <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-brand-600 text-xs font-bold text-white">
                    <Avatar
                      alt={user.fullName}
                      className="h-full w-full rounded-full text-xs font-bold text-white"
                      fallback={user.fullName.charAt(0).toUpperCase()}
                      src={user.avatarUrl}
                      style={{ backgroundColor: "var(--color-brand)" }}
                    />
                  </div>
                  <div className="hidden text-start sm:block">
                    <p className="max-w-[110px] truncate text-sm font-semibold">{user.fullName.split(" ")[0]}</p>
                  </div>
                  <ChevronDown className={cn("hidden h-4 w-4 text-muted-foreground transition-transform sm:block", open ? "rotate-180" : "")} />
                </button>

                {open ? (
                  <div
                    ref={refs.setFloating}
                    className="surface-card surface-card--strong z-50 w-72 rounded-3xl p-2"
                    style={{
                      ...floatingStyles,
                      backgroundColor: "var(--color-surface)",
                      borderColor: "var(--color-border-strong)"
                    }}
                    {...getFloatingProps()}
                  >
                    <div className="rounded-2xl p-3" style={{ backgroundColor: "var(--color-surface-2)" }}>
                      <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{user.fullName}</p>
                      <p className="mt-1 truncate text-xs" style={{ color: "var(--color-text-muted)" }}>{user.email}</p>
                    </div>

                    <div className="mt-2 space-y-1">
                      {(user.role === "STUDENT" ? studentMenuItems : adminMenuItems).map((item) => {
                        const Icon = item.icon;

                        return (
                          <Link
                            key={item.to}
                            className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium no-underline transition-colors hover:bg-surface2"
                            style={{ color: "var(--color-text-primary)" }}
                            onClick={() => setOpen(false)}
                            to={`${prefix}${item.to}`}
                          >
                            <Icon className="h-4 w-4 text-brand-600" />
                            {t(item.labelKey)}
                          </Link>
                        );
                      })}

                      {user.role === "STUDENT" ? (
                        <Link
                          className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium no-underline transition-colors hover:bg-surface2"
                          style={{ color: "var(--color-text-primary)" }}
                          onClick={() => setOpen(false)}
                          to={`${prefix}/help`}
                        >
                          <Shield className="h-4 w-4 text-brand-600" />
                          {t("nav.help")}
                        </Link>
                      ) : null}

                      <div className="my-1 h-px" style={{ backgroundColor: "var(--color-border)" }} />

                      <button
                        className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-brand-600 transition-colors hover:bg-brand-600/10"
                        onClick={() => {
                          setOpen(false);
                          void logout();
                        }}
                        type="button"
                      >
                        <LogOut className="h-4 w-4" />
                        {t("nav.signOut")}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="hidden items-center gap-2 md:flex">
                <Link
                  className="rounded-2xl px-3 py-2 text-sm font-medium no-underline transition-colors hover:bg-surface2"
                  style={{ color: "var(--color-text-secondary)" }}
                  to={`${prefix}/login`}
                >
                  {t("nav.login")}
                </Link>
                <Link
                  className="rounded-2xl px-4 py-2.5 text-sm font-semibold text-white no-underline transition-all"
                  style={{
                    background: "var(--gradient-brand)",
                    boxShadow: "0 12px 24px rgba(163,230,53,0.18)"
                  }}
                  to={`${prefix}/register`}
                >
                  {t("nav.getStarted")}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <DisclosurePanel className="border-t px-4 py-3 md:hidden" style={{ borderColor: "var(--color-border)" }}>
        <nav aria-label="Mobile primary" className="space-y-1">
          {links.map((item) => {
            const target = `${prefix}${item.to}`;
            const active = location.pathname === target || (item.to !== "/" && location.pathname.startsWith(target));
            const Icon = item.icon;

            return (
              <Link
                key={item.to}
                className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium no-underline transition-colors"
                style={{
                  color: active ? "var(--color-brand)" : "var(--color-text-primary)",
                  backgroundColor: active ? "var(--color-brand-muted)" : "transparent"
                }}
                to={target}
              >
                <Icon className="h-4 w-4" />
                {t(item.labelKey)}
              </Link>
            );
          })}

          {!user ? (
            <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3" style={{ borderColor: "var(--color-border)" }}>
              <Link
                className="block rounded-2xl border px-3 py-2.5 text-center text-sm font-medium no-underline"
                style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                to={`${prefix}/login`}
              >
                {t("nav.login")}
              </Link>
              <Link
                className="block rounded-2xl px-3 py-2.5 text-center text-sm font-semibold text-white no-underline"
                style={{
                  background: "var(--gradient-brand)"
                }}
                to={`${prefix}/register`}
              >
                {t("nav.getStarted")}
              </Link>
            </div>
          ) : null}
        </nav>
      </DisclosurePanel>
    </Disclosure>
  );
};
