import { useMemo, useState } from "react";
import { Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/react";
import { useFloating, autoUpdate, flip, offset, shift } from "@floating-ui/react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";

export const NavBar = () => {
  const location = useLocation();
  const segment = location.pathname.split("/")[1];
  const prefix = segment === "en" || segment === "ar" ? `/${segment}` : "";
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { refs, floatingStyles } = useFloating({
    open,
    onOpenChange: setOpen,
    middleware: [offset(10), flip(), shift()],
    whileElementsMounted: autoUpdate
  });

  const links = useMemo(() => {
    if (user?.role === "ADMIN") {
      return [
        { labelKey: "nav.dashboard", to: "/admin/dashboard" },
        { labelKey: "nav.lessons",   to: "/admin/lessons" },
        { labelKey: "nav.students",  to: "/admin/students" }
      ];
    }
    return [
      { labelKey: "nav.home",     to: "/" },
      { labelKey: "nav.course",   to: "/course" },
      { labelKey: "nav.checkout", to: "/checkout" }
    ];
  }, [user?.role]);

  return (
    <Disclosure
      as="header"
      className="sticky top-0 z-30 border-b backdrop-blur-md"
      style={{ borderColor: "var(--color-border)", backgroundColor: "color-mix(in srgb, var(--color-surface) 90%, transparent)" }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <DisclosureButton className="rounded-lg border px-3 py-2 text-sm font-medium text-secondary md:hidden" style={{ borderColor: "var(--color-border-strong)" }}>
            ☰
          </DisclosureButton>
          <Link className="flex items-center gap-2.5 no-underline" to={`${prefix}/`}>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white shadow-sm">
              E
            </span>
            <span className="hidden sm:block">
              <span className="block text-sm font-bold leading-tight tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                EduFlow
              </span>
              <span className="block text-[11px] leading-tight" style={{ color: "var(--color-text-muted)" }}>
                {t("app.subtitle")}
              </span>
            </span>
          </Link>
        </div>

        {/* Desktop nav */}
        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {links.map((item) => {
            const target = `${prefix}${item.to}`;
            const active = location.pathname === target || (item.to !== "/" && location.pathname.startsWith(target));
            return (
              <Link
                key={item.to}
                className={[
                  "rounded-lg px-3 py-2 text-sm font-medium no-underline transition-colors",
                  active
                    ? "bg-brand-600/10 text-brand-600 dark:bg-brand-600/20 dark:text-brand-400"
                    : "text-secondary hover:bg-surface2 hover:text-primary"
                ].join(" ")}
                to={target}
              >
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />

          {user ? (
            <div className="relative">
              <button
                ref={refs.setReference}
                aria-expanded={open}
                className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-surface2"
                style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                onClick={() => setOpen((v) => !v)}
                type="button"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                  {user.fullName.charAt(0).toUpperCase()}
                </span>
                <span className="hidden sm:block">{user.fullName.split(" ")[0]}</span>
              </button>

              {open ? (
                <div
                  ref={refs.setFloating}
                  className="z-50 w-60 rounded-xl border p-2 shadow-elevated"
                  style={{
                    ...floatingStyles,
                    backgroundColor: "var(--color-surface)",
                    borderColor: "var(--color-border-strong)"
                  }}
                >
                  <div className="px-3 py-2">
                    <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{user.fullName}</p>
                    <p className="mt-0.5 truncate text-xs" style={{ color: "var(--color-text-muted)" }}>{user.email}</p>
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {user.role === "STUDENT" ? (
                      <Link
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium no-underline transition-colors hover:bg-surface2"
                        style={{ color: "var(--color-text-primary)" }}
                        onClick={() => setOpen(false)}
                        to={`${prefix}/course`}
                      >
                        {t("nav.myCourse")}
                      </Link>
                    ) : (
                      <Link
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium no-underline transition-colors hover:bg-surface2"
                        style={{ color: "var(--color-text-primary)" }}
                        onClick={() => setOpen(false)}
                        to={`${prefix}/admin/dashboard`}
                      >
                        {t("nav.adminPanel")}
                      </Link>
                    )}
                    <div className="my-1 h-px" style={{ backgroundColor: "var(--color-border)" }} />
                    <button
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-brand-600 transition-colors hover:bg-brand-600/10"
                      onClick={() => { setOpen(false); void logout(); }}
                      type="button"
                    >
                      {t("nav.signOut")}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link
                className="rounded-lg px-3 py-2 text-sm font-medium no-underline transition-colors hover:bg-surface2"
                style={{ color: "var(--color-text-secondary)" }}
                to={`${prefix}/login`}
              >
                {t("nav.login")}
              </Link>
              <Link
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white no-underline shadow-sm transition-all hover:bg-brand-700 hover:shadow"
                to={`${prefix}/register`}
              >
                {t("nav.getStarted")}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      <DisclosurePanel className="border-t px-4 py-3 md:hidden" style={{ borderColor: "var(--color-border)" }}>
        <nav aria-label="Mobile primary" className="space-y-1">
          {links.map((item) => (
            <Link
              key={item.to}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium no-underline transition-colors hover:bg-surface2"
              style={{ color: "var(--color-text-primary)" }}
              to={`${prefix}${item.to}`}
            >
              {t(item.labelKey)}
            </Link>
          ))}
          {!user ? (
            <div className="mt-2 grid grid-cols-2 gap-2 border-t pt-2" style={{ borderColor: "var(--color-border)" }}>
              <Link
                className="block rounded-lg border px-3 py-2.5 text-center text-sm font-medium no-underline"
                style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                to={`${prefix}/login`}
              >
                {t("nav.login")}
              </Link>
              <Link
                className="block rounded-lg bg-brand-600 px-3 py-2.5 text-center text-sm font-semibold text-white no-underline"
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
