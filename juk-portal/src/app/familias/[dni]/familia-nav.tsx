"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils/cn";

/**
 * Navegación por módulos del portal de la familia. Sidebar vertical en desktop,
 * tira de tabs scrolleable en mobile.
 */
type Item = { label: string; sub?: string; icon: string; pronto?: boolean };

const ITEMS: Item[] = [
  { label: "Resumen", icon: "🏠" },
  { label: "Documentación", sub: "documentacion", icon: "📄" },
  { label: "Pagos", sub: "pagos", icon: "💳" },
  { label: "Viaje", sub: "viaje", icon: "✈️" },
  { label: "Mis datos", sub: "datos", icon: "🪪" },
  { label: "Diario", icon: "📔", pronto: true },
  { label: "Certificado", icon: "🎓", pronto: true },
  { label: "Encuesta", icon: "⭐", pronto: true },
];

export function FamiliaNav({ base }: { base: string }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Secciones"
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0 lg:pb-0"
    >
      {ITEMS.map((it) => {
        const href = it.sub ? `${base}/${it.sub}` : base;
        const active = it.sub ? pathname.startsWith(href) : pathname === base;

        if (it.pronto) {
          return (
            <span
              key={it.label}
              aria-disabled
              className="flex shrink-0 items-center gap-2 rounded-[var(--r-pill)] px-3 py-2 text-[length:var(--t-small)] font-semibold text-[var(--c-ink-subtle)] opacity-60 lg:px-4"
            >
              <span aria-hidden>{it.icon}</span>
              <span>{it.label}</span>
              <span className="rounded-[var(--r-pill)] bg-[var(--c-surface-2)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[var(--ls-label)]">
                Pronto
              </span>
            </span>
          );
        }

        return (
          <Link
            key={it.label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-[var(--r-pill)] px-3 py-2 text-[length:var(--t-small)] font-semibold transition-colors lg:px-4",
              active
                ? "bg-[var(--c-brand)] text-[var(--c-ink-onbrand)] shadow-[shadow:var(--shadow-brand)]"
                : "text-[var(--c-ink-muted)] hover:bg-[var(--c-surface-2)] hover:text-[var(--c-ink)]"
            )}
          >
            <span aria-hidden>{it.icon}</span>
            <span>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
