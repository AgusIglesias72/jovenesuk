"use client";

/*
 * Herramienta interna de iteración de diseño (NO es para el público).
 * Aparece solo si se entra con ?tweak en la URL; una vez activada queda
 * disponible vía localStorage hasta que se cierre con "Ocultar".
 *
 * - Colores: switchea verde de marca + acentos y recalcula escalas derivadas.
 * - Forma y profundidad: redondez de bordes, intensidad de sombras y ángulo
 *   de los gradientes (con preview).
 * - Tipografía: previsualiza fuentes display/body cargadas on-demand.
 * - Textos: edita en vivo los copys marcados con data-tweak-text en el DOM.
 *
 * "Copiar estilos" exporta el bloque CSS para studio/tokens.css; "Copiar
 * fuentes" exporta el snippet de next/font para src/app/layout.tsx.
 */

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "juk-tweak-settings";
const ENABLED_KEY = "juk-tweak-enabled";

type Settings = {
  brand: string;
  accent: string;
  honey: string;
  page: string;
  display: string;
  body: string;
  radius: number;
  shadow: number;
  gradAngle: number;
  texts: Record<string, string>;
};

const DEFAULTS: Settings = {
  brand: "#1f6f63",
  accent: "#ff8a5b",
  honey: "#f7b955",
  page: "#fbf7f2",
  display: "Bricolage Grotesque",
  body: "Plus Jakarta Sans",
  radius: 1,
  shadow: 1,
  gradAngle: 135,
  texts: {},
};

/* ── fuentes disponibles (curadas) ───────────────────────────────────── */

type FontDef = { family: string; nextName: string; weights: number[] };

const DISPLAY_FONTS: FontDef[] = [
  { family: "Bricolage Grotesque", nextName: "Bricolage_Grotesque", weights: [400, 500, 600, 700, 800] },
  { family: "Fraunces", nextName: "Fraunces", weights: [400, 500, 600, 700] },
  { family: "Space Grotesk", nextName: "Space_Grotesk", weights: [400, 500, 600, 700] },
  { family: "Sora", nextName: "Sora", weights: [400, 500, 600, 700, 800] },
  { family: "Unbounded", nextName: "Unbounded", weights: [400, 500, 600, 700, 800] },
  { family: "Outfit", nextName: "Outfit", weights: [400, 500, 600, 700, 800] },
  { family: "Epilogue", nextName: "Epilogue", weights: [400, 500, 600, 700, 800] },
];

const BODY_FONTS: FontDef[] = [
  { family: "Plus Jakarta Sans", nextName: "Plus_Jakarta_Sans", weights: [400, 500, 600, 700] },
  { family: "Outfit", nextName: "Outfit", weights: [400, 500, 600, 700] },
  { family: "Work Sans", nextName: "Work_Sans", weights: [400, 500, 600, 700] },
  { family: "DM Sans", nextName: "DM_Sans", weights: [400, 500, 600, 700] },
  { family: "Figtree", nextName: "Figtree", weights: [400, 500, 600, 700] },
  { family: "Hanken Grotesk", nextName: "Hanken_Grotesk", weights: [400, 500, 600, 700] },
];

const FALLBACK_FONT: FontDef = {
  family: "Bricolage Grotesque",
  nextName: "Bricolage_Grotesque",
  weights: [400, 500, 600, 700, 800],
};

function findFont(family: string): FontDef {
  return [...DISPLAY_FONTS, ...BODY_FONTS].find((f) => f.family === family) ?? FALLBACK_FONT;
}

function googleFontsHref(): string {
  const seen = new Map<string, number[]>();
  for (const f of [...DISPLAY_FONTS, ...BODY_FONTS]) {
    if (!seen.has(f.family)) seen.set(f.family, f.weights);
  }
  const families = [...seen.entries()].map(
    ([family, weights]) => `family=${family.replace(/ /g, "+")}:wght@${weights.join(";")}`,
  );
  return `https://fonts.googleapis.com/css2?${families.join("&")}&display=swap`;
}

/* ── utilidades de color ─────────────────────────────────────────────── */

type Hsl = { h: number; s: number; l: number };

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const v = hex.replace("#", "");
  const n = parseInt(v.length === 3 ? v.replace(/(.)/g, "$1$1") : v, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function hexToHsl(hex: string): Hsl {
  const { r, g, b } = hexToRgb(hex);
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case rn:
        h = ((gn - bn) / d) % 6;
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s, l };
}

function hslToHex({ h, s, l }: Hsl): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g] = [c, x];
  else if (h < 120) [r, g] = [x, c];
  else if (h < 180) [g, b] = [c, x];
  else if (h < 240) [g, b] = [x, c];
  else if (h < 300) [r, b] = [x, c];
  else [r, b] = [c, x];
  const to = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function rgba(hex: string, a: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

const BRAND_S = hexToHsl(DEFAULTS.brand).s;
const ACCENT_S = hexToHsl(DEFAULTS.accent).s;
const HONEY_S = hexToHsl(DEFAULTS.honey).s;

const RADIUS_BASE: Record<string, number> = {
  "--r-xs": 6,
  "--r-sm": 10,
  "--r-md": 14,
  "--r-lg": 20,
  "--r-xl": 28,
};

function buildStyleVars(p: Settings): Record<string, string> {
  const brand = hexToHsl(p.brand);
  const bf = brand.s / BRAND_S;
  const bStop = (s: number, l: number) => hslToHex({ h: brand.h, s: clamp01(s * bf), l });
  const b900 = bStop(0.42, 0.17);
  const b700 = bStop(0.52, 0.34);
  const b600 = bStop(0.51, 0.4);
  const b500 = bStop(0.45, 0.49);
  const b300 = bStop(0.45, 0.74);
  const b100 = bStop(0.46, 0.9);
  const b50 = bStop(0.45, 0.95);
  const inverse = hslToHex({ h: brand.h, s: clamp01(0.42 * bf), l: 0.16 });

  const accent = hexToHsl(p.accent);
  const af = accent.s / ACCENT_S;
  const aStop = (s: number, l: number) => hslToHex({ h: accent.h, s: clamp01(s * af), l });
  const a600 = aStop(0.9, 0.6);
  const a300 = aStop(1, 0.83);
  const aSoft = aStop(1, 0.93);

  const honey = hexToHsl(p.honey);
  const hf = honey.s / HONEY_S;
  const hStop = (s: number, l: number) => hslToHex({ h: honey.h, s: clamp01(s * hf), l });
  const hSoft = hStop(0.92, 0.9);

  const ang = p.gradAngle;
  const sf = p.shadow;
  const o = (n: number) => +(n * sf).toFixed(3);

  const vars: Record<string, string> = {
    "--c-brand": p.brand,
    "--c-brand-700": b700,
    "--c-brand-600": b600,
    "--c-brand-500": b500,
    "--c-brand-300": b300,
    "--c-brand-100": b100,
    "--c-brand-50": b50,
    "--c-border-brand": b300,
    "--c-surface-inverse": inverse,
    "--c-ring": rgba(p.brand, 0.12),

    "--c-accent": p.accent,
    "--c-accent-600": a600,
    "--c-accent-300": a300,
    "--c-accent-soft": aSoft,

    "--c-honey": p.honey,
    "--c-honey-soft": hSoft,

    "--c-page": p.page,

    "--grad-brand": `linear-gradient(${ang}deg, ${b700} 0%, ${p.brand} 60%, ${b900} 100%)`,
    "--grad-warm": `linear-gradient(${ang}deg, ${p.accent} 0%, ${p.honey} 100%)`,

    "--shadow-soft": `0 2px 8px rgba(33, 48, 45, ${o(0.05)})`,
    "--shadow-1": `0 2px 10px rgba(33, 48, 45, ${o(0.06)}), 0 1px 3px rgba(33, 48, 45, ${o(0.04)})`,
    "--shadow-2": `0 12px 30px rgba(33, 48, 45, ${o(0.08)}), 0 3px 8px rgba(33, 48, 45, ${o(0.05)})`,
    "--shadow-3": `0 24px 60px rgba(23, 63, 58, ${o(0.14)}), 0 8px 18px rgba(33, 48, 45, ${o(0.06)})`,
    "--shadow-brand": `0 12px 28px ${rgba(p.brand, o(0.28))}`,
    "--shadow-accent": `0 10px 24px ${rgba(p.accent, o(0.32))}`,
    "--ring-focus": `0 0 0 4px ${rgba(p.brand, 0.18)}`,
    "--ring-accent": `0 0 0 4px ${rgba(p.accent, 0.22)}`,
  };

  for (const [k, base] of Object.entries(RADIUS_BASE)) {
    vars[k] = `${Math.round(base * p.radius)}px`;
  }

  return vars;
}

function buildFontVars(p: Settings): Record<string, string> {
  return {
    "--font-display": `"${p.display}", system-ui, sans-serif`,
    "--font-body": `"${p.body}", system-ui, sans-serif`,
  };
}

function applyVars(vars: Record<string, string>) {
  for (const [k, v] of Object.entries(vars)) {
    document.body.style.setProperty(k, v);
  }
}

function clearVars(vars: Record<string, string>) {
  for (const k of Object.keys(vars)) {
    document.body.style.removeProperty(k);
  }
}

function fontSnippet(p: Settings): string {
  const display = findFont(p.display);
  const body = findFont(p.body);
  const wl = (w: number[]) => w.map((n) => `"${n}"`).join(", ");
  const sameFont = display.nextName === body.nextName;
  const imports = sameFont
    ? `import { ${display.nextName}, Space_Mono } from "next/font/google";`
    : `import { ${display.nextName}, ${body.nextName}, Space_Mono } from "next/font/google";`;
  const displayDecl = `const display = ${display.nextName}({\n  subsets: ["latin"],\n  weight: [${wl(display.weights)}],\n  variable: "--font-display",\n});`;
  const bodyDecl = `const body = ${body.nextName}({\n  subsets: ["latin"],\n  weight: [${wl(body.weights)}],\n  variable: "--font-body",\n});`;
  return `${imports}\n\n${displayDecl}\n${bodyDecl}`;
}

/* ── componente ──────────────────────────────────────────────────────── */

const COLOR_FIELDS: Array<{ key: keyof Settings; label: string }> = [
  { key: "brand", label: "Verde principal" },
  { key: "accent", label: "Durazno (acento)" },
  { key: "honey", label: "Miel (acento 2)" },
  { key: "page", label: "Fondo de página" },
];

type TextField = { id: string; label: string; original: string };

export function DesignTweaker() {
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(true);
  const [settings, setSettings] = useState<Settings>(() => {
    if (typeof window === "undefined") return DEFAULTS;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return { ...DEFAULTS, ...(JSON.parse(saved) as Partial<Settings>) };
      } catch {
        /* ignorar JSON inválido */
      }
    }
    return DEFAULTS;
  });
  const [copied, setCopied] = useState<"" | "estilos" | "fuentes">("");
  const [textFields, setTextFields] = useState<TextField[]>([]);
  const originals = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("tweak")) {
      window.localStorage.setItem(ENABLED_KEY, "1");
    }
    // Inicialización client-only desde localStorage/URL (no hay equivalente SSR).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnabled(window.localStorage.getItem(ENABLED_KEY) === "1");
  }, []);

  // Carga on-demand del set de fuentes (solo con la herramienta activa).
  useEffect(() => {
    if (!enabled) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = googleFontsHref();
    document.head.appendChild(link);
    return () => {
      if (document.head.contains(link)) document.head.removeChild(link);
    };
  }, [enabled]);

  // Aplicar estilos (colores, forma, fuentes).
  useEffect(() => {
    if (!enabled) return;
    const vars = { ...buildStyleVars(settings), ...buildFontVars(settings) };
    applyVars(vars);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    return () => clearVars(vars);
  }, [enabled, settings]);

  // Escanear y aplicar textos editables (data-tweak-text) en la página actual.
  useEffect(() => {
    if (!enabled) return;
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>("[data-tweak-text]"),
    );
    const fields: TextField[] = [];
    for (const el of nodes) {
      const id = el.dataset.tweakText;
      if (!id) continue;
      if (!originals.current.has(id)) {
        originals.current.set(id, (el.textContent ?? "").trim());
      }
      const original = originals.current.get(id) ?? "";
      const custom = settings.texts[id];
      const target = custom && custom.length > 0 ? custom : original;
      if ((el.textContent ?? "").trim() !== target) {
        el.textContent = target;
      }
      fields.push({ id, label: el.dataset.tweakLabel ?? id, original });
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTextFields(fields);
  }, [enabled, settings.texts, pathname]);

  if (!enabled) return null;

  const styleCss = Object.entries(buildStyleVars(settings))
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n");

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  function setText(id: string, value: string) {
    setSettings((s) => ({ ...s, texts: { ...s.texts, [id]: value } }));
  }

  function restoreTexts() {
    for (const [id, original] of originals.current.entries()) {
      const el = document.querySelector<HTMLElement>(`[data-tweak-text="${id}"]`);
      if (el) el.textContent = original;
    }
  }

  function reset() {
    setSettings(DEFAULTS);
    window.localStorage.removeItem(STORAGE_KEY);
  }

  function hide() {
    clearVars({ ...buildStyleVars(settings), ...buildFontVars(settings) });
    restoreTexts();
    window.localStorage.removeItem(ENABLED_KEY);
    setEnabled(false);
  }

  async function copy(what: "estilos" | "fuentes") {
    const text = what === "estilos" ? styleCss : fontSnippet(settings);
    await navigator.clipboard.writeText(text);
    setCopied(what);
    window.setTimeout(() => setCopied(""), 1500);
  }

  const sectionTitle = "font-[family-name:var(--font-mono)] text-[length:var(--t-label)] font-bold uppercase tracking-[0.14em] text-[var(--c-ink-subtle)]";
  const outlineBtn =
    "w-full rounded-[var(--r-pill)] border border-[var(--c-border-strong)] px-3 py-2 text-[length:var(--t-small)] font-semibold text-[var(--c-ink)] hover:bg-[var(--c-surface-2)]";

  return (
    <div className="fixed bottom-4 right-4 z-[100] font-[family-name:var(--font-body)]">
      {open ? (
        <div className="flex max-h-[88vh] w-72 flex-col overflow-hidden rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] shadow-[shadow:var(--shadow-3)]">
          <div className="flex items-center justify-between px-4 pt-4">
            <p className="font-[family-name:var(--font-display)] text-sm font-bold text-[var(--c-ink)]">
              Ajustar diseño
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--c-ink-subtle)] hover:bg-[var(--c-surface-2)] hover:text-[var(--c-ink)]"
              aria-label="Minimizar"
            >
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 8h10" />
              </svg>
            </button>
          </div>

          <div className="overflow-y-auto px-4 pb-4">
            <p className="mt-1 text-[length:var(--t-label)] leading-snug text-[var(--c-ink-subtle)]">
              Herramienta interna. Los cambios se ven solo en este navegador.
            </p>

            {/* Colores */}
            <p className={`mt-4 ${sectionTitle}`}>Colores</p>
            <div className="mt-2.5 space-y-2.5">
              {COLOR_FIELDS.map((f) => (
                <label key={f.key} className="flex items-center justify-between gap-3">
                  <span className="text-[length:var(--t-small)] text-[var(--c-ink-muted)]">{f.label}</span>
                  <span className="flex items-center gap-2">
                    <span className="font-[family-name:var(--font-mono)] text-[length:var(--t-label)] uppercase text-[var(--c-ink-subtle)]">
                      {String(settings[f.key])}
                    </span>
                    <input
                      type="color"
                      value={String(settings[f.key])}
                      onChange={(e) => update(f.key, e.target.value as Settings[typeof f.key])}
                      className="h-7 w-9 cursor-pointer rounded-[var(--r-xs)] border border-[var(--c-border)] bg-transparent p-0.5"
                      aria-label={f.label}
                    />
                  </span>
                </label>
              ))}
            </div>

            <div className="my-4 border-t border-[var(--c-border)]" />

            {/* Forma y profundidad */}
            <p className={sectionTitle}>Forma y profundidad</p>
            <div className="mt-2.5 space-y-3">
              <Slider
                label="Redondez"
                value={settings.radius}
                min={0.4}
                max={1.8}
                step={0.1}
                suffix="×"
                onChange={(v) => update("radius", v)}
              />
              <Slider
                label="Sombras"
                value={settings.shadow}
                min={0}
                max={2.5}
                step={0.1}
                suffix="×"
                onChange={(v) => update("shadow", v)}
              />
              <Slider
                label="Ángulo gradiente"
                value={settings.gradAngle}
                min={0}
                max={360}
                step={5}
                suffix="°"
                onChange={(v) => update("gradAngle", v)}
              />
              <div className="flex gap-2 pt-0.5">
                <GradSwatch grad="var(--grad-warm)" label="Cálido" />
                <GradSwatch grad="var(--grad-brand)" label="Marca" />
              </div>
            </div>
            <button
              type="button"
              onClick={() => copy("estilos")}
              className="mt-3 w-full rounded-[var(--r-pill)] bg-[var(--c-brand)] px-3 py-2 text-[length:var(--t-small)] font-semibold text-[var(--c-ink-onbrand)] hover:bg-[var(--c-brand-700)]"
            >
              {copied === "estilos" ? "¡Copiado!" : "Copiar estilos (CSS)"}
            </button>

            <div className="my-4 border-t border-[var(--c-border)]" />

            {/* Tipografía */}
            <p className={sectionTitle}>Tipografía</p>
            <div className="mt-2.5 space-y-2.5">
              <label className="block">
                <span className="text-[length:var(--t-small)] text-[var(--c-ink-muted)]">Títulos (display)</span>
                <select
                  value={settings.display}
                  onChange={(e) => update("display", e.target.value)}
                  className="mt-1 w-full cursor-pointer rounded-[var(--r-sm)] border border-[var(--c-border)] bg-[var(--c-surface-3)] px-2.5 py-2 text-[length:var(--t-small)] text-[var(--c-ink)]"
                >
                  {DISPLAY_FONTS.map((f) => (
                    <option key={f.family} value={f.family}>
                      {f.family}
                      {f.family === DEFAULTS.display ? " (actual)" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-[length:var(--t-small)] text-[var(--c-ink-muted)]">Cuerpo (body)</span>
                <select
                  value={settings.body}
                  onChange={(e) => update("body", e.target.value)}
                  className="mt-1 w-full cursor-pointer rounded-[var(--r-sm)] border border-[var(--c-border)] bg-[var(--c-surface-3)] px-2.5 py-2 text-[length:var(--t-small)] text-[var(--c-ink)]"
                >
                  {BODY_FONTS.map((f) => (
                    <option key={f.family} value={f.family}>
                      {f.family}
                      {f.family === DEFAULTS.body ? " (actual)" : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button type="button" onClick={() => copy("fuentes")} className={`mt-3 ${outlineBtn}`}>
              {copied === "fuentes" ? "¡Copiado!" : "Copiar fuentes (código)"}
            </button>
            <p className="mt-1.5 text-[length:var(--t-label)] leading-snug text-[var(--c-ink-subtle)]">
              Pegá el snippet en src/app/layout.tsx para fijar la tipografía.
            </p>

            <div className="my-4 border-t border-[var(--c-border)]" />

            {/* Textos */}
            <p className={sectionTitle}>Textos de esta página</p>
            {textFields.length === 0 ? (
              <p className="mt-2 text-[length:var(--t-small)] leading-snug text-[var(--c-ink-subtle)]">
                No hay textos editables marcados en esta página.
              </p>
            ) : (
              <div className="mt-2.5 space-y-2.5">
                {textFields.map((f) => (
                  <label key={f.id} className="block">
                    <span className="text-[length:var(--t-small)] text-[var(--c-ink-muted)]">{f.label}</span>
                    <textarea
                      value={settings.texts[f.id] ?? f.original}
                      onChange={(e) => setText(f.id, e.target.value)}
                      rows={2}
                      className="mt-1 w-full resize-none rounded-[var(--r-sm)] border border-[var(--c-border)] bg-[var(--c-surface-3)] px-2.5 py-1.5 text-[length:var(--t-small)] leading-snug text-[var(--c-ink)]"
                    />
                  </label>
                ))}
                <p className="text-[length:var(--t-label)] leading-snug text-[var(--c-ink-subtle)]">
                  Para fijarlos, llevá el texto final al componente en src/app/(public)/sections.tsx.
                </p>
              </div>
            )}

            <div className="my-4 border-t border-[var(--c-border)]" />

            <div className="flex gap-2">
              <button type="button" onClick={reset} className={outlineBtn}>
                Restablecer
              </button>
              <button
                type="button"
                onClick={hide}
                className="flex-1 rounded-[var(--r-pill)] px-3 py-2 text-[length:var(--t-small)] font-semibold text-[var(--c-ink-subtle)] underline hover:text-[var(--c-ink-muted)]"
              >
                Ocultar
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--c-brand)] text-[var(--c-ink-onbrand)] shadow-[shadow:var(--shadow-2)] hover:bg-[var(--c-brand-700)]"
          aria-label="Ajustar diseño"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="3.2" />
            <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between">
        <span className="text-[length:var(--t-small)] text-[var(--c-ink-muted)]">{label}</span>
        <span className="font-[family-name:var(--font-mono)] text-[length:var(--t-label)] text-[var(--c-ink-subtle)]">
          {value}
          {suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full cursor-pointer accent-[var(--c-brand)]"
      />
    </label>
  );
}

function GradSwatch({ grad, label }: { grad: string; label: string }) {
  return (
    <span className="flex-1">
      <span className="block h-8 rounded-[var(--r-sm)] border border-[var(--c-border)]" style={{ backgroundImage: grad }} />
      <span className="mt-1 block text-center font-[family-name:var(--font-mono)] text-[length:var(--t-label)] text-[var(--c-ink-subtle)]">
        {label}
      </span>
    </span>
  );
}
