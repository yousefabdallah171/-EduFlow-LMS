import type { ReactNode } from "react";
import { Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";

  return (
    <Disclosure as="div" className="md:hidden">
      <DisclosureButton
        className="rounded-xl border px-4 py-2 text-sm font-semibold transition-colors hover:bg-surface2"
        style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)", backgroundColor: "var(--color-surface)" }}
      >
        {t("nav.menu")}
      </DisclosureButton>
      <DisclosurePanel
        className="mt-3 rounded-2xl border p-3 shadow-elevated"
        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border-strong)" }}
      >
        <nav aria-label="Mobile navigation" className="space-y-1">
          {items.map((item) => {
            const target = `${prefix}${item.to}`;
            const active = location.pathname === target;

            return (
              <Link
                key={item.to}
                className={cn(
                  "block rounded-xl px-4 py-2.5 text-sm font-medium no-underline transition-colors",
                  active
                    ? "bg-brand-600/10 text-brand-600 dark:bg-brand-600/20 dark:text-brand-400"
                    : "hover:bg-surface2"
                )}
                style={active ? {} : { color: "var(--color-text-primary)" }}
                to={target}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        {footer ? <div className="mt-4">{footer}</div> : null}
      </DisclosurePanel>
    </Disclosure>
  );
};

