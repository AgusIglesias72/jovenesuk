"use client";

/*
 * Límite de error del Portal de Familias. Vive en `familias/` y no en
 * `familias/[dni]/` a propósito: quien carga los datos del alumno es
 * `familias/[dni]/layout.tsx`, y un error.tsx dentro de ese mismo segmento no
 * captura los fallos de su propio layout.
 */

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

import { Button, LinkButton } from "@/components/ui";

export default function FamiliasError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <section className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-[length:var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-danger)]">
        Algo salió mal
      </p>
      <h1 className="mt-3 font-display text-[length:var(--t-h1)] font-extrabold tracking-[var(--ls-tight)] text-[var(--c-ink)]">
        No pudimos cargar esta página
      </h1>
      <p className="mt-3 text-[length:var(--t-body)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
        Probá de nuevo en un momento. Si sigue pasando, escribinos y lo resolvemos
        {error.digest ? ` (código ${error.digest})` : ""}.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button type="button" onClick={reset}>
          Reintentar
        </Button>
        <LinkButton href="/familias" variant="secondary">
          Volver al inicio
        </LinkButton>
      </div>
    </section>
  );
}
