import type { ReactNode } from "react";

import { EMAIL, MAIL_URL } from "@/lib/contact";

import { VARIANTE_CLASE_BASE } from "./variantes";

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
 *
 * LA PIEL DE LA VARIANTE (A · Legajo, B · Cuaderno, C · Embarque)
 * --------------------------------------------------------------
 * El shell no pinta colores propios: todo lo suyo sale del vocabulario
 * `--form-*` de `src/styles/form-variants.css`, así que cambia de piel junto
 * con el formulario sin tener que conocer la variante. Y no puede conocerla:
 * un layout de Next NO recibe `searchParams` (no vuelve a renderizar al
 * navegar, así que quedarían viejos), y la variante de la campaña sale de
 * resolver el token contra la base — el mismo round-trip que hace la page.
 *
 * Por eso la page marca la variante con su clase (`VARIANTE_CLASES`) y el CSS
 * la sube hasta el <body> con `body:has(.v-form-b)`: con una sola marca quedan
 * en la misma piel el shell, el formulario y los popover que <DateInput> monta
 * en un portal fuera de este árbol.
 *
 * Queda el skeleton de `loading.tsx`, que se pinta ANTES de resolver el token y
 * por lo tanto antes de que exista la marca. Para eso el shell arranca con
 * `VARIANTE_CLASE_BASE`, que vale la piel A —la base y el default— y se apaga
 * sola en cuanto el árbol trae la marca de otra variante: el camino más
 * frecuente no tiene salto visual, y B y C pagan un cambio de piel al llegar la
 * respuesta. Es inevitable mientras la variante de la campaña dependa de la
 * base.
 */
export default function InscripcionLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${VARIANTE_CLASE_BASE} flex min-h-screen flex-col bg-[var(--c-page)] font-[family-name:var(--font-body)] text-[var(--c-ink)]`}
    >
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[200] focus:rounded-[var(--r-pill)] focus:bg-[var(--c-brand)] focus:px-5 focus:py-2.5 focus:text-[length:var(--t-small)] focus:font-semibold focus:text-[var(--c-ink-onbrand)] focus:shadow-[shadow:var(--shadow-2)]"
      >
        Saltar al contenido
      </a>

      <header className="border-b border-[var(--form-chrome-borde)] bg-[var(--form-chrome)]">
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

      <footer className="border-t border-[var(--form-chrome-borde)] px-4 py-6 sm:px-6">
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
