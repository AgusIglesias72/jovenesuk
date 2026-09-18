import Image from "next/image";
import type { ReactNode } from "react";

import { EMAIL, MAIL_URL, PHONE_DISPLAY, WHATSAPP_URL } from "@/lib/contact";
import { ACREDITACIONES_JUK, FOTO_HERO_INSCRIPCION, STATS_JUK } from "@/lib/marca";
import { cn } from "@/lib/utils/cn";

/**
 * El MARCO del Application Form: todo lo que rodea a la ficha.
 *
 * Por qué existe: la ficha sola es una columna de campos flotando en el vacío,
 * y la familia que llega desde un mail no tiene cómo saber que está en el lugar
 * correcto. Acá van la marca, el viaje, qué pasa después de enviar, cómo pedir
 * ayuda y los respaldos de la agencia.
 *
 * TRES REGLAS QUE NO SE NEGOCIAN
 * ------------------------------------------------------------------
 *  1. **Ni un `<form>` ni un control.** `inscripcion-variantes.spec.ts` toma la
 *     piel con `page.locator("form")` en modo estricto: un segundo formulario
 *     (un newsletter, un buscador) rompe el spec. Y todo `input`/`select`/
 *     `textarea` de la página entra en la comparación de árboles accesibles y
 *     en el piso de 16px del teléfono. El marco es texto, imágenes y `<a>`.
 *  2. **Un solo `<h1>` visible**, el de `HeroInscripcion` (regla (c) de
 *     `a11y-basico.spec.ts`, que audita las tres pieles). El camino del link
 *     inválido no monta el hero justamente por esto: conserva el suyo.
 *  3. **Cero salidas de navegación al sitio.** El aislamiento del shell es una
 *     decisión escrita (ver el encabezado de `layout.tsx`): nada de
 *     `/programas`, `/salidas`, `/notas` ni `/login`. Los únicos enlaces
 *     permitidos son la política de privacidad y los dos canales de ayuda.
 *
 * Nada de esto conoce la variante: los colores salen del vocabulario `--form-*`
 * de `src/styles/form-variants.css`, que el CSS sube hasta el <body> con
 * `body:has(.v-form-X)`. Una sola estructura, tres pieles.
 */

/** La marca, con el mismo dibujo que el `Wordmark` del sitio público.
 *
 * Se escribe acá y no se importa de `(public)/_components/`: esa es carpeta
 * privada de aquel segmento y hoy ningún archivo de afuera la toca (el único
 * cruce del repo, el contacto, se resolvió subiéndolo a `src/lib/`). Son ocho
 * líneas de JSX: duplicarlas cuesta menos que abrir el precedente. */
export function MarcaJuk({ inverse }: { inverse?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex h-9 items-center justify-center rounded-[var(--r-pill)] bg-white px-1.5 shadow-[shadow:var(--shadow-soft)]">
        <Image
          src="/landing/logo-juk.png"
          alt="Logo de Jóvenes en UK"
          width={38}
          height={30}
          className="h-[26px] w-auto"
        />
      </span>
      <span
        className={cn(
          "font-[family-name:var(--font-display)] text-lg font-bold tracking-[var(--ls-tight)]",
          inverse ? "text-[var(--form-cierre-tinta)]" : "text-[var(--c-ink)]"
        )}
      >
        Jóvenes en UK
      </span>
    </span>
  );
}

const TILDE = (
  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
    <path
      d="M3 8.5 6.5 12 13 4.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Lo que la familia necesita saber antes de empezar a tipear. */
const PROMESAS = [
  "Se completa en unos 10 minutos",
  "Podés hacerlo desde el teléfono",
  "Solo lo ve el equipo que organiza tu viaje",
] as const;

/**
 * La cabecera de la pantalla: volanta con el viaje, el título, la bajada, las
 * tres promesas y —cuando se entró sin link— el aviso de revisión a mano.
 */
export function HeroInscripcion({
  viajeNombre,
  sinToken,
}: {
  viajeNombre?: string | null;
  sinToken: boolean;
}) {
  return (
    <section className="marco-hero relative overflow-hidden">
      <div className="marco-hero-velo absolute inset-0" aria-hidden />

      <div className="relative mx-auto grid w-full max-w-5xl gap-10 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <p className="font-[family-name:var(--font-mono)] text-[length:var(--t-label)] font-bold uppercase tracking-[0.18em] text-[var(--form-hero-volanta)]">
            {viajeNombre ? `Inscripción · ${viajeNombre}` : "Inscripción"}
          </p>

          <h1 className="mt-3 font-[family-name:var(--font-display)] text-[length:var(--t-display-2)] font-extrabold leading-[var(--lh-tight)] tracking-[var(--ls-tight)] text-[var(--form-hero-tinta)]">
            Completá tu inscripción
          </h1>

          {/* La bajada NO repite el nombre del viaje: ya está en la volanta, dos
              renglones arriba. Con un nombre real ("Londres Julio 2027") decirlo
              dos veces en cuatro líneas suena a machaque, y además hacía que el
              mismo texto apareciera dos veces en la página. */}
          <p className="mt-4 max-w-xl text-[length:var(--t-body)] leading-[var(--lh-body)] text-[var(--form-hero-tinta-muted)]">
            Completá la ficha del alumno. Los datos tienen que coincidir con el pasaporte: con
            ellos emitimos la documentación del viaje.
          </p>

          <ul className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {PROMESAS.map((promesa) => (
              <li key={promesa} className="flex items-start gap-3">
                <span className="marco-tilde mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--r-pill)]">
                  {TILDE}
                </span>
                <span className="text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--form-hero-tinta-muted)]">
                  {promesa}
                </span>
              </li>
            ))}
          </ul>

          {sinToken && (
            <p className="mt-6 max-w-xl rounded-[var(--r-md)] border border-[var(--c-warning)] bg-[var(--c-warning-bg)] px-4 py-3 text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink)]">
              Estás completando el formulario sin el link que te mandamos por mail. Podés enviarlo
              igual: lo vamos a revisar a mano antes de darlo de alta, así que puede demorar un poco
              más.
            </p>
          )}
        </div>

        {/* Sin `priority` a propósito: la foto no se baja en el teléfono (queda
            en `display:none`, y con carga diferida el navegador ni la pide), que
            es donde se completa la mayoría de las fichas. En escritorio entra
            apenas después del texto. */}
        <figure className="relative hidden rotate-[-2deg] rounded-[var(--r-lg)] bg-[var(--c-surface)] p-2 pb-3 shadow-[shadow:var(--shadow-3)] lg:block">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[var(--r-sm)]">
            <Image
              src={FOTO_HERO_INSCRIPCION.src}
              alt={FOTO_HERO_INSCRIPCION.alt}
              fill
              sizes="420px"
              className="object-cover"
            />
          </div>
          <figcaption className="mt-2 text-center font-[family-name:var(--font-mono)] text-[length:var(--t-label)] uppercase tracking-[0.18em] text-[var(--c-ink-muted)]">
            Londres
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

const PASOS = [
  "Enviás la ficha y te queda el número de inscripción en pantalla.",
  "Te llega el acuse por mail con ese mismo número, por las dudas.",
  "El equipo la revisa y te abrimos el Portal de Familias para seguir el viaje.",
] as const;

function TituloAside({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-[family-name:var(--font-display)] text-[length:var(--t-h3)] font-bold tracking-[var(--ls-tight)] text-[var(--c-ink)]">
      {children}
    </h2>
  );
}

/** La columna lateral: qué pasa después de enviar y cómo pedir ayuda. */
export function ComoSigue() {
  return (
    <aside className="flex flex-col gap-4">
      <section className="marco-aside p-5">
        <TituloAside>Qué pasa después</TituloAside>
        <ol className="mt-4 space-y-4">
          {PASOS.map((paso, i) => (
            <li key={paso} className="flex items-start gap-3">
              {/* El número es decorativo: la lista ya es un <ol> y el lector de
                  pantalla anuncia el orden por su cuenta. */}
              <span
                className="grid h-8 w-8 shrink-0 place-items-center rounded-[var(--r-pill)] border-2 border-[var(--c-border-strong)] text-[length:var(--t-small)] font-bold text-[var(--c-ink-muted)]"
                aria-hidden
              >
                {i + 1}
              </span>
              <span className="text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
                {paso}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="marco-aside p-5">
        <TituloAside>¿Alguna duda?</TituloAside>
        <p className="mt-2 text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
          Si hay un dato que no tenés a mano, escribinos y lo resolvemos. No hace falta que
          completes todo de una sola vez.
        </p>
        <div className="mt-4 flex flex-col gap-1">
          <a
            href={MAIL_URL}
            className="inline-flex min-h-[var(--tap)] items-center text-[length:var(--t-small)] font-semibold text-[var(--c-brand)] underline underline-offset-2"
          >
            {EMAIL}
          </a>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[var(--tap)] items-center gap-2 text-[length:var(--t-small)] font-semibold text-[var(--c-brand)] underline underline-offset-2"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="currentColor" aria-hidden>
              <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3 .8.8-2.9-.2-.3a8.2 8.2 0 1 1 7.1 3.8Zm4.6-6.1c-.3-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.4-3c-.3-.4 0-.5.1-.7l.4-.5c.1-.2.2-.3.3-.5v-.5L9.6 7.6c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1.1 2.7c.1.2 1.9 2.9 4.6 4 .6.3 1.1.4 1.5.6.6.2 1.2.2 1.6.1.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.6-.4Z" />
            </svg>
            WhatsApp {PHONE_DISPLAY}
          </a>
        </div>
      </section>
    </aside>
  );
}

/** Las cifras y los sellos que respaldan a la agencia, justo antes de enviar. */
export function FranjaDeConfianza() {
  return (
    <section className="marco-confianza border-y border-[var(--c-border)] py-10 sm:py-12">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-6 lg:grid-cols-4">
          {STATS_JUK.map((s) => (
            <div key={s.label} className="text-center">
              <dd className="font-[family-name:var(--font-display)] text-[length:var(--t-h1)] font-extrabold tracking-[var(--ls-tight)] text-[var(--c-brand)]">
                {s.valor}
              </dd>
              <dt className="mt-1 text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
                {s.label}
              </dt>
            </div>
          ))}
        </dl>

        <p className="mt-10 text-center font-[family-name:var(--font-mono)] text-[length:var(--t-label)] font-bold uppercase tracking-[0.18em] text-[var(--c-ink-subtle)]">
          Nuestras acreditaciones
        </p>
        <ul className="mt-6 grid grid-cols-4 items-center gap-x-4 gap-y-6 sm:flex sm:justify-between sm:gap-6">
          {ACREDITACIONES_JUK.map((a) => (
            <li key={a.src} className="relative h-9 min-w-0 sm:h-12 sm:flex-1" title={a.alt}>
              <Image src={a.src} alt={a.alt} fill sizes="140px" className="object-contain opacity-80" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function TituloPie({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-[length:var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--form-cierre-tinta)]">
      {children}
    </h2>
  );
}

/** El pie: marca, ayuda y qué pasa con los datos. Sin nav de marketing. */
export function PieInscripcion() {
  return (
    <footer className="marco-cierre">
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <MarcaJuk inverse />
            <p className="marco-cierre-muted mt-3 max-w-xs text-[length:var(--t-small)] leading-[var(--lh-body)]">
              Viajes de estudio y programas de idiomas en el exterior, con acompañamiento de verdad.
              Educational Tour Operator.
            </p>
          </div>

          <div>
            <TituloPie>Ayuda</TituloPie>
            <ul className="mt-3 space-y-1">
              <li>
                <a
                  href={MAIL_URL}
                  className="marco-cierre-muted inline-flex min-h-[var(--tap)] items-center text-[length:var(--t-small)] underline underline-offset-2"
                >
                  {EMAIL}
                </a>
              </li>
              <li>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="marco-cierre-muted inline-flex min-h-[var(--tap)] items-center text-[length:var(--t-small)] underline underline-offset-2"
                >
                  WhatsApp {PHONE_DISPLAY}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <TituloPie>Tus datos</TituloPie>
            <p className="marco-cierre-muted mt-3 text-[length:var(--t-small)] leading-[var(--lh-body)]">
              Los usamos para organizar el viaje y nada más. Tratamos tus datos según nuestra{" "}
              <a
                href="/privacidad"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline underline-offset-2"
              >
                Política de Privacidad
              </a>
              .
            </p>
          </div>
        </div>

        <p className="marco-cierre-borde marco-cierre-muted mt-8 border-t pt-5 text-[length:var(--t-label)]">
          © Jóvenes en UK · Buenos Aires, Argentina
        </p>
      </div>
    </footer>
  );
}
