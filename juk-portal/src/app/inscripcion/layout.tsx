import type { ReactNode } from "react";

import { MarcaJuk, PieInscripcion } from "./_marco";
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
 * Por lo mismo el shell NO tiene nav de marketing ni `landing.css`, y las únicas
 * salidas de toda la pantalla son la política de privacidad y los dos canales de
 * ayuda (mail y WhatsApp).
 *
 * Dentro de ese límite, sí tiene mobiliario: la marca arriba, la cabecera con el
 * viaje, la columna de "qué pasa después", la franja con las cifras y las
 * acreditaciones, y un pie de tres columnas (`_marco.tsx`). La ficha sola era una
 * columna de campos flotando en el vacío, y la familia que llega desde un mail no
 * tenía cómo saber que estaba en el lugar correcto.
 *
 * El header NO es sticky: la barra de progreso de la piel C es `position: sticky;
 * top: 0` (`src/styles/form-variants.css`) y las dos se pisarían justo en la
 * pieza que hace que la ficha se termine.
 *
 * El `<main>` no lleva ancho ni padding propios: el ancho lo pone cada bloque
 * (`mx-auto max-w-5xl px-4`), que es lo que permite que la cabecera y la franja
 * de confianza sean de borde a borde.
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
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-5 sm:px-6">
          <MarcaJuk />
          <span className="text-right text-[length:var(--t-label)] uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]">
            Formulario de inscripción
            <span className="block normal-case tracking-normal">
              Educational Tour Operator · +10 años
            </span>
          </span>
        </div>
      </header>

      <main id="contenido" className="flex-1">
        {children}
      </main>

      <PieInscripcion />
    </div>
  );
}
