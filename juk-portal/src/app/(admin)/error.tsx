"use client";

/*
 * Límite de error del back-office: se renderiza DENTRO del AdminShell (el
 * layout del grupo queda por encima del boundary), así que el usuario conserva
 * la navegación y puede reintentar o volver al dashboard.
 */

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

import { Button, LinkButton } from "@/components/ui";

export default function AdminError({
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
    <section className="flex min-h-[50vh] flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-[length:var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-danger)]">
        Algo salió mal
      </p>
      <h1 className="mt-3 max-w-xl font-display text-[length:var(--t-h1)] font-extrabold tracking-[var(--ls-tight)] text-[var(--c-ink)]">
        No pudimos cargar esta pantalla
      </h1>
      <p className="mt-3 max-w-md text-[length:var(--t-body)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
        Puede ser algo momentáneo. Probá de nuevo; si sigue pasando, avisale al equipo técnico
        {error.digest ? ` con el código ${error.digest}` : ""}.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button type="button" onClick={reset}>
          Reintentar
        </Button>
        <LinkButton href="/dashboard" variant="secondary">
          Ir al dashboard
        </LinkButton>
      </div>
    </section>
  );
}
