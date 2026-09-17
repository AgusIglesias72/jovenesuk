import type { ReactNode } from "react";

import { EMAIL, MAIL_URL } from "@/lib/contact";

/**
 * Shell del Application Form público.
 *
 * Vive FUERA del route group `(public)` a propósito, y no es una preferencia
 * estética:
 *
 *  1. `(public)/layout.tsx` monta `<Analytics />`, que manda a Google Analytics
 *     el `page_location` completo. La URL de esta pantalla lleva el token del
 *     link (`?t=…`), que es una credencial: ese parámetro no puede salir del
 *     sistema ni quedar guardado en la propiedad de GA de nadie.
 *  2. TopNav y Footer invitan a irse a navegar el sitio en medio de una ficha
 *     larga. Acá la única salida es terminar de completarla.
 *
 * Por lo mismo el shell es mínimo: la marca, el contenido y una línea legal.
 * Nada de nav de marketing ni `landing.css`.
 */
export default function InscripcionLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--c-page)] font-[family-name:var(--font-body)] text-[var(--c-ink)]">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[200] focus:rounded-[var(--r-pill)] focus:bg-[var(--c-brand)] focus:px-5 focus:py-2.5 focus:text-[length:var(--t-small)] focus:font-semibold focus:text-[var(--c-ink-onbrand)] focus:shadow-[shadow:var(--shadow-2)]"
      >
        Saltar al contenido
      </a>

      <header className="border-b border-[var(--c-border)] bg-[var(--c-surface)]">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-4 sm:px-6">
          <span className="font-[family-name:var(--font-display)] text-[length:var(--t-small)] font-bold uppercase tracking-[0.14em] text-[var(--c-brand)]">
            Jóvenes en UK
          </span>
          <span className="text-[length:var(--t-label)] uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]">
            Formulario de inscripción
          </span>
        </div>
      </header>

      <main id="contenido" className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        {children}
      </main>

      <footer className="border-t border-[var(--c-border)] px-4 py-6 sm:px-6">
        <p className="mx-auto max-w-3xl text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink-subtle)]">
          Tratamos tus datos según nuestra{" "}
          <a
            href="/privacidad"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[var(--c-brand)] underline underline-offset-2"
          >
            Política de Privacidad
          </a>
          . Ante cualquier duda, escribinos a{" "}
          <a
            href={MAIL_URL}
            className="font-semibold text-[var(--c-brand)] underline underline-offset-2"
          >
            {EMAIL}
          </a>
          .
        </p>
      </footer>
    </div>
  );
}
