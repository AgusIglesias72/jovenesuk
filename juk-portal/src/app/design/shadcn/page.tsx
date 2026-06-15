import type { CSSProperties } from "react";
import { Geist_Mono, Inter } from "next/font/google";

import { ComponentesScreen } from "../shared/gallery";
import { PagosScreen } from "../shared/pagos";
import { PantallasScreen } from "../shared/pantallas";
import { PantallasAdminScreen } from "../shared/pantallas-admin";
import { SeguimientoScreen } from "../shared/seguimiento";
import "../shared/animations.css";
import "./tokens.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-geist-mono",
});

export const metadata = { title: "Shadcn · Design Lab · JUK" };

const NAV = [
  { id: "seguimiento", label: "Seguimiento M6" },
  { id: "pagos", label: "Pagos" },
  { id: "pantallas", label: "Pantallas" },
  { id: "pantallas-admin", label: "Admin" },
  { id: "componentes", label: "Componentes" },
];

const SWATCHES = [
  { label: "primary", v: "#171717", ink: "#fafafa" },
  { label: "foreground", v: "#0a0a0a", ink: "#fafafa" },
  { label: "muted-fg", v: "#737373", ink: "#fafafa" },
  { label: "muted", v: "#f5f5f5", ink: "#0a0a0a" },
  { label: "border", v: "#e5e5e5", ink: "#0a0a0a" },
  { label: "background", v: "#ffffff", ink: "#0a0a0a" },
  { label: "destructive", v: "#dc2626", ink: "#fafafa" },
];

function TokensStrip() {
  return (
    <div className="border-b border-[var(--c-border)] bg-[var(--c-surface)]">
      <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:px-10">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="font-[family-name:var(--font-display)] text-[length:var(--t-h2)] font-bold text-[var(--c-ink)]">
              Dirección Shadcn
            </p>
            <p className="text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
              La base &ldquo;normal&rdquo; de shadcn/ui — preset b0: tema neutral, Inter, radio 10px, sin color de
              marca.
            </p>
          </div>
          <p className="font-[family-name:var(--font-mono)] text-[length:var(--t-small)] text-[var(--c-ink-subtle)]">
            Editá{" "}
            <span className="rounded-[var(--r-xs)] bg-[var(--c-surface-2)] px-1.5 py-0.5 text-[var(--c-ink)]">
              src/app/design/shadcn/tokens.css
            </span>{" "}
            para ajustar esta dirección.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
          <div className="flex flex-wrap gap-2">
            {SWATCHES.map((s) => (
              <div
                key={s.label}
                className="flex h-12 w-[84px] flex-col justify-end rounded-[var(--r-md)] border border-[var(--c-border)] p-1.5"
                style={{ backgroundColor: s.v }}
              >
                <span className="font-[family-name:var(--font-mono)] text-[9px] font-bold" style={{ color: s.ink }}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
          <div>
            <p className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-[var(--ls-tight)] text-[var(--c-ink)]">
              Inter
            </p>
            <p className="font-[family-name:var(--font-mono)] text-[length:var(--t-mono)] text-[var(--c-ink-subtle)]">
              Geist Mono · UK-2026-JUL-LONDON · radius 0.625rem
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SubNav() {
  return (
    <nav className="sticky top-0 z-40 border-b border-[var(--c-border)] bg-[rgba(255,255,255,0.85)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-2 sm:px-6 lg:px-10">
        {NAV.map((n, i) => (
          <a
            key={n.id}
            href={`#${n.id}`}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-[var(--r-md)] px-3 py-1.5 text-[length:var(--t-small)] font-medium text-[var(--c-ink-muted)] transition-colors hover:bg-[var(--c-surface-2)] hover:text-[var(--c-ink)]"
          >
            <span className="font-[family-name:var(--font-mono)] text-[10px] font-bold text-[var(--c-ink-subtle)]">
              {String(i + 1).padStart(2, "0")}
            </span>
            {n.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

export default function ShadcnPage() {
  return (
    <div
      className={`v-shadcn ${inter.variable} ${geistMono.variable} min-h-screen bg-[var(--c-page)] font-[family-name:var(--font-body)] text-[var(--c-ink)] antialiased`}
      style={
        {
          "--font-display": "var(--font-inter)",
          "--font-body": "var(--font-inter)",
          "--font-mono": "var(--font-geist-mono)",
        } as CSSProperties
      }
    >
      <TokensStrip />
      <SubNav />

      <SeguimientoScreen n="01" />
      <PagosScreen n="02" />
      <PantallasScreen n="03" />
      <PantallasAdminScreen n="04" />
      <ComponentesScreen n="05" />

      <footer className="border-t border-[var(--c-border)] px-6 py-8 text-center text-[length:var(--t-small)] text-[var(--c-ink-subtle)]">
        Dirección <span className="font-semibold text-[var(--c-ink-muted)]">Shadcn</span> · la base neutral
        de shadcn/ui · restilá todo desde{" "}
        <span className="font-[family-name:var(--font-mono)]">tokens.css</span>
      </footer>
    </div>
  );
}
