import type { ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { resolveLocale } from "@/lib/locale";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  to: string;
};

type MobileDrawerProps = {
  items: NavItem[];
  footer?: ReactNode;
};

export const MobileDrawer = ({ items, footer }: MobileDrawerProps) => {
  const location = useLocation();
  const { locale } = useParams();
  const { t, i18n } = useTranslation();
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";
  const isAr = resolveLocale(i18n.language) === "ar";

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          className="inline-flex min-h-11 items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold transition-colors hover:bg-surface2 md:hidden"
          style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)", backgroundColor: "var(--color-surface)" }}
          type="button"
        >
          <Menu className="h-4 w-4" />
          {t("nav.menu")}
        </button>
      </SheetTrigger>
      <SheetContent
        side={isAr ? "right" : "left"}
        className="w-[min(88vw,24rem)] overflow-y-auto border-none p-0 md:hidden"
        style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)", backgroundColor: "var(--color-surface)" }}
      >
        <SheetHeader className="border-b px-5 pb-5 pt-6" style={{ borderColor: "var(--color-border)" }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <SheetTitle className="font-display text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>
                {t("nav.menu")}
              </SheetTitle>
              <p className="mt-1 text-sm leading-6" style={{ color: "var(--color-text-secondary)" }}>
                {t("app.subtitle")}
              </p>
            </div>
            <SheetClose asChild>
              <button
                aria-label={t("nav.closeNavigation")}
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border"
                style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </SheetClose>
          </div>
        </SheetHeader>

        <nav aria-label="Mobile navigation" className="space-y-2 px-4 py-5">
          {items.map((item) => {
            const target = `${prefix}${item.to}`;
            const active = location.pathname === target || (item.to !== "/" && location.pathname.startsWith(target));

            return (
              <SheetClose asChild key={item.to}>
                <Link
                  className={cn(
                    "flex min-h-12 items-center rounded-[22px] border px-4 text-sm font-semibold no-underline transition-all hover:-translate-y-0.5",
                    active ? "text-white" : "hover:bg-surface2"
                  )}
                  style={{
                    color: active ? "var(--color-brand-text)" : "var(--color-text-primary)",
                    background: active ? "var(--gradient-brand)" : "color-mix(in oklab, var(--color-surface-2) 82%, transparent)",
                    borderColor: active ? "transparent" : "var(--color-border)"
                  }}
                  to={target}
                >
                  {item.label}
                </Link>
              </SheetClose>
            );
          })}
        </nav>
        {footer ? <div className="border-t px-4 py-5" style={{ borderColor: "var(--color-border)" }}>{footer}</div> : null}
      </SheetContent>
    </Sheet>
  );
};

