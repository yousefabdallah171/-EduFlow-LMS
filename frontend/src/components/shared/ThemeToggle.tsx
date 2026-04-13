import { Switch } from "@headlessui/react";

import { useThemeStore } from "@/stores/theme.store";

export const ThemeToggle = () => {
  const { theme, setTheme } = useThemeStore();
  const checked = theme === "dark";

  return (
    <label
      className="flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-surface2"
      style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)", backgroundColor: "var(--color-surface)" }}
    >
      <span className="text-xs">{checked ? "🌙" : "☀"}</span>
      <Switch
        aria-label="Toggle dark mode"
        checked={checked}
        onChange={(nextChecked: boolean) => setTheme(nextChecked ? "dark" : "light")}
        className={[
          "relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors",
          checked ? "bg-brand-600" : "bg-slate-300 dark:bg-slate-600"
        ].join(" ")}
      >
        <span
          aria-hidden="true"
          className={[
            "inline-block size-4 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-4" : "translate-x-0.5"
          ].join(" ")}
        />
      </Switch>
    </label>
  );
};
