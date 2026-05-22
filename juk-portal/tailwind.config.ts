import type { Config } from "tailwindcss";

/**
 * Tailwind config alineado con el JUK Design System.
 * Tokens completos en ../juk-design-system/tokens/tailwind.config.js
 */
const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "juk-navy": {
          50:  "#f5f8fd",
          100: "#ecf1fa",
          200: "#dbe5f4",
          300: "#c2d2ed",
          400: "#9ab4e2",
          500: "#6f95d6",
          600: "#4570bf",
          700: "#2d5198",
          800: "#1c3d75",
          900: "#122d5c",
          950: "#0A1F44",
        },
        "juk-coral": {
          50:  "#fdf3f2",
          100: "#fbe6e4",
          400: "#ee948f",
          500: "#e4726d",
          600: "#d4524d",
          700: "#b83d39",
        },
        "juk-gold": {
          50:  "#fdf9ec",
          100: "#fbf2db",
          500: "#e6b54d",
          600: "#c89a3a",
        },
      },
      fontFamily: {
        display: ['"Fraunces"', "Georgia", "serif"],
        sans:    ['"Inter"', "system-ui", "-apple-system", "sans-serif"],
        mono:    ['"JetBrains Mono"', '"SF Mono"', "Consolas", "monospace"],
      },
      boxShadow: {
        xs: "0 1px 2px rgba(10, 31, 68, 0.04)",
        sm: "0 1px 3px rgba(10, 31, 68, 0.06), 0 1px 2px rgba(10, 31, 68, 0.04)",
        md: "0 4px 12px rgba(10, 31, 68, 0.08), 0 2px 4px rgba(10, 31, 68, 0.04)",
        lg: "0 12px 32px rgba(10, 31, 68, 0.12), 0 4px 8px rgba(10, 31, 68, 0.06)",
        focus: "0 0 0 3px rgba(69, 112, 191, 0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
