"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { PAGE_SIZE } from "@/lib/utils/paginate";
import { cn } from "@/lib/utils/cn";

/**
 * Paginación de tablas (STUDIO): "Mostrando a–b de N" + pills numeradas.
 * Navega por searchParam `page` preservando los filtros activos.
 */
export function Pagination({
  total,
  page,
  pages,
  pageSize = PAGE_SIZE,
}: {
  total: number;
  page: number;
  pages: number;
  pageSize?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [, startTransition] = useTransition();

  if (pages <= 1) return null;

  function ir(n: number) {
    const params = new URLSearchParams(sp.toString());
    if (n <= 1) params.delete("page");
    else params.set("page", String(n));
    const qs = params.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname));
  }

  const desde = (page - 1) * pageSize + 1;
  const hasta = Math.min(page * pageSize, total);

  // Ventana de páginas: 1 … (p-1, p, p+1) … última
  const numeros = Array.from({ length: pages }, (_, i) => i + 1).filter(
    (n) => n === 1 || n === pages || Math.abs(n - page) <= 1
  );

  return (
    <nav
      aria-label="Paginación"
      className="mt-4 flex flex-wrap items-center justify-between gap-3"
      data-pagination
    >
      <p className="text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
        Mostrando{" "}
        <span className="font-semibold text-[var(--c-ink)]">
          {desde}–{hasta}
        </span>{" "}
        de <span className="font-semibold text-[var(--c-ink)]">{total}</span>
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => ir(page - 1)}
          disabled={page <= 1}
          aria-label="página anterior"
          className="grid h-[var(--tap)] w-[var(--tap)] place-items-center rounded-[var(--r-pill)] border border-[var(--c-border-strong)] bg-[var(--c-surface)] text-[var(--c-ink-muted)] transition-colors hover:border-[var(--c-brand-300)] hover:text-[var(--c-brand)] disabled:cursor-not-allowed disabled:opacity-45 lg:[@media(pointer:fine)]:h-9 lg:[@media(pointer:fine)]:w-9"
        >
          ←
        </button>
        {numeros.map((n, i) => (
          <span key={n} className="flex items-center gap-1.5">
            {i > 0 && numeros[i - 1] !== n - 1 && (
              <span className="px-0.5 text-[var(--c-ink-subtle)]" aria-hidden>
                …
              </span>
            )}
            <button
              type="button"
              onClick={() => ir(n)}
              aria-current={n === page ? "page" : undefined}
              className={cn(
                "grid h-[var(--tap)] min-w-[var(--tap)] place-items-center rounded-[var(--r-pill)] px-2 text-[length:var(--t-small)] font-semibold transition-colors lg:[@media(pointer:fine)]:h-9 lg:[@media(pointer:fine)]:min-w-[36px]",
                n === page
                  ? "bg-[var(--c-brand)] text-[var(--c-ink-onbrand)] shadow-[shadow:var(--shadow-brand)]"
                  : "text-[var(--c-ink-muted)] hover:bg-[var(--c-surface-2)] hover:text-[var(--c-ink)]"
              )}
            >
              {n}
            </button>
          </span>
        ))}
        <button
          type="button"
          onClick={() => ir(page + 1)}
          disabled={page >= pages}
          aria-label="página siguiente"
          className="grid h-[var(--tap)] w-[var(--tap)] place-items-center rounded-[var(--r-pill)] border border-[var(--c-border-strong)] bg-[var(--c-surface)] text-[var(--c-ink-muted)] transition-colors hover:border-[var(--c-brand-300)] hover:text-[var(--c-brand)] disabled:cursor-not-allowed disabled:opacity-45 lg:[@media(pointer:fine)]:h-9 lg:[@media(pointer:fine)]:w-9"
        >
          →
        </button>
      </div>
    </nav>
  );
}
