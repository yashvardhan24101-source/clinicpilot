import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1200px",
      },
    },
    extend: {
      colors: {
        surface: {
          0: "var(--surface-0)",
          1: "var(--surface-1)",
          2: "var(--surface-2)",
          glass: "var(--surface-glass)",
        },
        ink: {
          DEFAULT: "var(--ink)",
          soft: "var(--ink-soft)",
          faint: "var(--ink-faint)",
        },
        line: {
          DEFAULT: "var(--line)",
          subtle: "var(--line-subtle)",
        },
        signal: {
          DEFAULT: "var(--signal)",
          glow: "var(--signal-glow)",
          subtle: "var(--signal-subtle)",
          hover: "var(--signal-hover)",
        },
        ok: {
          DEFAULT: "var(--ok)",
          subtle: "var(--ok-subtle)",
          foreground: "var(--ok-foreground)",
        },
        warn: {
          DEFAULT: "var(--warn)",
          subtle: "var(--warn-subtle)",
          foreground: "var(--warn-foreground)",
        },
        alert: {
          DEFAULT: "var(--alert)",
          subtle: "var(--alert-subtle)",
          foreground: "var(--alert-foreground)",
        },
      },
      fontFamily: {
        display: ["var(--font-sora)", "system-ui", "sans-serif"],
        body: ["var(--font-figtree)", "var(--font-noto-devanagari)", "system-ui", "sans-serif"],
        devanagari: ["var(--font-noto-devanagari)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "12px",
        xl: "16px",
        "2xl": "20px",
        full: "9999px",
      },
      boxShadow: {
        subtle: "0 1px 3px rgba(13, 27, 42, 0.04), 0 1px 2px rgba(13, 27, 42, 0.02)",
        elevation: "0 10px 25px -5px rgba(13, 27, 42, 0.08), 0 8px 10px -6px rgba(13, 27, 42, 0.04)",
        glow: "0 0 16px var(--signal-glow)",
      },
      keyframes: {
        "pulse-subtle": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.85", transform: "scale(1.06)" },
        },
        "slide-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "slide-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "pulse-subtle": "pulse-subtle 2.5s ease-in-out infinite",
        "slide-down": "slide-down 0.2s ease-out",
        "slide-up": "slide-up 0.2s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
