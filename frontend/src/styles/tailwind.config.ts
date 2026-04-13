import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        /* Brand */
        brand: {
          50:  "#fef2f2",
          100: "#fee2e2",
          200: "#fecaca",
          300: "#fca5a5",
          400: "#f87171",
          500: "#ef4444",
          600: "#EB2027",
          700: "#b91c1c",
          800: "#991b1b",
          900: "#7f1d1d"
        },
        /* Design token colors — these track CSS custom properties */
        page:       "var(--color-page)",
        surface:    "var(--color-surface)",
        surface2:   "var(--color-surface-2)",
        surface3:   "var(--color-surface-3)",
        invert:     "var(--color-invert)",
        invert2:    "var(--color-invert-2)",
        primary:    "var(--color-text-primary)",
        secondary:  "var(--color-text-secondary)",
        muted:      "var(--color-text-muted)"
      },
      fontFamily: {
        sans:   ["Inter", "system-ui", "sans-serif"],
        arabic: ["Noto Kufi Arabic", "sans-serif"]
      },
      boxShadow: {
        card:    "var(--shadow-card)",
        "card-hover": "var(--shadow-card-hover)",
        elevated: "var(--shadow-elevated)"
      },
      borderColor: {
        DEFAULT: "var(--color-border)",
        strong:  "var(--color-border-strong)"
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)"
      },
      backgroundImage: {
        "page-gradient-light": "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(235,32,39,0.08), transparent)",
        "page-gradient-dark":  "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(235,32,39,0.12), transparent)"
      }
    }
  },
  plugins: []
};

export default config;
