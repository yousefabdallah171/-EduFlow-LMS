import { useEffect, useMemo, useState } from "react";
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
  BadgeHelp,
  ChevronDown,
  Download,
  FileText,
  Gauge,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  ReceiptText,
  Shield,
  X,
  UserCircle2
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/hooks/useAuth";
import { resolveLocale } from "@/lib/locale";
import { cn } from "@/lib/utils";

type NavItem = {
  labelKey: string;
  to: string;
  icon: typeof LayoutDashboard;
};

const studentMenuItems: NavItem[] = [
  { labelKey: "nav.dashboard", to: "/dashboard", icon: LayoutDashboard },
  { labelKey: "nav.course", to: "/course", icon: GraduationCap },
  { labelKey: "nav.progress", to: "/progress", icon: Gauge },
  { labelKey: "nav.notes", to: "/notes", icon: FileText },
  { labelKey: "nav.downloads", to: "/downloads", icon: Download },
  { labelKey: "nav.orders", to: "/orders", icon: ReceiptText },
  { labelKey: "nav.profile", to: "/profile", icon: UserCircle2 }
];

const studentQuickMenuItems: NavItem[] = [
  { labelKey: "nav.dashboard", to: "/dashboard", icon: LayoutDashboard },
  { labelKey: "nav.course", to: "/course", icon: GraduationCap },
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
  { labelKey: "nav.checkout", to: "/checkout", icon: ReceiptText }
];

export const NavBar = () => {
  const location = useLocation();
  const segment = location.pathname.split("/")[1];
  const prefix = segment === "en" || segment === "ar" ? `/${segment}` : "";
  const { user, logout } = useAuth();
  const userRole = user?.role;
  const isAuthenticated = Boolean(user);
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const locale = resolveLocale(i18n.language);
  const isAr = locale === "ar";

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

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.hash, location.pathname, location.search]);

  const links = useMemo(() => {
    if (userRole === "ADMIN") {
      return adminMenuItems;
    }

    if (isAuthenticated) {
      return studentQuickMenuItems;
    }

    return publicMenuItems;
  }, [isAuthenticated, userRole]);

  const drawerLinks = useMemo(() => {
    if (userRole === "ADMIN") {
      return adminMenuItems;
    }

    if (isAuthenticated) {
      return [...studentMenuItems, { labelKey: "nav.help", to: "/help", icon: BadgeHelp }];
    }

    return publicMenuItems;
  }, [isAuthenticated, userRole]);

  return (
    <>
      <header
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
            <button
              aria-label={t("nav.openNavigation")}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border lg:hidden"
              onClick={() => setMobileNavOpen(true)}
              style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
              type="button"
            >
              <Menu className="h-5 w-5" />
            </button>

            <Link className="flex min-w-0 items-center gap-3 no-underline" to={`${prefix}/`}>
              <span
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl font-mono text-sm font-black text-white"
                style={{
                  background: "var(--gradient-brand)",
                  boxShadow: "0 10px 24px color-mix(in oklab, var(--color-brand) 22%, transparent)"
                }}
              >
                YA
              </span>
              <span className="hidden min-w-0 sm:block">
                <span className="truncate text-[11px] leading-tight" style={{ color: "var(--color-text-muted)" }}>
                  {t("app.subtitle")}
                </span>
              </span>
            </Link>
          </div>

          <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
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
                          border: "1px solid color-mix(in oklab, var(--color-brand) 18%, transparent)"
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
              <div className="hidden items-center gap-2 lg:flex">
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
      </header>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent
          side={isAr ? "right" : "left"}
          className="w-[min(88vw,24rem)] overflow-y-auto border-none p-0 lg:hidden"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in oklab, var(--color-surface) 92%, transparent), var(--color-surface))",
            boxShadow: "var(--shadow-elevated)"
          }}
        >
          <div className="flex min-h-full flex-col">
            <SheetHeader className="border-b px-5 pb-5 pt-6" style={{ borderColor: "var(--color-border)" }}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl font-mono text-sm font-black text-white"
                      style={{
                        background: "var(--gradient-brand)",
                        boxShadow: "0 12px 26px color-mix(in oklab, var(--color-brand) 24%, transparent)"
                      }}
                    >
                      YA
                    </span>
                    <div className="min-w-0">
                      <SheetTitle className="font-display text-base font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                        {t("nav.menu")}
                      </SheetTitle>
                      <p className="mt-1 text-sm leading-6" style={{ color: "var(--color-text-secondary)" }}>
                        {t("app.subtitle")}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  aria-label={t("nav.closeNavigation")}
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border"
                  onClick={() => setMobileNavOpen(false)}
                  style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                  type="button"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </SheetHeader>

            <div className="flex-1 px-4 py-5">
              {user ? (
                <div className="mb-5 rounded-[24px] border p-4" style={{ borderColor: "var(--color-border)", backgroundColor: "color-mix(in oklab, var(--color-surface-2) 82%, transparent)" }}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl text-sm font-bold text-white" style={{ background: "var(--gradient-brand)" }}>
                      <Avatar
                        alt={user.fullName}
                        className="h-full w-full rounded-2xl text-sm font-bold text-white"
                        fallback={user.fullName.charAt(0).toUpperCase()}
                        src={user.avatarUrl}
                        style={{ background: "var(--gradient-brand)" }}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-display text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                        {user.fullName}
                      </p>
                      <p className="mt-1 truncate text-xs" style={{ color: "var(--color-text-muted)" }}>
                        {user.email}
                      </p>
                    </div>
                  </div>

                  {user.role === "STUDENT" ? (
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <div className="rounded-[18px] px-3 py-2" style={{ backgroundColor: "var(--color-brand-muted)" }}>
                        <p className={cn("text-[10px] font-bold tracking-[0.16em]", !isAr && "uppercase")} style={{ color: "var(--color-text-muted)" }}>
                          {t("student.shell.section")}
                        </p>
                        <p className="mt-1 text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                          {t("common.student")}
                        </p>
                      </div>
                      <div className="rounded-[18px] px-3 py-2" style={{ backgroundColor: "var(--color-brand-muted)" }}>
                        <p className={cn("text-[10px] font-bold tracking-[0.16em]", !isAr && "uppercase")} style={{ color: "var(--color-text-muted)" }}>
                          {t("student.shell.enrolled")}
                        </p>
                        <p className="mt-1 text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                          {t("student.shell.lifetimeAccess")}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <nav aria-label="Mobile primary" className="space-y-2">
                {drawerLinks.map((item) => {
                  const target = `${prefix}${item.to}`;
                  const active = location.pathname === target || (item.to !== "/" && location.pathname.startsWith(target));
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.to}
                      className="flex items-center gap-3 rounded-[22px] border px-4 py-3 text-sm font-semibold no-underline transition-all hover:-translate-y-0.5"
                      onClick={() => setMobileNavOpen(false)}
                      style={{
                        color: active ? "var(--color-brand-text)" : "var(--color-text-primary)",
                        background: active ? "var(--gradient-brand)" : "color-mix(in oklab, var(--color-surface-2) 82%, transparent)",
                        borderColor: active ? "transparent" : "var(--color-border)"
                      }}
                      to={target}
                    >
                      <span
                        className="flex h-10 w-10 items-center justify-center rounded-2xl"
                        style={{
                          backgroundColor: active
                            ? "color-mix(in oklab, white 28%, transparent)"
                            : "color-mix(in oklab, var(--color-brand) 14%, transparent)",
                          color: active ? "var(--color-brand-text)" : "var(--color-text-primary)"
                        }}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="font-display text-[15px] tracking-tight">{t(item.labelKey)}</span>
                    </Link>
                  );
                })}
              </nav>

              {!user ? (
                <div className="mt-6 space-y-3 border-t pt-5" style={{ borderColor: "var(--color-border)" }}>
                  <Link
                    className="flex min-h-12 items-center justify-center rounded-[22px] border px-4 text-sm font-semibold no-underline"
                    onClick={() => setMobileNavOpen(false)}
                    style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                    to={`${prefix}/login`}
                  >
                    {t("nav.login")}
                  </Link>
                  <Link
                    className="flex min-h-12 items-center justify-center rounded-[22px] px-4 text-sm font-semibold no-underline"
                    onClick={() => setMobileNavOpen(false)}
                    style={{ background: "var(--gradient-brand)" }}
                    to={`${prefix}/register`}
                  >
                    {t("nav.getStarted")}
                  </Link>
                </div>
              ) : (
                <div className="mt-6 border-t pt-5" style={{ borderColor: "var(--color-border)" }}>
                  <button
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[22px] border px-4 text-sm font-semibold transition-colors hover:bg-surface2"
                    onClick={() => {
                      setMobileNavOpen(false);
                      void logout();
                    }}
                    style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                    type="button"
                  >
                    <LogOut className="h-4 w-4" />
                    {t("nav.signOut")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
