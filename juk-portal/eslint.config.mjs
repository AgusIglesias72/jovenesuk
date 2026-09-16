import next from "eslint-config-next";

/**
 * Guarda de tokens del design system.
 *
 * La dirección STUDIO vive en src/styles/tokens.css: un color de la paleta
 * default de Tailwind (gray-500, amber-100…), un hex suelto o una clase puente
 * juk-navy-* NO sigue a los tokens, así que cambiar tokens.css deja de restilar
 * esa pantalla. La regla marca los tres casos.
 *
 * Alcance real: solo literales de string adentro de `className` (incluye los
 * argumentos de `cn(...)`, porque el selector es descendiente). Un template
 * string con interpolación se le escapa; para eso está el grep de /juk-cierre.
 *
 * Está en "warn" a propósito mientras dura la migración de pantallas (fase 4.1):
 * apenas queden 0 avisos hay que subirla a "error" y borrar el puente de colores
 * de tailwind.config.ts.
 */
const PALETA_DEFAULT =
  "gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";

const PREFIJOS_DE_COLOR =
  "bg|text|border|ring|divide|from|via|to|fill|stroke|shadow|outline|decoration|placeholder|accent|caret";

const CLASSNAME = 'JSXAttribute[name.name="className"]';

const reglasDeTokens = {
  files: ["src/app/**/*.tsx", "src/components/**/*.tsx"],
  rules: {
    "no-restricted-syntax": [
      "warn",
      {
        selector: String.raw`${CLASSNAME} Literal[value=/(^|[^a-z-])(${PREFIJOS_DE_COLOR})-(${PALETA_DEFAULT})-[0-9]/]`,
        message:
          "Paleta default de Tailwind. Usá los tokens STUDIO: text-[var(--c-ink-muted)], border-[var(--c-border)], bg-[var(--c-surface-2)]… (src/styles/tokens.css).",
      },
      {
        selector: String.raw`${CLASSNAME} Literal[value=/#[0-9a-fA-F]{3}/]`,
        message:
          "Hex hardcodeado en una clase. Usá el token que corresponda de src/styles/tokens.css.",
      },
      {
        selector: String.raw`${CLASSNAME} Literal[value=/juk-(navy|coral|gold)-[0-9]/]`,
        message:
          "juk-navy/coral/gold-* es el puente de migración de tailwind.config.ts (hex congelados, no siguen a tokens.css). Migrá a var(--c-*).",
      },
    ],
  },
};

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      // Build del server de `npm run ci:local` (NEXT_DIST_DIR): son los mismos
      // archivos generados que `.next`, y sin esto el lint los analiza.
      ".next-e2e/**",
      "node_modules/**",
      "drizzle/**",
      "docs/**",
      "test-results/**",
      "playwright-report/**",
      "coverage/**",
      "next-env.d.ts",
    ],
  },
  ...next,
  reglasDeTokens,
];

export default eslintConfig;
