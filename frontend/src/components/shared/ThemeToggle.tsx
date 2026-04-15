import { useThemeStore } from "@/stores/theme.store";
import { useAuthStore } from "@/stores/auth.store";
import { api } from "@/lib/api";

export const ThemeToggle = () => {
  const { theme, setTheme } = useThemeStore();
  const { user, updateUser } = useAuthStore();

  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);

    // Save to account if logged in
    if (user && user.role === "STUDENT") {
      updateUser({ theme: next });
      void api.patch("/student/profile", { theme: next }).catch(() => {/* non-blocking */});
    }
  };

  return (
    <button
      aria-label="Toggle theme"
      className="rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-surface2"
      style={{ borderColor: "var(--color-border-strong)", backgroundColor: "var(--color-surface)", color: "var(--color-text-primary)" }}
      onClick={toggle}
      type="button"
    >
      {theme === "dark" ? "☀" : "🌙"}
    </button>
  );
};
