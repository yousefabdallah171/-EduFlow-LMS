import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        /* Brand */
        brand: {
          50:  "#f8fde8",
          100: "#effcc7",
          200: "#ddf998",
          300: "#c6f062",
          400: "#aee23a",
          500: "#93d11f",
          600: "#7cbb12",
          700: "#628f12",
          800: "#4f7014",
          900: "#425d15"
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
        sans: ["Manrope", "system-ui", "sans-serif"],
        display: ["Sora", "Manrope", "system-ui", "sans-serif"],
        arabic: ["Cairo", "sans-serif"],
        "arabic-display": ["Noto Kufi Arabic", "Cairo", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"]
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
        "page-gradient-light": "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(163,230,53,0.1), transparent)",
        "page-gradient-dark":  "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(163,230,53,0.14), transparent)"
      }
    }
  },
  plugins: []
};

export default config;
