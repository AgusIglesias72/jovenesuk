import type { Config } from "tailwindcss";

/**
 * Tailwind config — dirección visual STUDIO.
 *
 * Fuente de verdad de los tokens: src/styles/tokens.css (.v-studio).
 * Las paletas `juk-*` son el PUENTE de migración: las clases viejas
 * (text-juk-navy-950, etc.) quedan mapeadas a los valores STUDIO para que toda
 * la app adopte la dirección sin tocar cada archivo. El código nuevo debería
 * usar las custom properties directamente (bg-[var(--c-surface)]).
 *
 * El puente son hex CONGELADOS: no siguen a tokens.css, así que hay que
 * borrarlo. Al 10/09/2026 quedan 32 usos en 13 archivos de (admin) —
 * `grep -rn "juk-\(navy\|coral\|gold\)" src/` tiene que dar 0 antes de sacar el
 * bloque `colors` de abajo (lo marca eslint.config.mjs con un warn).
 */
const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Ex "navy" → escala teal/tinta de STUDIO
        "juk-navy": {
          50:  "#eef9f5",   // --c-brand-50
          100: "#dcf2ec",   // --c-brand-100
          200: "#bfe6dd",
          300: "#9fd9cf",   // --c-brand-300
          400: "#5e6b67",   // ink-muted (eran tonos de texto secundario)
          500: "#46b3a0",   // --c-brand-500
          600: "#339a88",   // --c-brand-600
          700: "#1f6f63",   // --c-brand
          800: "#1b5f55",
          900: "#173f3a",   // --c-surface-inverse
          950: "#21302d",   // --c-ink (texto principal)
        },
        // Ex "coral" → durazno/danger de STUDIO
        "juk-coral": {
          50:  "#fff4ee",
          100: "#ffe8dc",   // --c-accent-soft
          400: "#ffc4a8",   // --c-accent-300
          500: "#ff8a5b",   // --c-accent
          600: "#f5713e",   // --c-accent-600
          700: "#d65151",   // --c-danger (se usaba para crítico)
        },
        // Ex "gold" → miel de STUDIO
        "juk-gold": {
          50:  "#fdf6e9",
          100: "#fdeccd",   // --c-honey-soft
          500: "#f7b955",   // --c-honey
          600: "#d08a16",   // --c-warning
        },
      },
      fontFamily: {
        display: ["var(--font-display)", '"Bricolage Grotesque"', "system-ui", "sans-serif"],
        sans:    ["var(--font-body)", '"Plus Jakarta Sans"', "system-ui", "sans-serif"],
        mono:    ["var(--font-mono)", '"Space Mono"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        xs: "var(--shadow-soft)",
        sm: "var(--shadow-1)",
        md: "var(--shadow-2)",
        lg: "var(--shadow-3)",
        focus: "var(--ring-focus)",
      },
      borderRadius: {
        // Radios grandes, el sello de STUDIO
        DEFAULT: "10px",
        md: "10px",
        lg: "14px",
        xl: "20px",
        "2xl": "28px",
      },
    },
  },
  plugins: [],
};

export default config;
