"use client";

/*
 * Último recurso: sólo se muestra si falla el root layout (layout.tsx), donde
 * ya no hay boundary de segmento que atrape nada. Reemplaza al documento
 * entero, así que trae su propio <html>/<body> y su propio import de estilos
 * (los del root layout no llegan hasta acá). Sin fuentes: si el layout se
 * cayó, lo único que importa es que se lea y haya una salida.
 */

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

import "@/styles/globals.css";

export default function GlobalError({
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
    <html lang="es-AR">
      <body className="v-studio">
        <title>Algo salió mal · JUK</title>
        <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--c-page)] px-6 text-center">
          <h1 className="max-w-xl text-[length:var(--t-h1)] font-extrabold tracking-[var(--ls-tight)] text-[var(--c-ink)]">
            Algo salió mal
          </h1>
          <p className="mt-3 max-w-md text-[length:var(--t-body)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
            Tuvimos un problema cargando el portal. Probá de nuevo en un momento
            {error.digest ? ` (código ${error.digest})` : ""}.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-8 inline-flex min-h-[var(--tap)] items-center justify-center rounded-[var(--r-pill)] bg-[var(--c-brand)] px-6 text-[length:var(--t-body)] font-semibold text-[var(--c-ink-onbrand)]"
          >
            Reintentar
          </button>
        </main>
      </body>
    </html>
  );
}
