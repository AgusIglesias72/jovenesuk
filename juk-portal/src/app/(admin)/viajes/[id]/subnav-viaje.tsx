"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils/cn";

export type SeccionViaje = { id: string; label: string };

/**
 * Subnavegación del detalle de viaje.
 *
 * Anclas y NO tabs, a propósito: las secciones tienen que seguir montadas a la
 * vez (los paneles se refrescan entre sí con `router.refresh()` y los E2E los
 * localizan juntos), y lo que resuelve es llegar al M7 sin scrollear cinco
 * pantallas. Son `<a href="#…">` nativos porque es un salto dentro de la misma
 * página, no una navegación de Next.
 */
export function SubnavViaje({ secciones }: { secciones: SeccionViaje[] }) {
  const [activa, setActiva] = useState<string | null>(null);
  const ids = secciones.map((s) => s.id).join(" ");

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const destinos = ids
      .split(" ")
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (destinos.length === 0) return;

    // La sección que cruza una franja en el tercio superior de la pantalla es
    // la "actual": funciona igual con el scroll de la ventana (mobile) y con el
    // del contenedor del shell (desktop), porque la raíz es el viewport.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiva(entry.target.id);
        }
      },
      { rootMargin: "-25% 0px -65% 0px" }
    );
    destinos.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ids]);

  return (
    <nav
      aria-label="Secciones del viaje"
      className="sticky top-[calc(3.75rem+var(--safe-top))] z-20 mb-6 lg:top-3"
    >
      <ul className="flex gap-1 overflow-x-auto rounded-[var(--r-pill)] border border-[var(--c-border)] bg-[var(--c-surface)] p-1 shadow-[shadow:var(--shadow-1)] [scrollbar-width:none]">
        {secciones.map((s) => {
          const esActiva = activa === s.id;
          return (
            <li key={s.id} className="shrink-0">
              <a
                href={`#${s.id}`}
                aria-current={esActiva ? "location" : undefined}
                onClick={() => setActiva(s.id)}
                className={cn(
                  "inline-flex min-h-[var(--tap)] items-center whitespace-nowrap rounded-[var(--r-pill)] px-4 text-[length:var(--t-small)] font-semibold transition-colors duration-150",
                  "focus-visible:outline-none focus-visible:shadow-[shadow:var(--ring-focus)]",
                  esActiva
                    ? "bg-[var(--c-brand-50)] text-[var(--c-brand)]"
                    : "text-[var(--c-ink-muted)] hover:bg-[var(--c-surface-2)] hover:text-[var(--c-ink)]"
                )}
              >
                {s.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
