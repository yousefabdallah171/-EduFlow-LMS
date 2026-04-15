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

    // Save to account if logged in
    if (user && user.role === "STUDENT") {
      updateUser({ locale: next });
      void api.patch("/student/profile", { locale: next }).catch(() => {/* non-blocking */});
    }
  };

  return (
    <button
      aria-label="Switch language"
      className="rounded-lg border px-3 py-2 text-sm font-semibold transition-colors hover:bg-surface2"
      style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)", backgroundColor: "var(--color-surface)" }}
      onClick={toggle}
      type="button"
    >
      {locale === "ar" ? "EN" : "AR"}
    </button>
  );
};
