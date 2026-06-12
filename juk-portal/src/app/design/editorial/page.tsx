import type { CSSProperties } from "react";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";

import { ScreenAlumnos } from "./ScreenAlumnos";
import { ScreenDashboard } from "./ScreenDashboard";
import { ScreenLogin } from "./ScreenLogin";
import { ScreenViaje } from "./ScreenViaje";
import { Eyebrow } from "./primitives";
import "./tokens.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], display: "swap" });

export const metadata = { title: "Editorial · Design Lab" };

const sections = [
  { id: "dashboard", label: "01 · Dashboard" },
  { id: "alumnos", label: "02 · Alumnos" },
  { id: "viaje", label: "03 · Detalle de viaje" },
  { id: "login", label: "04 · Login" },
] as const;

/* ── Tira de tokens ──────────────────────────────────────────────── */

const paleta = [
  { name: "brand", v: "var(--c-brand)" },
  { name: "brand-600", v: "var(--c-brand-600)" },
  { name: "brand-300", v: "var(--c-brand-300)" },
  { name: "gold", v: "var(--c-gold)" },
  { name: "gold-bright", v: "var(--c-gold-bright)" },
  { name: "coral", v: "var(--c-coral)" },
  { name: "page", v: "var(--c-page)", ring: true },
  { name: "surface", v: "var(--c-surface)", ring: true },
  { name: "surface-2", v: "var(--c-surface-2)", ring: true },
  { name: "ink", v: "var(--c-ink)" },
  { name: "ink-muted", v: "var(--c-ink-muted)" },
  { name: "border", v: "var(--c-border)", ring: true },
  { name: "success", v: "var(--c-success)" },
  { name: "warning", v: "var(--c-warning)" },
  { name: "danger", v: "var(--c-danger)" },
  { name: "info", v: "var(--c-info)" },
];

const escalaTipo = [
  { label: "Display 1", size: "var(--t-display-1)" },
  { label: "Display 2", size: "var(--t-display-2)" },
  { label: "H1", size: "var(--t-h1)" },
  { label: "H2", size: "var(--t-h2)" },
  { label: "Body", size: "var(--t-body)" },
];

const radios = [
  { name: "xs", v: "var(--r-xs)" },
  { name: "sm", v: "var(--r-sm)" },
  { name: "md", v: "var(--r-md)" },
  { name: "lg", v: "var(--r-lg)" },
  { name: "pill", v: "var(--r-pill)" },
];

function TokensStrip() {
  return (
    <div className="border-b border-[var(--c-border)] bg-[var(--c-surface)]">
      <div className="mx-auto max-w-[72rem] px-[var(--sp-5)] py-[var(--sp-6)]">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <Eyebrow gold>Dirección visual</Eyebrow>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-[length:var(--t-h2)] font-medium tracking-[var(--ls-tight)] text-[var(--c-ink)]">
              Editorial — Tokens
            </h2>
          </div>
          <p className="max-w-md rounded-[var(--r-md)] bg-[var(--c-gold-soft)] px-3 py-2 text-[length:var(--t-small)] text-[#5b4a1d]">
            Editá <code className="font-[family-name:var(--font-mono)]">src/app/design/editorial/tokens.css</code> para ajustar esta dirección.
          </p>
        </div>

        <div className="grid gap-[var(--sp-6)] lg:grid-cols-[1.4fr_1fr_0.7fr]">
          {/* Paleta */}
          <div>
            <Eyebrow>Paleta</Eyebrow>
            <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-8">
              {paleta.map((c) => (
                <div key={c.name} className="flex flex-col gap-1">
                  <span
                    className={`h-10 w-full rounded-[var(--r-sm)] ${c.ring ? "ring-1 ring-inset ring-[var(--c-border-strong)]" : ""}`}
                    style={{ background: c.v }}
                  />
                  <span className="truncate font-[family-name:var(--font-mono)] text-[0.62rem] text-[var(--c-ink-subtle)]">{c.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tipografía */}
          <div>
            <Eyebrow>Escala tipográfica · Fraunces / Inter</Eyebrow>
            <div className="mt-3 space-y-1.5">
              {escalaTipo.map((t) => (
                <div key={t.label} className="flex items-baseline gap-3 border-b border-[var(--c-rule)] pb-1">
                  <span className="w-16 shrink-0 font-[family-name:var(--font-mono)] text-[0.62rem] uppercase tracking-wide text-[var(--c-ink-subtle)]">
                    {t.label}
                  </span>
                  <span
                    className="truncate font-[family-name:var(--font-display)] font-light leading-none text-[var(--c-ink)]"
                    style={{ fontSize: `min(${t.size}, 2rem)` } as CSSProperties}
                  >
                    Aa Bb
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Radios */}
          <div>
            <Eyebrow>Radios</Eyebrow>
            <div className="mt-3 flex flex-wrap gap-2">
              {radios.map((r) => (
                <div key={r.name} className="flex flex-col items-center gap-1">
                  <span
                    className="h-10 w-10 border border-[var(--c-border-strong)] bg-[var(--c-surface-2)]"
                    style={{ borderRadius: r.v }}
                  />
                  <span className="font-[family-name:var(--font-mono)] text-[0.62rem] text-[var(--c-ink-subtle)]">{r.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SubNav() {
  return (
    <nav className="sticky top-[49px] z-40 border-b border-[var(--c-border)] bg-[var(--c-page)]/92 backdrop-blur">
      <div className="mx-auto flex max-w-[72rem] flex-wrap items-center gap-x-1 gap-y-1 px-[var(--sp-5)] py-2">
        {sections.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="rounded-[var(--r-md)] px-3 py-1.5 font-[family-name:var(--font-mono)] text-[length:var(--t-small)] text-[var(--c-ink-muted)] transition-colors hover:bg-[var(--c-overlay)] hover:text-[var(--c-ink)]"
          >
            {s.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

function SectionAnchor({ id, kicker }: { id: string; kicker: string }) {
  return (
    <div id={id} className="scroll-mt-28 border-t border-[var(--c-border)] bg-[var(--c-surface-2)]">
      <div className="mx-auto max-w-[72rem] px-[var(--sp-5)] py-3">
        <span className="font-[family-name:var(--font-mono)] text-[length:var(--t-label)] uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]">
          {kicker}
        </span>
      </div>
    </div>
  );
}

export default function EditorialPage() {
  return (
    <div
      className="v-editorial min-h-screen bg-[var(--c-page)] font-[family-name:var(--font-body)] text-[var(--c-ink)] antialiased"
      style={
        {
          "--font-display": fraunces.style.fontFamily,
          "--font-body": inter.style.fontFamily,
          "--font-mono": jetbrains.style.fontFamily,
        } as CSSProperties
      }
    >
      <TokensStrip />
      <SubNav />

      <SectionAnchor id="dashboard" kicker="Pantalla 01 — Dashboard" />
      <ScreenDashboard />

      <SectionAnchor id="alumnos" kicker="Pantalla 02 — ABM Alumnos (lista + formulario)" />
      <ScreenAlumnos />

      <SectionAnchor id="viaje" kicker="Pantalla 03 — Detalle de viaje" />
      <ScreenViaje />

      <SectionAnchor id="login" kicker="Pantalla 04 — Login / onboarding" />
      <ScreenLogin />

      <footer className="border-t border-[var(--c-border)] py-[var(--sp-7)] text-center">
        <p className="font-[family-name:var(--font-mono)] text-[length:var(--t-small)] text-[var(--c-ink-subtle)]">
          JUK · Dirección Editorial — concept / handoff visual · datos de ejemplo
        </p>
      </footer>
    </div>
  );
}
