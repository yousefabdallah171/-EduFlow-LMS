import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { useLocation, useNavigate } from "react-router-dom";

import { useLocaleStore } from "@/stores/locale.store";

const locales = [
  { id: "en" as const, label: "English" },
  { id: "ar" as const, label: "العربية" }
];

const replaceLocaleInPathname = (pathname: string, locale: "en" | "ar") => {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "en" || parts[0] === "ar") {
    parts[0] = locale;
  } else {
    parts.unshift(locale);
  }

  return `/${parts.join("/")}`;
};

export const LanguageSwitcher = () => {
  const { locale, setLocale } = useLocaleStore();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Menu as="div" className="relative">
      <MenuButton
        className="rounded-lg border px-3 py-2 text-sm font-semibold transition-colors hover:bg-surface2"
        style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)", backgroundColor: "var(--color-surface)" }}
      >
        {locale === "ar" ? "AR" : "EN"}
      </MenuButton>
      <MenuItems
        anchor="bottom end"
        className="z-40 mt-2 w-40 rounded-xl border p-1 shadow-elevated focus:outline-none"
        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border-strong)" }}
      >
        {locales.map((item) => (
          <MenuItem key={item.id}>
            {({ focus }) => (
              <button
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                style={{
                  backgroundColor: focus ? "var(--color-surface-2)" : "transparent",
                  color: locale === item.id ? "var(--color-brand)" : "var(--color-text-primary)"
                }}
                onClick={() => {
                  setLocale(item.id);
                  navigate(`${replaceLocaleInPathname(location.pathname, item.id)}${location.search}${location.hash}`);
                }}
                type="button"
              >
                <span>{item.label}</span>
                {locale === item.id ? <span aria-hidden="true" className="text-brand-600">●</span> : null}
              </button>
            )}
          </MenuItem>
        ))}
      </MenuItems>
    </Menu>
  );
};
