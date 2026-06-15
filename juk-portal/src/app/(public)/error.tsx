"use client";

/*
 * Límite de error del sitio público: si una página tira una excepción en
 * runtime, se ve esto (con el diseño del sitio) en vez de la pantalla cruda.
 * El TopNav/Footer los aporta el layout del segmento (public).
 */
import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // No-op si no hay DSN configurado; reporta a Sentry si lo hay.
    Sentry.captureException(error);
  }, [error]);

  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-20 text-center">
      <p className="font-[family-name:var(--font-mono)] text-[length:var(--t-label)] font-bold uppercase tracking-[0.16em] text-[var(--c-accent-600)]">
        Algo salió mal
      </p>
      <h1 className="mt-3 max-w-xl font-[family-name:var(--font-display)] text-[length:var(--t-h1)] font-extrabold tracking-[var(--ls-tight)] text-[var(--c-ink)]">
        Tuvimos un problema cargando esta página
      </h1>
      <p className="mt-3 max-w-md text-[length:var(--t-body)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
        Probá de nuevo en un momento. Si sigue pasando, escribinos y lo resolvemos.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-[var(--tap)] items-center justify-center rounded-[var(--r-pill)] bg-[var(--c-brand)] px-6 text-[length:var(--t-body)] font-semibold text-[var(--c-ink-onbrand)] shadow-[shadow:var(--shadow-brand)] transition-transform active:scale-[0.97] hover:bg-[var(--c-brand-700)]"
        >
          Reintentar
        </button>
        <Link
          href="/"
          className="inline-flex min-h-[var(--tap)] items-center justify-center rounded-[var(--r-pill)] border border-[var(--c-border-strong)] bg-[var(--c-surface)] px-6 text-[length:var(--t-body)] font-semibold text-[var(--c-ink)] transition-colors hover:border-[var(--c-brand-300)] hover:text-[var(--c-brand)]"
        >
          Volver al inicio
        </Link>
      </div>
    </section>
  );
}
