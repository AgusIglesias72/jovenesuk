import { Eyebrow, Mono } from "./ui";

const SWATCHES: Array<{ name: string; varName: string; ring?: boolean }> = [
  { name: "brand", varName: "--c-brand" },
  { name: "brand-soft", varName: "--c-brand-soft", ring: true },
  { name: "header", varName: "--c-header" },
  { name: "bg", varName: "--c-bg", ring: true },
  { name: "surface", varName: "--c-surface", ring: true },
  { name: "surface-3", varName: "--c-surface-3", ring: true },
  { name: "ink", varName: "--c-ink" },
  { name: "ink-3", varName: "--c-ink-3" },
  { name: "border", varName: "--c-border", ring: true },
  { name: "success", varName: "--c-success" },
  { name: "warning", varName: "--c-warning" },
  { name: "danger", varName: "--c-danger" },
  { name: "info", varName: "--c-info" },
];

const TYPE_SCALE = [
  { label: "Display 3xl", className: "font-[var(--font-display)] text-[length:var(--t-3xl)] font-[number:var(--fw-semibold)] tracking-[var(--ls-tight)]", sample: "60" },
  { label: "Display xl", className: "font-[var(--font-display)] text-[length:var(--t-xl)] font-[number:var(--fw-semibold)] tracking-[var(--ls-tight)]", sample: "Londres en Julio" },
  { label: "Body base", className: "font-[var(--font-body)] text-[length:var(--t-base)]", sample: "Texto de interfaz, denso y legible." },
  { label: "Mono sm", className: "font-[var(--font-mono)] text-[length:var(--t-sm)] tabular-nums", sample: "UK-2026-JUL-LONDON" },
  { label: "Caps 2xs", className: "text-[length:var(--t-2xs)] font-[number:var(--fw-semibold)] uppercase tracking-[var(--ls-caps)] text-[var(--c-ink-3)]", sample: "Etiqueta de sección" },
];

const RADII = [
  { name: "xs", varName: "--r-xs" },
  { name: "sm", varName: "--r-sm" },
  { name: "md", varName: "--r-md" },
  { name: "lg", varName: "--r-lg" },
];

export function TokenStrip() {
  return (
    <div className="border-b border-[var(--c-border)] bg-[var(--c-surface)]">
      <div className="mx-auto max-w-[1240px] px-[var(--s-6)] py-[var(--s-6)]">
        <div className="flex flex-wrap items-end justify-between gap-[var(--s-3)]">
          <div>
            <div className="flex items-center gap-[var(--s-3)]">
              <span className="grid size-[28px] place-items-center rounded-[var(--r-sm)] bg-[var(--c-header)] font-[var(--font-display)] text-[length:var(--t-md)] font-[number:var(--fw-bold)] text-[var(--c-brand-ink)]">
                J
              </span>
              <h1 className="font-[var(--font-display)] text-[length:var(--t-lg)] font-[number:var(--fw-semibold)] tracking-[var(--ls-tight)] text-[var(--c-ink)]">
                Dirección visual ·{" "}
                <span className="text-[var(--c-brand)]">Console</span>
              </h1>
            </div>
            <p className="mt-[var(--s-2)] max-w-[560px] text-[length:var(--t-sm)] text-[var(--c-ink-3)]">
              Consola de operaciones para el JUK Portal: densa, tabular, profesional. Un solo acento
              filoso sobre superficies gris-frío.
            </p>
          </div>
          <p className="rounded-[var(--r-sm)] border border-[var(--c-border-strong)] bg-[var(--c-surface-2)] px-[var(--s-3)] py-[var(--s-2)] text-[length:var(--t-xs)] text-[var(--c-ink-2)]">
            Editá{" "}
            <Mono className="font-[number:var(--fw-medium)] text-[var(--c-ink)]">
              src/app/design/console/tokens.css
            </Mono>{" "}
            para ajustar esta dirección.
          </p>
        </div>

        <div className="mt-[var(--s-6)] grid grid-cols-1 gap-[var(--s-6)] lg:grid-cols-[1.4fr_1.4fr_0.8fr]">
          {/* paleta */}
          <div>
            <Eyebrow>Paleta</Eyebrow>
            <div className="mt-[var(--s-3)] flex flex-wrap gap-[var(--s-3)]">
              {SWATCHES.map((s) => (
                <div key={s.name} className="flex flex-col items-center gap-[var(--s-1)]">
                  <span
                    className={`size-[34px] rounded-[var(--r-md)] shadow-[var(--sh-xs)] ${s.ring ? "ring-1 ring-inset ring-[var(--c-border-strong)]" : ""}`}
                    style={{ backgroundColor: `var(${s.varName})` }}
                  />
                  <Mono className="text-[length:var(--t-2xs)] text-[var(--c-ink-3)]">{s.name}</Mono>
                </div>
              ))}
            </div>
          </div>

          {/* tipografía */}
          <div>
            <Eyebrow>Escala tipográfica</Eyebrow>
            <ul className="mt-[var(--s-3)] flex flex-col gap-[var(--s-3)]">
              {TYPE_SCALE.map((t) => (
                <li key={t.label} className="flex items-baseline gap-[var(--s-4)]">
                  <Mono className="w-[88px] shrink-0 text-[length:var(--t-2xs)] text-[var(--c-ink-4)]">
                    {t.label}
                  </Mono>
                  <span className={`truncate text-[var(--c-ink)] ${t.className}`}>{t.sample}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* radios */}
          <div>
            <Eyebrow>Radios</Eyebrow>
            <div className="mt-[var(--s-3)] flex flex-wrap gap-[var(--s-3)]">
              {RADII.map((r) => (
                <div key={r.name} className="flex flex-col items-center gap-[var(--s-1)]">
                  <span
                    className="size-[34px] border border-[var(--c-border-strong)] bg-[var(--c-surface-3)]"
                    style={{ borderRadius: `var(${r.varName})` }}
                  />
                  <Mono className="text-[length:var(--t-2xs)] text-[var(--c-ink-3)]">{r.name}</Mono>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
