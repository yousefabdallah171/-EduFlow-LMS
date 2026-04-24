import { MoonStar, SunMedium } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useThemeStore } from "@/stores/theme.store";
import { useAuthStore } from "@/stores/auth.store";
import { api } from "@/lib/api";

export const ThemeToggle = () => {
  const { theme, setTheme } = useThemeStore();
  const { user, updateUser } = useAuthStore();
  const { t } = useTranslation();

  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);

    if (user && user.role === "STUDENT") {
      updateUser({ theme: next });
      void api.patch("/student/profile", { theme: next }).catch(() => {});
    }
  };

  const label = theme === "dark" ? t("common.switchToLightMode") : t("common.switchToDarkMode");

  return (
    <button
      aria-label={label}
      className="inline-flex items-center justify-center rounded-2xl border px-3 py-2 text-sm transition-colors hover:bg-surface2"
      style={{
        backgroundColor: "var(--color-surface)",
        borderColor: "var(--color-border-strong)",
        color: theme === "dark" ? "var(--color-brand)" : "var(--color-text-primary)"
      }}
      onClick={toggle}
      title={label}
      type="button"
    >
      {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
    </button>
  );
};
