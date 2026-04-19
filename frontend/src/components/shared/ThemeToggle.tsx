import { MoonStar, SunMedium } from "lucide-react";

import { useThemeStore } from "@/stores/theme.store";
import { useAuthStore } from "@/stores/auth.store";
import { api } from "@/lib/api";

export const ThemeToggle = () => {
  const { theme, setTheme } = useThemeStore();
  const { user, updateUser } = useAuthStore();

  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);

    if (user && user.role === "STUDENT") {
      updateUser({ theme: next });
      void api.patch("/student/profile", { theme: next }).catch(() => {});
    }
  };

  return (
    <button
      aria-label="Toggle theme"
      className="inline-flex items-center justify-center rounded-2xl px-3 py-2 text-sm transition-colors hover:bg-surface2"
      style={{
        backgroundColor: "var(--color-surface)",
        color: "var(--color-text-primary)"
      }}
      onClick={toggle}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      type="button"
    >
      {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
    </button>
  );
};
