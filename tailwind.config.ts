import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Plus Jakarta Sans", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        /* ── Theme-aware surface tokens ─────────────────────
           These map to CSS vars so dark/light is automatic.
           Use: bg-theme-page, text-theme-fg, border-theme, etc.
        ────────────────────────────────────────────────── */
        theme: {
          page:    "hsl(var(--bg))",
          surface: "hsl(var(--surface))",
          raised:  "hsl(var(--surface-raised))",
          overlay: "hsl(var(--surface-overlay))",
          fg:      "hsl(var(--fg))",
          muted:   "hsl(var(--fg-muted))",
          subtle:  "hsl(var(--fg-subtle))",
          border:  "hsl(var(--border))",
          strong:  "hsl(var(--border-strong))",
          primary: "hsl(var(--primary))",
          ring:    "hsl(var(--ring))",
          input:   "hsl(var(--input-bg))",
          "input-border": "hsl(var(--input-border))",
          /* sidebar */
          "sidebar-bg":     "hsl(var(--sidebar-bg))",
          "sidebar-border": "hsl(var(--sidebar-border))",
          "sidebar-active": "hsl(var(--sidebar-active-bg))",
          "sidebar-active-fg": "hsl(var(--sidebar-active-fg))",
          "sidebar-hover":  "hsl(var(--sidebar-hover-bg))",
          /* semantic */
          "success-bg": "hsl(var(--success-bg))",
          "success-fg": "hsl(var(--success-fg))",
          "warning-bg": "hsl(var(--warning-bg))",
          "warning-fg": "hsl(var(--warning-fg))",
          "danger-bg":  "hsl(var(--danger-bg))",
          "danger-fg":  "hsl(var(--danger-fg))",
          "info-bg":    "hsl(var(--info-bg))",
          "info-fg":    "hsl(var(--info-fg))",
          "purple-bg":  "hsl(var(--purple-bg))",
          "purple-fg":  "hsl(var(--purple-fg))",
        },
        brand: {
          50:  "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
        },
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
      },
    },
  },
  plugins: [],
};

export default config;
