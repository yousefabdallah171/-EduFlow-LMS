import { Languages } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { useLocaleStore } from "@/stores/locale.store";
import { useAuthStore } from "@/stores/auth.store";
import { api } from "@/lib/api";

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
  const { user, updateUser } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const toggle = () => {
    const next = locale === "en" ? "ar" : "en";
    setLocale(next);
    navigate(`${replaceLocaleInPathname(location.pathname, next)}${location.search}${location.hash}`, { replace: true });

    if (user && user.role === "STUDENT") {
      updateUser({ locale: next });
      void api.patch("/student/profile", { locale: next }).catch(() => {});
    }
  };

  const currentLabel = locale === "ar" ? "العربية" : "English";
  const currentFlag = locale === "ar" ? "🇪🇬" : "🇺🇸";

  return (
    <button
      aria-label={`Switch language (current: ${currentLabel})`}
      className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold transition-colors hover:bg-surface2"
      style={{
        color: "var(--color-text-primary)",
        backgroundColor: "var(--color-surface)"
      }}
      onClick={toggle}
      title={locale === "ar" ? "Switch to English" : "التبديل إلى العربية"}
      type="button"
    >
      <Languages className="h-4 w-4" />
      <span className="text-base leading-none" aria-hidden="true">{currentFlag}</span>
      <span>{locale === "ar" ? "EN" : "AR"}</span>
    </button>
  );
};
